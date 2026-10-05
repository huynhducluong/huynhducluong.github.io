import { professionalProfileSeed, websiteContentSeed } from "../data/websiteSeed";
import { websiteNavigationLabels, type WebsiteNavigationLabels } from "../data/websiteNavigation";
import type { DocumentReleaseSummary } from "../types/portfolio";
import type { ProfessionalProfileContent, WebsiteContent, WebsiteContentSelection, WebsiteRuntimeData } from "../types/website";
import { supabase } from "./supabaseClient";
import { withoutTrashed } from "./activeContent";
import {
  projectFromRow,
  toolFromRow,
  type ProjectRow,
  type ToolRow,
} from "./supabasePortfolioRepository";

interface WebsiteContentRow {
  version: string;
  seo_title: WebsiteContent["seoTitle"];
  seo_description: WebsiteContent["seoDescription"];
  navigation: WebsiteNavigationLabels;
  hero_eyebrow: WebsiteContent["heroEyebrow"];
  focus: WebsiteContent["focus"];
  specialization: WebsiteContent["specialization"];
  expertise_title: WebsiteContent["expertiseTitle"];
  experience_title: WebsiteContent["experienceTitle"];
  projects_title: WebsiteContent["projectsTitle"];
  automation_title: WebsiteContent["automationTitle"];
  projects_page: WebsiteContent["projectsPage"] | null;
  tools_page: WebsiteContent["toolsPage"] | null;
  contact_kicker: WebsiteContent["contactKicker"];
  contact_title: WebsiteContent["contactTitle"];
  footer_text: WebsiteContent["footerText"];
  theme: WebsiteContent["theme"];
  content_selection?: WebsiteContentSelection | null;
  sections: WebsiteContent["sections"];
}

const websiteContentFromRow = (row: WebsiteContentRow): WebsiteContent => ({
  version: row.version,
  seoTitle: row.seo_title,
  seoDescription: row.seo_description,
  heroEyebrow: row.hero_eyebrow,
  focus: row.focus,
  specialization: row.specialization,
  expertiseTitle: row.expertise_title,
  experienceTitle: row.experience_title,
  projectsTitle: row.projects_title,
  automationTitle: row.automation_title,
  projectsPage: row.projects_page ?? structuredClone(websiteContentSeed.projectsPage),
  toolsPage: row.tools_page ?? structuredClone(websiteContentSeed.toolsPage),
  contactKicker: row.contact_kicker,
  contactTitle: row.contact_title,
  footerText: row.footer_text,
  theme: row.theme ?? { presetId: "personal-blue" },
  contentSelection: row.content_selection ?? structuredClone(websiteContentSeed.contentSelection),
  sections: row.sections ?? structuredClone(websiteContentSeed.sections),
});

const websiteContentWithDefaults = (content: WebsiteContent): WebsiteContent => {
  const { navigation: _legacyNavigation, ...supportedContent } = content as WebsiteContent & { navigation?: unknown };
  return {
    ...structuredClone(websiteContentSeed),
    ...supportedContent,
    projectsPage: supportedContent.projectsPage ?? structuredClone(websiteContentSeed.projectsPage),
    toolsPage: supportedContent.toolsPage ?? structuredClone(websiteContentSeed.toolsPage),
    contentSelection: {
      ...structuredClone(websiteContentSeed.contentSelection),
      ...supportedContent.contentSelection,
    },
    sections: {
      ...structuredClone(websiteContentSeed.sections),
      ...supportedContent.sections,
    },
  };
};

export const loadProfessionalProfile = async (): Promise<ProfessionalProfileContent> => {
  const { data, error } = await supabase
    .from("professional_profile")
    .select("profile,experiences,education,skill_groups,languages")
    .eq("id", "primary")
    .maybeSingle();
  if (error) throw error;
  if (!data) return structuredClone(professionalProfileSeed);
  return {
    profile: data.profile as ProfessionalProfileContent["profile"],
    experiences: (data.experiences ?? []) as ProfessionalProfileContent["experiences"],
    education: (data.education ?? []) as ProfessionalProfileContent["education"],
    skillGroups: (data.skill_groups ?? []) as ProfessionalProfileContent["skillGroups"],
    languages: (data.languages ?? []) as ProfessionalProfileContent["languages"],
  };
};

export const saveProfessionalProfile = async (content: ProfessionalProfileContent): Promise<void> => {
  const { error } = await supabase.from("professional_profile").upsert({
    id: "primary",
    profile: content.profile,
    experiences: content.experiences,
    education: content.education,
    skill_groups: content.skillGroups,
    languages: content.languages,
  });
  if (error) throw error;
};

