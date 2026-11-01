import type { CvRuntimeData } from "../types/cvContent";
import type { PortfolioRuntimeData } from "../types/portfolio";
import type { ProfileDocumentKind } from "../types/profileDocument";
import {
  PORTFOLIO_PROFILE_CARD_GROUPS,
  PORTFOLIO_PROFILE_CARD_ITEMS,
  automationLayoutOptions,
  portfolioContributionLimit,
  profileLayoutOptions,
  projectLayoutOptions,
  resolveAutomationLayout,
  resolveProjectLayout,
} from "../portfolio/layouts";
import {
  automationMediaRequirement,
  projectMediaRequirement,
  resolvePortfolioMedia,
} from "../portfolio/mediaSlots";

const MAX_DETAILED_CV_PROJECTS = 7;
const MAX_COMPACT_CV_PROJECTS = 8;
const MAX_CV_TOOLS = 2;

const hasText = (value: string | null | undefined): boolean => Boolean(value?.trim());

export const validateProfileDocument = (
  kind: ProfileDocumentKind,
  runtime?: CvRuntimeData | PortfolioRuntimeData | null,
): string[] => {
  if (kind === "cv") {
    const data = runtime as CvRuntimeData | null | undefined;
    if (!data) return ["CV draft is not loaded."];
    const issues = [
      !hasText(data.content.profile.name.en) && "Add a full name in Professional Profile.",
      !hasText(data.content.profile.professionalTitle.en) && "Add an English professional title in Professional Profile.",
      !hasText(data.content.profile.summary.en) && "Add an English professional summary in Professional Profile.",
      !hasText(data.content.profile.email) && "Add an email address in Professional Profile.",
      !data.detailedProjects.length && "Select at least one detailed CV project.",
      data.detailedProjects.length > MAX_DETAILED_CV_PROJECTS && `Use no more than ${MAX_DETAILED_CV_PROJECTS} detailed CV projects for the fixed two-page layout.`,
      data.compactProjects.length > MAX_COMPACT_CV_PROJECTS && `Use no more than ${MAX_COMPACT_CV_PROJECTS} selected projects for the fixed two-page layout.`,
      data.tools.length > MAX_CV_TOOLS && `Use no more than ${MAX_CV_TOOLS} BIM automation tools for the fixed two-card layout.`,
      (!Number.isInteger(data.content.pageOneProjectCount) || data.content.pageOneProjectCount < 1 || data.content.pageOneProjectCount > 3)
        && "Page 1 must contain between 1 and 3 detailed projects.",
    ].filter((item): item is string => Boolean(item));

    data.detailedProjects.forEach((project, index) => {
      const label = project.name.en.trim() || `Detailed project ${index + 1}`;
      if (!hasText(project.name.en)) issues.push(`Add an English name for detailed project ${index + 1}.`);
      if (!hasText(project.role?.en)) issues.push(`Add an English role for "${label}".`);
      if (!hasText(project.startDate)) issues.push(`Add a start date for "${label}".`);
      if (project.cvShowSummary && !hasText(project.summary?.en)) issues.push(`Add an English summary for "${label}" or hide its summary.`);
      const responsibilityIds = new Set(project.responsibilities.map((item) => item.id));
      if (!project.cvResponsibilityIds.some((id) => responsibilityIds.has(id))) {
        issues.push(`Select at least one available responsibility for "${label}".`);
      }
    });

    data.compactProjects.forEach((project, index) => {
      if (!hasText(project.name.en)) issues.push(`Add an English name for selected project ${index + 1}.`);
    });

    data.tools.forEach((tool, index) => {
      const label = tool.name.trim() || `BIM automation tool ${index + 1}`;
      if (!hasText(tool.name)) issues.push(`Add a name for BIM automation tool ${index + 1}.`);
      if (!hasText(tool.solution.en)) issues.push(`Add an English solution for "${label}".`);
    });

    return issues;
  }

  const data = runtime as PortfolioRuntimeData | null | undefined;
  if (!data) return ["Portfolio draft is not loaded."];
  const issues = [
    !data.content.profile.name.en && "Add a full name in Professional Profile.",
    !data.content.profile.email && "Add an email address in Professional Profile.",
    !data.content.title && "Document title is required.",
    !data.projects.some((item) => item.includeInPortfolio) && "Select at least one Portfolio project.",
  ].filter((item): item is string => Boolean(item));

  data.projects.filter((item) => item.includeInPortfolio).forEach((project, index) => {
    const label = project.name.en.trim() || `Portfolio project ${index + 1}`;
    const requirement = projectMediaRequirement(resolveProjectLayout(data, project.id, project.portfolioLayout));
    const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]);
    if (requirement.primary && !media.primary) {
      issues.push(`Add a Primary visual for "${label}".`);
    }
    if (requirement.supportingRequired && !media.supporting) {
      issues.push(`Add a different Supporting visual for "${label}" because its layout uses two images.`);
    }
  });

  data.tools.filter((item) => item.includeInPortfolio).forEach((tool, index) => {
    const label = tool.name.trim() || `Portfolio tool ${index + 1}`;
    const requirement = automationMediaRequirement(resolveAutomationLayout(data, tool.id));
    const media = resolvePortfolioMedia(tool.images, data.content.mediaAssignments.tools[tool.id]);
    if (requirement.primary && !media.primary) {
      issues.push(`Add a Primary visual for "${label}".`);
    }
    if (requirement.supportingRequired && !media.supporting) {
      issues.push(`Add a different Supporting visual for "${label}" because its layout uses two images.`);
    }
  });

  return issues;
};

