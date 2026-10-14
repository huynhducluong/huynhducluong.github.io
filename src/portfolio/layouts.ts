import type {
  AutomationLayout,
  ClosingLayout,
  CoverLayout,
  CredentialsLayout,
  PortfolioLayoutPreferences,
  PortfolioRuntimeData,
  ProfileLayout,
  ProjectIndexLayout,
  ProjectLayout,
} from "../types/portfolio";

export interface PortfolioLayoutOption<T extends string> {
  id: T;
  label: string;
  description: string;
  preview: string;
}

export const coverLayoutOptions: readonly PortfolioLayoutOption<CoverLayout>[] = [
  { id: "cover.classic", label: "Classic Minimal", description: "Bold color cover that works without an image.", preview: "classic" },
  { id: "cover.split-image", label: "Split Image", description: "Identity-led cover with a tall project image.", preview: "split" },
  { id: "cover.horizontal", label: "Horizontal Editorial", description: "Wide project image with an editorial introduction.", preview: "horizontal" },
];

export const profileLayoutOptions: readonly PortfolioLayoutOption<ProfileLayout>[] = [
  { id: "profile.classic", label: "Classic Split", description: "Compact profile with a strong colored rail.", preview: "classic" },
  { id: "profile.portrait", label: "Portrait Profile", description: "Large portrait, profile statement and capability cards.", preview: "portrait" },
  { id: "profile.capability", label: "Capability Profile", description: "Capability-led profile with a contact sidebar.", preview: "capability" },
];

export const indexLayoutOptions: readonly PortfolioLayoutOption<ProjectIndexLayout>[] = [
  { id: "index.classic", label: "Classic List", description: "Reliable two-column project list.", preview: "classic" },
  { id: "index.visual", label: "Visual Grid", description: "Image-led grid for up to eight selected projects.", preview: "visual" },
  { id: "index.editorial", label: "Editorial Index", description: "Numbered list that handles long titles well.", preview: "editorial" },
];

export const projectLayoutOptions: readonly PortfolioLayoutOption<Exclude<ProjectLayout, "feature" | "standard" | "compact">>[] = [
  { id: "project.classic", label: "Classic", description: "The reliable original image-and-content layout.", preview: "classic" },
  { id: "project.balanced", label: "Balanced", description: "Hero image, project facts and contribution summary.", preview: "balanced" },
  { id: "project.editorial", label: "Editorial", description: "Large editorial image with a supporting detail crop.", preview: "editorial" },
  { id: "project.technical", label: "Technical", description: "Engineering-led layout with a strong information rail.", preview: "technical" },
  { id: "project.portrait", label: "Portrait", description: "Best for tall bridge, tower or vertical model imagery.", preview: "portrait" },
  { id: "project.evidence", label: "Evidence", description: "Two visuals and three clearly separated contributions.", preview: "evidence" },
];

export const automationLayoutOptions: readonly PortfolioLayoutOption<AutomationLayout>[] = [
  { id: "automation.classic", label: "Classic Overview", description: "Multiple selected tools summarized on one page.", preview: "classic" },
  { id: "automation.workflow", label: "Workflow", description: "A step-by-step case study page for each tool.", preview: "workflow" },
  { id: "automation.input-geometry", label: "Input to Geometry", description: "Input-led technical explanation with a concept diagram.", preview: "geometry" },
];

export const credentialsLayoutOptions: readonly PortfolioLayoutOption<CredentialsLayout>[] = [
  { id: "credentials.dual", label: "Dual Documents", description: "Two equal document frames with concise metadata.", preview: "dual" },
  { id: "credentials.bands", label: "Document Bands", description: "Flexible horizontal bands for mixed document formats.", preview: "bands" },
];

