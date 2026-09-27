export type CvLanguage = "en";

export interface CvProjectSelection {
  projectId: string;
  responsibilityIds: readonly string[];
  showSummary: boolean;
}

export interface CvPageOneConfig {
  id: "page-1";
  layout: "sidebar-main";
  employmentIds: readonly string[];
  educationIds: readonly string[];
  skillGroupIds: readonly string[];
  languageIds: readonly string[];
  projectExperience: readonly CvProjectSelection[];
}

export interface CvPageTwoConfig {
  id: "page-2";
  layout: "main";
  projectExperience: readonly CvProjectSelection[];
  selectedProjectIds: readonly string[];
  automationToolIds: readonly string[];
}

export interface CvDocumentConfig {
  language: CvLanguage;
  version: string;
  themeId: string;
  pages: readonly [CvPageOneConfig, CvPageTwoConfig];
}
