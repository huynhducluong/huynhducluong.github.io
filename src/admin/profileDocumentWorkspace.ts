import { cvContentSeed } from "../data/cvSeed";
import { portfolioContentSeed } from "../data/portfolioSeed";
import {
  listDocumentReleases,
  loadPortfolioDraftData,
  publishPortfolioRelease,
  savePortfolioContent,
  savePortfolioSelection,
} from "../services/documentRepository";
import { loadCvData, publishCvRelease, saveCvContent } from "../services/cvRepository";
import { escapeHtml } from "../shared/format";
import { documentThemes, resolveDocumentTheme } from "../themes/documentThemes";
import type { CvContent, CvRuntimeData } from "../types/cvContent";
import type { DocumentReleaseSummary, PortfolioContent, PortfolioRuntimeData } from "../types/portfolio";
import type { StoredDocumentTheme } from "../types/theme";

export type ProfileDocumentKind = "cv" | "portfolio";
type DocumentTab = "content" | "experience" | "education" | "selection" | "appearance";

interface WorkspaceCallbacks {
  rerender: () => void;
  setDirty: (value: boolean) => void;
  notify: (message: string, kind?: "info" | "error" | "success") => void;
}

const state: {
  cv: CvRuntimeData | null;
  portfolio: PortfolioRuntimeData | null;
  releases: Record<ProfileDocumentKind, DocumentReleaseSummary[]>;
  loading: Set<ProfileDocumentKind>;
  errors: Partial<Record<ProfileDocumentKind, string>>;
  tab: Record<ProfileDocumentKind, DocumentTab>;
  zoom: Record<ProfileDocumentKind, "fit" | "75" | "100">;
} = {
  cv: null,
  portfolio: null,
  releases: { cv: [], portfolio: [] },
  loading: new Set(),
  errors: {},
  tab: { cv: "content", portfolio: "content" },
  zoom: { cv: "fit", portfolio: "fit" },
};

let previewTimer: number | undefined;

const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (value: string): string[] => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);
const field = (label: string, name: string, value: string, type = "text"): string =>
  `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"></label>`;
