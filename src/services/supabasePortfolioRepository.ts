import { supabaseConfig } from "../config/supabase";
import type { LocalizedText, ContentPoint } from "../types/career";
import type {
  PortfolioLayout,
  PortfolioMedia,
  PortfolioMediaCrop,
  PortfolioProject,
  PortfolioRepository,
  PortfolioTool,
  PublicationStatus,
} from "../types/portfolio";
import { supabase } from "./supabaseClient";
import { withoutTrashed } from "./activeContent";

interface MediaCropRow {
  id: string;
  layout: PortfolioLayout;
  storage_path: string;
  crop_x: number;
  crop_y: number;
  crop_width: number;
  crop_height: number;
  width: number;
  height: number;
  mime_type: string;
  file_size: number;
}

interface MediaRow {
  id: string;
  storage_path: string;
  alt: LocalizedText;
  caption: LocalizedText | null;
  kind: "cover" | "gallery";
  display_order: number;
  project_image_crops?: MediaCropRow[];
}

export interface ProjectRow {
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
  is_current: boolean;
  year: number | null;
  responsibilities: ContentPoint[];
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  portfolio_layout: PortfolioLayout;
  include_in_cv: boolean;
  cv_order: number;
  cv_display: "detailed" | "compact";
  cv_show_summary: boolean;
  cv_responsibility_ids: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  project_images?: MediaRow[];
}

export interface ToolRow {
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
  include_in_cv: boolean;
  cv_order: number;
  deleted_at?: string | null;
  tool_images?: MediaRow[];
}

const toMedia = (row: MediaRow): PortfolioMedia => {
  const { data } = supabase.storage
    .from(supabaseConfig.storageBucket)
    .getPublicUrl(row.storage_path);
  const crops = Object.fromEntries((row.project_image_crops ?? []).map((crop): [PortfolioLayout, PortfolioMediaCrop] => {
    const cropUrl = supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(crop.storage_path).data.publicUrl;
    return [crop.layout, {
      id: crop.id,
      layout: crop.layout,
      storagePath: crop.storage_path,
      publicUrl: cropUrl,
      cropX: Number(crop.crop_x),
      cropY: Number(crop.crop_y),
      cropWidth: Number(crop.crop_width),
      cropHeight: Number(crop.crop_height),
      width: crop.width,
      height: crop.height,
      mimeType: crop.mime_type,
      fileSize: Number(crop.file_size),
    }];
  })) as Partial<Record<PortfolioLayout, PortfolioMediaCrop>>;
  return {
    id: row.id,
    storagePath: row.storage_path,
    publicUrl: data.publicUrl,
    alt: row.alt,
    caption: row.caption ?? undefined,
    kind: row.kind,
    displayOrder: row.display_order,
    crops,
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
  endDate: row.is_current ? null : row.end_date,
  isCurrent: row.is_current ?? false,
  year: row.year ?? undefined,
  responsibilities: row.responsibilities ?? [],
  technologies: row.technologies ?? [],
  images: (row.project_images ?? []).sort((a, b) => a.display_order - b.display_order).map(toMedia),
  featured: row.featured,
  status: row.status,
  displayOrder: row.display_order,
  includeInPortfolio: row.include_in_portfolio,
  portfolioOrder: row.display_order,
  portfolioLayout: row.portfolio_layout,
  includeInCv: row.include_in_cv ?? false,
  cvOrder: row.cv_order ?? 100,
  cvDisplay: row.cv_display ?? "compact",
  cvShowSummary: row.cv_show_summary ?? true,
  cvResponsibilityIds: row.cv_responsibility_ids ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toolFromRow = (row: ToolRow): PortfolioTool => ({
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
  portfolioOrder: row.display_order,
  includeInCv: row.include_in_cv ?? false,
  cvOrder: row.cv_order ?? 100,
});

const projectSelect = "*, project_images(*)";
const toolSelect = "*, tool_images(*)";

export const supabasePortfolioRepository: PortfolioRepository = {
  async listPublishedProjects(): Promise<PortfolioProject[]> {
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelect)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order");
    if (error) throw error;
    return withoutTrashed(data as ProjectRow[]).map(projectFromRow);
  },

  async getPublishedProject(slug: string): Promise<PortfolioProject | null> {
    if (!slug) return null;
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? projectFromRow(data as ProjectRow) : null;
  },

  async listPublishedTools(): Promise<PortfolioTool[]> {
    const { data, error } = await supabase
      .from("automation_tools")
      .select(toolSelect)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order");
    if (error) throw error;
    return withoutTrashed(data as ToolRow[]).map(toolFromRow);
  },

  async getPublishedTool(slug: string): Promise<PortfolioTool | null> {
    if (!slug) return null;
    const { data, error } = await supabase
      .from("automation_tools")
      .select(toolSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toolFromRow(data as ToolRow) : null;
  },
};
