import { portfolioContentSeed } from "../data/portfolioSeed";
import type {
  DocumentReleaseSummary,
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

const releaseSummary = (row: { id: string; version: string; published_at: string }): DocumentReleaseSummary => ({
  id: row.id,
  version: row.version,
  publishedAt: row.published_at,
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

export const savePortfolioContent = async (content: PortfolioContent): Promise<void> => {
  const { error } = await supabase.from("portfolio_content").upsert({
    id: "primary",
    version: content.version,
    title: content.title,
    year: content.year,
    kicker: content.kicker,
    about_kicker: content.aboutKicker,
    about_heading: content.aboutHeading,
    closing_kicker: content.closingKicker,
    closing_heading: content.closingHeading,
    closing_text: content.closingText,
    theme: content.theme,
    profile: content.profile,
    skill_groups: content.skillGroups,
  });
  if (error) throw error;
};

export const savePortfolioSelection = async (
  projects: PortfolioRuntimeData["projects"],
  tools: PortfolioRuntimeData["tools"],
): Promise<void> => {
  const projectResults = await Promise.all(projects.map((project) =>
    supabase.from("projects").update({
      include_in_portfolio: project.includeInPortfolio,
      portfolio_order: project.portfolioOrder,
      portfolio_layout: project.portfolioLayout,
    }).eq("id", project.id),
  ));
  const toolResults = await Promise.all(tools.map((tool) =>
    supabase.from("automation_tools").update({
      include_in_portfolio: tool.includeInPortfolio,
      portfolio_order: tool.portfolioOrder,
    }).eq("id", tool.id),
  ));
  const failed = [...projectResults, ...toolResults].find((result) => result.error);
  if (failed?.error) throw failed.error;
};

export const publishPortfolioRelease = async (): Promise<void> => {
  const runtime = await loadPortfolioDraftData();
  const payload: PortfolioRuntimeData = {
    content: runtime.content,
    projects: runtime.projects.filter((project) => project.includeInPortfolio),
    tools: runtime.tools.filter((tool) => tool.includeInPortfolio),
  };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in before publishing the Portfolio.");
  const { error } = await supabase.from("portfolio_releases").insert({
    version: payload.content.version,
    payload,
    published_by: authData.user.id,
  });
  if (error) throw error;
};

export const listDocumentReleases = async (
  table: "cv_releases" | "portfolio_releases",
): Promise<DocumentReleaseSummary[]> => {
  const { data, error } = await supabase
    .from(table)
    .select("id,version,published_at")
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map((row) => releaseSummary(row as { id: string; version: string; published_at: string }));
};
