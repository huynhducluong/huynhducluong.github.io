import { cvContentSeed } from "../data/cvSeed";
import { portfolioContentSeed } from "../data/portfolioSeed";
import { loadPortfolioDraftData } from "../services/documentRepository";
import { loadCvData } from "../services/cvRepository";
import { loadProfessionalProfile } from "../services/websiteRepository";
import {
  archiveProfileDocument,
  createProfileDocument,
  ensureProfileDocumentLibrary,
  listProfileDocumentReleases,
  listProfileDocuments,
  publishProfileDocument,
  renameProfileDocument,
  saveProfileDocument,
} from "../services/profileDocumentRepository";
import { escapeHtml } from "../shared/format";
import { bindPreviewSender, type PreviewSender } from "../shared/previewProtocol";
import { documentThemes } from "../themes/documentThemes";
import type { CvContent, CvRuntimeData } from "../types/cvContent";
import type { PortfolioContent, PortfolioRuntimeData } from "../types/portfolio";
import type {
  ProfileDocumentKind,
  ProfileDocumentRecord,
  ProfileDocumentReleaseSummary,
  ProfileDocumentStatus,
} from "../types/profileDocument";
import type { StoredDocumentTheme } from "../types/theme";
import { renderDocumentThemeFields } from "./documentThemeFields";
import { bindEmbeddedPreview, type EmbeddedPreviewController } from "./embeddedPreview";
import {
  renderAdminPreviewControlGroup,
  renderAdminPreviewToolbar,
  renderAdminSectionCard,
  setButtonBusy,
} from "./ui";

export type { ProfileDocumentKind } from "../types/profileDocument";
type DocumentTab = "content" | "experience" | "education" | "selection" | "appearance";
type DocumentFilter = ProfileDocumentStatus | "all";

interface WorkspaceCallbacks {
  rerender: () => void;
  setDirty: (value: boolean) => void;
  notify: (message: string, kind?: "info" | "error" | "success") => void;
}

const state: {
  cv: CvRuntimeData | null;
  portfolio: PortfolioRuntimeData | null;
  documents: Record<ProfileDocumentKind, ProfileDocumentRecord[]>;
  selectedId: Record<ProfileDocumentKind, string | null>;
  releases: Record<ProfileDocumentKind, ProfileDocumentReleaseSummary[]>;
  loading: Set<ProfileDocumentKind>;
  loaded: Set<ProfileDocumentKind>;
  errors: Partial<Record<ProfileDocumentKind, string>>;
  tab: Record<ProfileDocumentKind, DocumentTab>;
  zoom: Record<ProfileDocumentKind, "fit" | "75" | "100">;
  filter: Record<ProfileDocumentKind, DocumentFilter>;
  search: Record<ProfileDocumentKind, string>;
  dirty: Record<ProfileDocumentKind, boolean>;
} = {
  cv: null,
  portfolio: null,
  documents: { cv: [], portfolio: [] },
  selectedId: { cv: null, portfolio: null },
  releases: { cv: [], portfolio: [] },
  loading: new Set(),
  loaded: new Set(),
  errors: {},
  tab: { cv: "content", portfolio: "content" },
  zoom: { cv: "fit", portfolio: "fit" },
  filter: { cv: "all", portfolio: "all" },
  search: { cv: "", portfolio: "" },
  dirty: { cv: false, portfolio: false },
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
let previewSender: PreviewSender | undefined;

const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (value: string): string[] => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);
const field = (label: string, name: string, value: string, type = "text"): string =>
  `<label>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"></label>`;
