import type { CvRuntimeData } from "../types/cvContent";
import type { PortfolioRuntimeData } from "../types/portfolio";
import type {
  ProfileDocumentKind,
  ProfileDocumentPayload,
  ProfileDocumentRecord,
  ProfileDocumentReleaseSummary,
  ProfileDocumentStatus,
} from "../types/profileDocument";
import { supabase } from "./supabaseClient";

interface ProfileDocumentRow {
  id: string;
  kind: ProfileDocumentKind;
  internal_title: string;
  status: ProfileDocumentStatus;
  is_active: boolean;
  draft_payload: ProfileDocumentPayload | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
}

const fromRow = <TPayload extends ProfileDocumentPayload>(row: ProfileDocumentRow): ProfileDocumentRecord<TPayload> => ({
  id: row.id,
  kind: row.kind,
  internalTitle: row.internal_title,
  status: row.status,
  isActive: row.is_active,
  draftPayload: row.draft_payload as TPayload | null,
  lastPublishedAt: row.last_published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listProfileDocuments = async <TPayload extends ProfileDocumentPayload>(
  kind: ProfileDocumentKind,
): Promise<Array<ProfileDocumentRecord<TPayload>>> => {
  const { data, error } = await supabase
    .from("profile_documents")
    .select("*")
    .eq("kind", kind)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ProfileDocumentRow[]).map((row) => fromRow<TPayload>(row));
};

export const ensureProfileDocumentLibrary = async <TPayload extends ProfileDocumentPayload>(
  kind: ProfileDocumentKind,
  legacyPayload: TPayload,
): Promise<Array<ProfileDocumentRecord<TPayload>>> => {
  let documents = await listProfileDocuments<TPayload>(kind);
  if (!documents.length) {
    const { error } = await supabase.from("profile_documents").insert({
      kind,
      internal_title: kind === "cv" ? "General CV" : "General Portfolio",
      status: "draft",
      draft_payload: legacyPayload,
    });
    if (error) throw error;
    documents = await listProfileDocuments<TPayload>(kind);
  }

  const hasUninitializedDocuments = documents.some((item) => !item.draftPayload);
  if (hasUninitializedDocuments) {
    const { error } = await supabase
      .from("profile_documents")
      .update({ draft_payload: legacyPayload })
      .eq("kind", kind)
      .is("draft_payload", null);
    if (error) throw error;
    documents = await listProfileDocuments<TPayload>(kind);
  }
  return documents;
};

export const createProfileDocument = async <TPayload extends ProfileDocumentPayload>(
  kind: ProfileDocumentKind,
  internalTitle: string,
  payload: TPayload,
): Promise<ProfileDocumentRecord<TPayload>> => {
  const { data, error } = await supabase
    .from("profile_documents")
    .insert({
      kind,
      internal_title: internalTitle.trim(),
      status: "draft",
      is_active: false,
      draft_payload: payload,
    })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow<TPayload>(data as ProfileDocumentRow);
};

export const saveProfileDocument = async <TPayload extends ProfileDocumentPayload>(
  id: string,
  payload: TPayload,
): Promise<void> => {
  const { error } = await supabase
    .from("profile_documents")
    .update({ draft_payload: payload })
    .eq("id", id);
  if (error) throw error;
};

export const renameProfileDocument = async (id: string, internalTitle: string): Promise<void> => {
  const { error } = await supabase
    .from("profile_documents")
    .update({ internal_title: internalTitle.trim() })
    .eq("id", id);
  if (error) throw error;
};

export const archiveProfileDocument = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("profile_documents")
    .update({ status: "archived", is_active: false })
    .eq("id", id)
    .eq("is_active", false);
  if (error) throw error;
};

export const publishProfileDocument = async <TPayload extends ProfileDocumentPayload>(
  id: string,
  version: string,
  payload: TPayload,
): Promise<void> => {
  const { error } = await supabase.rpc("publish_profile_document", {
    p_document_id: id,
    p_version: version,
    p_payload: payload,
  });
  if (error) throw error;
};

export const listProfileDocumentReleases = async (documentId: string): Promise<ProfileDocumentReleaseSummary[]> => {
  const { data, error } = await supabase
    .from("profile_document_releases")
    .select("id,document_id,version,published_at,is_active")
    .eq("document_id", documentId)
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    version: String(row.version),
    publishedAt: String(row.published_at),
    isActive: Boolean(row.is_active),
  }));
};

export const loadActiveProfileDocumentRelease = async <TPayload extends ProfileDocumentPayload>(
  kind: ProfileDocumentKind,
): Promise<TPayload | null> => {
  const { data, error } = await supabase
    .from("profile_document_releases")
    .select("payload")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as TPayload | undefined) ?? null;
};

export type CvProfileDocument = ProfileDocumentRecord<CvRuntimeData>;
export type PortfolioProfileDocument = ProfileDocumentRecord<PortfolioRuntimeData>;
