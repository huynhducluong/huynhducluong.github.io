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

export interface WebsiteContent {
  version: string;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
  navigation: {
    expertise: LocalizedText;
    experience: LocalizedText;
    projects: LocalizedText;
    automation: LocalizedText;
  };
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
  sections: {
    expertise: boolean;
    experience: boolean;
    projects: boolean;
    automation: boolean;
    contact: boolean;
  };
}

export interface WebsiteRuntimeData {
  content: WebsiteContent;
  professional: ProfessionalProfileContent;
  projects: PortfolioProject[];
  tools: PortfolioTool[];
}
