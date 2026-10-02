import { websiteContentSeed } from "../data/websiteSeed";
import {
  listWebsiteReleases,
  loadWebsiteDraftData,
  publishWebsiteRelease,
  saveProfessionalProfile,
  saveWebsiteContent,
  saveWebsiteFeatured,
} from "../services/websiteRepository";
import { escapeHtml } from "../shared/format";
import { bindPreviewSender, type PreviewSender } from "../shared/previewProtocol";
import { documentThemes } from "../themes/documentThemes";
import type { DocumentReleaseSummary } from "../types/portfolio";
import type { ProfessionalProfileContent, WebsiteContent, WebsiteRuntimeData } from "../types/website";
import type { StoredDocumentTheme } from "../types/theme";
import { renderDocumentThemeFields } from "./documentThemeFields";
import { invalidateProfileDocumentWorkspace } from "./profileDocumentWorkspace";
import { updateCoverLetterSharedProfile } from "./coverLetterWorkspace";
import { bindEmbeddedPreview, type EmbeddedPreviewController } from "./embeddedPreview";
import {
  renderAdminPreviewControlGroup,
  renderAdminPreviewToolbar,
  renderAdminSectionCard,
  setButtonBusy,
} from "./ui";

export type SiteWorkspaceKind = "homepage" | "profile";
type WebsiteTab = "general" | "sections" | "featured" | "appearance";
type ProfileTab = "identity" | "experience" | "education" | "skills";
type WebsiteViewport = "desktop" | "laptop" | "tablet" | "mobile";
type WebsitePreviewZoom = "fit" | "75" | "100";

interface WorkspaceCallbacks {
  rerender: () => void;
  setDirty: (value: boolean) => void;
  notify: (message: string, kind?: "info" | "error" | "success") => void;
}

