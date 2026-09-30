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

export type CvProjectDisplay = "detailed" | "compact";

export interface CvContent {
  version: string;
  themeId: string;
  theme: StoredDocumentTheme;
  pageOneProjectCount: number;
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  skillGroups: SkillGroup[];
  languages: LanguageSkill[];
}

export interface CvRuntimeProject extends Project {
  cvOrder: number;
  cvDisplay: CvProjectDisplay;
  cvShowSummary: boolean;
  cvResponsibilityIds: string[];
}

export interface CvRuntimeTool extends AutomationTool {
  cvOrder: number;
}

export interface CvRuntimeData {
  content: CvContent;
  detailedProjects: CvRuntimeProject[];
  compactProjects: CvRuntimeProject[];
  tools: CvRuntimeTool[];
}
