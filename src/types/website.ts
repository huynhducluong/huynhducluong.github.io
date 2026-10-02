import type { Education, Experience, LanguageSkill, LocalizedText, Profile, SkillGroup } from "./career";
import type { PortfolioProject, PortfolioTool } from "./portfolio";
import type { StoredDocumentTheme } from "./theme";

export interface ProfessionalProfileContent {
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  skillGroups: SkillGroup[];
  languages: LanguageSkill[];
}

export interface WebsiteContentSelection {
  projectIds: string[];
  featuredProjectIds: string[];
  toolIds: string[];
  featuredToolIds: string[];
}

export interface WebsiteContent {
  version: string;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
  heroEyebrow: LocalizedText;
  focus: LocalizedText;
  specialization: LocalizedText;
  expertiseTitle: LocalizedText;
  experienceTitle: LocalizedText;
  projectsTitle: LocalizedText;
  automationTitle: LocalizedText;
  projectsPage: {
    kicker: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
  };
  toolsPage: {
    kicker: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
  };
  contactKicker: LocalizedText;
  contactTitle: LocalizedText;
  footerText: LocalizedText;
  theme: StoredDocumentTheme;
  contentSelection: WebsiteContentSelection;
  sections: {
    expertise: boolean;
    experience: boolean;
    projects: boolean;
    automation: boolean;
    contact: boolean;
  };
}

export interface WebsiteRuntimeProject extends PortfolioProject {
  websiteVisible?: boolean;
}

export interface WebsiteRuntimeTool extends PortfolioTool {
  websiteVisible?: boolean;
}

export interface WebsiteRuntimeData {
  content: WebsiteContent;
  professional: ProfessionalProfileContent;
  projects: WebsiteRuntimeProject[];
  tools: WebsiteRuntimeTool[];
}
