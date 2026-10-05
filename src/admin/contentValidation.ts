import type { LocalizedText } from "../types/career";
import type { PortfolioMedia, PortfolioProject, PortfolioTool } from "../types/portfolio";
import type { WebsiteRuntimeData } from "../types/website";

export interface ContentValidationResult {
  errors: string[];
  warnings: string[];
}

const hasText = (value: string | null | undefined): boolean => Boolean(value?.trim());
const missingTranslation = (value: LocalizedText | undefined, label: string): string[] => {
  if (!value || !hasText(value.en) || hasText(value.vi)) return [];
  return [`${label} is missing Vietnamese content.`];
};

const validateCover = (images: PortfolioMedia[], label: string): ContentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cover = images.find((image) => image.kind === "cover");
  if (!cover) {
    errors.push(`${label} needs a cover image.`);
    return { errors, warnings };
  }
  if (!hasText(cover.alt.en)) errors.push("The cover image needs English alt text.");
  if (!hasText(cover.alt.vi)) warnings.push("The cover image is missing Vietnamese alt text.");
  const galleryMissingEnglishAlt = images.filter((image) => image.kind === "gallery" && !hasText(image.alt.en)).length;
  const galleryMissingVietnameseAlt = images.filter((image) => image.kind === "gallery" && !hasText(image.alt.vi)).length;
  if (galleryMissingEnglishAlt) warnings.push(`${galleryMissingEnglishAlt} gallery image${galleryMissingEnglishAlt === 1 ? " is" : "s are"} missing English alt text.`);
  if (galleryMissingVietnameseAlt) warnings.push(`${galleryMissingVietnameseAlt} gallery image${galleryMissingVietnameseAlt === 1 ? " is" : "s are"} missing Vietnamese alt text.`);
  return { errors, warnings };
};

export const validateProjectReadiness = (project: PortfolioProject): ContentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!hasText(project.name.en)) errors.push("Project name (EN) is required.");
  if (!hasText(project.slug)) errors.push("Project slug is required.");
  if (!hasText(project.summary?.en)) errors.push("Project summary (EN) is required.");
  if (!hasText(project.challenge?.en)) errors.push("Project challenge (EN) is required.");
  if (!hasText(project.approach?.en)) errors.push("Project approach (EN) is required.");
  if (!hasText(project.outcome?.en)) errors.push("Project outcome (EN) is required.");
  if (!project.responsibilities.some((item) => hasText(item.text.en))) errors.push("Add at least one English responsibility.");
  if (!project.technologies.length) errors.push("Add at least one technology.");

  warnings.push(...missingTranslation(project.name, "Project name"));
  warnings.push(...missingTranslation(project.location, "Project location"));
  warnings.push(...missingTranslation(project.role, "Project role"));
  warnings.push(...missingTranslation(project.summary, "Project summary"));
  warnings.push(...missingTranslation(project.challenge, "Project challenge"));
  warnings.push(...missingTranslation(project.approach, "Project approach"));
  warnings.push(...missingTranslation(project.outcome, "Project outcome"));
  if (project.responsibilities.some((item) => hasText(item.text.en) && !hasText(item.text.vi))) {
    warnings.push("One or more responsibilities are missing Vietnamese content.");
  }
  const coverResult = validateCover(project.images, "Project");
  errors.push(...coverResult.errors);
  warnings.push(...coverResult.warnings);
  const cover = project.images.find((image) => image.kind === "cover");
  if (cover && Object.keys(cover.crops ?? {}).length < 3) warnings.push("Project cover crops are incomplete (recommended: 3/3).");
  return { errors, warnings };
};

export const validateToolReadiness = (tool: PortfolioTool): ContentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!hasText(tool.name)) errors.push("Tool name is required.");
  if (!hasText(tool.slug)) errors.push("Tool slug is required.");
  if (!hasText(tool.problem.en)) errors.push("Tool problem (EN) is required.");
  if (!hasText(tool.solution.en)) errors.push("Tool solution (EN) is required.");
  if (!hasText(tool.benefit?.en)) errors.push("Tool benefit (EN) is required.");
  if (!tool.technologies.length) errors.push("Add at least one technology.");
  warnings.push(...missingTranslation(tool.problem, "Tool problem"));
  warnings.push(...missingTranslation(tool.solution, "Tool solution"));
  warnings.push(...missingTranslation(tool.benefit, "Tool benefit"));
  const coverResult = validateCover(tool.images, "Tool");
  errors.push(...coverResult.errors);
  warnings.push(...coverResult.warnings);
  return { errors, warnings };
};

const requireLocalized = (value: LocalizedText, label: string, errors: string[]): void => {
  if (!hasText(value.en)) errors.push(`${label} (EN) is required.`);
  if (!hasText(value.vi)) errors.push(`${label} (VI) is required.`);
};

export const validateWebsitePublish = (runtime: WebsiteRuntimeData): ContentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { content, professional } = runtime;
  requireLocalized(content.seoTitle, "SEO title", errors);
  requireLocalized(content.seoDescription, "SEO description", errors);
  requireLocalized(content.heroEyebrow, "Hero eyebrow", errors);
  requireLocalized(content.focus, "Professional focus", errors);
  requireLocalized(content.specialization, "Specialization", errors);
  if (!hasText(professional.profile.name.en) || !hasText(professional.profile.name.vi)) errors.push("Professional Profile name is required.");
  if (!hasText(professional.profile.email)) errors.push("Professional Profile email is required.");

  const selectedProjects = runtime.projects.filter((item) => item.websiteVisible !== false);
  const selectedTools = runtime.tools.filter((item) => item.websiteVisible !== false);
  for (const project of selectedProjects) {
    const result = validateProjectReadiness(project);
    errors.push(...result.errors.map((issue) => `${project.name.en || "Untitled project"}: ${issue}`));
    warnings.push(...result.warnings.map((issue) => `${project.name.en || "Untitled project"}: ${issue}`));
    if (project.status !== "published") errors.push(`${project.name.en || "Untitled project"} is not Ready.`);
  }
  for (const tool of selectedTools) {
    const result = validateToolReadiness(tool);
    errors.push(...result.errors.map((issue) => `${tool.name || "Untitled tool"}: ${issue}`));
    warnings.push(...result.warnings.map((issue) => `${tool.name || "Untitled tool"}: ${issue}`));
    if (tool.status !== "published") errors.push(`${tool.name || "Untitled tool"} is not Ready.`);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
};
