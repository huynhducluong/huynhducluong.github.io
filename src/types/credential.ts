import type { LocalizedText } from "./career";
import type { PublicationStatus } from "./portfolio";

export type CredentialKind = "professional_certification" | "academic_degree" | "language_exam" | "license" | "course" | "award" | "membership" | "other";
export type CredentialRelationType = "education" | "language";
export type CredentialDocumentKind = "certificate" | "diploma" | "transcript" | "score_report" | "supporting_document" | "other";

/** Orientation a credential preview is printed in; both crops can exist, the Portfolio prints this one. */
export type CredentialPreviewProfile = "landscape" | "portrait";

/** A public crop of an image evidence file (credential_media_crops). */
export interface CredentialPreviewCrop {
  id: string;
  profile: CredentialPreviewProfile;
  storagePath: string;
  publicUrl: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  width: number;
  height: number;
}

/** The one preview a credential prints: only set when an image evidence file is shown in the Portfolio. */
export interface CredentialPreview {
  profile: CredentialPreviewProfile;
  storagePath: string;
  publicUrl: string;
  width: number;
  height: number;
}

export interface CredentialAsset {
  id: string;
  credentialId: string;
  documentKind: CredentialDocumentKind;
  name: string;
  storagePath: string;
  originalFilename: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
  displayOrder: number;
  createdAt: string;
  /** Explicit opt-in (default off): this image's crop is public in the Portfolio. */
  showInPortfolio: boolean;
  /** Quarter turns applied to the private original before cropping; the original is never rewritten. */
  previewRotation: 0 | 1 | 2 | 3;
  previewProfile: CredentialPreviewProfile;
  crops: CredentialPreviewCrop[];
}

export interface ProfessionalCredential {
  id: string;
  kind: CredentialKind;
  relatedType: CredentialRelationType | null;
  relatedId: string | null;
  title: LocalizedText;
  issuer: LocalizedText;
  description: LocalizedText;
  issuedOn: string | null;
  expiresOn: string | null;
  doesNotExpire: boolean;
  credentialNumber: string;
  verificationUrl: string;
  status: PublicationStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  assets: CredentialAsset[];
}

export type ProfessionalCredentialInput = Omit<ProfessionalCredential, "id" | "createdAt" | "updatedAt" | "assets">;
export type CredentialSnapshot = Omit<ProfessionalCredential, "assets" | "createdAt" | "updatedAt"> & {
  /** Public preview crop of the evidence shown in the Portfolio; absent means the page keeps its placeholder. */
  preview?: CredentialPreview;
};
