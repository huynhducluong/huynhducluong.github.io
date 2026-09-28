import { profile } from "../data/profile";
import { documentThemes } from "../themes/documentThemes";
import type { CoverLetterInput, CoverLetterSenderSnapshot } from "../types/coverLetter";

export const coverLetterSenderDefaults: CoverLetterSenderSnapshot = {
  name: profile.name,
  professionalTitle: "BIM Coordinator - Infrastructure",
  email: profile.email,
  phone: profile.phone,
  location: "Ho Chi Minh City, Viet Nam",
  portfolioUrl: null,
};

const isoToday = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export const createCoverLetterDraft = (): CoverLetterInput => {
  const theme = documentThemes[0];

  return {
    internalTitle: "Untitled cover letter",
    companyName: "",
    positionTitle: "",
    recipientName: "",
    recipientTitle: "",
    companyAddress: "",
    applicationDate: isoToday(),
    salutation: "Dear Hiring Manager,",
    openingParagraph: "",
    fitParagraph: "",
    companyParagraph: "",
    closingParagraph: "",
    signOff: "Sincerely,",
    privateNotes: "",
    theme: {
      presetId: theme.id,
      primary: theme.tokens.primary,
      accent: theme.tokens.accent,
    },
    projectIds: [],
    toolIds: [],
  };
};
