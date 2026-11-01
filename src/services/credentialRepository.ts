import { supabaseConfig } from "../config/supabase";
import type {
  CredentialPreview,
  CredentialPreviewProfile,
  CredentialAsset,
  CredentialDocumentKind,
  ProfessionalCredential,
  ProfessionalCredentialInput,
  CredentialSnapshot,
} from "../types/credential";
import { supabase } from "./supabaseClient";
import { validateCredentialFile } from "../shared/credentialValidation";
import { MemoryRequestCache } from "./memoryRequestCache";
import { removeUnreferencedStoragePaths } from "./adminSystemRepository";

const removePreviewCrops = async (assets: CredentialAsset[]): Promise<void> => {
  const paths = assets.flatMap((asset) => asset.crops.map((crop) => crop.storagePath));
  if (!paths.length) return;
  try {
    await removeUnreferencedStoragePaths(paths);
  } catch {
    // The rows are gone; orphaned preview files are removed by a later cleanup pass.
  }
};

interface CredentialAssetRow {
  id: string;
  credential_id: string;
  document_kind: CredentialDocumentKind;
  name: string;
  storage_path: string;
  original_filename: string;
  mime_type: CredentialAsset["mimeType"];
  file_size: number;
  display_order: number;
  created_at: string;
  /** 202611010002; absent until that migration is applied. */
  show_in_portfolio?: boolean;
  preview_rotation?: number;
  preview_profile?: CredentialPreviewProfile;
  credential_media_crops?: Array<{ id: string; profile: CredentialPreviewProfile; storage_path: string; crop_x: number; crop_y: number; crop_width: number; crop_height: number; width: number; height: number }>;
}

interface CredentialRow {
  id: string;
  kind: ProfessionalCredential["kind"];
  related_type: ProfessionalCredential["relatedType"];
  related_id: string | null;
  title: ProfessionalCredential["title"];
  issuer: ProfessionalCredential["issuer"];
  description: ProfessionalCredential["description"];
  issued_on: string | null;
  expires_on: string | null;
  does_not_expire: boolean;
  credential_number: string | null;
  verification_url: string | null;
  status: ProfessionalCredential["status"];
  display_order: number;
  created_at: string;
  updated_at: string;
  credential_assets?: CredentialAssetRow[];
}

const assetFromRow = (row: CredentialAssetRow): CredentialAsset => ({
  id: row.id,
  credentialId: row.credential_id,
  documentKind: row.document_kind,
  name: row.name,
  storagePath: row.storage_path,
  originalFilename: row.original_filename,
  mimeType: row.mime_type,
  fileSize: Number(row.file_size),
  displayOrder: row.display_order,
  createdAt: row.created_at,
  showInPortfolio: row.show_in_portfolio === true && row.mime_type !== "application/pdf",
  previewRotation: ([0, 1, 2, 3].includes(Number(row.preview_rotation)) ? Number(row.preview_rotation) : 0) as CredentialAsset["previewRotation"],
  previewProfile: row.preview_profile === "portrait" ? "portrait" : "landscape",
  crops: (row.credential_media_crops ?? []).map((crop) => ({
    id: crop.id,
    profile: crop.profile,
    storagePath: crop.storage_path,
    publicUrl: supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(crop.storage_path).data.publicUrl,
    cropX: Number(crop.crop_x),
    cropY: Number(crop.crop_y),
    cropWidth: Number(crop.crop_width),
    cropHeight: Number(crop.crop_height),
    width: crop.width,
    height: crop.height,
  })),
});

/** The preview a credential prints: its shown image evidence, in the chosen orientation, once that crop is saved. */
export const credentialPreview = (credential: ProfessionalCredential): CredentialPreview | undefined => {
  const asset = credential.assets.find((item) => item.showInPortfolio);
  const crop = asset?.crops.find((item) => item.profile === asset.previewProfile);
  return crop ? { profile: crop.profile, storagePath: crop.storagePath, publicUrl: crop.publicUrl, width: crop.width, height: crop.height } : undefined;
};