const area = (label: string, name: string, value: string, rows = 5): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(value)}</textarea></label>`;

const themeFields = (theme: StoredDocumentTheme): string => {
  const resolved = resolveDocumentTheme(theme);
  return `
    <div class="admin-document-theme">
      <label>Theme preset<select name="theme_preset">
        ${documentThemes.map((item) => `<option value="${item.id}"${theme.presetId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
        <option value="custom"${theme.presetId === "custom" ? " selected" : ""}>Custom</option>
      </select></label>
      <label>Primary color<input name="theme_primary" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"></label>
      <label>Accent color<input name="theme_accent" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"></label>
    </div>
    <p class="admin-form-help">Colors are stored in the working draft and frozen inside every published release.</p>`;
};

const readTheme = (form: FormData): StoredDocumentTheme => {
  const presetId = text(form, "theme_preset") || "personal-blue";
  return presetId === "custom"
    ? { presetId, primary: text(form, "theme_primary"), accent: text(form, "theme_accent") }
    : { presetId };
};

export const ensureProfileDocumentWorkspace = async (kind: ProfileDocumentKind): Promise<void> => {
  if (state.loading.has(kind) || state[kind]) return;
  state.loading.add(kind);
  delete state.errors[kind];
  try {
    if (kind === "cv") {
      const [runtime, releases] = await Promise.all([
        loadCvData({ adminPreview: true, preferRelease: false }),
        listDocumentReleases("cv_releases"),
      ]);
      state.cv = runtime;
      state.releases.cv = releases;
    } else {
      const [runtime, releases] = await Promise.all([
        loadPortfolioDraftData(),
        listDocumentReleases("portfolio_releases"),
      ]);
      state.portfolio = runtime;
      state.releases.portfolio = releases;
    }
  } catch (error) {
    state.errors[kind] = error instanceof Error ? error.message : "Document workspace could not be loaded.";
  } finally {
    state.loading.delete(kind);
  }
};

const latestRelease = (kind: ProfileDocumentKind): string => {
  const release = state.releases[kind][0];
  return release ? `Published ${new Date(release.publishedAt).toLocaleString()} · ${escapeHtml(release.version)}` : "No public release yet";
};

const cvContentPanel = (content: CvContent): string => `
  <div class="admin-section-heading"><h3>Profile & document</h3><p>Core identity and summary used by the CV.</p></div>
  <div class="admin-form-grid">
    ${field("CV version", "cv_version", content.version)}
    ${field("Detailed projects on page 1", "page_one_project_count", String(content.pageOneProjectCount), "number")}
    ${field("Full name", "profile_name", content.profile.name)}
    ${field("Professional title (English)", "profile_title_en", content.profile.professionalTitle.en)}
    ${field("Professional title (Vietnamese)", "profile_title_vi", content.profile.professionalTitle.vi)}
    ${field("Email", "profile_email", content.profile.email, "email")}
    ${field("Phone", "profile_phone", content.profile.phone, "tel")}
    ${field("Photo path", "profile_photo", content.profile.photoPath)}
    ${field("Location (English)", "profile_location_en", content.profile.location.en)}
    ${field("Location (Vietnamese)", "profile_location_vi", content.profile.location.vi)}
  </div>
  ${area("Professional summary (English)", "profile_summary_en", content.profile.summary.en)}
  ${area("Professional summary (Vietnamese)", "profile_summary_vi", content.profile.summary.vi)}`;

const cvExperiencePanel = (content: CvContent): string => `
  <div class="admin-section-heading"><h3>Professional experience</h3><p>Edit the entries that appear in the CV sidebar.</p></div>
  <div class="admin-document-cards">${content.experiences.map((item, index) => `
    <article>
      <input type="hidden" name="experience_id_${index}" value="${escapeHtml(item.id)}">
      <h4>${escapeHtml(item.company || `Experience ${index + 1}`)}</h4>
      <div class="admin-form-grid">
        ${field("Company", `experience_company_${index}`, item.company)}
        ${field("Position (English)", `experience_position_en_${index}`, item.position.en)}
        ${field("Position (Vietnamese)", `experience_position_vi_${index}`, item.position.vi)}
        ${field("Location (English)", `experience_location_en_${index}`, item.location.en)}
        ${field("Location (Vietnamese)", `experience_location_vi_${index}`, item.location.vi)}
        ${field("Start", `experience_start_${index}`, item.startDate, "month")}
        ${field("End (blank = Present)", `experience_end_${index}`, item.endDate ?? "", "month")}
      </div>
      ${area("Responsibilities (one English item per line)", `experience_responsibilities_${index}`, item.responsibilities.map((point) => point.text.en).join("\n"), 4)}
      ${field("Technologies (comma separated)", `experience_technologies_${index}`, item.technologies.join(", "))}
    </article>`).join("")}</div>`;

const cvEducationPanel = (content: CvContent): string => `
  <div class="admin-section-heading"><h3>Education, skills & languages</h3><p>Keep compact lists concise to protect the two-page layout.</p></div>
  <div class="admin-document-cards">
    ${content.education.map((item, index) => `<article><h4>Education ${index + 1}</h4><div class="admin-form-grid">
      ${field("Field (English)", `education_field_en_${index}`, item.field.en)}
      ${field("Field (Vietnamese)", `education_field_vi_${index}`, item.field.vi)}
      ${field("Institution (English)", `education_institution_en_${index}`, item.institution.en)}
      ${field("Institution (Vietnamese)", `education_institution_vi_${index}`, item.institution.vi)}
      ${field("Start year", `education_start_${index}`, item.startDate)}
      ${field("End year", `education_end_${index}`, item.endDate)}
    </div></article>`).join("")}
    ${content.skillGroups.map((group, index) => `<article><h4>${escapeHtml(group.title.en)}</h4><div class="admin-form-grid">
      ${field("Group title (English)", `skill_title_en_${index}`, group.title.en)}
      ${field("Group title (Vietnamese)", `skill_title_vi_${index}`, group.title.vi)}
    </div>${area("Items (one per line)", `skill_items_${index}`, group.items.map((item) => item.label.en).join("\n"), 5)}</article>`).join("")}
    ${content.languages.map((item, index) => `<article><h4>Language ${index + 1}</h4><div class="admin-form-grid">
      ${field("Language (English)", `language_name_en_${index}`, item.name.en)}
      ${field("Language (Vietnamese)", `language_name_vi_${index}`, item.name.vi)}
      ${field("Proficiency (English)", `language_proficiency_en_${index}`, item.proficiency?.en ?? "")}
      ${field("Proficiency (Vietnamese)", `language_proficiency_vi_${index}`, item.proficiency?.vi ?? "")}
    </div></article>`).join("")}
  </div>`;

const cvSelectionPanel = (runtime: CvRuntimeData): string => `
  <div class="admin-section-heading"><h3>Projects & automation</h3><p>Selection and order are managed on each Project or Automation tool under “Website, CV & Portfolio”.</p></div>
  <div class="admin-document-summary-grid">
    <article><strong>${runtime.detailedProjects.length}</strong><span>Detailed projects</span><ul>${runtime.detailedProjects.map((item) => `<li>${escapeHtml(item.name.en)}</li>`).join("")}</ul></article>
    <article><strong>${runtime.compactProjects.length}</strong><span>Compact projects</span><ul>${runtime.compactProjects.map((item) => `<li>${escapeHtml(item.name.en)}</li>`).join("")}</ul></article>
    <article><strong>${runtime.tools.length}</strong><span>Automation tools</span><ul>${runtime.tools.map((item) => `<li>${escapeHtml(item.name)}</li>`).join("")}</ul></article>
  </div>`;

const readCvForm = (formElement: HTMLFormElement): CvContent => {
  const current = state.cv?.content ?? structuredClone(cvContentSeed);
  const form = new FormData(formElement);
  return {
    version: text(form, "cv_version") || current.version,
    themeId: readTheme(form).presetId,
    theme: readTheme(form),
    pageOneProjectCount: Math.max(1, Number(form.get("page_one_project_count")) || 3),
    profile: {
      name: text(form, "profile_name"),
      professionalTitle: { en: text(form, "profile_title_en"), vi: text(form, "profile_title_vi") },
      email: text(form, "profile_email"),
      phone: text(form, "profile_phone"),
      photoPath: text(form, "profile_photo"),
      location: { en: text(form, "profile_location_en"), vi: text(form, "profile_location_vi") },
      summary: { en: text(form, "profile_summary_en"), vi: text(form, "profile_summary_vi") },
    },
    experiences: current.experiences.map((item, index) => {
      const responsibilityLines = lines(text(form, `experience_responsibilities_${index}`));
      return {
        ...item,
        company: text(form, `experience_company_${index}`),
        position: { en: text(form, `experience_position_en_${index}`), vi: text(form, `experience_position_vi_${index}`) },
        location: { en: text(form, `experience_location_en_${index}`), vi: text(form, `experience_location_vi_${index}`) },
        startDate: text(form, `experience_start_${index}`),
        endDate: text(form, `experience_end_${index}`) || null,
        responsibilities: responsibilityLines.map((value, pointIndex) => ({
          id: item.responsibilities[pointIndex]?.id ?? `${item.id}-${pointIndex + 1}`,
          text: { en: value, vi: item.responsibilities[pointIndex]?.text.vi ?? "" },
        })),
        technologies: commaList(text(form, `experience_technologies_${index}`)),
      };
    }),
    education: current.education.map((item, index) => ({
      ...item,
      field: { en: text(form, `education_field_en_${index}`), vi: text(form, `education_field_vi_${index}`) },
      institution: { en: text(form, `education_institution_en_${index}`), vi: text(form, `education_institution_vi_${index}`) },
      startDate: text(form, `education_start_${index}`),
      endDate: text(form, `education_end_${index}`),
    })),
    skillGroups: current.skillGroups.map((group, index) => ({
      ...group,
      title: { en: text(form, `skill_title_en_${index}`), vi: text(form, `skill_title_vi_${index}`) },
      items: lines(text(form, `skill_items_${index}`)).map((value, itemIndex) => ({
        id: group.items[itemIndex]?.id ?? `${group.id}-${itemIndex + 1}`,
        label: { en: value, vi: group.items[itemIndex]?.label.vi ?? value },
      })),
    })),
    languages: current.languages.map((item, index) => ({
      ...item,
      name: { en: text(form, `language_name_en_${index}`), vi: text(form, `language_name_vi_${index}`) },
      proficiency: { en: text(form, `language_proficiency_en_${index}`), vi: text(form, `language_proficiency_vi_${index}`) },
    })),
  };
};

const portfolioContentPanel = (content: PortfolioContent): string => `
  <div class="admin-section-heading"><h3>Cover & document settings</h3><p>These values belong to the working Portfolio draft.</p></div>
  <div class="admin-form-grid">
    ${field("Portfolio version", "portfolio_version", content.version)}
    ${field("Cover year", "portfolio_year", content.year)}
    ${field("Document title", "portfolio_title", content.title)}
    ${field("Cover kicker", "portfolio_kicker", content.kicker)}
    ${field("Full name", "portfolio_name", content.profile.name)}
    ${field("Professional title", "portfolio_profile_title", content.profile.professionalTitle.en)}
    ${field("Email", "portfolio_email", content.profile.email, "email")}
    ${field("Phone", "portfolio_phone", content.profile.phone, "tel")}
  </div>
  ${area("Profile summary", "portfolio_summary", content.profile.summary.en)}
  <div class="admin-section-heading"><h3>About & closing pages</h3></div>
  <div class="admin-form-grid">
    ${field("About kicker", "about_kicker", content.aboutKicker)}
    ${field("About heading", "about_heading", content.aboutHeading)}
    ${field("Closing kicker", "closing_kicker", content.closingKicker)}
    ${field("Closing heading", "closing_heading", content.closingHeading)}
  </div>
  ${area("Closing text", "closing_text", content.closingText, 3)}
  <button class="button button--secondary" type="button" data-sync-cv-profile>Sync profile & skills from CV draft</button>`;

const portfolioSelectionPanel = (runtime: PortfolioRuntimeData): string => `
  <div class="admin-section-heading"><h3>Portfolio pages</h3><p>Select and order the records that will be frozen into the next release.</p></div>
  <div class="admin-document-selection">
    <h4>Projects</h4>
    ${runtime.projects.map((item) => `<article><label class="admin-switch"><input type="checkbox" name="portfolio_project" value="${escapeHtml(item.id)}"${item.includeInPortfolio ? " checked" : ""}><span>${escapeHtml(item.name.en)}</span></label><input aria-label="Order" name="project_order_${escapeHtml(item.id)}" type="number" value="${item.portfolioOrder}"><select aria-label="Layout" name="project_layout_${escapeHtml(item.id)}"><option value="feature"${item.portfolioLayout === "feature" ? " selected" : ""}>Feature</option><option value="standard"${item.portfolioLayout === "standard" ? " selected" : ""}>Standard</option><option value="compact"${item.portfolioLayout === "compact" ? " selected" : ""}>Compact</option></select><span class="status status--${item.status}">${item.status}</span></article>`).join("")}
    <h4>Automation tools</h4>
    ${runtime.tools.map((item) => `<article><label class="admin-switch"><input type="checkbox" name="portfolio_tool" value="${escapeHtml(item.id)}"${item.includeInPortfolio ? " checked" : ""}><span>${escapeHtml(item.name)}</span></label><input aria-label="Order" name="tool_order_${escapeHtml(item.id)}" type="number" value="${item.portfolioOrder}"><span></span><span class="status status--${item.status}">${item.status}</span></article>`).join("")}
  </div>`;

const readPortfolioForm = (formElement: HTMLFormElement): PortfolioRuntimeData => {
  const current = state.portfolio ?? { content: structuredClone(portfolioContentSeed), projects: [], tools: [] };
  const form = new FormData(formElement);
  const projectIds = new Set(form.getAll("portfolio_project").map(String));
  const toolIds = new Set(form.getAll("portfolio_tool").map(String));
  const content: PortfolioContent = {
    ...current.content,
    version: text(form, "portfolio_version") || current.content.version,
    year: text(form, "portfolio_year"),
    title: text(form, "portfolio_title"),
    kicker: text(form, "portfolio_kicker"),
    aboutKicker: text(form, "about_kicker"),
    aboutHeading: text(form, "about_heading"),
    closingKicker: text(form, "closing_kicker"),
    closingHeading: text(form, "closing_heading"),
    closingText: text(form, "closing_text"),
    theme: readTheme(form),
    profile: {
      ...current.content.profile,
      name: text(form, "portfolio_name"),
      professionalTitle: { ...current.content.profile.professionalTitle, en: text(form, "portfolio_profile_title") },
      email: text(form, "portfolio_email"),
      phone: text(form, "portfolio_phone"),
      summary: { ...current.content.profile.summary, en: text(form, "portfolio_summary") },
    },
  };
  return {
    content,
    projects: current.projects.map((item) => ({
      ...item,
      includeInPortfolio: projectIds.has(item.id),
      portfolioOrder: Number(form.get(`project_order_${item.id}`)) || 100,
      portfolioLayout: String(form.get(`project_layout_${item.id}`) ?? item.portfolioLayout) as typeof item.portfolioLayout,
    })),
    tools: current.tools.map((item) => ({
      ...item,
      includeInPortfolio: toolIds.has(item.id),
      portfolioOrder: Number(form.get(`tool_order_${item.id}`)) || 100,
    })),
  };
};

const validation = (kind: ProfileDocumentKind): string[] => {
  if (kind === "cv") {
    const data = state.cv;
    if (!data) return ["CV draft is not loaded."];
    return [
      !data.content.profile.name && "Full name is required.",
      !data.content.profile.email && "Email is required.",
      !data.detailedProjects.length && "Select at least one detailed CV project.",
    ].filter((item): item is string => Boolean(item));
  }
  const data = state.portfolio;
  if (!data) return ["Portfolio draft is not loaded."];
  return [
    !data.content.title && "Document title is required.",
    !data.projects.some((item) => item.includeInPortfolio) && "Select at least one Portfolio project.",
  ].filter((item): item is string => Boolean(item));
};

const tabs = (kind: ProfileDocumentKind): Array<[DocumentTab, string]> => kind === "cv"
  ? [["content", "Profile"], ["experience", "Experience"], ["education", "Education & skills"], ["selection", "Projects & tools"], ["appearance", "Appearance"]]
  : [["content", "Content"], ["selection", "Projects & tools"], ["appearance", "Appearance"]];

export const profileDocumentWorkspaceView = (kind: ProfileDocumentKind): string => {
  if (state.loading.has(kind)) return '<section class="admin-document-loading"><span></span><h2>Loading document workspace…</h2></section>';
  if (state.errors[kind]) return `<section class="admin-placeholder"><p class="section-kicker">Document workspace</p><h2>Could not load ${kind === "cv" ? "Curriculum Vitae" : "Portfolio"}</h2><p>${escapeHtml(state.errors[kind] ?? "")}</p><p>Apply the latest Supabase migration, then reload Admin.</p></section>`;
  const runtime = kind === "cv" ? state.cv : state.portfolio;
  if (!runtime) return '<section class="admin-document-loading"><span></span><h2>Preparing workspace…</h2></section>';
  const content = runtime.content;
  const activeTab = state.tab[kind];
  const issues = validation(kind);
  const publicPath = kind === "cv" ? "cv/" : "portfolio/";
  const previewPath = `${publicPath}?preview=1&embedded=1`;
  const contentPanel = kind === "cv" ? cvContentPanel(content as CvContent) : portfolioContentPanel(content as PortfolioContent);
  const selectionPanel = kind === "cv" ? cvSelectionPanel(runtime as CvRuntimeData) : portfolioSelectionPanel(runtime as PortfolioRuntimeData);
  const experiencePanel = kind === "cv" ? cvExperiencePanel(content as CvContent) : "";
  const educationPanel = kind === "cv" ? cvEducationPanel(content as CvContent) : "";
  return `
    <section class="admin-document-workspace" data-document-kind="${kind}">
      <header class="admin-document-header">
        <div><p class="section-kicker">Profile & documents</p><h1>${kind === "cv" ? "Curriculum Vitae" : "Portfolio"}</h1><p><span class="status status--draft">Working draft</span> ${latestRelease(kind)}</p></div>
        <div class="admin-document-actions">
          <span data-document-save-state>All changes saved</span>
          <button class="button button--secondary" type="button" data-document-print>Print / Save PDF</button>
          <button class="button button--secondary" type="submit" form="${kind}-document-form">Save draft</button>
          <button class="button" type="button" data-document-publish>Publish release</button>
        </div>
      </header>
      <div class="admin-document-layout">
        <section class="admin-document-editor">
          <nav class="admin-document-tabs" aria-label="Document editor sections">
            ${tabs(kind).map(([id, label]) => `<button type="button" data-document-tab="${id}" class="${activeTab === id ? "is-active" : ""}">${label}</button>`).join("")}
          </nav>
          <form id="${kind}-document-form" data-document-form>
            <section data-document-panel="content"${activeTab === "content" ? "" : " hidden"}>${contentPanel}</section>
            ${kind === "cv" ? `<section data-document-panel="experience"${activeTab === "experience" ? "" : " hidden"}>${experiencePanel}</section><section data-document-panel="education"${activeTab === "education" ? "" : " hidden"}>${educationPanel}</section>` : ""}
            <section data-document-panel="selection"${activeTab === "selection" ? "" : " hidden"}>${selectionPanel}</section>
            <section data-document-panel="appearance"${activeTab === "appearance" ? "" : " hidden"}><div class="admin-section-heading"><h3>Brand colors</h3><p>Appearance is saved with the draft and becomes read-only after publishing.</p></div>${themeFields(content.theme)}</section>
          </form>
        </section>
        <aside class="admin-document-preview">
          <div class="admin-document-preview__toolbar"><div><strong>Draft preview</strong><span>${issues.length ? `${issues.length} item${issues.length === 1 ? "" : "s"} need attention` : "Ready to publish"}</span></div><div><button type="button" data-document-zoom="fit" class="${state.zoom[kind] === "fit" ? "is-active" : ""}">Fit</button><button type="button" data-document-zoom="75" class="${state.zoom[kind] === "75" ? "is-active" : ""}">75%</button><button type="button" data-document-zoom="100" class="${state.zoom[kind] === "100" ? "is-active" : ""}">100%</button><a href="${import.meta.env.BASE_URL + publicPath}" target="_blank" rel="noreferrer">Public ↗</a></div></div>
          <div class="admin-document-frame admin-document-frame--${kind}" data-zoom="${state.zoom[kind]}"><iframe title="${kind === "cv" ? "CV" : "Portfolio"} draft preview" src="${import.meta.env.BASE_URL + previewPath}" data-document-iframe></iframe></div>
          <div class="admin-document-validation"><strong>Pre-publish check</strong>${issues.length ? `<ul>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Required content and document selection are ready.</p>"}</div>
          <details class="admin-document-releases"><summary>Release history (${state.releases[kind].length})</summary>${state.releases[kind].length ? `<ol>${state.releases[kind].map((item) => `<li><strong>${escapeHtml(item.version)}</strong><span>${new Date(item.publishedAt).toLocaleString()}</span></li>`).join("")}</ol>` : "<p>No release has been published.</p>"}</details>
        </aside>
      </div>
    </section>`;
};

const previewPayload = (kind: ProfileDocumentKind, form: HTMLFormElement): CvRuntimeData | PortfolioRuntimeData => {
  if (kind === "cv") {
    const runtime = state.cv!;
    return { ...runtime, content: readCvForm(form) };
  }
  return readPortfolioForm(form);
};

const sendPreview = (kind: ProfileDocumentKind, form: HTMLFormElement): void => {
  const frame = document.querySelector<HTMLIFrameElement>("[data-document-iframe]");
  frame?.contentWindow?.postMessage({ type: `hdl:${kind}-preview`, data: previewPayload(kind, form) }, window.location.origin);
};

export const discardProfileDocumentChanges = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
};

export const invalidateProfileDocumentWorkspace = (): void => {
  state.cv = null;
};

export const bindProfileDocumentWorkspace = (root: ParentNode, kind: ProfileDocumentKind, callbacks: WorkspaceCallbacks): void => {
  const form = root.querySelector<HTMLFormElement>("[data-document-form]");
  const iframe = root.querySelector<HTMLIFrameElement>("[data-document-iframe]");
  if (!form) return;
  const markDirty = (): void => {
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-document-save-state]");
    if (status) status.textContent = "Unsaved changes";
    if (previewTimer !== undefined) window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => sendPreview(kind, form), 180);
  };
  form.addEventListener("input", markDirty);
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement;
    if (target.name === "theme_preset" && target.value !== "custom") {
      const theme = documentThemes.find((item) => item.id === target.value);
      const primary = form.elements.namedItem("theme_primary");
      const accent = form.elements.namedItem("theme_accent");
      if (theme && primary instanceof HTMLInputElement && accent instanceof HTMLInputElement) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    }
    markDirty();
  });
  iframe?.addEventListener("load", () => sendPreview(kind, form));
  root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((button) => button.addEventListener("click", () => {
    state.tab[kind] = button.dataset.documentTab as DocumentTab;
    root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
    root.querySelectorAll<HTMLElement>("[data-document-panel]").forEach((panel) => { panel.hidden = panel.dataset.documentPanel !== state.tab[kind]; });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-document-zoom]").forEach((button) => button.addEventListener("click", () => {
    state.zoom[kind] = button.dataset.documentZoom as typeof state.zoom.cv;
    const frameRoot = root.querySelector<HTMLElement>(".admin-document-frame");
    if (frameRoot) frameRoot.dataset.zoom = state.zoom[kind];
    root.querySelectorAll<HTMLButtonElement>("[data-document-zoom]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  root.querySelector("[data-document-print]")?.addEventListener("click", () => iframe?.contentWindow?.print());
  root.querySelector("[data-sync-cv-profile]")?.addEventListener("click", async () => {
    if (!state.cv) await ensureProfileDocumentWorkspace("cv");
    if (!state.portfolio || !state.cv) return callbacks.notify("CV draft could not be loaded.", "error");
    state.portfolio.content.profile = structuredClone(state.cv.content.profile);
    state.portfolio.content.skillGroups = structuredClone(state.cv.content.skillGroups);
    callbacks.setDirty(true);
    callbacks.rerender();
    callbacks.notify("Portfolio profile and skills synced from the CV draft.", "success");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      if (kind === "cv") {
        const content = readCvForm(form);
        await saveCvContent(content);
        state.cv = { ...state.cv!, content };
      } else {
        const runtime = readPortfolioForm(form);
        await Promise.all([savePortfolioContent(runtime.content), savePortfolioSelection(runtime.projects, runtime.tools)]);
        state.portfolio = runtime;
      }
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify(`${kind === "cv" ? "CV" : "Portfolio"} draft saved.`, "success");
    })().catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector("[data-document-publish]")?.addEventListener("click", () => {
    if (!window.confirm(`Publish the current ${kind === "cv" ? "CV" : "Portfolio"} draft as a new public release?`)) return;
    void (async () => {
      if (kind === "cv") {
        const content = readCvForm(form);
        await saveCvContent(content);
        state.cv = { ...state.cv!, content };
        await publishCvRelease();
        state.releases.cv = await listDocumentReleases("cv_releases");
      } else {
        const runtime = readPortfolioForm(form);
        await savePortfolioContent(runtime.content);
        await savePortfolioSelection(runtime.projects, runtime.tools);
        state.portfolio = runtime;
        await publishPortfolioRelease();
        state.releases.portfolio = await listDocumentReleases("portfolio_releases");
      }
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify(`${kind === "cv" ? "CV" : "Portfolio"} release published. The public page now shows this snapshot.`, "success");
    })().catch((error: Error) => callbacks.notify(error.message, "error"));
  });
};
