import type { ContentPoint, LocalizedText, Profile, SkillGroup } from "./career";
import type { CredentialSnapshot } from "./credential";
import type { StoredDocumentTheme } from "./theme";

export type PublicationStatus = "draft" | "published" | "archived";
export type LegacyPortfolioLayout = "feature" | "standard" | "compact";
export type MediaCropProfile = "wide" | "landscape" | "portrait";
export type ProjectLayout =
  | "project.classic"
  | "project.balanced"
  | "project.editorial"
  | "project.technical"
  | "project.portrait"
  | "project.evidence"
  | LegacyPortfolioLayout;
export type PortfolioLayout = ProjectLayout;
export type CoverLayout = "cover.classic" | "cover.split-image" | "cover.horizontal";
export type ProfileLayout = "profile.classic" | "profile.portrait" | "profile.capability";
export type ProjectIndexLayout = "index.classic" | "index.visual" | "index.editorial";
export type AutomationLayout = "automation.classic" | "automation.workflow" | "automation.input-geometry";
export type CredentialsLayout = "credentials.dual" | "credentials.bands";
export type ClosingLayout = "closing.classic" | "closing.blue" | "closing.white";
export type CvProjectDisplay = "detailed" | "compact";

export interface PortfolioLayoutPreferences {
  configVersion: 2;
  cover: CoverLayout;
  profile: ProfileLayout;
  index: ProjectIndexLayout;
  projectDefault: Exclude<ProjectLayout, LegacyPortfolioLayout>;
  projectOverrides: Record<string, ProjectLayout>;
  automationDefault: AutomationLayout;
  automationOverrides: Record<string, AutomationLayout>;
  credentials: CredentialsLayout;
  credentialOverrides: Record<string, CredentialsLayout>;
  includeCredentials: boolean;
  closing: ClosingLayout;
}

export interface PortfolioMediaAssignment {
  primaryMediaId?: string;
  supportingMediaId?: string;
}

export interface PortfolioMediaAssignments {
  projects: Record<string, PortfolioMediaAssignment>;
  tools: Record<string, PortfolioMediaAssignment>;
  /** Cover (Split, Horizontal) and White closing image; empty uses the first selected project's primary visual. */
  feature?: PortfolioFeatureImage;
}

export interface PortfolioFeatureImage {
  projectId?: string;
  mediaId?: string;
}

export type PortfolioProjectText = "summary" | "story";

/** Figures printed on the Portrait profile; each counts selected Portfolio content. */
export type PortfolioProfileStat = "projects" | "tools" | "capabilities" | "credentials";

export interface PortfolioProfilePage {
  /** Skill groups shown as capability cards, in Professional Profile order; null = the first groups. */
  skillGroupIds: string[] | null;
  stats: [PortfolioProfileStat, PortfolioProfileStat];
}

export interface PortfolioCoverHighlight {
  kicker: LocalizedText;
  lines: LocalizedText[];
}

export interface PortfolioImageOverlay {
  enabled: boolean;
  opacity: number;
}

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
  /** Statement on the Split and Horizontal covers. */
  coverStatement: LocalizedText;
  /** Aside beside the image on the Horizontal cover. */
  coverHighlight: PortfolioCoverHighlight;
  /** Text in the footer of every page with chrome. */
  footerText: LocalizedText;
  /** One line for every Automation layout: Classic page title, Workflow and Input → Geometry subtitle. */
  automationStatement: LocalizedText;
  profilePage: PortfolioProfilePage;
  /** Responsibilities printed per project (Projects & tools); a project without an entry prints its first ones. */
  projectResponsibilities: Record<string, string[]>;
  /** What Technical and Editorial project pages print: the summary, or Challenge → Approach → Outcome. */
  projectText: PortfolioProjectText;
  theme: StoredDocumentTheme;
  imageOverlay: PortfolioImageOverlay;
  layouts: PortfolioLayoutPreferences;
  mediaAssignments: PortfolioMediaAssignments;
  profile: Profile;
  skillGroups: SkillGroup[];
}

export interface PortfolioCredential extends CredentialSnapshot {
  includeInPortfolio: boolean;
  portfolioOrder: number;
}

export interface PortfolioRuntimeData {
  content: PortfolioContent;
  projects: PortfolioProject[];
  tools: PortfolioTool[];
  credentials?: PortfolioCredential[];
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
  crops?: Partial<Record<MediaCropProfile | LegacyPortfolioLayout, PortfolioMediaCrop>>;
}

export interface PortfolioMediaCrop {
  id: string;
  profile: MediaCropProfile | LegacyPortfolioLayout;
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

/** A Portfolio project fact (Project › Key facts), e.g. "18 km" · "Bridge length". */
export interface PortfolioKeyFact {
  id: string;
  value: LocalizedText;
  label: LocalizedText;
}

/** A Workflow step of an automation tool (Tool › Workflow steps), printed before its Outcome. */
export interface PortfolioWorkflowStep {
  id: string;
  label: LocalizedText;
  text: LocalizedText;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  youtubeUrl?: string;
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
  keyFacts?: PortfolioKeyFact[];
  technologies: string[];
  images: PortfolioMedia[];
  featured: boolean;
  status: PublicationStatus;
  displayOrder: number;
  includeInPortfolio: boolean;
  portfolioOrder: number;
  portfolioLayout: ProjectLayout;
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
  youtubeUrl?: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  benefit?: LocalizedText;
  workflowSteps?: PortfolioWorkflowStep[];
  technologies: string[];
  images: PortfolioMedia[];
  featured: boolean;
  status: PublicationStatus;
  displayOrder: number;
  includeInPortfolio: boolean;
  portfolioOrder: number;
  portfolioLayout?: AutomationLayout;
  includeInCv: boolean;
  cvOrder: number;
}

export interface PortfolioRepository {
  listPublishedProjects(): Promise<PortfolioProject[]>;
  getPublishedProject(slug: string): Promise<PortfolioProject | null>;
  listPublishedTools(): Promise<PortfolioTool[]>;
  getPublishedTool(slug: string): Promise<PortfolioTool | null>;
}