const credentialFromRow = (row: CredentialRow): ProfessionalCredential => ({
  id: row.id,
  kind: row.kind,
  relatedType: row.related_type,
  relatedId: row.related_id,
  title: row.title ?? { en: "", vi: "" },
  issuer: row.issuer ?? { en: "", vi: "" },
  description: row.description ?? { en: "", vi: "" },
  issuedOn: row.issued_on,
  expiresOn: row.expires_on,
  doesNotExpire: row.does_not_expire,
  credentialNumber: row.credential_number ?? "",
  verificationUrl: row.verification_url ?? "",
  status: row.status,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  assets: (row.credential_assets ?? []).sort((left, right) => left.display_order - right.display_order).map(assetFromRow),
});

export const credentialSnapshot = (credential: ProfessionalCredential): CredentialSnapshot => ({
  id: credential.id,
  kind: credential.kind,
  relatedType: credential.relatedType,
  relatedId: credential.relatedId,
  title: structuredClone(credential.title),
  issuer: structuredClone(credential.issuer),
  description: structuredClone(credential.description),
  issuedOn: credential.issuedOn,
  expiresOn: credential.expiresOn,
  doesNotExpire: credential.doesNotExpire,
  credentialNumber: credential.credentialNumber,
  verificationUrl: credential.verificationUrl,
  status: credential.status,
  displayOrder: credential.displayOrder,
  ...(credentialPreview(credential) ? { preview: credentialPreview(credential) } : {}),
});

const toRow = (input: ProfessionalCredentialInput) => ({
  kind: input.kind,
  related_type: input.relatedType,
  related_id: input.relatedId,
  title: input.title,
  issuer: input.issuer,
  description: input.description,
  issued_on: input.issuedOn || null,
  expires_on: input.doesNotExpire ? null : input.expiresOn || null,
  does_not_expire: input.doesNotExpire,
  credential_number: input.credentialNumber.trim() || null,
  verification_url: input.verificationUrl.trim() || null,
  status: input.status,
  display_order: input.displayOrder,
});

const selection = "*, credential_assets(*)";
// Preview crops join in once 202611010002 is applied; until then the library loads without them.
const selectionWithPreviews = "*, credential_assets(*, credential_media_crops(*))";
let previewsAvailable = true;

const credentialCache = new MemoryRequestCache<ProfessionalCredential[]>(30_000);

const fetchProfessionalCredentials = async (): Promise<ProfessionalCredential[]> => {
  const query = (columns: string) => supabase.from("professional_credentials").select(columns).order("display_order").order("created_at");
  let { data, error } = await query(previewsAvailable ? selectionWithPreviews : selection);
  if (error && previewsAvailable && /credential_media_crops|relationship/i.test(error.message)) {
    previewsAvailable = false;
    ({ data, error } = await query(selection));
  }
  if (error) throw error;
  return (data as unknown as CredentialRow[]).map(credentialFromRow);
};

export const listProfessionalCredentials = async (force = false): Promise<ProfessionalCredential[]> =>
  structuredClone(await credentialCache.get(fetchProfessionalCredentials, force));

export const reorderProfessionalCredentials = async (orderedIds: string[]): Promise<ProfessionalCredential[]> => {
  const { error } = await supabase.rpc("reorder_admin_content", { target_type: "credential", ordered_ids: orderedIds });
  if (error) throw error;
  credentialCache.invalidate();
  return listProfessionalCredentials(true);
};

export const createProfessionalCredential = async (input: ProfessionalCredentialInput): Promise<ProfessionalCredential> => {
  const { data, error } = await supabase
    .from("professional_credentials")
    .insert(toRow(input))
    .select(selection)
    .single();
  if (error) throw error;
  credentialCache.invalidate();
  return credentialFromRow(data as CredentialRow);
};

export const updateProfessionalCredential = async (id: string, input: ProfessionalCredentialInput): Promise<ProfessionalCredential> => {
  const { data, error } = await supabase
    .from("professional_credentials")
    .update(toRow(input))
    .eq("id", id)
    .select(selection)
    .single();
  if (error) throw error;
  credentialCache.invalidate();
  return credentialFromRow(data as CredentialRow);
};

