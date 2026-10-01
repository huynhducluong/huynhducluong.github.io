import type { CvRuntimeData } from "./cvContent";
import type { DocumentReleaseSummary, PortfolioRuntimeData } from "./portfolio";

export type ProfileDocumentKind = "cv" | "portfolio";
export type ProfileDocumentStatus = "draft" | "published" | "archived";
export type ProfileDocumentPayload = CvRuntimeData | PortfolioRuntimeData;

export interface ProfileDocumentRecord<TPayload extends ProfileDocumentPayload = ProfileDocumentPayload> {
  id: string;
  kind: ProfileDocumentKind;
  internalTitle: string;
  status: ProfileDocumentStatus;
  isActive: boolean;
  draftPayload: TPayload | null;
  lastPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDocumentReleaseSummary extends DocumentReleaseSummary {
  documentId: string;
  isActive: boolean;
}
