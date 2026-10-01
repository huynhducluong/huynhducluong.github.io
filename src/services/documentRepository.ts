import { portfolioContentSeed } from "../data/portfolioSeed";
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

interface PortfolioContentRow {
  version: string;
  title: string;
  year: string;
  kicker: string;
  about_kicker: string;
  about_heading: string;
  closing_kicker: string;
  closing_heading: string;
  closing_text: string;
  theme: PortfolioContent["theme"];
  profile: PortfolioContent["profile"];
  skill_groups: PortfolioContent["skillGroups"];
}

const contentFromRow = (row: PortfolioContentRow): PortfolioContent => ({
  version: row.version,
  title: row.title,
  year: row.year,
  kicker: row.kicker,
  aboutKicker: row.about_kicker,
  aboutHeading: row.about_heading,
  closingKicker: row.closing_kicker,
  closingHeading: row.closing_heading,
  closingText: row.closing_text,
  theme: row.theme ?? { presetId: "personal-blue" },
  profile: row.profile,
  skillGroups: row.skill_groups ?? [],
});

export const loadPortfolioDraftData = async (): Promise<PortfolioRuntimeData> => {
  const [contentResult, projectResult, toolResult] = await Promise.all([
    supabase.from("portfolio_content").select("*").eq("id", "primary").maybeSingle(),
    supabase.from("projects").select("*, project_images(*)").is("deleted_at", null).order("portfolio_order"),
    supabase.from("automation_tools").select("*, tool_images(*)").is("deleted_at", null).order("portfolio_order"),
  ]);
  if (contentResult.error) throw contentResult.error;
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;

  return {
    content: contentResult.data
      ? contentFromRow(contentResult.data as PortfolioContentRow)
      : structuredClone(portfolioContentSeed),
    projects: (projectResult.data as ProjectRow[]).map(projectFromRow),
    tools: (toolResult.data as ToolRow[]).map(toolFromRow),
  };
};
export const loadPublishedPortfolioRelease = async (): Promise<PortfolioRuntimeData> => {
  try {
    const activeRelease = await loadActiveProfileDocumentRelease<PortfolioRuntimeData>("portfolio");
    if (activeRelease) return activeRelease;
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
  return data.payload as PortfolioRuntimeData;
};
