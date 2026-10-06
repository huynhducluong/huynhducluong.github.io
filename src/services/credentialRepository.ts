import { supabaseConfig } from "../config/supabase";
import type {
  CredentialAsset,
  CredentialDocumentKind,
  ProfessionalCredential,
  ProfessionalCredentialInput,
  CredentialSnapshot,
} from "../types/credential";
import { supabase } from "./supabaseClient";
import { validateCredentialFile } from "../shared/credentialValidation";

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
});

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

export const listProfessionalCredentials = async (): Promise<ProfessionalCredential[]> => {
  const { data, error } = await supabase
    .from("professional_credentials")
    .select(selection)
    .order("display_order")
    .order("created_at");
  if (error) throw error;
  return (data as CredentialRow[]).map(credentialFromRow);
};

export const createProfessionalCredential = async (input: ProfessionalCredentialInput): Promise<ProfessionalCredential> => {
  const { data, error } = await supabase
    .from("professional_credentials")
    .insert(toRow(input))
    .select(selection)
    .single();
  if (error) throw error;
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
  return credentialFromRow(data as CredentialRow);
};

export const archiveProfessionalCredential = async (id: string): Promise<void> => {
  const { error } = await supabase.from("professional_credentials").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
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
};
