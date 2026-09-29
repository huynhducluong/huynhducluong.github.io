import { cvContentSeed, cvRuntimeSeed } from "../data/cvSeed";
import { supabase } from "./supabaseClient";
import type { ContentPoint, LocalizedText, Project } from "../types/career";
import type {
  CvContent,
  CvProjectDisplay,
  CvRuntimeData,
  CvRuntimeProject,
  CvRuntimeTool,
} from "../types/cvContent";

interface CvContentRow {
  version: string;
  theme_id: string;
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
}

interface CvToolRow {
  id: string;
  name: string;
  problem: LocalizedText;
  solution: LocalizedText;
  technologies: string[];
  featured: boolean;
  cv_order: number;
}

const contentFromRow = (row: CvContentRow): CvContent => ({
  version: row.version,
  themeId: row.theme_id,
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
    cvOrder: row.cv_order,
    cvDisplay: row.cv_display,
    cvShowSummary: row.cv_show_summary,
    cvResponsibilityIds: row.cv_responsibility_ids ?? [],
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
  cvOrder: row.cv_order,
});

const loadLiveCvData = async (adminPreview: boolean): Promise<CvRuntimeData> => {
  let projectQuery = supabase.from("projects").select("id,name,location,role,summary,start_date,end_date,is_current,year,responsibilities,technologies,featured,display_order,cv_order,cv_display,cv_show_summary,cv_responsibility_ids").eq("include_in_cv", true);
  let toolQuery = supabase.from("automation_tools").select("id,name,problem,solution,technologies,featured,cv_order").eq("include_in_cv", true);
  if (!adminPreview) {
    projectQuery = projectQuery.eq("status", "published");
    toolQuery = toolQuery.eq("status", "published");
  }

  const [contentResult, projectResult, toolResult] = await Promise.all([
    supabase.from("cv_content").select("*").eq("id", "primary").maybeSingle(),
    projectQuery.order("cv_order"),
    toolQuery.order("cv_order"),
  ]);

  if (contentResult.error) throw contentResult.error;
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;

  const content = contentResult.data
    ? contentFromRow(contentResult.data as CvContentRow)
    : cvContentSeed;
  const projects = (projectResult.data as CvProjectRow[]).map(projectFromRow);

  return {
    content,
    detailedProjects: projects.filter((project) => project.cvDisplay === "detailed"),
    compactProjects: projects.filter((project) => project.cvDisplay === "compact"),
    tools: (toolResult.data as CvToolRow[]).map(toolFromRow),
  };
};

export const loadCvData = async (options: { adminPreview?: boolean; preferRelease?: boolean } = {}): Promise<CvRuntimeData> => {
  const adminPreview = options.adminPreview ?? false;
  const preferRelease = options.preferRelease ?? !adminPreview;

  try {
    if (preferRelease) {
      const { data, error } = await supabase
        .from("cv_releases")
        .select("payload")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.payload) return data.payload as CvRuntimeData;
      return cvRuntimeSeed;
    }
    return await loadLiveCvData(adminPreview);
  } catch (error) {
    console.warn("CV data could not be loaded from Supabase; using the bundled seed.", error);
    return cvRuntimeSeed;
  }
};

export const saveCvContent = async (content: CvContent): Promise<void> => {
  const { error } = await supabase.from("cv_content").upsert({
    id: "primary",
    version: content.version,
    theme_id: content.themeId,
    page_one_project_count: content.pageOneProjectCount,
    profile: content.profile,
    experiences: content.experiences,
    education: content.education,
    skill_groups: content.skillGroups,
    languages: content.languages,
  });
  if (error) throw error;
};

export const publishCvRelease = async (): Promise<void> => {
  const data = await loadLiveCvData(true);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in before publishing the CV.");
  const { error } = await supabase.from("cv_releases").insert({
    version: data.content.version,
    payload: data,
    published_by: authData.user.id,
  });
  if (error) throw error;
};