const area = (label: string, name: string, value: string, rows = 5): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(value)}</textarea></label>`;

const themeFields = (theme: StoredDocumentTheme): string => renderDocumentThemeFields({
  theme,
  names: { preset: "theme_preset", primary: "theme_primary", accent: "theme_accent" },
  helpText: "Colors are stored in the working draft and frozen inside every published release.",
});

const readTheme = (form: FormData): StoredDocumentTheme => {
  const presetId = text(form, "theme_preset") || "personal-blue";
  return presetId === "custom"
    ? { presetId, primary: text(form, "theme_primary"), accent: text(form, "theme_accent") }
    : { presetId };
};

const selectionStorageKey = (kind: ProfileDocumentKind): string => `hdl-admin-${kind}-document`;

const selectedDocument = (kind: ProfileDocumentKind): ProfileDocumentRecord | null =>
  state.documents[kind].find((item) => item.id === state.selectedId[kind]) ?? null;

const setDocumentUrl = (kind: ProfileDocumentKind, id: string | null): void => {
  const url = new URL(window.location.href);
  if (url.searchParams.get("view") === kind) {
    if (id) url.searchParams.set("document", id);
    else url.searchParams.delete("document");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  if (id) window.localStorage.setItem(selectionStorageKey(kind), id);
};

const selectDocument = async (kind: ProfileDocumentKind, document: ProfileDocumentRecord | null): Promise<void> => {
  state.selectedId[kind] = document?.id ?? null;
  state.dirty[kind] = false;
  if (kind === "cv") state.cv = document?.draftPayload ? structuredClone(document.draftPayload as CvRuntimeData) : null;
  else state.portfolio = document?.draftPayload ? structuredClone(document.draftPayload as PortfolioRuntimeData) : null;
  state.releases[kind] = document ? await listProfileDocumentReleases(document.id) : [];
  setDocumentUrl(kind, document?.id ?? null);
};

const preferredDocument = (kind: ProfileDocumentKind, documents: ProfileDocumentRecord[]): ProfileDocumentRecord | null => {
  const urlId = new URL(window.location.href).searchParams.get("document");
  const storedId = window.localStorage.getItem(selectionStorageKey(kind));
  return documents.find((item) => item.id === urlId)
    ?? documents.find((item) => item.id === storedId && item.status !== "archived")
    ?? documents.find((item) => item.isActive)
    ?? documents.find((item) => item.status !== "archived")
    ?? documents[0]
    ?? null;
};

const composeCvDraft = (saved: CvRuntimeData, shared: CvRuntimeData): CvRuntimeData => ({
  ...shared,
  content: saved.content,
});

const composePortfolioDraft = (saved: PortfolioRuntimeData, shared: PortfolioRuntimeData): PortfolioRuntimeData => {
  const savedProjects = new Map(saved.projects.map((item) => [item.id, item]));
  const savedTools = new Map(saved.tools.map((item) => [item.id, item]));
  return {
    ...shared,
    content: saved.content,
    projects: shared.projects.map((item) => {
      const selection = savedProjects.get(item.id);
      return selection ? {
        ...item,
        includeInPortfolio: selection.includeInPortfolio,
        portfolioOrder: selection.portfolioOrder,
        portfolioLayout: selection.portfolioLayout,
      } : item;
    }),
    tools: shared.tools.map((item) => {
      const selection = savedTools.get(item.id);
      return selection ? {
        ...item,
        includeInPortfolio: selection.includeInPortfolio,
        portfolioOrder: selection.portfolioOrder,
      } : item;
    }),
  };
};

const refreshDocuments = async (kind: ProfileDocumentKind): Promise<void> => {
  if (kind === "cv") {
    const [documents, shared] = await Promise.all([
      listProfileDocuments<CvRuntimeData>(kind),
      loadCvData({ adminPreview: true, preferRelease: false }),
    ]);
    state.documents.cv = documents.map((document) => ({
      ...document,
      draftPayload: document.draftPayload ? composeCvDraft(document.draftPayload, shared) : null,
    }));
    return;
  }
  const [documents, shared] = await Promise.all([
    listProfileDocuments<PortfolioRuntimeData>(kind),
    loadPortfolioDraftData(),
  ]);
  state.documents.portfolio = documents.map((document) => ({
    ...document,
    draftPayload: document.draftPayload ? composePortfolioDraft(document.draftPayload, shared) : null,
  }));
};

export const ensureProfileDocumentWorkspace = async (kind: ProfileDocumentKind): Promise<void> => {
  if (state.loading.has(kind) || state.loaded.has(kind)) return;
  state.loading.add(kind);
  delete state.errors[kind];
  try {
    if (kind === "cv") {
      const shared = await loadCvData({ adminPreview: true, preferRelease: false });
      const documents = await ensureProfileDocumentLibrary<CvRuntimeData>(kind, shared);
      state.documents.cv = documents.map((document) => ({
        ...document,
        draftPayload: document.draftPayload ? composeCvDraft(document.draftPayload, shared) : null,
      }));
    } else {
      const shared = await loadPortfolioDraftData();
      const documents = await ensureProfileDocumentLibrary<PortfolioRuntimeData>(kind, shared);
      state.documents.portfolio = documents.map((document) => ({
        ...document,
        draftPayload: document.draftPayload ? composePortfolioDraft(document.draftPayload, shared) : null,
      }));
    }
    await selectDocument(kind, preferredDocument(kind, state.documents[kind]));
    state.loaded.add(kind);
  } catch (error) {
    state.errors[kind] = error instanceof Error ? error.message : "Document workspace could not be loaded.";
  } finally {
    state.loading.delete(kind);
  }
};

const latestRelease = (kind: ProfileDocumentKind): string => {
  const release = state.releases[kind][0];
  return release ? `Published ${new Date(release.publishedAt).toLocaleString()} · ${escapeHtml(release.version)}` : "Not published yet";
};

const cvContentPanel = (content: CvContent): string => [
  renderAdminSectionCard({
    title: "CV document",
    note: "Control the draft version and first-page project density.",
    content: `<div class="admin-form-grid">
      ${field("CV version", "cv_version", content.version)}
      ${field("Detailed projects on page 1", "page_one_project_count", String(content.pageOneProjectCount), "number")}
    </div>`,
  }),
  renderAdminSectionCard({
    title: "CV profile",
    note: "Edit or sync the profile snapshot stored in this CV draft.",
    content: `<div class="admin-form-grid">
      ${field("Full name", "profile_name", content.profile.name)}
      ${field("Professional title (EN)", "profile_title_en", content.profile.professionalTitle.en)}
      ${field("Professional title (VI)", "profile_title_vi", content.profile.professionalTitle.vi)}
      ${field("Email", "profile_email", content.profile.email, "email")}
      ${field("Phone", "profile_phone", content.profile.phone, "tel")}
      ${field("Photo path", "profile_photo", content.profile.photoPath)}
      ${field("Location (EN)", "profile_location_en", content.profile.location.en)}
      ${field("Location (VI)", "profile_location_vi", content.profile.location.vi)}
    </div>
    ${area("Professional summary (EN)", "profile_summary_en", content.profile.summary.en)}
    ${area("Professional summary (VI)", "profile_summary_vi", content.profile.summary.vi)}`,
    actions: '<button class="button button--secondary" type="button" data-sync-professional-profile>Sync from Professional Profile</button>',
  }),
].join("");

const cvExperiencePanel = (content: CvContent): string => renderAdminSectionCard({
  title: "CV experience",
  note: "Edit the work history shown in the CV sidebar.",
  content: `<div class="admin-document-cards">${content.experiences.map((item, index) => `
    <article>
      <input type="hidden" name="experience_id_${index}" value="${escapeHtml(item.id)}">
      <h4>${escapeHtml(item.company || `Experience ${index + 1}`)}</h4>
      <div class="admin-form-grid">
        ${field("Company", `experience_company_${index}`, item.company)}
        ${field("Position (EN)", `experience_position_en_${index}`, item.position.en)}
        ${field("Position (VI)", `experience_position_vi_${index}`, item.position.vi)}
        ${field("Location (EN)", `experience_location_en_${index}`, item.location.en)}
        ${field("Location (VI)", `experience_location_vi_${index}`, item.location.vi)}
        ${field("Start", `experience_start_${index}`, item.startDate, "month")}
        ${field("End (blank = Present)", `experience_end_${index}`, item.endDate ?? "", "month")}
      </div>
      ${area("Responsibilities (one EN item per line)", `experience_responsibilities_${index}`, item.responsibilities.map((point) => point.text.en).join("\n"), 4)}
      ${field("Technologies (comma separated)", `experience_technologies_${index}`, item.technologies.join(", "))}
    </article>`).join("")}</div>`,
});

const cvEducationPanel = (content: CvContent): string => [
  renderAdminSectionCard({
    title: "CV education",
    note: "Keep education entries concise for the two-page layout.",
    content: `<div class="admin-document-cards">
      ${content.education.map((item, index) => `<article><h4>Education ${index + 1}</h4><div class="admin-form-grid">
      ${field("Field (EN)", `education_field_en_${index}`, item.field.en)}
      ${field("Field (VI)", `education_field_vi_${index}`, item.field.vi)}
      ${field("Institution (EN)", `education_institution_en_${index}`, item.institution.en)}
      ${field("Institution (VI)", `education_institution_vi_${index}`, item.institution.vi)}
      ${field("Start year", `education_start_${index}`, item.startDate)}
      ${field("End year", `education_end_${index}`, item.endDate)}
      </div></article>`).join("")}
    </div>`,
  }),
  renderAdminSectionCard({
    title: "CV skills",
    note: "Organize compact skill groups for the CV sidebar.",
    content: `<div class="admin-document-cards">
      ${content.skillGroups.map((group, index) => `<article><h4>${escapeHtml(group.title.en)}</h4><div class="admin-form-grid">
      ${field("Group title (EN)", `skill_title_en_${index}`, group.title.en)}
      ${field("Group title (VI)", `skill_title_vi_${index}`, group.title.vi)}
      </div>${area("Items (one per line)", `skill_items_${index}`, group.items.map((item) => item.label.en).join("\n"), 5)}</article>`).join("")}
    </div>`,
  }),
  renderAdminSectionCard({
    title: "CV languages",
    note: "Keep language and proficiency labels aligned in EN and VI.",
    content: `<div class="admin-document-cards">
      ${content.languages.map((item, index) => `<article><h4>Language ${index + 1}</h4><div class="admin-form-grid">
      ${field("Language (EN)", `language_name_en_${index}`, item.name.en)}
      ${field("Language (VI)", `language_name_vi_${index}`, item.name.vi)}
      ${field("Proficiency (EN)", `language_proficiency_en_${index}`, item.proficiency?.en ?? "")}
      ${field("Proficiency (VI)", `language_proficiency_vi_${index}`, item.proficiency?.vi ?? "")}
      </div></article>`).join("")}
    </div>`,
  }),
].join("");

const cvSelectionPanel = (runtime: CvRuntimeData): string => renderAdminSectionCard({
  title: "CV selection",
  note: "Review Projects and Tools selected from their editors.",
  content: `<div class="admin-document-summary-grid">
    <article><strong>${runtime.detailedProjects.length}</strong><span>Detailed projects</span><ul>${runtime.detailedProjects.map((item) => `<li>${escapeHtml(item.name.en)}</li>`).join("")}</ul></article>
    <article><strong>${runtime.compactProjects.length}</strong><span>Compact projects</span><ul>${runtime.compactProjects.map((item) => `<li>${escapeHtml(item.name.en)}</li>`).join("")}</ul></article>
    <article><strong>${runtime.tools.length}</strong><span>Automation tools</span><ul>${runtime.tools.map((item) => `<li>${escapeHtml(item.name)}</li>`).join("")}</ul></article>
  </div>`,
});

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

const portfolioContentPanel = (content: PortfolioContent): string => [
  renderAdminSectionCard({
    title: "Portfolio cover",
    note: "Edit cover details and the profile used in this draft.",
    content: `<div class="admin-form-grid">
    ${field("Portfolio version", "portfolio_version", content.version)}
    ${field("Cover year", "portfolio_year", content.year)}
    ${field("Document title", "portfolio_title", content.title)}
    ${field("Cover kicker", "portfolio_kicker", content.kicker)}
    ${field("Full name", "portfolio_name", content.profile.name)}
    ${field("Professional title", "portfolio_profile_title", content.profile.professionalTitle.en)}
    ${field("Email", "portfolio_email", content.profile.email, "email")}
    ${field("Phone", "portfolio_phone", content.profile.phone, "tel")}
  </div>
  ${area("Profile summary", "portfolio_summary", content.profile.summary.en)}`,
    actions: '<div class="admin-document-sync-actions"><button class="button button--secondary" type="button" data-sync-professional-profile>Sync from Professional Profile</button><button class="button button--secondary" type="button" data-sync-cv-profile>Sync from active CV</button></div>',
  }),
  renderAdminSectionCard({
    title: "Portfolio narrative",
    note: "Edit the About and closing page content.",
    content: `<div class="admin-form-grid">
    ${field("About kicker", "about_kicker", content.aboutKicker)}
    ${field("About heading", "about_heading", content.aboutHeading)}
    ${field("Closing kicker", "closing_kicker", content.closingKicker)}
    ${field("Closing heading", "closing_heading", content.closingHeading)}
  </div>
  ${area("Closing text", "closing_text", content.closingText, 3)}`,
  }),
].join("");

const portfolioSelectionPanel = (runtime: PortfolioRuntimeData): string => renderAdminSectionCard({
  title: "Portfolio selection",
  note: "Choose and order content for the next Portfolio release.",
  content: `<div class="admin-document-selection">
    <h4>Projects</h4>
    ${runtime.projects.map((item) => `<article><label class="admin-switch"><input type="checkbox" name="portfolio_project" value="${escapeHtml(item.id)}"${item.includeInPortfolio ? " checked" : ""}><span>${escapeHtml(item.name.en)}</span></label><input aria-label="Order" name="project_order_${escapeHtml(item.id)}" type="number" value="${item.portfolioOrder}"><select aria-label="Layout" name="project_layout_${escapeHtml(item.id)}"><option value="feature"${item.portfolioLayout === "feature" ? " selected" : ""}>Feature</option><option value="standard"${item.portfolioLayout === "standard" ? " selected" : ""}>Standard</option><option value="compact"${item.portfolioLayout === "compact" ? " selected" : ""}>Compact</option></select><span class="status status--${item.status}">${item.status}</span></article>`).join("")}
    <h4>Automation tools</h4>
    ${runtime.tools.map((item) => `<article><label class="admin-switch"><input type="checkbox" name="portfolio_tool" value="${escapeHtml(item.id)}"${item.includeInPortfolio ? " checked" : ""}><span>${escapeHtml(item.name)}</span></label><input aria-label="Order" name="tool_order_${escapeHtml(item.id)}" type="number" value="${item.portfolioOrder}"><span></span><span class="status status--${item.status}">${item.status}</span></article>`).join("")}
  </div>`,
});

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

const documentLabel = (kind: ProfileDocumentKind): string => kind === "cv" ? "CV" : "Portfolio";
const documentPlural = (kind: ProfileDocumentKind): string => kind === "cv" ? "CVs" : "Portfolios";
const formattedDate = (value: string): string => new Date(value).toLocaleDateString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const filterCount = (kind: ProfileDocumentKind, filter: DocumentFilter): number => filter === "all"
  ? state.documents[kind].length
  : state.documents[kind].filter((item) => item.status === filter).length;

const visibleDocuments = (kind: ProfileDocumentKind): ProfileDocumentRecord[] => {
  const query = state.search[kind].trim().toLowerCase();
  return state.documents[kind].filter((item) => {
    if (state.filter[kind] !== "all" && item.status !== state.filter[kind]) return false;
    return !query || item.internalTitle.toLowerCase().includes(query) || Boolean(item.draftPayload?.content.version.toLowerCase().includes(query));
  });
};

const documentListView = (kind: ProfileDocumentKind): string => {
  const selected = selectedDocument(kind);
  const documents = visibleDocuments(kind);
  return !documents.length
    ? `<li class="admin-empty">No ${documentPlural(kind).toLowerCase()} match this view.</li>`
    : documents.map((item) => `
      <li class="admin-content-item ${selected?.id === item.id ? "is-selected" : ""}">
        <button class="admin-content-item__select" type="button" data-profile-document-select="${escapeHtml(item.id)}" aria-pressed="${selected?.id === item.id}">
          <strong>${escapeHtml(item.internalTitle)}</strong>
          <small>Version ${escapeHtml(item.draftPayload?.content.version || "not set")}</small>
          <small>Updated ${formattedDate(item.updatedAt)}</small>
        </button>
        <div class="admin-content-item__meta"><span class="status status--${item.status}">${item.status}</span>${item.isActive ? '<span class="admin-document-active">Active</span>' : ""}</div>
      </li>`).join("");
};

const documentCollectionView = (kind: ProfileDocumentKind): string => `
    <aside class="admin-document-library__collection">
      <div class="admin-collection__heading"><div><small>Profile & documents</small><h2>${documentPlural(kind)} <span>${state.documents[kind].length}</span></h2></div><button class="button admin-action-new" type="button" data-profile-document-new>+ New</button></div>
      <div class="admin-list-controls">
        <label class="admin-search"><span class="sr-only">Search ${documentPlural(kind)}</span><input type="search" placeholder="Search title or version..." value="${escapeHtml(state.search[kind])}" data-profile-document-search></label>
        <div class="admin-filter-row" aria-label="${documentLabel(kind)} status">${(["all", "draft", "published", "archived"] as DocumentFilter[]).map((filter) => `<button type="button" data-profile-document-filter="${filter}" class="${state.filter[kind] === filter ? "is-active" : ""}"><span>${filter}</span><strong>${filterCount(kind, filter)}</strong></button>`).join("")}</div>
      </div>
      <div class="admin-collection__scroll"><ul class="admin-content-list" data-profile-document-list>${documentListView(kind)}</ul></div>
    </aside>`;

const emptyDocumentWorkspace = (kind: ProfileDocumentKind): string => `
  <section class="admin-document-library__empty">
    <div><p class="section-kicker">Profile & documents</p><h1>Select a ${documentLabel(kind)}</h1><p>Choose a document from the list to edit it, or create a focused variant for a role, client or audience.</p></div>
    <button class="button" type="button" data-profile-document-new>Create ${documentLabel(kind)}</button>
  </section>`;

export const profileDocumentWorkspaceView = (kind: ProfileDocumentKind): string => {
  if (state.loading.has(kind)) return '<section class="admin-document-loading"><span></span><h2>Loading document workspace…</h2></section>';
  if (state.errors[kind]) return `<section class="admin-placeholder"><p class="section-kicker">Document workspace</p><h2>Could not load ${kind === "cv" ? "Curriculum Vitae" : "Portfolio"}</h2><p>${escapeHtml(state.errors[kind] ?? "")}</p><p>Apply the latest Supabase migration, then reload Admin.</p></section>`;
  const runtime = kind === "cv" ? state.cv : state.portfolio;
  const selected = selectedDocument(kind);
  if (!runtime || !selected) return `<section class="admin-document-library">${documentCollectionView(kind)}<div class="admin-document-library__workspace">${emptyDocumentWorkspace(kind)}</div></section>`;
  const content = runtime.content;
  const activeTab = state.tab[kind];
  const issues = validation(kind);
  const publicPath = kind === "cv" ? "cv/" : "portfolio/";
  const previewPath = `${publicPath}?preview=1&embedded=1`;
  const contentPanel = kind === "cv" ? cvContentPanel(content as CvContent) : portfolioContentPanel(content as PortfolioContent);
  const selectionPanel = kind === "cv" ? cvSelectionPanel(runtime as CvRuntimeData) : portfolioSelectionPanel(runtime as PortfolioRuntimeData);
  const experiencePanel = kind === "cv" ? cvExperiencePanel(content as CvContent) : "";
  const educationPanel = kind === "cv" ? cvEducationPanel(content as CvContent) : "";
  const archived = selected.status === "archived";
  const initialPageCount = kind === "cv"
    ? 2
    : 4
      + (runtime as PortfolioRuntimeData).projects.filter((item) => item.includeInPortfolio).length
      + ((runtime as PortfolioRuntimeData).tools.some((item) => item.includeInPortfolio) ? 1 : 0);
  const zoomControls = renderAdminPreviewControlGroup({
    label: "Preview zoom",
    dataAttribute: "data-document-zoom",
    activeValue: state.zoom[kind],
    options: [
      { label: "Fit", value: "fit" },
      { label: "75%", value: "75" },
      { label: "100%", value: "100" },
    ],
  });
  const previewToolbar = renderAdminPreviewToolbar({
    title: `${documentLabel(kind)} preview`,
    meta: `${kind === "cv" ? "A4" : "A4 landscape"} · <span data-preview-page-count>${initialPageCount} pages</span> · <span data-kind="${issues.length ? "warning" : "success"}">${issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Ready"}</span>`,
    controls: zoomControls,
  });
  return `
    <section class="admin-document-library is-editing">${documentCollectionView(kind)}<div class="admin-document-library__workspace">
    <section class="admin-document-workspace" data-document-kind="${kind}">
      <header class="admin-document-header">
        <div class="admin-document-header__identity"><button class="admin-document-library__back" type="button" data-profile-document-close aria-label="Back to ${documentPlural(kind)}">← ${documentPlural(kind)}</button><p class="section-kicker">${documentLabel(kind)} document</p><h1>${escapeHtml(selected.internalTitle)}</h1><p><span class="status status--${selected.status}">${selected.status}</span>${selected.isActive ? '<span class="admin-document-active">Active public version</span>' : ""}<span>${latestRelease(kind)}</span></p></div>
        <div class="admin-document-actions">
          <span data-document-save-state>Saved</span>
          <button class="button button--secondary admin-action-utility" type="button" data-document-print>Print / PDF</button>
          <details class="admin-document-more"><summary>More</summary><div><button type="button" data-profile-document-rename>Rename</button><button type="button" data-profile-document-duplicate>Duplicate</button>${!archived && !selected.isActive ? '<button type="button" data-profile-document-archive>Archive</button>' : ""}</div></details>
          ${archived ? "" : `<button class="button button--secondary admin-action-save" type="submit" form="${kind}-document-form">Save draft</button><button class="button admin-action-publish" type="button" data-document-publish>Publish & set active</button>`}
        </div>
      </header>
      ${archived ? '<div class="admin-document-lock"><strong>Archived document</strong><span>This snapshot is read-only. Duplicate it to create an editable draft.</span></div>' : ""}
      <div class="admin-document-layout">
        <section class="admin-document-editor">
          <nav class="admin-document-tabs" role="tablist" aria-label="Document editor sections">
            ${tabs(kind).map(([id, label]) => `<button type="button" role="tab" data-document-tab="${id}" aria-selected="${activeTab === id}" class="${activeTab === id ? "is-active" : ""}">${label}</button>`).join("")}
          </nav>
          <form id="${kind}-document-form" data-document-form>
            <section data-document-panel="content"${activeTab === "content" ? "" : " hidden"}>${contentPanel}</section>
            ${kind === "cv" ? `<section data-document-panel="experience"${activeTab === "experience" ? "" : " hidden"}>${experiencePanel}</section><section data-document-panel="education"${activeTab === "education" ? "" : " hidden"}>${educationPanel}</section>` : ""}
            <section data-document-panel="selection"${activeTab === "selection" ? "" : " hidden"}>${selectionPanel}</section>
            <section data-document-panel="appearance"${activeTab === "appearance" ? "" : " hidden"}>${renderAdminSectionCard({ title: `${documentLabel(kind)} appearance`, note: "Choose brand colors saved with this draft.", content: themeFields(content.theme) })}</section>
          </form>
        </section>
        <aside class="admin-document-preview">
          ${previewToolbar}
          <div class="admin-document-frame admin-document-frame--${kind}" data-zoom="${state.zoom[kind]}" tabindex="0" aria-label="Scrollable ${kind === "cv" ? "CV" : "Portfolio"} preview"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="${kind === "cv" ? "CV" : "Portfolio"} draft preview" src="${import.meta.env.BASE_URL + previewPath}" data-document-iframe scrolling="no" tabindex="-1"></iframe></div></div>
          <div class="admin-document-validation"><strong>Pre-publish check</strong>${issues.length ? `<ul>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Required content and document selection are ready.</p>"}</div>
          <details class="admin-document-releases"><summary>Release history (${state.releases[kind].length})</summary>${state.releases[kind].length ? `<ol>${state.releases[kind].map((item) => `<li><strong>${escapeHtml(item.version)}${item.isActive ? " · Active" : ""}</strong><span>${new Date(item.publishedAt).toLocaleString()}</span></li>`).join("")}</ol>` : "<p>No release has been published.</p>"}</details>
        </aside>
      </div>
    </section></div></section>`;
};

const previewPayload = (kind: ProfileDocumentKind, form: HTMLFormElement): CvRuntimeData | PortfolioRuntimeData => {
  if (kind === "cv") {
    const runtime = state.cv!;
    return { ...runtime, content: readCvForm(form) };
  }
  return readPortfolioForm(form);
};

const sendPreview = (kind: ProfileDocumentKind, form: HTMLFormElement): void => {
  void kind;
  void form;
  previewSender?.send();
};

export const discardProfileDocumentChanges = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = undefined;
  const cvDocument = selectedDocument("cv");
  const portfolioDocument = selectedDocument("portfolio");
  state.cv = cvDocument?.draftPayload ? structuredClone(cvDocument.draftPayload as CvRuntimeData) : null;
  state.portfolio = portfolioDocument?.draftPayload ? structuredClone(portfolioDocument.draftPayload as PortfolioRuntimeData) : null;
  state.dirty = { cv: false, portfolio: false };
};

export const invalidateProfileDocumentWorkspace = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = undefined;
  state.cv = null;
  state.portfolio = null;
  state.documents = { cv: [], portfolio: [] };
  state.selectedId = { cv: null, portfolio: null };
  state.releases = { cv: [], portfolio: [] };
  state.loaded.clear();
};

export const markProfileDocumentWorkspaceStale = (): void => {
  state.loaded.clear();
};

export const bindProfileDocumentWorkspace = (root: ParentNode, kind: ProfileDocumentKind, callbacks: WorkspaceCallbacks): void => {
  const form = root.querySelector<HTMLFormElement>("[data-document-form]");
  const iframe = root.querySelector<HTMLIFrameElement>("[data-document-iframe]");
  const previewStage = root.querySelector<HTMLElement>("[data-embedded-preview-stage]");
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = iframe && previewStage
    ? bindEmbeddedPreview(iframe, previewStage, { measurementHeight: kind === "cv" ? 1123 : 794 })
    : undefined;
  previewSender = iframe && form
    ? bindPreviewSender(iframe, kind, () => previewPayload(kind, form), () => {
      previewController?.refresh();
      const pageCount = iframe.contentDocument?.querySelectorAll(kind === "cv" ? ".cv-page" : ".portfolio-page").length ?? 0;
      const pageCountLabel = root.querySelector<HTMLElement>("[data-preview-page-count]");
      if (pageCountLabel && pageCount) pageCountLabel.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"}`;
    })
    : undefined;

  const openDocument = (id: string): void => {
    if (state.dirty[kind] && !window.confirm("Discard the unsaved changes and open another document?")) return;
    const next = state.documents[kind].find((item) => item.id === id);
    if (!next) return;
    void selectDocument(kind, next)
      .then(() => {
        callbacks.setDirty(false);
        callbacks.rerender();
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  };
  const bindSelectionButtons = (scope: ParentNode): void => {
    scope.querySelectorAll<HTMLButtonElement>("[data-profile-document-select]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.profileDocumentSelect;
      if (id) openDocument(id);
    }));
  };
  bindSelectionButtons(root);
  root.querySelector<HTMLInputElement>("[data-profile-document-search]")?.addEventListener("input", (event) => {
    state.search[kind] = (event.currentTarget as HTMLInputElement).value;
    const list = root.querySelector<HTMLElement>("[data-profile-document-list]");
    if (list) {
      list.innerHTML = documentListView(kind);
      bindSelectionButtons(list);
    }
  });
  root.querySelectorAll<HTMLButtonElement>("[data-profile-document-filter]").forEach((button) => button.addEventListener("click", () => {
    state.filter[kind] = button.dataset.profileDocumentFilter as DocumentFilter;
    callbacks.rerender();
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-document-new]").forEach((button) => button.addEventListener("click", () => {
    if (state.dirty[kind] && !window.confirm("Create the new document from the current unsaved changes? The original document will stay unchanged.")) return;
    const title = window.prompt(`Name this ${documentLabel(kind)}`, `New ${documentLabel(kind)}`)?.trim();
    if (!title) return;
    const payload = form ? previewPayload(kind, form) : (kind === "cv" ? state.cv : state.portfolio)
      ?? state.documents[kind].find((item) => item.isActive)?.draftPayload
      ?? state.documents[kind].find((item) => item.status !== "archived")?.draftPayload;
    if (!payload) return callbacks.notify(`${documentLabel(kind)} source content is not available.`, "error");
    setButtonBusy(button, true, "Creating…");
    void createProfileDocument(kind, title, structuredClone(payload))
      .then(async (created) => {
        await refreshDocuments(kind);
        await selectDocument(kind, state.documents[kind].find((item) => item.id === created.id) ?? created);
        callbacks.setDirty(false);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} created.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (button.isConnected) setButtonBusy(button, false); });
  }));
  root.querySelector<HTMLButtonElement>("[data-profile-document-close]")?.addEventListener("click", () => {
    if (state.dirty[kind] && !window.confirm("Discard the unsaved changes and return to the document list?")) return;
    void selectDocument(kind, null).then(() => {
      callbacks.setDirty(false);
      callbacks.rerender();
    });
  });

  const activeDocument = selectedDocument(kind);
  root.querySelector<HTMLButtonElement>("[data-profile-document-rename]")?.addEventListener("click", () => {
    if (!activeDocument) return;
    if (state.dirty[kind]) return callbacks.notify("Save the document before renaming it.", "info");
    const title = window.prompt(`Rename this ${documentLabel(kind)}`, activeDocument.internalTitle)?.trim();
    if (!title || title === activeDocument.internalTitle) return;
    void renameProfileDocument(activeDocument.id, title)
      .then(async () => {
        await refreshDocuments(kind);
        await selectDocument(kind, state.documents[kind].find((item) => item.id === activeDocument.id) ?? null);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} renamed.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector<HTMLButtonElement>("[data-profile-document-duplicate]")?.addEventListener("click", (event) => {
    if (!activeDocument?.draftPayload) return;
    const payload = form && state.dirty[kind] ? previewPayload(kind, form) : activeDocument.draftPayload;
    const title = window.prompt(`Name the duplicated ${documentLabel(kind)}`, `${activeDocument.internalTitle} copy`)?.trim();
    if (!title) return;
    const button = event.currentTarget as HTMLButtonElement;
    setButtonBusy(button, true, "Duplicating…");
    void createProfileDocument(kind, title, structuredClone(payload))
      .then(async (created) => {
        await refreshDocuments(kind);
        await selectDocument(kind, state.documents[kind].find((item) => item.id === created.id) ?? created);
        callbacks.setDirty(false);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} duplicated as a new draft.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (button.isConnected) setButtonBusy(button, false); });
  });
  root.querySelector<HTMLButtonElement>("[data-profile-document-archive]")?.addEventListener("click", () => {
    if (state.dirty[kind]) return callbacks.notify("Save or discard the current changes before archiving.", "info");
    if (!activeDocument || !window.confirm(`Archive “${activeDocument.internalTitle}”?`)) return;
    void archiveProfileDocument(activeDocument.id)
      .then(async () => {
        await refreshDocuments(kind);
        await selectDocument(kind, state.documents[kind].find((item) => item.id === activeDocument.id) ?? null);
        callbacks.setDirty(false);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} archived.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  if (!form) return;
  if (activeDocument?.status === "archived") {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>("input, textarea, select, button").forEach((control) => { control.disabled = true; });
  }
  const markDirty = (): void => {
    if (activeDocument?.status === "archived") return;
    state.dirty[kind] = true;
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
  root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((button) => button.addEventListener("click", () => {
    state.tab[kind] = button.dataset.documentTab as DocumentTab;
    root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-document-panel]").forEach((panel) => { panel.hidden = panel.dataset.documentPanel !== state.tab[kind]; });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-document-zoom]").forEach((button) => button.addEventListener("click", () => {
    state.zoom[kind] = button.dataset.documentZoom as typeof state.zoom.cv;
    const frameRoot = root.querySelector<HTMLElement>(".admin-document-frame");
    if (frameRoot) frameRoot.dataset.zoom = state.zoom[kind];
    previewController?.refresh();
    root.querySelectorAll<HTMLButtonElement>("[data-document-zoom]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
  }));
  root.querySelector("[data-document-print]")?.addEventListener("click", () => iframe?.contentWindow?.print());
  root.querySelector("[data-sync-professional-profile]")?.addEventListener("click", () => {
    void loadProfessionalProfile()
      .then((professional) => {
        if (kind === "cv" && state.cv) {
          state.cv.content.profile = structuredClone(professional.profile);
          state.cv.content.experiences = structuredClone(professional.experiences);
          state.cv.content.education = structuredClone(professional.education);
          state.cv.content.skillGroups = structuredClone(professional.skillGroups);
          state.cv.content.languages = structuredClone(professional.languages);
          state.dirty.cv = true;
        } else if (kind === "portfolio" && state.portfolio) {
          state.portfolio.content.profile = structuredClone(professional.profile);
          state.portfolio.content.skillGroups = structuredClone(professional.skillGroups);
          state.dirty.portfolio = true;
        }
        callbacks.setDirty(true);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} synced from the saved Professional Profile.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector("[data-sync-cv-profile]")?.addEventListener("click", async () => {
    if (!state.loaded.has("cv")) await ensureProfileDocumentWorkspace("cv");
    const source = state.documents.cv.find((item) => item.isActive)?.draftPayload
      ?? state.documents.cv.find((item) => item.status !== "archived")?.draftPayload;
    if (!state.portfolio || !source) return callbacks.notify("An active CV could not be loaded.", "error");
    state.portfolio.content.profile = structuredClone((source as CvRuntimeData).content.profile);
    state.portfolio.content.skillGroups = structuredClone((source as CvRuntimeData).content.skillGroups);
    state.dirty.portfolio = true;
    callbacks.setDirty(true);
    callbacks.rerender();
    callbacks.notify("Portfolio profile and skills synced from the active CV.", "success");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>(`[form="${kind}-document-form"].admin-action-save`);
    if (!activeDocument) return;
    setButtonBusy(saveButton, true, "Saving…");
    void (async () => {
      const payload = previewPayload(kind, form);
      await saveProfileDocument(activeDocument.id, payload);
      await refreshDocuments(kind);
      await selectDocument(kind, state.documents[kind].find((item) => item.id === activeDocument.id) ?? null);
      state.dirty[kind] = false;
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify(`${kind === "cv" ? "CV" : "Portfolio"} draft saved.`, "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  root.querySelector<HTMLButtonElement>("[data-document-publish]")?.addEventListener("click", (event) => {
    if (!activeDocument || !window.confirm(`Publish “${activeDocument.internalTitle}” and make it the active public ${documentLabel(kind)}?`)) return;
    const publishButton = event.currentTarget as HTMLButtonElement;
    setButtonBusy(publishButton, true, "Publishing…");
    void (async () => {
      const payload = previewPayload(kind, form);
      await saveProfileDocument(activeDocument.id, payload);
      await publishProfileDocument(activeDocument.id, payload.content.version, payload);
      await refreshDocuments(kind);
      await selectDocument(kind, state.documents[kind].find((item) => item.id === activeDocument.id) ?? null);
      state.dirty[kind] = false;
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify(`${documentLabel(kind)} published and set as the active public version.`, "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (publishButton.isConnected) setButtonBusy(publishButton, false); });
  });
};
