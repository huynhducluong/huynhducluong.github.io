export interface LocalizedText {
  en: string;
  vi: string;
}

export interface ContentPoint {
  id: string;
  text: LocalizedText;
}

export interface Profile {
  name: string;
  professionalTitle: LocalizedText;
  email: string;
  phone: string;
  location: LocalizedText;
  summary: LocalizedText;
  photoPath: string;
}

export interface Experience {
  id: string;
  company: string;
  position: LocalizedText;
  locationCode?: string;
  location: LocalizedText;
  startDate: string;
  endDate: string | null;
  responsibilities: ContentPoint[];
  technologies: string[];
}

export interface Project {
  id: string;
  name: LocalizedText;
  location: LocalizedText;
  role?: LocalizedText;
  summary?: LocalizedText;
  startDate?: string;
  endDate?: string | null;
  year?: number;
  responsibilities: ContentPoint[];
  technologies: string[];
  imagePaths: string[];
  featured: boolean;
  displayOrder: number;
}

export interface AutomationTool {
  id: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  technologies: string[];
  imagePaths: string[];
  featured: boolean;
}

export interface Education {
  id: string;
  field: LocalizedText;
  institution: LocalizedText;
  classification?: LocalizedText;
  startDate: string;
  endDate: string;
}

export interface LanguageSkill {
  id: string;
  name: LocalizedText;
  proficiency?: LocalizedText;
}

export interface SkillItem {
  id: string;
  label: LocalizedText;
}

export interface SkillGroup {
  id: string;
  title: LocalizedText;
  items: SkillItem[];
}