export const loadWebsiteDraftData = async (): Promise<WebsiteRuntimeData> => {
  const [contentResult, professional, projectResult, toolResult] = await Promise.all([
    supabase.from("website_content").select("*").eq("id", "primary").maybeSingle(),
    loadProfessionalProfile(),
    supabase.from("projects").select("*, project_images(*, project_image_crops(*))").is("deleted_at", null).order("display_order"),
    supabase.from("automation_tools").select("*, tool_images(*)").is("deleted_at", null).order("display_order"),
  ]);
  if (contentResult.error) throw contentResult.error;
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  const contentRow = contentResult.data as WebsiteContentRow | null;
  const content = contentRow ? websiteContentFromRow(contentRow) : structuredClone(websiteContentSeed);
  const sourceProjects = withoutTrashed(projectResult.data as ProjectRow[]).map(projectFromRow);
  const sourceTools = withoutTrashed(toolResult.data as ToolRow[]).map(toolFromRow);
  if (!contentRow?.content_selection) {
    content.contentSelection = {
      projectIds: sourceProjects.filter((item) => item.status === "published").map((item) => item.id),
      featuredProjectIds: sourceProjects.filter((item) => item.status === "published" && item.featured).map((item) => item.id),
      toolIds: sourceTools.filter((item) => item.status === "published").map((item) => item.id),
      featuredToolIds: sourceTools.filter((item) => item.status === "published" && item.featured).map((item) => item.id),
    };
  }
  const selectedProjects = new Set(content.contentSelection.projectIds);
  const featuredProjects = new Set(content.contentSelection.featuredProjectIds);
  const selectedTools = new Set(content.contentSelection.toolIds);
  const featuredTools = new Set(content.contentSelection.featuredToolIds);
  return {
    content,
    professional,
    projects: sourceProjects.map((item) => ({
      ...item,
      websiteVisible: item.status === "published" && selectedProjects.has(item.id),
      featured: item.status === "published" && featuredProjects.has(item.id),
      displayOrder: item.displayOrder,
    })),
    tools: sourceTools.map((item) => ({
      ...item,
      websiteVisible: item.status === "published" && selectedTools.has(item.id),
      featured: item.status === "published" && featuredTools.has(item.id),
      displayOrder: item.displayOrder,
    })),
  };
};

export const saveWebsiteContent = async (content: WebsiteContent): Promise<void> => {
  const { error } = await supabase.from("website_content").upsert({
    id: "primary",
    version: content.version,
    seo_title: content.seoTitle,
    seo_description: content.seoDescription,
    navigation: websiteNavigationLabels,
    hero_eyebrow: content.heroEyebrow,
    focus: content.focus,
    specialization: content.specialization,
    expertise_title: content.expertiseTitle,
    experience_title: content.experienceTitle,
    projects_title: content.projectsTitle,
    automation_title: content.automationTitle,
    projects_page: content.projectsPage,
    tools_page: content.toolsPage,
    contact_kicker: content.contactKicker,
    contact_title: content.contactTitle,
    footer_text: content.footerText,
    theme: content.theme,
    content_selection: content.contentSelection,
    sections: content.sections,
  });
  if (error) throw error;
};

export const websiteReleasePayload = (draft: WebsiteRuntimeData): WebsiteRuntimeData => {
  const payload: WebsiteRuntimeData = {
    content: draft.content,
    professional: draft.professional,
    projects: draft.projects
      .filter((item) => item.websiteVisible !== false && item.status === "published")
      .sort((left, right) => left.displayOrder - right.displayOrder),
    tools: draft.tools
      .filter((item) => item.websiteVisible !== false && item.status === "published")
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
  return payload;
};

export const publishWebsiteRelease = async (draft: WebsiteRuntimeData): Promise<void> => {
  const payload = websiteReleasePayload(draft);
  const { error } = await supabase.rpc("publish_website", {
    p_version: payload.content.version,
    p_payload: payload,
  });
  if (error) throw error;
};

export const loadPublishedWebsiteRelease = async (): Promise<WebsiteRuntimeData> => {
  const { data, error } = await supabase
    .from("website_releases")
    .select("payload")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) throw new Error("No published Website release is available.");
  const payload = data.payload as WebsiteRuntimeData;
  return {
    ...payload,
    content: websiteContentWithDefaults(payload.content),
  };
};

export const listWebsiteReleases = async (): Promise<DocumentReleaseSummary[]> => {
  const { data, error } = await supabase
    .from("website_releases")
    .select("id,version,published_at")
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    version: String(row.version),
    publishedAt: String(row.published_at),
  }));
};
