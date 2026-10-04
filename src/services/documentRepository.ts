import { portfolioContentSeed } from "../data/portfolioSeed";
import type { LocalizedText } from "../types/career";
import type {
  PortfolioContent,
  PortfolioRuntimeData,
} from "../types/portfolio";
import { supabase } from "./supabaseClient";
import {
  projectFromRow,
  toolFromRow,
  type ProjectRow,
  type ToolRow,
} from "./supabasePortfolioRepository";
import { loadActiveProfileDocumentRelease } from "./profileDocumentRepository";
import { withoutTrashed } from "./activeContent";

interface PortfolioContentRow {
  version: string;
  title: string;
  year: string;
  kicker: LocalizedText | string;
  about_kicker: LocalizedText | string;
  about_heading: LocalizedText | string;
  closing_kicker: LocalizedText | string;
  closing_heading: LocalizedText | string;
  closing_text: LocalizedText | string;
  theme: PortfolioContent["theme"];
  profile: PortfolioContent["profile"];
  skill_groups: PortfolioContent["skillGroups"];
}

const localized = (value: LocalizedText | string | null | undefined, fallback: LocalizedText): LocalizedText => {
  if (typeof value === "string") return { en: value, vi: "" };
  return value
    ? { en: String(value.en ?? ""), vi: String(value.vi ?? "") }
    : structuredClone(fallback);
};

export const normalizePortfolioContent = (content: PortfolioContent): PortfolioContent => ({
  ...content,
  kicker: localized(content.kicker as LocalizedText | string, portfolioContentSeed.kicker),
  aboutKicker: localized(content.aboutKicker as LocalizedText | string, portfolioContentSeed.aboutKicker),
  aboutHeading: localized(content.aboutHeading as LocalizedText | string, portfolioContentSeed.aboutHeading),
  closingKicker: localized(content.closingKicker as LocalizedText | string, portfolioContentSeed.closingKicker),
  closingHeading: localized(content.closingHeading as LocalizedText | string, portfolioContentSeed.closingHeading),
  closingText: localized(content.closingText as LocalizedText | string, portfolioContentSeed.closingText),
});

export const normalizePortfolioRuntimeData = (runtime: PortfolioRuntimeData): PortfolioRuntimeData => ({
  ...runtime,
  content: normalizePortfolioContent(runtime.content),
});

const contentFromRow = (row: PortfolioContentRow): PortfolioContent => normalizePortfolioContent({
  version: row.version,
  title: row.title,
  year: row.year,
  kicker: localized(row.kicker, portfolioContentSeed.kicker),
  aboutKicker: localized(row.about_kicker, portfolioContentSeed.aboutKicker),
  aboutHeading: localized(row.about_heading, portfolioContentSeed.aboutHeading),
  closingKicker: localized(row.closing_kicker, portfolioContentSeed.closingKicker),
  closingHeading: localized(row.closing_heading, portfolioContentSeed.closingHeading),
  closingText: localized(row.closing_text, portfolioContentSeed.closingText),
  theme: row.theme ?? { presetId: "personal-blue" },
  profile: row.profile,
  skillGroups: row.skill_groups ?? [],
});

export const loadPortfolioDraftData = async (): Promise<PortfolioRuntimeData> => {
  const [contentResult, projectResult, toolResult] = await Promise.all([
    supabase.from("portfolio_content").select("*").eq("id", "primary").maybeSingle(),
    supabase.from("projects").select("*, project_images(*, project_image_crops(*))").is("deleted_at", null).order("portfolio_order"),
    supabase.from("automation_tools").select("*, tool_images(*)").is("deleted_at", null).order("portfolio_order"),
  ]);
  if (contentResult.error) throw contentResult.error;
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;

  return {
    content: contentResult.data
      ? contentFromRow(contentResult.data as PortfolioContentRow)
      : structuredClone(portfolioContentSeed),
    projects: withoutTrashed(projectResult.data as ProjectRow[]).map(projectFromRow),
    tools: withoutTrashed(toolResult.data as ToolRow[]).map(toolFromRow),
  };
};
export const loadPublishedPortfolioRelease = async (): Promise<PortfolioRuntimeData> => {
  try {
    const activeRelease = await loadActiveProfileDocumentRelease<PortfolioRuntimeData>("portfolio");
    if (activeRelease) return normalizePortfolioRuntimeData(activeRelease);
  } catch {
    // Fall through to the legacy release table until the library migration is applied.
  }
  const { data, error } = await supabase
    .from("portfolio_releases")
    .select("payload")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) throw new Error("No published Portfolio release is available.");
  return normalizePortfolioRuntimeData(data.payload as PortfolioRuntimeData);
};
