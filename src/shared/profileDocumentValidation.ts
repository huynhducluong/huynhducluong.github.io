import type { CvRuntimeData } from "../types/cvContent";
import type { PortfolioRuntimeData } from "../types/portfolio";
import type { ProfileDocumentKind } from "../types/profileDocument";

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
  return [
    !data.content.profile.name.en && "Add a full name in Professional Profile.",
    !data.content.profile.email && "Add an email address in Professional Profile.",
    !data.content.title && "Document title is required.",
    !data.projects.some((item) => item.includeInPortfolio) && "Select at least one Portfolio project.",
  ].filter((item): item is string => Boolean(item));
};
