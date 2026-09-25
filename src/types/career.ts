export interface LocalizedText {
    en: string;
    vi: string;
  }
  
  export interface Profile {
    name: string;
    professionalTitle: LocalizedText;
    email: string;
    phone: string;
    location: LocalizedText;
    summary: LocalizedText;
    coreSkills: string[];
  }
  
  export interface Experience {
    id: string;
    company: string;
    position: LocalizedText;
    location: LocalizedText;
    startDate: string;
    endDate: string | null;
    responsibilities: LocalizedText[];
    technologies: string[];
  }
  
  export interface Project {
    id: string;
    name: LocalizedText;
    location: LocalizedText;
    role: LocalizedText;
    summary: LocalizedText;
    responsibilities: LocalizedText[];
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