import { supabaseConfig } from "../config/supabase";
import type { LocalizedText, ContentPoint } from "../types/career";
import type {
  PortfolioLayout,
  PortfolioMedia,
  PortfolioProject,
  PortfolioRepository,
  PortfolioTool,
  PublicationStatus,
} from "../types/portfolio";
import { supabase } from "./supabaseClient";

interface MediaRow {
  id: string;
  storage_path: string;
  alt: LocalizedText;
  caption: LocalizedText | null;
  kind: "cover" | "gallery";
  display_order: number;
}

interface ProjectRow {
  id: string;
  slug: string;
  name: LocalizedText;
  location: LocalizedText;
  role: LocalizedText | null;
  summary: LocalizedText | null;
  challenge: LocalizedText | null;
  approach: LocalizedText | null;
  outcome: LocalizedText | null;
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  responsibilities: ContentPoint[];
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  portfolio_layout: PortfolioLayout;
  created_at: string;
  updated_at: string;
  project_images?: MediaRow[];
}

interface ToolRow {
  id: string;
  slug: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  benefit: LocalizedText | null;
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  tool_images?: MediaRow[];
}

const toMedia = (row: MediaRow): PortfolioMedia => {
  const { data } = supabase.storage
    .from(supabaseConfig.storageBucket)
    .getPublicUrl(row.storage_path);
  return {
    id: row.id,
    storagePath: row.storage_path,
    publicUrl: data.publicUrl,
    alt: row.alt,
    caption: row.caption ?? undefined,
    kind: row.kind,
    displayOrder: row.display_order,
  };
};

export const projectFromRow = (row: ProjectRow): PortfolioProject => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  location: row.location,
  role: row.role ?? undefined,
  summary: row.summary ?? undefined,
  challenge: row.challenge ?? undefined,
  approach: row.approach ?? undefined,
  outcome: row.outcome ?? undefined,
  startDate: row.start_date ?? undefined,
  endDate: row.end_date,
  year: row.year ?? undefined,
  responsibilities: row.responsibilities ?? [],
  technologies: row.technologies ?? [],
  images: (row.project_images ?? []).sort((a, b) => a.display_order - b.display_order).map(toMedia),
  featured: row.featured,
  status: row.status,
  displayOrder: row.display_order,
  includeInPortfolio: row.include_in_portfolio,
  portfolioOrder: row.portfolio_order,
  portfolioLayout: row.portfolio_layout,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toolFromRow = (row: ToolRow): PortfolioTool => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  problem: row.problem,
  solution: row.solution,
  benefit: row.benefit ?? undefined,
  technologies: row.technologies ?? [],
  images: (row.tool_images ?? []).sort((a, b) => a.display_order - b.display_order).map(toMedia),
  featured: row.featured,
  status: row.status,
  displayOrder: row.display_order,
  includeInPortfolio: row.include_in_portfolio,
  portfolioOrder: row.portfolio_order,
});

const projectSelect = "*, project_images(*)";
const toolSelect = "*, tool_images(*)";

export const supabasePortfolioRepository: PortfolioRepository = {
  async listPublishedProjects(): Promise<PortfolioProject[]> {
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelect)
      .eq("status", "published")
      .order("display_order");
    if (error) throw error;
    return (data as ProjectRow[]).map(projectFromRow);
  },

  async getPublishedProject(slug: string): Promise<PortfolioProject | null> {
    if (!slug) return null;
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data ? projectFromRow(data as ProjectRow) : null;
  },

  async listPublishedTools(): Promise<PortfolioTool[]> {
    const { data, error } = await supabase
      .from("automation_tools")
      .select(toolSelect)
      .eq("status", "published")
      .order("display_order");
    if (error) throw error;
    return (data as ToolRow[]).map(toolFromRow);
  },

  async getPublishedTool(slug: string): Promise<PortfolioTool | null> {
    if (!slug) return null;
    const { data, error } = await supabase
      .from("automation_tools")
      .select(toolSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data ? toolFromRow(data as ToolRow) : null;
  },
};
