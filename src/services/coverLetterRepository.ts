import { supabase } from "./supabaseClient";
import type {
  CoverLetterEvidenceOption,
  CoverLetterInput,
  CoverLetterRecord,
  CoverLetterSenderSnapshot,
  CoverLetterStatus,
} from "../types/coverLetter";

interface CoverLetterRow {
  id: string;
  internal_title: string;
  company_name: string;
  position_title: string;
  recipient_name: string;
  recipient_title: string;
  company_address: string;
  application_date: string;
  salutation: string;
  opening_paragraph: string;
  fit_paragraph: string;
  company_paragraph: string;
  closing_paragraph: string;
  sign_off: string;
  private_notes: string;
  status: CoverLetterStatus;
  theme_id: string;
  theme_primary: string;
  theme_accent: string;
  sender_snapshot: CoverLetterSenderSnapshot | null;
  template_version: string;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  cover_letter_projects?: Array<{ project_id: string; display_order: number }>;
  cover_letter_tools?: Array<{ tool_id: string; display_order: number }>;
}

const selection = "*, cover_letter_projects(project_id, display_order), cover_letter_tools(tool_id, display_order)";

const toRecord = (row: CoverLetterRow): CoverLetterRecord => ({
  id: row.id,
  internalTitle: row.internal_title,
  companyName: row.company_name,
  positionTitle: row.position_title,
  recipientName: row.recipient_name,
  recipientTitle: row.recipient_title,
  companyAddress: row.company_address,
  applicationDate: row.application_date,
  salutation: row.salutation,
  openingParagraph: row.opening_paragraph,
  fitParagraph: row.fit_paragraph,
  companyParagraph: row.company_paragraph,
  closingParagraph: row.closing_paragraph,
  signOff: row.sign_off,
  privateNotes: row.private_notes,
  status: row.status,
  theme: { presetId: row.theme_id, primary: row.theme_primary, accent: row.theme_accent },
  senderSnapshot: row.sender_snapshot,
  templateVersion: row.template_version,
  finalizedAt: row.finalized_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  projectIds: [...(row.cover_letter_projects ?? [])].sort((a, b) => a.display_order - b.display_order).map((item) => item.project_id),
  toolIds: [...(row.cover_letter_tools ?? [])].sort((a, b) => a.display_order - b.display_order).map((item) => item.tool_id),
});

const toRow = (input: CoverLetterInput) => ({
  internal_title: input.internalTitle.trim(),
  company_name: input.companyName.trim(),
  position_title: input.positionTitle.trim(),
  recipient_name: input.recipientName.trim(),
  recipient_title: input.recipientTitle.trim(),
  company_address: input.companyAddress.trim(),
  application_date: input.applicationDate,
  salutation: input.salutation.trim(),
  opening_paragraph: input.openingParagraph.trim(),
  fit_paragraph: input.fitParagraph.trim(),
  company_paragraph: input.companyParagraph.trim(),
  closing_paragraph: input.closingParagraph.trim(),
  sign_off: input.signOff.trim(),
  private_notes: input.privateNotes.trim(),
  theme_id: input.theme.presetId,
  theme_primary: input.theme.primary,
  theme_accent: input.theme.accent,
});

const syncEvidence = async (letterId: string, input: CoverLetterInput): Promise<void> => {
  const projectDelete = await supabase.from("cover_letter_projects").delete().eq("cover_letter_id", letterId);
  if (projectDelete.error) throw projectDelete.error;
  const toolDelete = await supabase.from("cover_letter_tools").delete().eq("cover_letter_id", letterId);
  if (toolDelete.error) throw toolDelete.error;
  if (input.projectIds.length) {
    const result = await supabase.from("cover_letter_projects").insert(input.projectIds.map((projectId, displayOrder) => ({ cover_letter_id: letterId, project_id: projectId, display_order: displayOrder })));
    if (result.error) throw result.error;
  }
  if (input.toolIds.length) {
    const result = await supabase.from("cover_letter_tools").insert(input.toolIds.map((toolId, displayOrder) => ({ cover_letter_id: letterId, tool_id: toolId, display_order: displayOrder })));
    if (result.error) throw result.error;
  }
};

export const listCoverLetters = async (): Promise<CoverLetterRecord[]> => {
  const { data, error } = await supabase.from("cover_letters").select(selection).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as CoverLetterRow[]).map(toRecord);
};

export const getCoverLetter = async (id: string): Promise<CoverLetterRecord | null> => {
  const { data, error } = await supabase.from("cover_letters").select(selection).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as CoverLetterRow) : null;
};

export const createCoverLetter = async (input: CoverLetterInput): Promise<CoverLetterRecord> => {
  const { data, error } = await supabase.from("cover_letters").insert(toRow(input)).select("id").single();
  if (error) throw error;
  const id = String(data.id);
  try {
    await syncEvidence(id, input);
  } catch (syncError) {
    await supabase.from("cover_letters").delete().eq("id", id);
    throw syncError;
  }
  const record = await getCoverLetter(id);
  if (!record) throw new Error("The cover letter was created but could not be reloaded.");
  return record;
};

export const updateCoverLetterDraft = async (id: string, input: CoverLetterInput): Promise<CoverLetterRecord> => {
  const { error } = await supabase.from("cover_letters").update(toRow(input)).eq("id", id).eq("status", "draft");
  if (error) throw error;
  await syncEvidence(id, input);
  const record = await getCoverLetter(id);
  if (!record) throw new Error("The cover letter could not be reloaded.");
  return record;
};

export const finalizeCoverLetter = async (id: string, input: CoverLetterInput, sender: CoverLetterSenderSnapshot): Promise<CoverLetterRecord> => {
  const saved = await updateCoverLetterDraft(id, input);
  const { error } = await supabase.from("cover_letters").update({ status: "final", sender_snapshot: sender, finalized_at: new Date().toISOString() }).eq("id", saved.id).eq("status", "draft");
  if (error) throw error;
  const record = await getCoverLetter(id);
  if (!record) throw new Error("The finalized cover letter could not be reloaded.");
  return record;
};

export const archiveCoverLetter = async (id: string): Promise<void> => {
  const { error } = await supabase.from("cover_letters").update({ status: "archived" }).eq("id", id).eq("status", "final");
  if (error) throw error;
};

export const deleteCoverLetterDraft = async (id: string): Promise<void> => {
  const { error } = await supabase.from("cover_letters").delete().eq("id", id).eq("status", "draft");
  if (error) throw error;
};

export const duplicateCoverLetter = async (record: CoverLetterRecord): Promise<CoverLetterRecord> =>
  createCoverLetter({ ...record, internalTitle: record.internalTitle + " (Copy)" });

export const listCoverLetterEvidence = async (): Promise<{ projects: CoverLetterEvidenceOption[]; tools: CoverLetterEvidenceOption[] }> => {
  const [projectResult, toolResult] = await Promise.all([
    supabase.from("projects").select("id, name, status").is("deleted_at", null).order("display_order"),
    supabase.from("automation_tools").select("id, name, status").is("deleted_at", null).order("display_order"),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  return {
    projects: (projectResult.data ?? []).map((item) => ({ id: String(item.id), name: String((item.name as { en?: string }).en ?? "Untitled project"), status: String(item.status) })),
    tools: (toolResult.data ?? []).map((item) => ({ id: String(item.id), name: String(item.name), status: String(item.status) })),
  };
};