const state: {
  runtime: WebsiteRuntimeData | null;
  releases: DocumentReleaseSummary[];
  loading: boolean;
  error: string;
  websiteTab: WebsiteTab;
  profileTab: ProfileTab;
  viewport: WebsiteViewport;
  previewZoom: WebsitePreviewZoom;
  stale: boolean;
} = {
  runtime: null,
  releases: [],
  loading: false,
  error: "",
  websiteTab: "general",
  profileTab: "identity",
  viewport: "desktop",
  previewZoom: "fit",
  stale: false,
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
let previewSender: PreviewSender | undefined;
let previewResizeObserver: ResizeObserver | undefined;
const websiteViewportWidths: Record<WebsiteViewport, number> = {
  desktop: 1440,
  laptop: 1280,
  tablet: 768,
  mobile: 390,
};
const value = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (text: string): string[] => text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (text: string): string[] => text.split(",").map((item) => item.trim()).filter(Boolean);
const field = (label: string, name: string, current: string, type = "text"): string =>
  `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(current)}"></label>`;
const area = (label: string, name: string, current: string, rows = 4): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(current)}</textarea></label>`;
const bilingual = (label: string, name: string, text: { en: string; vi: string }): string =>
  `<div class="admin-site-bilingual">${field(`${label} (EN)`, `${name}_en`, text.en)}${field(`${label} (VI)`, `${name}_vi`, text.vi)}</div>`;

const readLocalized = (form: FormData, name: string): { en: string; vi: string } => ({
  en: value(form, `${name}_en`),
  vi: value(form, `${name}_vi`),
});

const themeFields = (theme: StoredDocumentTheme): string => renderDocumentThemeFields({
  theme,
  names: {
    preset: "website_theme_preset",
    primary: "website_theme_primary",
    accent: "website_theme_accent",
  },
  helpText: "The website theme is frozen into the next release and does not affect document themes.",
});

const readTheme = (form: FormData): StoredDocumentTheme => {
  const presetId = value(form, "website_theme_preset") || "personal-blue";
  return presetId === "custom"
    ? { presetId, primary: value(form, "website_theme_primary"), accent: value(form, "website_theme_accent") }
    : { presetId };
};

export const ensureSiteWorkspace = async (): Promise<void> => {
  if (state.loading || (state.runtime && !state.stale)) return;
  state.loading = true;
  state.error = "";
  try {
    [state.runtime, state.releases] = await Promise.all([
      loadWebsiteDraftData(),
      listWebsiteReleases(),
    ]);
    state.stale = false;
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Website workspace could not be loaded.";
  } finally {
    state.loading = false;
  }
};

const websiteGeneral = (content: WebsiteContent): string => [
  renderAdminSectionCard({
    title: "Website SEO",
    note: "Edit browser and search-result titles and descriptions.",
    content: `${bilingual("SEO title", "seo_title", content.seoTitle)}
      <div class="admin-site-bilingual">${area("SEO description (EN)", "seo_description_en", content.seoDescription.en, 4)}${area("SEO description (VI)", "seo_description_vi", content.seoDescription.vi, 4)}</div>`,
  }),
  renderAdminSectionCard({
    title: "Website hero",
    note: "Edit the homepage introduction shown above the main content.",
    content: `${bilingual("Hero eyebrow", "hero_eyebrow", content.heroEyebrow)}
      ${bilingual("Professional focus", "focus", content.focus)}
      ${bilingual("Specialization", "specialization", content.specialization)}`,
  }),
  renderAdminSectionCard({
    title: "Website listings",
    note: "Set introductions for the Projects and Automation pages.",
    content: `${bilingual("Projects page kicker", "projects_page_kicker", content.projectsPage.kicker)}
      ${bilingual("Projects page title", "projects_page_title", content.projectsPage.title)}
      <div class="admin-site-bilingual">${area("Projects page description (EN)", "projects_page_description_en", content.projectsPage.description.en, 3)}${area("Projects page description (VI)", "projects_page_description_vi", content.projectsPage.description.vi, 3)}</div>
      ${bilingual("Tools page kicker", "tools_page_kicker", content.toolsPage.kicker)}
      ${bilingual("Tools page title", "tools_page_title", content.toolsPage.title)}
      <div class="admin-site-bilingual">${area("Tools page description (EN)", "tools_page_description_en", content.toolsPage.description.en, 3)}${area("Tools page description (VI)", "tools_page_description_vi", content.toolsPage.description.vi, 3)}</div>`,
  }),
].join("");

const sectionGroup = (
  order: string,
  id: keyof WebsiteContent["sections"],
  title: string,
  enabled: boolean,
  fields: string,
): string => `<article class="admin-site-section-group">
  <header class="admin-site-section-group__header">
    <div class="admin-site-section-group__identity"><span>${order}</span><h4>${escapeHtml(title)}</h4></div>
    <label class="admin-site-section-visibility">
      <span class="admin-site-section-status admin-site-section-status--shown">Shown</span>
      <span class="admin-site-section-status admin-site-section-status--hidden">Hidden</span>
      <input name="section_${id}" type="checkbox" aria-label="Show ${escapeHtml(title)} section"${enabled ? " checked" : ""}>
      <span class="admin-site-section-switch" aria-hidden="true"></span>
    </label>
  </header>
  <div class="admin-site-section-group__body">${fields}</div>