export const archiveProfessionalCredential = async (id: string): Promise<void> => {
  const { error } = await supabase.from("professional_credentials").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
  credentialCache.invalidate();
};

/** Removes the private evidence files first, then the row (credential_assets rows cascade). */
export const deleteProfessionalCredential = async (credential: ProfessionalCredential): Promise<void> => {
  if (credential.assets.length) {
    const { error: storageError } = await supabase.storage
      .from(supabaseConfig.privateDocumentBucket)
      .remove(credential.assets.map((asset) => asset.storagePath));
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("professional_credentials").delete().eq("id", credential.id);
  if (error) throw error;
  await removePreviewCrops(credential.assets);
  credentialCache.invalidate();
};

const extensions: Record<CredentialAsset["mimeType"], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const uploadCredentialAsset = async (
  credentialId: string,
  file: File,
  documentKind: CredentialDocumentKind,
): Promise<CredentialAsset> => {
  const validationError = validateCredentialFile(file);
  if (validationError) throw new Error(validationError);
  const mimeType = file.type as CredentialAsset["mimeType"];
  const id = crypto.randomUUID();
  const storagePath = `credentials/${credentialId}/${id}.${extensions[mimeType]}`;
  const { error: uploadError } = await supabase.storage
    .from(supabaseConfig.privateDocumentBucket)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;
  const row = {
    id,
    credential_id: credentialId,
    document_kind: documentKind,
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 180) || "Credential document",
    storage_path: storagePath,
    original_filename: file.name.slice(0, 240),
    mime_type: mimeType,
    file_size: file.size,
    display_order: 100,
  };
  const { data, error } = await supabase.from("credential_assets").insert(row).select("*").single();
  if (error) {
    await supabase.storage.from(supabaseConfig.privateDocumentBucket).remove([storagePath]);
    throw error;
  }
  credentialCache.invalidate();
  return assetFromRow(data as CredentialAssetRow);
};

export const openCredentialAsset = async (asset: CredentialAsset): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(supabaseConfig.privateDocumentBucket)
    .createSignedUrl(asset.storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
};

export const deleteCredentialAsset = async (asset: CredentialAsset): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from(supabaseConfig.privateDocumentBucket)
    .remove([asset.storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("credential_assets").delete().eq("id", asset.id);
  if (error) throw error;
  await removePreviewCrops([asset]);
  credentialCache.invalidate();
};

/** The private evidence file, for the preview cropper only (never re-uploaded or modified). */
export const downloadCredentialAsset = async (asset: CredentialAsset): Promise<Blob> => {
  const { data, error } = await supabase.storage.from(supabaseConfig.privateDocumentBucket).download(asset.storagePath);
  if (error) throw error;
  return data;
};

/**
 * Saves how an evidence image is previewed: shown in the Portfolio or not (one file per credential), the orientation
 * printed, and the quarter turns applied before cropping. Turning one file on turns the other files of that credential off.
 */
export const saveCredentialPreviewSettings = async (
  asset: CredentialAsset,
  settings: { showInPortfolio: boolean; previewProfile: CredentialPreviewProfile; previewRotation: CredentialAsset["previewRotation"] },
): Promise<void> => {
  if (settings.showInPortfolio && asset.mimeType === "application/pdf") throw new Error("Only image evidence can be shown in the Portfolio.");
  if (settings.showInPortfolio) {
    const { error } = await supabase.from("credential_assets").update({ show_in_portfolio: false }).eq("credential_id", asset.credentialId).neq("id", asset.id);
    if (error) throw error;
  }
  const { error } = await supabase.from("credential_assets").update({
    show_in_portfolio: settings.showInPortfolio,
    preview_profile: settings.previewProfile,
    preview_rotation: settings.previewRotation,
  }).eq("id", asset.id);
  if (error) {
    if (/show_in_portfolio|preview_rotation|preview_profile/.test(error.message)) throw new Error("Apply the latest database migration before saving credential previews.");
    throw error;
  }
  credentialCache.invalidate();
};
