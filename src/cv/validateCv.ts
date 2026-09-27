import { automationTools } from "../data/tools";
import { education } from "../data/education";
import { experiences } from "../data/experience";
import { languageSkills } from "../data/languages";
import { projects } from "../data/projects";
import { skillGroups } from "../data/skills";
import { findDocumentTheme } from "../themes/documentThemes";
import type { CvDocumentConfig, CvProjectSelection } from "../types/documents";

const requireId = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  collectionName: string,
): T => {
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(
      "CV configuration references missing " + collectionName + ' ID "' + id + '".',
    );
  }

  return item;
};

const validateProjectSelection = (selection: CvProjectSelection): void => {
  const project = requireId(projects, selection.projectId, "project");

  for (const responsibilityId of selection.responsibilityIds) {
    requireId(project.responsibilities, responsibilityId, "responsibility");
  }
};

export const validateCvConfig = (config: CvDocumentConfig): void => {
  if (config.pages.length !== 2) {
    throw new Error("The CV must contain exactly two configured pages.");
  }

  if (!findDocumentTheme(config.themeId)) {
    throw new Error(
      'CV configuration references missing document theme ID "' +
        config.themeId +
        '".',
    );
  }

  const [pageOne, pageTwo] = config.pages;

  pageOne.employmentIds.forEach((id) => requireId(experiences, id, "experience"));
  pageOne.educationIds.forEach((id) => requireId(education, id, "education"));
  pageOne.skillGroupIds.forEach((id) => requireId(skillGroups, id, "skill group"));
  pageOne.languageIds.forEach((id) => requireId(languageSkills, id, "language"));
  pageOne.projectExperience.forEach(validateProjectSelection);
  pageTwo.projectExperience.forEach(validateProjectSelection);
  pageTwo.selectedProjectIds.forEach((id) => requireId(projects, id, "project"));
  pageTwo.automationToolIds.forEach((id) =>
    requireId(automationTools, id, "automation tool"),
  );
};

export const findRequired = requireId;
