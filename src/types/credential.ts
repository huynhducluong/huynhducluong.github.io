import type { LocalizedText } from "./career";
import type { PublicationStatus } from "./portfolio";

export type CredentialKind = "professional_certification" | "academic_degree" | "language_exam" | "license" | "course" | "award" | "membership" | "other";
export type CredentialRelationType = "education" | "language";
export type CredentialDocumentKind = "certificate" | "diploma" | "transcript" | "score_report" | "supporting_document" | "other";

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
export type CredentialSnapshot = Omit<ProfessionalCredential, "assets" | "createdAt" | "updatedAt">;
