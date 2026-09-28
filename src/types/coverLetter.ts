export type CoverLetterStatus = "draft" | "final" | "archived";

export interface CoverLetterSenderSnapshot {
  name: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  portfolioUrl: string | null;
}

export interface CoverLetterThemeSnapshot {
  presetId: string;
  primary: string;
  accent: string;
}

export interface CoverLetterInput {
  internalTitle: string;
  companyName: string;
  positionTitle: string;
  recipientName: string;
  recipientTitle: string;
  companyAddress: string;
  applicationDate: string;
  salutation: string;
  openingParagraph: string;
  fitParagraph: string;
  companyParagraph: string;
  closingParagraph: string;
  signOff: string;
  privateNotes: string;
  theme: CoverLetterThemeSnapshot;
  projectIds: string[];
  toolIds: string[];
}

export interface CoverLetterRecord extends CoverLetterInput {
  id: string;
  status: CoverLetterStatus;
  senderSnapshot: CoverLetterSenderSnapshot | null;
  templateVersion: string;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterEvidenceOption {
  id: string;
  name: string;
  status: string;
}