export const closingLayoutOptions: readonly PortfolioLayoutOption<ClosingLayout>[] = [
  { id: "closing.classic", label: "Classic Centered", description: "Minimal centered closing page.", preview: "classic" },
  { id: "closing.blue", label: "Blue Closing", description: "High-impact brand closing without an image dependency.", preview: "blue" },
  { id: "closing.white", label: "White Closing", description: "Editorial closing with contact panel and project image.", preview: "white" },
];

export const modernPortfolioLayouts: PortfolioLayoutPreferences = {
  configVersion: 2,
  cover: "cover.horizontal",
  profile: "profile.capability",
  index: "index.visual",
  projectDefault: "project.balanced",
  projectOverrides: {},
  automationDefault: "automation.workflow",
  automationOverrides: {},
  credentials: "credentials.bands",
  includeCredentials: false,
  closing: "closing.blue",
};

export const legacyPortfolioLayouts: PortfolioLayoutPreferences = {
  ...modernPortfolioLayouts,
  cover: "cover.classic",
  profile: "profile.classic",
  index: "index.classic",
  projectDefault: "project.classic",
  automationDefault: "automation.classic",
  closing: "closing.classic",
};

const isOption = <T extends string>(value: unknown, options: readonly PortfolioLayoutOption<T>[]): value is T =>
  typeof value === "string" && options.some((option) => option.id === value);

const isProjectLayout = (value: unknown): value is ProjectLayout =>
  value === "feature" || value === "standard" || value === "compact" || isOption(value, projectLayoutOptions);

export const normalizePortfolioLayouts = (
  value: Partial<PortfolioLayoutPreferences> | null | undefined,
  fallback: PortfolioLayoutPreferences = legacyPortfolioLayouts,
): PortfolioLayoutPreferences => ({
  configVersion: 2,
  cover: isOption(value?.cover, coverLayoutOptions) ? value.cover : fallback.cover,
  profile: isOption(value?.profile, profileLayoutOptions) ? value.profile : fallback.profile,
  index: isOption(value?.index, indexLayoutOptions) ? value.index : fallback.index,
  projectDefault: isOption(value?.projectDefault, projectLayoutOptions) ? value.projectDefault : fallback.projectDefault,
  projectOverrides: Object.fromEntries(Object.entries(value?.projectOverrides ?? {}).filter((entry): entry is [string, ProjectLayout] => isProjectLayout(entry[1]))),
  automationDefault: isOption(value?.automationDefault, automationLayoutOptions) ? value.automationDefault : fallback.automationDefault,
  automationOverrides: Object.fromEntries(Object.entries(value?.automationOverrides ?? {}).filter((entry): entry is [string, AutomationLayout] => isOption(entry[1], automationLayoutOptions))),
  credentials: isOption(value?.credentials, credentialsLayoutOptions) ? value.credentials : fallback.credentials,
  includeCredentials: value?.includeCredentials ?? fallback.includeCredentials,
  closing: isOption(value?.closing, closingLayoutOptions) ? value.closing : fallback.closing,
});

export const resolveProjectLayout = (data: PortfolioRuntimeData, projectId: string, _legacy?: ProjectLayout): ProjectLayout =>
  data.content.layouts.projectOverrides[projectId] ?? data.content.layouts.projectDefault;

export const resolveAutomationLayout = (data: PortfolioRuntimeData, toolId: string): AutomationLayout =>
  data.content.layouts.automationOverrides[toolId] ?? data.content.layouts.automationDefault;

export const portfolioPageCount = (data: PortfolioRuntimeData): number => {
  const selectedTools = data.tools.filter((tool) => tool.includeInPortfolio);
  const toolLayouts = selectedTools.map((tool) => resolveAutomationLayout(data, tool.id));
  const automationPages = (toolLayouts.includes("automation.classic") ? 1 : 0)
    + toolLayouts.filter((layout) => layout !== "automation.classic").length;
  return 4
    + data.projects.filter((project) => project.includeInPortfolio).length
    + automationPages
    + (data.content.layouts.includeCredentials ? 1 : 0);
};
