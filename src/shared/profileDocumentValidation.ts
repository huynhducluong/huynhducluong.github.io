import type { CvRuntimeData } from "../types/cvContent";
import type { PortfolioRuntimeData } from "../types/portfolio";
import type { ProfileDocumentKind } from "../types/profileDocument";

export const validateProfileDocument = (
  kind: ProfileDocumentKind,
  runtime?: CvRuntimeData | PortfolioRuntimeData | null,
): string[] => {
  if (kind === "cv") {
    const data = runtime as CvRuntimeData | null | undefined;
    if (!data) return ["CV draft is not loaded."];
    return [
      !data.content.profile.name.en && "Add a full name in Professional Profile.",
      !data.content.profile.email && "Add an email address in Professional Profile.",
      !data.detailedProjects.length && "Select at least one detailed CV project.",
    ].filter((item): item is string => Boolean(item));
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
