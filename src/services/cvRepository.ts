import { cvContentSeed, cvRuntimeSeed } from "../data/cvSeed";
import { supabase } from "./supabaseClient";
import type { ContentPoint, LocalizedText, Project } from "../types/career";
import type { PublicationStatus } from "../types/portfolio";
import type {
  CvContent,
  CvProjectDisplay,
  CvRuntimeData,
  CvRuntimeProject,
  CvRuntimeTool,
} from "../types/cvContent";
import { loadActiveProfileDocumentRelease } from "./profileDocumentRepository";
import { withoutTrashed } from "./activeContent";

interface CvContentRow {
  version: string;
  theme_id: string;
  theme: CvContent["theme"] | null;
  page_one_project_count: number;
  profile: CvContent["profile"];
  experiences: CvContent["experiences"];
  education: CvContent["education"];
  skill_groups: CvContent["skillGroups"];
  languages: CvContent["languages"];
}

interface CvProjectRow {
  id: string;
  name: LocalizedText;
  location: LocalizedText;
  role: LocalizedText | null;
  summary: LocalizedText | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  year: number | null;
  responsibilities: ContentPoint[];
  technologies: string[];
  featured: boolean;
  display_order: number;
  cv_order: number;
  cv_display: CvProjectDisplay;
  cv_show_summary: boolean;
  cv_responsibility_ids: string[];
  include_in_cv: boolean;
  status: PublicationStatus;
  deleted_at: string | null;
}

interface CvToolRow {
  id: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  technologies: string[];
  featured: boolean;
  display_order: number;
  cv_order: number;
  include_in_cv: boolean;
  status: PublicationStatus;
  deleted_at: string | null;
}

const contentFromRow = (row: CvContentRow): CvContent => ({
  version: row.version,
  themeId: row.theme_id,
  theme: row.theme ?? { presetId: row.theme_id },
  pageOneProjectCount: row.page_one_project_count,
  profile: row.profile,
  experiences: row.experiences ?? [],
  education: row.education ?? [],
  skillGroups: row.skill_groups ?? [],
  languages: row.languages ?? [],
});

const projectFromRow = (row: CvProjectRow): CvRuntimeProject => {
  const project: Project = {
    id: row.id,
    name: row.name,
    location: row.location,
    role: row.role ?? undefined,
    summary: row.summary ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.is_current ? null : row.end_date ?? undefined,
    year: row.year ?? undefined,
    responsibilities: row.responsibilities ?? [],
    technologies: row.technologies ?? [],
    imagePaths: [],
    featured: row.featured,
    displayOrder: row.display_order,
  };

  return {
    ...project,
    cvOrder: row.display_order,
    cvDisplay: row.cv_display,
    cvShowSummary: row.cv_show_summary,
    cvResponsibilityIds: row.cv_responsibility_ids ?? [],
    includeInCv: row.include_in_cv,
    status: row.status,
  };
};
const toolFromRow = (row: CvToolRow): CvRuntimeTool => ({
  id: row.id,
  name: row.name,
  problem: row.problem,
  solution: row.solution,
  technologies: row.technologies ?? [],
  imagePaths: [],
  featured: row.featured,
  cvOrder: row.display_order,
  includeInCv: row.include_in_cv,
  status: row.status,
});

const loadLiveCvData = async (adminPreview: boolean): Promise<CvRuntimeData> => {
  let projectQuery = supabase.from("projects").select("id,name,location,role,summary,start_date,end_date,is_current,year,responsibilities,technologies,featured,display_order,cv_order,cv_display,cv_show_summary,cv_responsibility_ids,include_in_cv,status,deleted_at").is("deleted_at", null);
  let toolQuery = supabase.from("automation_tools").select("id,name,problem,solution,technologies,featured,display_order,cv_order,include_in_cv,status,deleted_at").is("deleted_at", null);
  if (!adminPreview) {
    projectQuery = projectQuery.eq("include_in_cv", true).eq("status", "published");
    toolQuery = toolQuery.eq("include_in_cv", true).eq("status", "published");
  }

  const [contentResult, professionalResult, projectResult, toolResult] = await Promise.all([
    supabase.from("cv_content").select("*").eq("id", "primary").maybeSingle(),
    supabase.from("professional_profile").select("profile,experiences,education,skill_groups,languages").eq("id", "primary").maybeSingle(),
    projectQuery.order("display_order"),
    toolQuery.order("display_order"),
  ]);

  if (contentResult.error) throw contentResult.error;
  if (professionalResult.error) throw professionalResult.error;
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;

  const content = contentResult.data
    ? contentFromRow(contentResult.data as CvContentRow)
    : structuredClone(cvContentSeed);
  if (professionalResult.data) {
    content.profile = professionalResult.data.profile as CvContent["profile"];
    content.experiences = (professionalResult.data.experiences ?? []) as CvContent["experiences"];
    content.education = (professionalResult.data.education ?? []) as CvContent["education"];
    content.skillGroups = (professionalResult.data.skill_groups ?? []) as CvContent["skillGroups"];
    content.languages = (professionalResult.data.languages ?? []) as CvContent["languages"];
  }
  const projects = withoutTrashed(projectResult.data as CvProjectRow[]).map(projectFromRow);
  const selectedProjects = projects.filter((project) => project.includeInCv);
  const tools = withoutTrashed(toolResult.data as CvToolRow[]).map(toolFromRow);
  const selectedTools = tools.filter((tool) => tool.includeInCv);

  return {
    content,
    detailedProjects: selectedProjects.filter((project) => project.cvDisplay === "detailed"),
    compactProjects: selectedProjects.filter((project) => project.cvDisplay === "compact"),
    tools: selectedTools,
    availableProjects: adminPreview ? projects : undefined,
    availableTools: adminPreview ? tools : undefined,
  };
};

export const loadCvData = async (options: { adminPreview?: boolean; preferRelease?: boolean } = {}): Promise<CvRuntimeData> => {
  const adminPreview = options.adminPreview ?? false;
  const preferRelease = options.preferRelease ?? !adminPreview;

  try {
    if (preferRelease) {
      try {
        const activeRelease = await loadActiveProfileDocumentRelease<CvRuntimeData>("cv");
        if (activeRelease) {
          activeRelease.content.theme ??= { presetId: activeRelease.content.themeId };
          return activeRelease;
        }
      } catch {
        // Fall through to the legacy release table until the library migration is applied.
      }
      const { data, error } = await supabase
        .from("cv_releases")
        .select("payload")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.payload) {
        const runtime = data.payload as CvRuntimeData;
        runtime.content.theme ??= { presetId: runtime.content.themeId };
        return runtime;
      }
      throw new Error("No published CV release is available.");
    }
    return await loadLiveCvData(adminPreview);
  } catch (error) {
    if (!adminPreview) throw error;
    console.warn("CV draft could not be loaded from Supabase; using the bundled seed.", error);
    return structuredClone(cvRuntimeSeed);
  }
};
