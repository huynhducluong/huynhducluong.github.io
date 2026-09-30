import { englishCvConfig } from "../config/cv.en";
import { education } from "./education";
import { experiences } from "./experience";
import { languageSkills } from "./languages";
import { profile } from "./profile";
import { projects } from "./projects";
import { skillGroups } from "./skills";
import { automationTools } from "./tools";
import type { CvContent, CvRuntimeData, CvRuntimeProject } from "../types/cvContent";

const detailedSelections = [
  ...englishCvConfig.pages[0].projectExperience,
  ...englishCvConfig.pages[1].projectExperience,
];

const detailedById = new Map<string, { selection: (typeof detailedSelections)[number]; order: number }>(detailedSelections.map((selection, index) => [
  selection.projectId,
  { selection, order: index + 1 },
]));

const compactById = new Map<string, number>(englishCvConfig.pages[1].selectedProjectIds.map((id, index) => [id, index + 1]));

export const cvContentSeed: CvContent = {
  version: englishCvConfig.version,
  themeId: englishCvConfig.themeId,
  theme: { presetId: englishCvConfig.themeId },
  pageOneProjectCount: englishCvConfig.pages[0].projectExperience.length,
  profile,
  experiences,
  education,
  skillGroups,
  languages: languageSkills,
};

export const cvProjectSeed = projects.map((project): CvRuntimeProject | null => {
  const detailed = detailedById.get(project.id);
  const compactOrder = compactById.get(project.id);
  if (!detailed && compactOrder === undefined) return null;

  return {
    ...project,
    cvOrder: detailed?.order ?? compactOrder ?? 100,
    cvDisplay: detailed ? "detailed" : "compact",
    cvShowSummary: detailed?.selection.showSummary ?? false,
    cvResponsibilityIds: detailed ? [...detailed.selection.responsibilityIds] : [],
  };
}).filter((project): project is CvRuntimeProject => project !== null);

export const cvRuntimeSeed: CvRuntimeData = {
  content: cvContentSeed,
  detailedProjects: cvProjectSeed.filter((project) => project.cvDisplay === "detailed").sort((a, b) => a.cvOrder - b.cvOrder),
  compactProjects: cvProjectSeed.filter((project) => project.cvDisplay === "compact").sort((a, b) => a.cvOrder - b.cvOrder),
  tools: englishCvConfig.pages[1].automationToolIds.map((id, index) => {
    const tool = automationTools.find((item) => item.id === id);
    if (!tool) throw new Error(`Missing CV automation tool "${id}".`);
    return { ...tool, cvOrder: index + 1 };
  }),
};

export const cvProjectSeedSettings = new Map(cvProjectSeed.map((project) => [project.id, {
  include_in_cv: true,
  cv_order: project.cvOrder,
  cv_display: project.cvDisplay,
  cv_show_summary: project.cvShowSummary,
  cv_responsibility_ids: project.cvResponsibilityIds,
}]));

export const cvToolSeedSettings = new Map(cvRuntimeSeed.tools.map((tool) => [tool.id, {
  include_in_cv: true,
  cv_order: tool.cvOrder,
}]));