const layoutLabel = (options: readonly { id: string; label: string }[], id: string): string => options.find((option) => option.id === id)?.label ?? id;

/**
 * Recommendations never block publishing. They name everything the Portfolio leaves out, so the editor always
 * knows: lists a layout slices (docs/ui-guidelines.md §8.4) and blocks omitted because their content is empty.
 * The CV has none yet; the Pre-publish dialog shows the section for both documents.
 */
export const profileDocumentRecommendations = (
  kind: ProfileDocumentKind,
  runtime?: CvRuntimeData | PortfolioRuntimeData | null,
): string[] => {
  if (kind !== "portfolio" || !runtime) return [];
  const data = runtime as PortfolioRuntimeData;
  const notes: string[] = [];
  const profileLayout = data.content.layouts.profile;
  if (profileLayout !== "profile.classic") {
    const label = layoutLabel(profileLayoutOptions, profileLayout);
    const groups = data.content.skillGroups ?? [];
    if (groups.length > PORTFOLIO_PROFILE_CARD_GROUPS) notes.push(`Profile (${label}) prints the first ${PORTFOLIO_PROFILE_CARD_GROUPS} of ${groups.length} skill groups.`);
    groups.slice(0, PORTFOLIO_PROFILE_CARD_GROUPS).forEach((group) => {
      if (group.items.length > PORTFOLIO_PROFILE_CARD_ITEMS) notes.push(`Profile (${label}) prints the first ${PORTFOLIO_PROFILE_CARD_ITEMS} of ${group.items.length} items in "${group.title.en}".`);
    });
  }
  data.projects.filter((item) => item.includeInPortfolio).forEach((project, index) => {
    const name = project.name.en.trim() || `Portfolio project ${index + 1}`;
    const layout = resolveProjectLayout(data, project.id, project.portfolioLayout);
    const responsibilities = project.responsibilities.filter((point) => hasText(point.text.en));
    const limit = portfolioContributionLimit(layout);
    // One line per project: everything it is missing, then what that leaves out.
    const missing = [
      !hasText(project.summary?.en) && "summary",
      !hasText(project.location.en) && "location",
      !responsibilities.length && "responsibilities",
    ].filter((item): item is string => Boolean(item));
    if (missing.length) notes.push(`"${name}" is missing its ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0]}, so ${missing.length > 1 ? "they are" : "it is"} left out.`);
    if (responsibilities.length > limit) notes.push(`"${name}" (${layoutLabel(projectLayoutOptions, layout)}) prints the first ${limit} of ${responsibilities.length} responsibilities.`);
  });
  data.tools.filter((item) => item.includeInPortfolio).forEach((tool, index) => {
    const name = tool.name.trim() || `Portfolio tool ${index + 1}`;
    const layout = resolveAutomationLayout(data, tool.id);
    if (layout === "automation.workflow" && !hasText(tool.benefit?.en)) notes.push(`"${name}" has no benefit, so ${layoutLabel(automationLayoutOptions, layout)} prints no outcome.`);
  });
  return notes;
};
