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
import { documentThemes, resolveDocumentTheme } from "../themes/documentThemes";
import type { DocumentReleaseSummary } from "../types/portfolio";
import type { ProfessionalProfileContent, WebsiteContent, WebsiteRuntimeData } from "../types/website";
import type { StoredDocumentTheme } from "../types/theme";
import { invalidateProfileDocumentWorkspace } from "./profileDocumentWorkspace";
import { updateCoverLetterSharedProfile } from "./coverLetterWorkspace";
import { bindEmbeddedPreview, type EmbeddedPreviewController } from "./embeddedPreview";

export type SiteWorkspaceKind = "homepage" | "profile";
type WebsiteTab = "general" | "navigation" | "sections" | "featured" | "appearance";
type ProfileTab = "identity" | "experience" | "education" | "skills";

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
  zoom: "desktop" | "laptop" | "tablet" | "mobile";
} = {
  runtime: null,
  releases: [],
  loading: false,
  error: "",
  websiteTab: "general",
  profileTab: "identity",
  zoom: "desktop",
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
const value = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (text: string): string[] => text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (text: string): string[] => text.split(",").map((item) => item.trim()).filter(Boolean);
const field = (label: string, name: string, current: string, type = "text"): string =>
  `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(current)}"></label>`;
const area = (label: string, name: string, current: string, rows = 4): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(current)}</textarea></label>`;
const bilingual = (label: string, name: string, text: { en: string; vi: string }): string =>
  `<div class="admin-site-bilingual">${field(`${label} (English)`, `${name}_en`, text.en)}${field(`${label} (Vietnamese)`, `${name}_vi`, text.vi)}</div>`;

const readLocalized = (form: FormData, name: string): { en: string; vi: string } => ({
  en: value(form, `${name}_en`),
  vi: value(form, `${name}_vi`),
});

const themeFields = (theme: StoredDocumentTheme): string => {
  const resolved = resolveDocumentTheme(theme);
  return `<div class="admin-document-theme">
    <label>Theme preset<select name="website_theme_preset">${documentThemes.map((item) => `<option value="${item.id}"${theme.presetId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}<option value="custom"${theme.presetId === "custom" ? " selected" : ""}>Custom</option></select></label>
    <label>Primary color<input name="website_theme_primary" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"></label>
    <label>Accent color<input name="website_theme_accent" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"></label>
  </div><p class="admin-form-help">The website theme is frozen into the next release and does not affect document themes.</p>`;
};

const readTheme = (form: FormData): StoredDocumentTheme => {
  const presetId = value(form, "website_theme_preset") || "personal-blue";
  return presetId === "custom"
    ? { presetId, primary: value(form, "website_theme_primary"), accent: value(form, "website_theme_accent") }
    : { presetId };
};

export const ensureSiteWorkspace = async (): Promise<void> => {
  if (state.loading || state.runtime) return;
  state.loading = true;
  state.error = "";
  try {
    [state.runtime, state.releases] = await Promise.all([
      loadWebsiteDraftData(),
      listWebsiteReleases(),
    ]);
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Website workspace could not be loaded.";
  } finally {
    state.loading = false;
  }
};

const websiteGeneral = (content: WebsiteContent): string => `
  <div class="admin-section-heading"><h3>Release & search metadata</h3><p>Control how the website is identified in search results and browser tabs.</p></div>
  <div class="admin-form-grid">${field("Website version", "website_version", content.version)}</div>
  ${bilingual("SEO title", "seo_title", content.seoTitle)}
  <div class="admin-site-bilingual">${area("SEO description (English)", "seo_description_en", content.seoDescription.en, 4)}${area("SEO description (Vietnamese)", "seo_description_vi", content.seoDescription.vi, 4)}</div>
  <div class="admin-section-heading"><h3>Hero metadata</h3><p>The main identity comes from Professional Profile.</p></div>
  ${bilingual("Hero eyebrow", "hero_eyebrow", content.heroEyebrow)}
  ${bilingual("Professional focus", "focus", content.focus)}
  ${bilingual("Specialization", "specialization", content.specialization)}
  <div class="admin-section-heading"><h3>Listing pages</h3><p>Manage the introduction shown above the published Projects and Automation Tools collections.</p></div>
  ${bilingual("Projects page kicker", "projects_page_kicker", content.projectsPage.kicker)}
  ${bilingual("Projects page title", "projects_page_title", content.projectsPage.title)}
  <div class="admin-site-bilingual">${area("Projects page description (English)", "projects_page_description_en", content.projectsPage.description.en, 3)}${area("Projects page description (Vietnamese)", "projects_page_description_vi", content.projectsPage.description.vi, 3)}</div>
  ${bilingual("Tools page kicker", "tools_page_kicker", content.toolsPage.kicker)}
  ${bilingual("Tools page title", "tools_page_title", content.toolsPage.title)}
  <div class="admin-site-bilingual">${area("Tools page description (English)", "tools_page_description_en", content.toolsPage.description.en, 3)}${area("Tools page description (Vietnamese)", "tools_page_description_vi", content.toolsPage.description.vi, 3)}</div>`;

const websiteNavigation = (content: WebsiteContent): string => `
  <div class="admin-section-heading"><h3>Primary navigation</h3><p>Keep labels short so the desktop and mobile navigation remain clear.</p></div>
  ${bilingual("Expertise", "nav_expertise", content.navigation.expertise)}
  ${bilingual("Experience", "nav_experience", content.navigation.experience)}
  ${bilingual("Projects", "nav_projects", content.navigation.projects)}
  ${bilingual("Automation", "nav_automation", content.navigation.automation)}`;

const sectionRow = (id: keyof WebsiteContent["sections"], title: string, enabled: boolean): string =>
  `<label class="admin-site-section-toggle"><input name="section_${id}" type="checkbox"${enabled ? " checked" : ""}><span><strong>${escapeHtml(title)}</strong><small>Show this section in the next Website release</small></span></label>`;

const websiteSections = (content: WebsiteContent): string => `
  <div class="admin-section-heading"><h3>Homepage sections</h3><p>Choose visibility and edit the main heading for each section.</p></div>
  <div class="admin-site-section-list">
    ${sectionRow("expertise", "Expertise", content.sections.expertise)}
    ${bilingual("Expertise heading", "expertise_title", content.expertiseTitle)}
    ${sectionRow("experience", "Experience", content.sections.experience)}
    ${bilingual("Experience heading", "experience_title", content.experienceTitle)}
    ${sectionRow("projects", "Projects", content.sections.projects)}
    ${bilingual("Projects heading", "projects_title", content.projectsTitle)}
    ${sectionRow("automation", "Automation", content.sections.automation)}
    ${bilingual("Automation heading", "automation_title", content.automationTitle)}
    ${sectionRow("contact", "Contact", content.sections.contact)}
    ${bilingual("Contact kicker", "contact_kicker", content.contactKicker)}
    ${bilingual("Contact heading", "contact_title", content.contactTitle)}
    ${bilingual("Footer text", "footer_text", content.footerText)}
  </div>`;

const websiteFeatured = (runtime: WebsiteRuntimeData): string => `
  <div class="admin-section-heading"><h3>Featured content</h3><p>Only records with Published status are included when a Website release is created.</p></div>
  <div class="admin-site-featured">
    <h4>Projects</h4>
    ${runtime.projects.map((item) => `<label><input type="checkbox" name="featured_project" value="${escapeHtml(item.id)}"${item.featured ? " checked" : ""}><span><strong>${escapeHtml(item.name.en)}</strong><small>${item.status} · ${escapeHtml(item.slug)}</small></span></label>`).join("")}
    <h4>Automation tools</h4>
    ${runtime.tools.map((item) => `<label><input type="checkbox" name="featured_tool" value="${escapeHtml(item.id)}"${item.featured ? " checked" : ""}><span><strong>${escapeHtml(item.name)}</strong><small>${item.status} · ${escapeHtml(item.slug)}</small></span></label>`).join("")}
  </div>`;

const readWebsiteForm = (formElement: HTMLFormElement): WebsiteRuntimeData => {
  const current = state.runtime!;
  const form = new FormData(formElement);
  const projectIds = new Set(form.getAll("featured_project").map(String));
  const toolIds = new Set(form.getAll("featured_tool").map(String));
  const content: WebsiteContent = {
    ...current.content,
    version: value(form, "website_version") || websiteContentSeed.version,
    seoTitle: readLocalized(form, "seo_title"),
    seoDescription: readLocalized(form, "seo_description"),
    navigation: {
      expertise: readLocalized(form, "nav_expertise"),
      experience: readLocalized(form, "nav_experience"),
      projects: readLocalized(form, "nav_projects"),
      automation: readLocalized(form, "nav_automation"),
    },
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

const profileIdentity = (professional: ProfessionalProfileContent): string => `
  <div class="admin-section-heading"><h3>Professional identity</h3><p>This is the shared source for Website, CV, Portfolio sync and Cover Letter sender details.</p></div>
  <div class="admin-form-grid">
    ${field("Full name", "profile_name", professional.profile.name)}
    ${field("Email", "profile_email", professional.profile.email, "email")}
    ${field("Phone", "profile_phone", professional.profile.phone, "tel")}
    ${field("Photo path", "profile_photo", professional.profile.photoPath)}
    ${field("Professional title (English)", "profile_title_en", professional.profile.professionalTitle.en)}
    ${field("Professional title (Vietnamese)", "profile_title_vi", professional.profile.professionalTitle.vi)}
    ${field("Location (English)", "profile_location_en", professional.profile.location.en)}
    ${field("Location (Vietnamese)", "profile_location_vi", professional.profile.location.vi)}
  </div>
  <div class="admin-site-bilingual">${area("Summary (English)", "profile_summary_en", professional.profile.summary.en, 6)}${area("Summary (Vietnamese)", "profile_summary_vi", professional.profile.summary.vi, 6)}</div>`;

const profileExperience = (professional: ProfessionalProfileContent): string => `
  <div class="admin-section-heading"><h3>Experience</h3><p>Shared career history used by Website and CV.</p></div>
  <div class="admin-document-cards">${professional.experiences.map((item, index) => `<article><h4>${escapeHtml(item.company)}</h4><div class="admin-form-grid">
    ${field("Company", `profile_experience_company_${index}`, item.company)}
    ${field("Position (English)", `profile_experience_position_en_${index}`, item.position.en)}
    ${field("Position (Vietnamese)", `profile_experience_position_vi_${index}`, item.position.vi)}
    ${field("Location (English)", `profile_experience_location_en_${index}`, item.location.en)}
    ${field("Location (Vietnamese)", `profile_experience_location_vi_${index}`, item.location.vi)}
    ${field("Start", `profile_experience_start_${index}`, item.startDate, "month")}
    ${field("End (blank = Present)", `profile_experience_end_${index}`, item.endDate ?? "", "month")}
  </div>${area("Responsibilities (one English item per line)", `profile_experience_responsibilities_${index}`, item.responsibilities.map((point) => point.text.en).join("\n"), 4)}${field("Technologies", `profile_experience_technologies_${index}`, item.technologies.join(", "))}</article>`).join("")}</div>`;

const profileEducation = (professional: ProfessionalProfileContent): string => `
  <div class="admin-section-heading"><h3>Education</h3><p>Education is stored once and included in CV snapshots.</p></div>
  <div class="admin-document-cards">${professional.education.map((item, index) => `<article><h4>Education ${index + 1}</h4><div class="admin-form-grid">
    ${field("Field (English)", `profile_education_field_en_${index}`, item.field.en)}
    ${field("Field (Vietnamese)", `profile_education_field_vi_${index}`, item.field.vi)}
    ${field("Institution (English)", `profile_education_institution_en_${index}`, item.institution.en)}
    ${field("Institution (Vietnamese)", `profile_education_institution_vi_${index}`, item.institution.vi)}
    ${field("Start year", `profile_education_start_${index}`, item.startDate)}
    ${field("End year", `profile_education_end_${index}`, item.endDate)}
  </div></article>`).join("")}</div>`;

const profileSkills = (professional: ProfessionalProfileContent): string => `
  <div class="admin-section-heading"><h3>Skills & languages</h3><p>These lists feed the Website expertise section and CV.</p></div>
  <div class="admin-document-cards">
    ${professional.skillGroups.map((group, index) => `<article><h4>${escapeHtml(group.title.en)}</h4><div class="admin-form-grid">${field("Group title (English)", `profile_skill_title_en_${index}`, group.title.en)}${field("Group title (Vietnamese)", `profile_skill_title_vi_${index}`, group.title.vi)}</div>${area("Items (one per line)", `profile_skill_items_${index}`, group.items.map((item) => item.label.en).join("\n"), 5)}</article>`).join("")}
    ${professional.languages.map((item, index) => `<article><h4>Language ${index + 1}</h4><div class="admin-form-grid">${field("Name (English)", `profile_language_name_en_${index}`, item.name.en)}${field("Name (Vietnamese)", `profile_language_name_vi_${index}`, item.name.vi)}${field("Proficiency (English)", `profile_language_level_en_${index}`, item.proficiency?.en ?? "")}${field("Proficiency (Vietnamese)", `profile_language_level_vi_${index}`, item.proficiency?.vi ?? "")}</div></article>`).join("")}
  </div>`;

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
  return `<section class="admin-site-workspace">
    <header class="admin-document-header"><div><p class="section-kicker">Website</p><h1>Homepage</h1><p><span class="status status--draft">Draft</span>${latest ? `Published ${new Date(latest.publishedAt).toLocaleString()} · ${escapeHtml(latest.version)}` : "Not published yet"}</p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button button--secondary admin-action-save" type="submit" form="website-editor-form">Save draft</button><button class="button admin-action-publish" type="button" data-publish-website>Publish</button></div></header>
    <div class="admin-document-layout">
      <section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Website editor sections">${([["general","General & SEO"],["navigation","Navigation"],["sections","Sections"],["featured","Featured content"],["appearance","Appearance"]] as Array<[WebsiteTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-website-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav>
        <form id="website-editor-form" data-website-form>
          <section data-website-panel="general"${tab === "general" ? "" : " hidden"}>${websiteGeneral(content)}</section>
          <section data-website-panel="navigation"${tab === "navigation" ? "" : " hidden"}>${websiteNavigation(content)}</section>
          <section data-website-panel="sections"${tab === "sections" ? "" : " hidden"}>${websiteSections(content)}</section>
          <section data-website-panel="featured"${tab === "featured" ? "" : " hidden"}>${websiteFeatured(runtime)}</section>
          <section data-website-panel="appearance"${tab === "appearance" ? "" : " hidden"}><div class="admin-section-heading"><h3>Website appearance</h3><p>Use a controlled brand theme while preserving the existing layout.</p></div>${themeFields(content.theme)}</section>
        </form>
      </section>
      <aside class="admin-site-preview"><div class="admin-document-preview__toolbar"><div><strong>Website draft preview</strong><span>Desktop-first preview with responsive checkpoints</span></div><div>${(["desktop","laptop","tablet","mobile"] as const).map((size) => `<button type="button" data-website-viewport="${size}" class="${state.zoom === size ? "is-active" : ""}">${size[0].toUpperCase() + size.slice(1)}</button>`).join("")}<a href="${import.meta.env.BASE_URL}" target="_blank" rel="noreferrer">Public ↗</a></div></div><div class="admin-site-frame" data-viewport="${state.zoom}" tabindex="0" aria-label="Scrollable website preview"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="Website draft preview" src="${import.meta.env.BASE_URL}?preview=1&embedded=1" data-website-iframe scrolling="no" tabindex="-1"></iframe></div></div><details class="admin-document-releases"><summary>Website release history (${state.releases.length})</summary>${state.releases.length ? `<ol>${state.releases.map((item) => `<li><strong>${escapeHtml(item.version)}</strong><span>${new Date(item.publishedAt).toLocaleString()}</span></li>`).join("")}</ol>` : "<p>No release has been published.</p>"}</details></aside>
    </div>
  </section>`;
};

const profileView = (): string => {
  const professional = state.runtime!.professional;
  const tab = state.profileTab;
  return `<section class="admin-profile-workspace"><header class="admin-document-header"><div><p class="section-kicker">Shared content</p><h1>Professional Profile</h1><p>Single source for Website, Curriculum Vitae, Portfolio and Cover Letters</p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button admin-action-save" type="submit" form="profile-editor-form">Save changes</button></div></header><div class="admin-profile-layout"><section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Professional Profile sections">${([["identity","Identity"],["experience","Experience"],["education","Education"],["skills","Skills & languages"]] as Array<[ProfileTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-profile-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav><form id="profile-editor-form" data-profile-form><section data-profile-panel="identity"${tab === "identity" ? "" : " hidden"}>${profileIdentity(professional)}</section><section data-profile-panel="experience"${tab === "experience" ? "" : " hidden"}>${profileExperience(professional)}</section><section data-profile-panel="education"${tab === "education" ? "" : " hidden"}>${profileEducation(professional)}</section><section data-profile-panel="skills"${tab === "skills" ? "" : " hidden"}>${profileSkills(professional)}</section></form></section><aside class="admin-profile-usage"><p class="section-kicker">Used by</p><h2>One profile, four outputs</h2><div><article><strong>Website</strong><span>Applied when the next Website release is published.</span></article><article><strong>Curriculum Vitae</strong><span>Loaded into the CV working draft and frozen on publish.</span></article><article><strong>Portfolio</strong><span>Use “Sync from CV draft” before publishing when overrides are not needed.</span></article><article><strong>Cover Letters</strong><span>Provides the sender identity and reusable professional evidence.</span></article></div><p>Published releases remain unchanged until you publish each channel again.</p></aside></div></section>`;
};

export const siteWorkspaceView = (kind: SiteWorkspaceKind): string => {
  if (state.loading) return '<section class="admin-document-loading"><span></span><h2>Loading website workspace…</h2></section>';
  if (state.error) return `<section class="admin-placeholder"><p class="section-kicker">Website CMS</p><h2>Could not load workspace</h2><p>${escapeHtml(state.error)}</p><p>Apply the latest Supabase migration, then reload Admin.</p></section>`;
  if (!state.runtime) return '<section class="admin-document-loading"><span></span><h2>Preparing workspace…</h2></section>';
  return kind === "homepage" ? websiteView() : profileView();
};

const sendPreview = (form: HTMLFormElement): void => {
  const iframe = document.querySelector<HTMLIFrameElement>("[data-website-iframe]");
  iframe?.contentWindow?.postMessage({ type: "hdl:website-preview", data: readWebsiteForm(form) }, window.location.origin);
  previewController?.refresh();
};

export const discardSiteChanges = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewController?.disconnect();
  previewController = undefined;
};

export const bindSiteWorkspace = (root: ParentNode, _kind: SiteWorkspaceKind, callbacks: WorkspaceCallbacks): void => {
  const websiteForm = root.querySelector<HTMLFormElement>("[data-website-form]");
  const profileForm = root.querySelector<HTMLFormElement>("[data-profile-form]");
  const previewIframe = root.querySelector<HTMLIFrameElement>("[data-website-iframe]");
  const previewStage = root.querySelector<HTMLElement>("[data-embedded-preview-stage]");
  previewController?.disconnect();
  previewController = previewIframe && previewStage
    ? bindEmbeddedPreview(previewIframe, previewStage, { measurementHeight: 900 })
    : undefined;
  const markDirty = (): void => {
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-site-save-state]");
    if (status) status.textContent = "Unsaved changes";
    if (websiteForm) {
      if (previewTimer !== undefined) window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => sendPreview(websiteForm), 180);
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
  root.querySelector<HTMLIFrameElement>("[data-website-iframe]")?.addEventListener("load", () => {
    if (websiteForm) sendPreview(websiteForm);
  });
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
    state.zoom = button.dataset.websiteViewport as typeof state.zoom;
    const frame = root.querySelector<HTMLElement>(".admin-site-frame");
    if (frame) frame.dataset.viewport = state.zoom;
    previewController?.refresh();
    root.querySelectorAll<HTMLButtonElement>("[data-website-viewport]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  websiteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      const runtime = readWebsiteForm(websiteForm);
      await Promise.all([saveWebsiteContent(runtime.content), saveWebsiteFeatured(runtime)]);
      state.runtime = runtime;
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website draft saved. Public pages are unchanged until publish.", "success");
    })().catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      const professional = readProfileForm(profileForm);
      await saveProfessionalProfile(professional);
      state.runtime = { ...state.runtime!, professional };
      invalidateProfileDocumentWorkspace();
      updateCoverLetterSharedProfile(professional);
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Professional Profile saved. Publish each channel when ready.", "success");
    })().catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector("[data-publish-website]")?.addEventListener("click", () => {
    if (!websiteForm || !window.confirm("Publish the current Website draft as a new public release?")) return;
    void (async () => {
      const runtime = readWebsiteForm(websiteForm);
      await saveWebsiteContent(runtime.content);
      await saveWebsiteFeatured(runtime);
      state.runtime = runtime;
      await publishWebsiteRelease();
      state.releases = await listWebsiteReleases();
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website release published. All public pages now use this snapshot.", "success");
    })().catch((error: Error) => callbacks.notify(error.message, "error"));
  });
};