</article>`;

const websiteSections = (content: WebsiteContent): string => renderAdminSectionCard({
  title: "Website sections",
  note: "Choose homepage visibility and edit each section heading.",
  content: `<div class="admin-site-section-list">
    ${sectionGroup("01", "expertise", "Expertise", content.sections.expertise, bilingual("Heading", "expertise_title", content.expertiseTitle))}
    ${sectionGroup("02", "experience", "Experience", content.sections.experience, bilingual("Heading", "experience_title", content.experienceTitle))}
    ${sectionGroup("03", "projects", "Projects", content.sections.projects, bilingual("Heading", "projects_title", content.projectsTitle))}
    ${sectionGroup("04", "automation", "Automation", content.sections.automation, bilingual("Heading", "automation_title", content.automationTitle))}
    ${sectionGroup("05", "contact", "Contact", content.sections.contact, `${bilingual("Kicker", "contact_kicker", content.contactKicker)}
      ${bilingual("Heading", "contact_title", content.contactTitle)}
      ${bilingual("Footer text", "footer_text", content.footerText)}`)}
  </div>`,
});

const websiteFeatured = (runtime: WebsiteRuntimeData): string => renderAdminSectionCard({
  title: "Website featured content",
  note: "Choose published Projects and Tools for the next release.",
  content: `<div class="admin-site-featured">
    <h4>Projects</h4>
    ${runtime.projects.map((item) => `<label><input type="checkbox" name="featured_project" value="${escapeHtml(item.id)}"${item.featured ? " checked" : ""}><span><strong>${escapeHtml(item.name.en)}</strong><small>${item.status} · ${escapeHtml(item.slug)}</small></span></label>`).join("")}
    <h4>Automation tools</h4>
    ${runtime.tools.map((item) => `<label><input type="checkbox" name="featured_tool" value="${escapeHtml(item.id)}"${item.featured ? " checked" : ""}><span><strong>${escapeHtml(item.name)}</strong><small>${item.status} · ${escapeHtml(item.slug)}</small></span></label>`).join("")}
  </div>`,
});

const readWebsiteForm = (formElement: HTMLFormElement): WebsiteRuntimeData => {
  const current = state.runtime!;
  const form = new FormData(formElement);
  const projectIds = new Set(form.getAll("featured_project").map(String));
  const toolIds = new Set(form.getAll("featured_tool").map(String));
  const content: WebsiteContent = {
    ...current.content,
    version: current.content.version || websiteContentSeed.version,
    seoTitle: readLocalized(form, "seo_title"),
    seoDescription: readLocalized(form, "seo_description"),
    heroEyebrow: readLocalized(form, "hero_eyebrow"),
    focus: readLocalized(form, "focus"),
    specialization: readLocalized(form, "specialization"),
    expertiseTitle: readLocalized(form, "expertise_title"),
    experienceTitle: readLocalized(form, "experience_title"),
    projectsTitle: readLocalized(form, "projects_title"),
    automationTitle: readLocalized(form, "automation_title"),
    projectsPage: {
      kicker: readLocalized(form, "projects_page_kicker"),
      title: readLocalized(form, "projects_page_title"),
      description: readLocalized(form, "projects_page_description"),
    },
    toolsPage: {
      kicker: readLocalized(form, "tools_page_kicker"),
      title: readLocalized(form, "tools_page_title"),
      description: readLocalized(form, "tools_page_description"),
    },
    contactKicker: readLocalized(form, "contact_kicker"),
    contactTitle: readLocalized(form, "contact_title"),
    footerText: readLocalized(form, "footer_text"),
    theme: readTheme(form),
    sections: {
      expertise: form.get("section_expertise") === "on",
      experience: form.get("section_experience") === "on",
      projects: form.get("section_projects") === "on",
      automation: form.get("section_automation") === "on",
      contact: form.get("section_contact") === "on",
    },
  };
  return {
    content,
    professional: current.professional,
    projects: current.projects.map((item) => ({ ...item, featured: projectIds.has(item.id) })),
    tools: current.tools.map((item) => ({ ...item, featured: toolIds.has(item.id) })),
  };
};

const profileIdentity = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile identity",
  note: "Shared contact and profile details used across all outputs.",
  content: `<div class="admin-form-grid">
    ${field("Full name", "profile_name", professional.profile.name)}
    ${field("Email", "profile_email", professional.profile.email, "email")}
    ${field("Phone", "profile_phone", professional.profile.phone, "tel")}
    ${field("Photo path", "profile_photo", professional.profile.photoPath)}
    ${field("Professional title (EN)", "profile_title_en", professional.profile.professionalTitle.en)}
    ${field("Professional title (VI)", "profile_title_vi", professional.profile.professionalTitle.vi)}
    ${field("Location (EN)", "profile_location_en", professional.profile.location.en)}
    ${field("Location (VI)", "profile_location_vi", professional.profile.location.vi)}
  </div>
  <div class="admin-site-bilingual">${area("Summary (EN)", "profile_summary_en", professional.profile.summary.en, 6)}${area("Summary (VI)", "profile_summary_vi", professional.profile.summary.vi, 6)}</div>`,
});

const profileExperience = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile experience",
  note: "Shared career history used by the Website and CV.",
  content: `<div class="admin-document-cards">${professional.experiences.map((item, index) => `<article><h4>${escapeHtml(item.company)}</h4><div class="admin-form-grid">
    ${field("Company", `profile_experience_company_${index}`, item.company)}
    ${field("Position (EN)", `profile_experience_position_en_${index}`, item.position.en)}
    ${field("Position (VI)", `profile_experience_position_vi_${index}`, item.position.vi)}
    ${field("Location (EN)", `profile_experience_location_en_${index}`, item.location.en)}
    ${field("Location (VI)", `profile_experience_location_vi_${index}`, item.location.vi)}
    ${field("Start", `profile_experience_start_${index}`, item.startDate, "month")}
    ${field("End (blank = Present)", `profile_experience_end_${index}`, item.endDate ?? "", "month")}
  </div>${area("Responsibilities (one EN item per line)", `profile_experience_responsibilities_${index}`, item.responsibilities.map((point) => point.text.en).join("\n"), 4)}${field("Technologies", `profile_experience_technologies_${index}`, item.technologies.join(", "))}</article>`).join("")}</div>`,
});

const profileEducation = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile education",
  note: "Education saved once and reused in CV snapshots.",
  content: `<div class="admin-document-cards">${professional.education.map((item, index) => `<article><h4>Education ${index + 1}</h4><div class="admin-form-grid">
    ${field("Field (EN)", `profile_education_field_en_${index}`, item.field.en)}
    ${field("Field (VI)", `profile_education_field_vi_${index}`, item.field.vi)}
    ${field("Institution (EN)", `profile_education_institution_en_${index}`, item.institution.en)}
    ${field("Institution (VI)", `profile_education_institution_vi_${index}`, item.institution.vi)}
    ${field("Start year", `profile_education_start_${index}`, item.startDate)}
    ${field("End year", `profile_education_end_${index}`, item.endDate)}
  </div></article>`).join("")}</div>`,
});

const profileSkills = (professional: ProfessionalProfileContent): string => [
  renderAdminSectionCard({
    title: "Profile skills",
    note: "Skill groups used by Website expertise and CV.",
    content: `<div class="admin-document-cards">
      ${professional.skillGroups.map((group, index) => `<article><h4>${escapeHtml(group.title.en)}</h4><div class="admin-form-grid">${field("Group title (EN)", `profile_skill_title_en_${index}`, group.title.en)}${field("Group title (VI)", `profile_skill_title_vi_${index}`, group.title.vi)}</div>${area("Items (one per line)", `profile_skill_items_${index}`, group.items.map((item) => item.label.en).join("\n"), 5)}</article>`).join("")}
    </div>`,
  }),
  renderAdminSectionCard({
    title: "Profile languages",
    note: "Keep language names and proficiency aligned in EN and VI.",
    content: `<div class="admin-document-cards">
      ${professional.languages.map((item, index) => `<article><h4>Language ${index + 1}</h4><div class="admin-form-grid">${field("Name (EN)", `profile_language_name_en_${index}`, item.name.en)}${field("Name (VI)", `profile_language_name_vi_${index}`, item.name.vi)}${field("Proficiency (EN)", `profile_language_level_en_${index}`, item.proficiency?.en ?? "")}${field("Proficiency (VI)", `profile_language_level_vi_${index}`, item.proficiency?.vi ?? "")}</div></article>`).join("")}
    </div>`,
  }),
].join("");

const readProfileForm = (formElement: HTMLFormElement): ProfessionalProfileContent => {
  const current = state.runtime!.professional;
  const form = new FormData(formElement);
  return {
    profile: {
      name: value(form, "profile_name"),
      email: value(form, "profile_email"),
      phone: value(form, "profile_phone"),
      photoPath: value(form, "profile_photo"),
      professionalTitle: { en: value(form, "profile_title_en"), vi: value(form, "profile_title_vi") },
      location: { en: value(form, "profile_location_en"), vi: value(form, "profile_location_vi") },
      summary: { en: value(form, "profile_summary_en"), vi: value(form, "profile_summary_vi") },
    },
    experiences: current.experiences.map((item, index) => {
      const responsibilities = lines(value(form, `profile_experience_responsibilities_${index}`));
      return {
        ...item,
        company: value(form, `profile_experience_company_${index}`),
        position: { en: value(form, `profile_experience_position_en_${index}`), vi: value(form, `profile_experience_position_vi_${index}`) },
        location: { en: value(form, `profile_experience_location_en_${index}`), vi: value(form, `profile_experience_location_vi_${index}`) },
        startDate: value(form, `profile_experience_start_${index}`),
        endDate: value(form, `profile_experience_end_${index}`) || null,
        responsibilities: responsibilities.map((text, pointIndex) => ({ id: item.responsibilities[pointIndex]?.id ?? `${item.id}-${pointIndex + 1}`, text: { en: text, vi: item.responsibilities[pointIndex]?.text.vi ?? "" } })),
        technologies: commaList(value(form, `profile_experience_technologies_${index}`)),
      };
    }),
    education: current.education.map((item, index) => ({
      ...item,
      field: { en: value(form, `profile_education_field_en_${index}`), vi: value(form, `profile_education_field_vi_${index}`) },
      institution: { en: value(form, `profile_education_institution_en_${index}`), vi: value(form, `profile_education_institution_vi_${index}`) },
      startDate: value(form, `profile_education_start_${index}`),
      endDate: value(form, `profile_education_end_${index}`),
    })),
    skillGroups: current.skillGroups.map((group, index) => ({
      ...group,
      title: { en: value(form, `profile_skill_title_en_${index}`), vi: value(form, `profile_skill_title_vi_${index}`) },
      items: lines(value(form, `profile_skill_items_${index}`)).map((label, itemIndex) => ({ id: group.items[itemIndex]?.id ?? `${group.id}-${itemIndex + 1}`, label: { en: label, vi: group.items[itemIndex]?.label.vi ?? label } })),
    })),
    languages: current.languages.map((item, index) => ({
      ...item,
      name: { en: value(form, `profile_language_name_en_${index}`), vi: value(form, `profile_language_name_vi_${index}`) },
      proficiency: { en: value(form, `profile_language_level_en_${index}`), vi: value(form, `profile_language_level_vi_${index}`) },
    })),
  };
};

const websiteView = (): string => {
  const runtime = state.runtime!;
  const content = runtime.content;
  const tab = state.websiteTab;
  const latest = state.releases[0];
  const releaseHistory = state.releases.length
    ? `<ol class="admin-release-history__list">${state.releases.map((item, index) => `<li><div><strong>${index === 0 ? "Latest release" : "Published release"}</strong><span>${new Date(item.publishedAt).toLocaleString()}</span></div><code>${escapeHtml(item.version)}</code></li>`).join("")}</ol>`
    : '<p class="admin-empty">No Website release has been published yet.</p>';
  const viewportControls = renderAdminPreviewControlGroup({
    label: "Website viewport",
    dataAttribute: "data-website-viewport",
    activeValue: state.viewport,
    options: [
      { label: "Desktop", value: "desktop" },
      { label: "Laptop", value: "laptop" },
      { label: "Tablet", value: "tablet" },
      { label: "Mobile", value: "mobile" },
    ],
  });
  const zoomControls = renderAdminPreviewControlGroup({
    label: "Preview zoom",
    dataAttribute: "data-website-zoom",
    activeValue: state.previewZoom,
    options: [
      { label: "Fit", value: "fit" },
      { label: "75%", value: "75" },
      { label: "100%", value: "100" },
    ],
  });
  const previewToolbar = renderAdminPreviewToolbar({
    title: "Website preview",
    meta: 'Live draft · <span data-preview-status>Connecting…</span>',
    controls: `${viewportControls}${zoomControls}`,
  });
  return `<section class="admin-site-workspace">
    <header class="admin-document-header"><div><p class="section-kicker">Website</p><h1>Homepage</h1><p><span class="status status--draft">Draft</span>${latest ? `Last published ${new Date(latest.publishedAt).toLocaleString()}` : "Not published yet"}</p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button button--secondary admin-action-utility" type="button" data-website-history-open>History (${state.releases.length})</button><button class="button button--secondary admin-action-save" type="submit" form="website-editor-form">Save draft</button><button class="button admin-action-publish" type="button" data-publish-website>Publish</button></div></header>
    <div class="admin-document-layout">
      <section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Website editor sections">${([["general","General & SEO"],["sections","Sections"],["featured","Featured content"],["appearance","Appearance"]] as Array<[WebsiteTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-website-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav>
        <form id="website-editor-form" data-website-form>
          <section data-website-panel="general"${tab === "general" ? "" : " hidden"}>${websiteGeneral(content)}</section>
          <section data-website-panel="sections"${tab === "sections" ? "" : " hidden"}>${websiteSections(content)}</section>
          <section data-website-panel="featured"${tab === "featured" ? "" : " hidden"}>${websiteFeatured(runtime)}</section>
          <section data-website-panel="appearance"${tab === "appearance" ? "" : " hidden"}>${renderAdminSectionCard({ title: "Website appearance", note: "Choose the brand theme for the next Website release.", content: themeFields(content.theme) })}</section>
        </form>
      </section>
      <aside class="admin-site-preview">${previewToolbar}<div class="admin-site-frame" data-viewport="${state.viewport}" data-zoom="${state.previewZoom}" tabindex="0" aria-label="Scrollable website preview"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="Website draft preview" src="${import.meta.env.BASE_URL}?preview=1&embedded=1" data-website-iframe scrolling="no" tabindex="-1"></iframe></div></div></aside>
    </div>
    <dialog class="admin-dialog admin-release-history" data-website-history-dialog aria-labelledby="website-release-history-title"><form method="dialog"><div><p class="section-kicker">Website</p><h2 id="website-release-history-title">Release history</h2><p>Versions are generated automatically when a release is published.</p></div>${releaseHistory}<div class="admin-actions"><button class="button button--secondary" type="button" data-website-history-close>Close</button></div></form></dialog>
  </section>`;
};

const profileView = (): string => {
  const professional = state.runtime!.professional;
  const tab = state.profileTab;
  return `<section class="admin-profile-workspace">
    <header class="admin-document-header"><div><p class="section-kicker">Shared content</p><h1>Professional Profile</h1><p>Single source for Website, Curriculum Vitae, Portfolio and Cover Letters</p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button admin-action-save" type="submit" form="profile-editor-form">Save changes</button></div></header>
    <div class="admin-profile-layout">
      <section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Professional Profile sections">${([["identity","Identity"],["experience","Experience"],["education","Education"],["skills","Skills & languages"]] as Array<[ProfileTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-profile-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav><form id="profile-editor-form" data-profile-form><section data-profile-panel="identity"${tab === "identity" ? "" : " hidden"}>${profileIdentity(professional)}</section><section data-profile-panel="experience"${tab === "experience" ? "" : " hidden"}>${profileExperience(professional)}</section><section data-profile-panel="education"${tab === "education" ? "" : " hidden"}>${profileEducation(professional)}</section><section data-profile-panel="skills"${tab === "skills" ? "" : " hidden"}>${profileSkills(professional)}</section></form></section>
      <aside class="admin-profile-usage"><p class="section-kicker">Used by</p><h2>One profile, four outputs</h2><div><article><strong>Website</strong><span>Applied when the next Website release is published.</span></article><article><strong>Curriculum Vitae</strong><span>Use “Sync from Professional Profile” in the CV draft before publishing.</span></article><article><strong>Portfolio</strong><span>Sync from the Professional Profile or from the active CV draft.</span></article><article><strong>Cover Letters</strong><span>Drafts use the saved profile; finalized letters retain their sender snapshot.</span></article></div><p>Published releases and finalized letters remain unchanged.</p></aside>
    </div>
  </section>`;
};

export const siteWorkspaceView = (kind: SiteWorkspaceKind): string => {
  if (state.loading) return '<section class="admin-document-loading"><span></span><h2>Loading website workspace…</h2></section>';
  if (state.error) return `<section class="admin-placeholder"><p class="section-kicker">Website CMS</p><h2>Could not load workspace</h2><p>${escapeHtml(state.error)}</p><p>Apply the latest Supabase migration, then reload Admin.</p></section>`;
  if (!state.runtime) return '<section class="admin-document-loading"><span></span><h2>Preparing workspace…</h2></section>';
  return kind === "homepage" ? websiteView() : profileView();
};

const sendPreview = (): void => previewSender?.send();

const automaticWebsiteVersion = (date = new Date()): string => {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export const discardSiteChanges = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = undefined;
  previewResizeObserver?.disconnect();
  previewResizeObserver = undefined;
};

export const markSiteWorkspaceStale = (): void => {
  state.stale = true;
};

export const bindSiteWorkspace = (root: ParentNode, _kind: SiteWorkspaceKind, callbacks: WorkspaceCallbacks): void => {
  const websiteForm = root.querySelector<HTMLFormElement>("[data-website-form]");
  const profileForm = root.querySelector<HTMLFormElement>("[data-profile-form]");
  const previewIframe = root.querySelector<HTMLIFrameElement>("[data-website-iframe]");
  const previewStage = root.querySelector<HTMLElement>("[data-embedded-preview-stage]");
  const previewFrame = root.querySelector<HTMLElement>(".admin-site-frame");
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = previewIframe && previewStage
    ? bindEmbeddedPreview(previewIframe, previewStage, { measurementHeight: 900 })
    : undefined;
  const syncWebsitePreviewScale = (): void => {
    if (!previewFrame || !previewStage) return;
    if (state.previewZoom === "fit") {
      const availableWidth = Math.max(previewFrame.clientWidth - 32, 1);
      const scale = Math.min(1, availableWidth / websiteViewportWidths[state.viewport]);
      previewStage.style.setProperty("--preview-scale", String(scale));
    } else {
      previewStage.style.removeProperty("--preview-scale");
    }
    previewController?.refresh();
  };
  previewResizeObserver?.disconnect();
  previewResizeObserver = previewFrame ? new ResizeObserver(syncWebsitePreviewScale) : undefined;
  if (previewFrame) previewResizeObserver?.observe(previewFrame);
  syncWebsitePreviewScale();
  previewSender = previewIframe && websiteForm
    ? bindPreviewSender(previewIframe, "website", () => readWebsiteForm(websiteForm), () => {
        previewController?.refresh();
        const status = root.querySelector<HTMLElement>("[data-preview-status]");
        if (status) status.textContent = "Auto-updating";
      })
    : undefined;
  const markDirty = (): void => {
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-site-save-state]");
    if (status) status.textContent = "Unsaved changes";
    if (websiteForm && previewSender) {
      if (previewTimer !== undefined) window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(sendPreview, 180);
    }
  };
  websiteForm?.addEventListener("input", markDirty);
  websiteForm?.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement;
    if (target.name === "website_theme_preset" && target.value !== "custom") {
      const theme = documentThemes.find((item) => item.id === target.value);
      const primary = websiteForm.elements.namedItem("website_theme_primary");
      const accent = websiteForm.elements.namedItem("website_theme_accent");
      if (theme && primary instanceof HTMLInputElement && accent instanceof HTMLInputElement) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    }
    markDirty();
  });
  profileForm?.addEventListener("input", markDirty);
  profileForm?.addEventListener("change", markDirty);
  root.querySelectorAll<HTMLButtonElement>("[data-website-tab]").forEach((button) => button.addEventListener("click", () => {
    state.websiteTab = button.dataset.websiteTab as WebsiteTab;
    root.querySelectorAll<HTMLButtonElement>("[data-website-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-website-panel]").forEach((panel) => { panel.hidden = panel.dataset.websitePanel !== state.websiteTab; });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => {
    state.profileTab = button.dataset.profileTab as ProfileTab;
    root.querySelectorAll<HTMLButtonElement>("[data-profile-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-profile-panel]").forEach((panel) => { panel.hidden = panel.dataset.profilePanel !== state.profileTab; });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-website-viewport]").forEach((button) => button.addEventListener("click", () => {
    state.viewport = button.dataset.websiteViewport as WebsiteViewport;
    if (previewFrame) previewFrame.dataset.viewport = state.viewport;
    syncWebsitePreviewScale();
    root.querySelectorAll<HTMLButtonElement>("[data-website-viewport]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-website-zoom]").forEach((button) => button.addEventListener("click", () => {
    state.previewZoom = button.dataset.websiteZoom as WebsitePreviewZoom;
    if (previewFrame) previewFrame.dataset.zoom = state.previewZoom;
    syncWebsitePreviewScale();
    root.querySelectorAll<HTMLButtonElement>("[data-website-zoom]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
  }));
  const releaseHistoryDialog = root.querySelector<HTMLDialogElement>("[data-website-history-dialog]");
  root.querySelector<HTMLButtonElement>("[data-website-history-open]")?.addEventListener("click", () => releaseHistoryDialog?.showModal());
  root.querySelector<HTMLButtonElement>("[data-website-history-close]")?.addEventListener("click", () => releaseHistoryDialog?.close());
  websiteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>('[form="website-editor-form"].admin-action-save');
    setButtonBusy(saveButton, true, "Saving…");
    void (async () => {
      const runtime = readWebsiteForm(websiteForm);
      await Promise.all([saveWebsiteContent(runtime.content), saveWebsiteFeatured(runtime)]);
      state.runtime = runtime;
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website draft saved. Public pages are unchanged until publish.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>('[form="profile-editor-form"].admin-action-save');
    setButtonBusy(saveButton, true, "Saving…");
    void (async () => {
      const professional = readProfileForm(profileForm);
      await saveProfessionalProfile(professional);
      state.runtime = { ...state.runtime!, professional };
      invalidateProfileDocumentWorkspace();
      updateCoverLetterSharedProfile(professional);
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Professional Profile saved. Publish each channel when ready.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  root.querySelector<HTMLButtonElement>("[data-publish-website]")?.addEventListener("click", (event) => {
    if (!websiteForm || !window.confirm("Publish the current Website draft as a new public release? A version will be generated automatically.")) return;
    const publishButton = event.currentTarget as HTMLButtonElement;
    setButtonBusy(publishButton, true, "Publishing…");
    void (async () => {
      const draft = readWebsiteForm(websiteForm);
      const runtime: WebsiteRuntimeData = {
        ...draft,
        content: { ...draft.content, version: automaticWebsiteVersion() },
      };
      await saveWebsiteContent(runtime.content);
      await saveWebsiteFeatured(runtime);
      state.runtime = runtime;
      await publishWebsiteRelease();
      state.releases = await listWebsiteReleases();
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website release published. All public pages now use this snapshot.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (publishButton.isConnected) setButtonBusy(publishButton, false); });
  });
};
