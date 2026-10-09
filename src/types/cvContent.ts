import type {
  AutomationTool,
  Education,
  Experience,
  LanguageSkill,
  Profile,
  Project,
  SkillGroup,
} from "./career";
import type { StoredDocumentTheme } from "./theme";
import type { PublicationStatus } from "./portfolio";
import type { CredentialSnapshot } from "./credential";

export type CvProjectDisplay = "detailed" | "compact";

export type CvBackgroundGroup = "experiences" | "education" | "credentials" | "skillGroups" | "languages";

export interface CvBackgroundOrder {
  experienceIds: string[];
  educationIds: string[];
  credentialIds: string[];
  skillGroupIds: string[];
  languageIds: string[];
}

export interface CvBackgroundSelection {
  experienceIds: string[];
  educationIds: string[];
  credentialIds: string[];
  skillGroupIds: string[];
  languageIds: string[];
}

export interface CvContent {
  version: string;
  themeId: string;
  theme: StoredDocumentTheme;
  pageOneProjectCount: number;
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  credentials: CredentialSnapshot[];
  skillGroups: SkillGroup[];
  languages: LanguageSkill[];
  backgroundSelection?: CvBackgroundSelection;
  /** Retained for legacy published releases. New drafts use source order. */
  backgroundOrder?: CvBackgroundOrder;
}

export interface CvRuntimeProject extends Project {
  status?: PublicationStatus;
  includeInCv?: boolean;
  cvOrder: number;
  cvDisplay: CvProjectDisplay;
  cvShowSummary: boolean;
  cvResponsibilityIds: string[];
}

export interface CvRuntimeTool extends AutomationTool {
  status?: PublicationStatus;
  includeInCv?: boolean;
  cvOrder: number;
}

export interface CvRuntimeData {
  content: CvContent;
  detailedProjects: CvRuntimeProject[];
  compactProjects: CvRuntimeProject[];
  tools: CvRuntimeTool[];
  availableProjects?: CvRuntimeProject[];
  availableTools?: CvRuntimeTool[];
}
