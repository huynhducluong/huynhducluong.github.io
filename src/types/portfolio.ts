import type { ContentPoint, LocalizedText, Profile, SkillGroup } from "./career";
import type { StoredDocumentTheme } from "./theme";

export type PublicationStatus = "draft" | "published" | "archived";
export type PortfolioLayout = "feature" | "standard" | "compact";
export type CvProjectDisplay = "detailed" | "compact";

export interface PortfolioContent {
  version: string;
  title: string;
  year: string;
  kicker: LocalizedText;
  aboutKicker: LocalizedText;
  aboutHeading: LocalizedText;
  closingKicker: LocalizedText;
  closingHeading: LocalizedText;
  closingText: LocalizedText;
  theme: StoredDocumentTheme;
  profile: Profile;
  skillGroups: SkillGroup[];
}

export interface PortfolioRuntimeData {
  content: PortfolioContent;
  projects: PortfolioProject[];
  tools: PortfolioTool[];
}

export interface DocumentReleaseSummary {
  id: string;
  version: string;
  publishedAt: string;
}

export interface PortfolioMedia {
  id: string;
  storagePath: string;
  publicUrl?: string;
  alt: LocalizedText;
  caption?: LocalizedText;
  kind: "cover" | "gallery";
  displayOrder: number;
  crops?: Partial<Record<PortfolioLayout, PortfolioMediaCrop>>;
}

export interface PortfolioMediaCrop {
  id: string;
  layout: PortfolioLayout;
  storagePath: string;
  publicUrl?: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  name: LocalizedText;
  location: LocalizedText;
  role?: LocalizedText;
  summary?: LocalizedText;
  challenge?: LocalizedText;
  approach?: LocalizedText;
  outcome?: LocalizedText;
  startDate?: string;
  endDate?: string | null;
  isCurrent: boolean;
  year?: number;
  responsibilities: ContentPoint[];
  technologies: string[];
  images: PortfolioMedia[];
  featured: boolean;
  status: PublicationStatus;
  displayOrder: number;
  includeInPortfolio: boolean;
  portfolioOrder: number;
  portfolioLayout: PortfolioLayout;
  includeInCv: boolean;
  cvOrder: number;
  cvDisplay: CvProjectDisplay;
  cvShowSummary: boolean;
  cvResponsibilityIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioTool {
  id: string;
  slug: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  benefit?: LocalizedText;
  technologies: string[];
  images: PortfolioMedia[];
  featured: boolean;
  status: PublicationStatus;
  displayOrder: number;
  includeInPortfolio: boolean;
  portfolioOrder: number;
  includeInCv: boolean;
  cvOrder: number;
}

export interface PortfolioRepository {
  listPublishedProjects(): Promise<PortfolioProject[]>;
  getPublishedProject(slug: string): Promise<PortfolioProject | null>;
  listPublishedTools(): Promise<PortfolioTool[]>;
  getPublishedTool(slug: string): Promise<PortfolioTool | null>;
}
