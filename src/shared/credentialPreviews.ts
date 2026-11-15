import type { CredentialPreview, CredentialPreviewProfile, CredentialSnapshot } from "../types/credential";

type PreviewSource = Pick<CredentialSnapshot, "previews" | "preview">;

/** Every public crop of a credential's shown evidence; older releases carry only the single `preview` they printed. */
export const credentialPreviews = (snapshot: PreviewSource | undefined): Partial<Record<CredentialPreviewProfile, CredentialPreview>> => {
  if (snapshot?.previews && Object.values(snapshot.previews).some(Boolean)) return snapshot.previews;
  return snapshot?.preview ? { [snapshot.preview.profile]: snapshot.preview } : {};
};

/** The crop a frame of the wanted orientation prints; `exact` is false when only the other orientation exists. */
export const pickCredentialPreview = (
  snapshot: PreviewSource | undefined,
  wanted: CredentialPreviewProfile,
): { preview: CredentialPreview; exact: boolean } | undefined => {
  const previews = credentialPreviews(snapshot);
  const exact = previews[wanted];
  if (exact) return { preview: exact, exact: true };
  const other = previews[wanted === "landscape" ? "portrait" : "landscape"];
  return other ? { preview: other, exact: false } : undefined;
};
