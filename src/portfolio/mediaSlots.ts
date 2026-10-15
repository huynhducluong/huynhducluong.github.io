import type {
  AutomationLayout,
  MediaCropProfile,
  PortfolioMedia,
  PortfolioMediaAssignment,
  ProjectLayout,
} from "../types/portfolio";

export interface PortfolioMediaRequirement {
  primary?: MediaCropProfile;
  supporting?: MediaCropProfile;
  supportingRequired?: boolean;
}

const projectRequirements: Record<ProjectLayout, PortfolioMediaRequirement> = {
  "project.classic": { primary: "portrait" },
  "project.balanced": { primary: "wide" },
  "project.editorial": { primary: "landscape", supporting: "wide", supportingRequired: true },
  "project.technical": { primary: "wide", supporting: "wide", supportingRequired: true },
  "project.portrait": { primary: "portrait" },
  "project.evidence": { primary: "wide", supporting: "landscape", supportingRequired: true },
  feature: { primary: "portrait" },
  standard: { primary: "portrait" },
  compact: { primary: "portrait" },
};

const automationRequirements: Record<AutomationLayout, PortfolioMediaRequirement> = {
  "automation.classic": {},
  "automation.workflow": { primary: "wide" },
  "automation.input-geometry": { primary: "landscape", supporting: "wide", supportingRequired: true },
};

export const projectMediaRequirement = (layout: ProjectLayout): PortfolioMediaRequirement =>
  projectRequirements[layout];

export const automationMediaRequirement = (layout: AutomationLayout): PortfolioMediaRequirement =>
  automationRequirements[layout];

const coverMedia = (images: PortfolioMedia[]): PortfolioMedia | undefined =>
  images.find((image) => image.kind === "cover") ?? images[0];

const firstSupportingMedia = (images: PortfolioMedia[], primaryId?: string): PortfolioMedia | undefined =>
  images.find((image) => image.id !== primaryId && image.kind === "gallery")
  ?? images.find((image) => image.id !== primaryId);

export const resolvePortfolioMedia = (
  images: PortfolioMedia[],
  assignment?: PortfolioMediaAssignment,
): { primary?: PortfolioMedia; supporting?: PortfolioMedia } => {
  const primary = images.find((image) => image.id === assignment?.primaryMediaId) ?? coverMedia(images);
  const supporting = images.find((image) => image.id === assignment?.supportingMediaId && image.id !== primary?.id)
    ?? firstSupportingMedia(images, primary?.id);
  return { primary, supporting };
};

export const mediaRequirementLabel = (requirement: PortfolioMediaRequirement): string => {
  const profiles = [requirement.primary, requirement.supporting].filter(Boolean);
  if (!profiles.length) return "No image required";
  return `${profiles.length} ${profiles.length === 1 ? "image" : "images"} · ${profiles.map((profile) => `${profile![0].toUpperCase()}${profile!.slice(1)}`).join(" + ")}`;
};
