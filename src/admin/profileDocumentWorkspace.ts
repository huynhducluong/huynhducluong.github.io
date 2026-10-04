import { cvContentSeed } from "../data/cvSeed";
import { portfolioContentSeed } from "../data/portfolioSeed";
import { loadPortfolioDraftData, normalizePortfolioRuntimeData } from "../services/documentRepository";
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
import { degreeClassificationValue, escapeHtml } from "../shared/format";
import { bindPreviewSender, type PreviewSender } from "../shared/previewProtocol";
import { documentThemes } from "../themes/documentThemes";
import { backgroundOrderKey, orderedCvBackground, resolveCvBackgroundOrder } from "../cv/backgroundOrder";
import type { LocalizedText, Profile } from "../types/career";
import type { CvBackgroundGroup, CvContent, CvRuntimeData, CvRuntimeProject, CvRuntimeTool } from "../types/cvContent";
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
import { confirmAdmin } from "./confirmDialog";
import {
  bindPreviewZoom,
  createPreviewZoomState,
  renderPreviewZoomControls,
  type PreviewZoomController,
  type PreviewZoomState,
} from "./previewZoom";
import {
  renderAdminPreviewToolbar,
  renderAdminSectionCard,
  setButtonBusy,
} from "./ui";

export type { ProfileDocumentKind } from "../types/profileDocument";
type DocumentTab = "content" | "background" | "selection" | "appearance";
type DocumentFilter = ProfileDocumentStatus | "all";
type WorkspaceLoadPhase = "idle" | "loading" | "ready" | "error";

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
  loading: Partial<Record<ProfileDocumentKind, Promise<void>>>;
  phase: Record<ProfileDocumentKind, WorkspaceLoadPhase>;
  errors: Partial<Record<ProfileDocumentKind, string>>;
  tab: Record<ProfileDocumentKind, DocumentTab>;
  zoom: Record<ProfileDocumentKind, PreviewZoomState>;
  filter: Record<ProfileDocumentKind, DocumentFilter>;
  search: Record<ProfileDocumentKind, string>;
  dirty: Record<ProfileDocumentKind, boolean>;
} = {
  cv: null,
  portfolio: null,
  documents: { cv: [], portfolio: [] },
  selectedId: { cv: null, portfolio: null },
  releases: { cv: [], portfolio: [] },
  loading: {},
  phase: { cv: "idle", portfolio: "idle" },
  errors: {},
  tab: { cv: "content", portfolio: "content" },
  zoom: { cv: createPreviewZoomState(), portfolio: createPreviewZoomState() },
  filter: { cv: "all", portfolio: "all" },
  search: { cv: "", portfolio: "" },
  dirty: { cv: false, portfolio: false },
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
let previewSender: PreviewSender | undefined;
let previewZoomController: PreviewZoomController | undefined;

const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const field = (label: string, name: string, value: string, type = "text"): string =>
  `<label${type === "month" ? ' class="admin-date-field"' : ""}>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"></label>`;
const area = (label: string, name: string, value: string, rows = 5): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(value)}</textarea></label>`;
const localizedFields = (label: string, name: string, value: LocalizedText): string =>
  `<div class="admin-site-bilingual">${field(`${label} (EN)`, `${name}_en`, value.en)}${field(`${label} (VI)`, `${name}_vi`, value.vi)}</div>`;
const localizedAreas = (label: string, name: string, value: LocalizedText, rows = 5): string =>
  `<div class="admin-site-bilingual">${area(`${label} (EN)`, `${name}_en`, value.en, rows)}${area(`${label} (VI)`, `${name}_vi`, value.vi, rows)}</div>`;

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
  state.zoom[kind] = createPreviewZoomState();
  if (kind === "cv") state.cv = document?.draftPayload ? structuredClone(document.draftPayload as CvRuntimeData) : null;
  else state.portfolio = document?.draftPayload ? structuredClone(document.draftPayload as PortfolioRuntimeData) : null;
  state.releases[kind] = document ? await listProfileDocumentReleases(document.id) : [];
  setDocumentUrl(kind, document?.id ?? null);
};

const preferredDocument = (kind: ProfileDocumentKind, documents: ProfileDocumentRecord[]): ProfileDocumentRecord | null => {
  const urlId = new URL(window.location.href).searchParams.get("document");
  const storedId = window.localStorage.getItem(selectionStorageKey(kind));
  const initialized = documents.filter((item) => Boolean(item.draftPayload));
  return initialized.find((item) => item.id === urlId)
    ?? initialized.find((item) => item.id === storedId && item.status !== "archived")
    ?? initialized.find((item) => item.isActive)
    ?? initialized.find((item) => item.status !== "archived")
    ?? initialized[0]
    ?? null;
};

const inheritSharedProfile = (shared: Profile, tailored: Profile): Profile => ({
  ...structuredClone(shared),
  professionalTitle: structuredClone(tailored.professionalTitle),
  summary: structuredClone(tailored.summary),
});

const composeCvDraft = (saved: CvRuntimeData, shared: CvRuntimeData, sharedProfile: Profile): CvRuntimeData => {
  const savedProjects = [...saved.detailedProjects, ...saved.compactProjects];
  const savedProjectSelection = new Map(savedProjects.map((item) => [item.id, item]));
  const savedToolSelection = new Map(saved.tools.map((item) => [item.id, item]));
  const sharedProjects = shared.availableProjects ?? [...shared.detailedProjects, ...shared.compactProjects];
  const sharedTools = shared.availableTools ?? shared.tools;
  const availableProjects = sharedProjects.map((item) => {
    const selection = savedProjectSelection.get(item.id);
    const ready = item.status === undefined || item.status === "published";
    return selection && ready ? {
      ...item,
      includeInCv: true,
      cvOrder: item.cvOrder,
      cvDisplay: selection.cvDisplay,
      cvShowSummary: selection.cvShowSummary,
      cvResponsibilityIds: selection.cvResponsibilityIds,
    } : { ...item, includeInCv: false };
  });
  const availableTools = sharedTools.map((item) => {
    const selection = savedToolSelection.get(item.id);
    const ready = item.status === undefined || item.status === "published";
    return selection && ready ? { ...item, includeInCv: true, cvOrder: item.cvOrder } : { ...item, includeInCv: false };
  });
  return {
    content: {
      ...saved.content,
      profile: inheritSharedProfile(sharedProfile, saved.content.profile),
    },
    detailedProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "detailed").sort((a, b) => a.cvOrder - b.cvOrder),
    compactProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "compact").sort((a, b) => a.cvOrder - b.cvOrder),
    tools: availableTools.filter((item) => item.includeInCv).sort((a, b) => a.cvOrder - b.cvOrder),
    availableProjects,
    availableTools,
  };
};

const composePortfolioDraft = (saved: PortfolioRuntimeData, shared: PortfolioRuntimeData, sharedProfile: Profile): PortfolioRuntimeData => {
  const normalizedSaved = normalizePortfolioRuntimeData(saved);
  const savedProjects = new Map(normalizedSaved.projects.map((item) => [item.id, item]));
  const savedTools = new Map(normalizedSaved.tools.map((item) => [item.id, item]));
  return {
    ...shared,
    content: {
      ...normalizedSaved.content,
      profile: inheritSharedProfile(sharedProfile, normalizedSaved.content.profile),
    },
    projects: shared.projects.map((item) => {
      const selection = savedProjects.get(item.id);
      return selection && item.status === "published" ? {
        ...item,
        includeInPortfolio: selection.includeInPortfolio,
        portfolioOrder: item.portfolioOrder,
        portfolioLayout: selection.portfolioLayout,
      } : { ...item, includeInPortfolio: false };
    }),
    tools: shared.tools.map((item) => {
      const selection = savedTools.get(item.id);
      return selection && item.status === "published" ? {
        ...item,
        includeInPortfolio: selection.includeInPortfolio,
        portfolioOrder: item.portfolioOrder,
      } : { ...item, includeInPortfolio: false };
    }),
  };
};

const refreshDocuments = async (kind: ProfileDocumentKind): Promise<void> => {
  if (kind === "cv") {
    const [documents, shared, professional] = await Promise.all([
      listProfileDocuments<CvRuntimeData>(kind),
      loadCvData({ adminPreview: true, preferRelease: false }),
      loadProfessionalProfile(),
    ]);
    state.documents.cv = documents.map((document) => ({
      ...document,
      draftPayload: document.draftPayload ? composeCvDraft(document.draftPayload, shared, professional.profile) : null,
    }));
    return;
  }
  const [documents, shared, professional] = await Promise.all([
    listProfileDocuments<PortfolioRuntimeData>(kind),
    loadPortfolioDraftData(),
    loadProfessionalProfile(),
  ]);
  state.documents.portfolio = documents.map((document) => ({
    ...document,
    draftPayload: document.draftPayload ? composePortfolioDraft(document.draftPayload, shared, professional.profile) : null,
  }));
};

export const ensureProfileDocumentWorkspace = (kind: ProfileDocumentKind): Promise<void> => {
  if (state.phase[kind] === "ready") return Promise.resolve();
  const pending = state.loading[kind];
  if (pending) return pending;

  state.phase[kind] = "loading";
  delete state.errors[kind];

  let request!: Promise<void>;
  request = (async () => {
    try {
      if (kind === "cv") {
        const [shared, professional] = await Promise.all([
          loadCvData({ adminPreview: true, preferRelease: false }),
          loadProfessionalProfile(),
        ]);
        const documents = await ensureProfileDocumentLibrary<CvRuntimeData>(kind, shared);
        state.documents.cv = documents.map((document) => ({
          ...document,
          draftPayload: document.draftPayload ? composeCvDraft(document.draftPayload, shared, professional.profile) : null,
        }));
      } else {
        const [shared, professional] = await Promise.all([
          loadPortfolioDraftData(),
          loadProfessionalProfile(),
        ]);
        const documents = await ensureProfileDocumentLibrary<PortfolioRuntimeData>(kind, shared);
        state.documents.portfolio = documents.map((document) => ({
          ...document,
          draftPayload: document.draftPayload ? composePortfolioDraft(document.draftPayload, shared, professional.profile) : null,
        }));
      }
      const preferred = preferredDocument(kind, state.documents[kind]);
      if (!preferred) throw new Error(`No initialized ${kind === "cv" ? "CV" : "Portfolio"} document is available.`);
      await selectDocument(kind, preferred);
      state.phase[kind] = "ready";
    } catch (error) {
      state.errors[kind] = error instanceof Error ? error.message : "Document workspace could not be loaded.";
      state.phase[kind] = "error";
    } finally {
      if (state.loading[kind] === request) delete state.loading[kind];
    }
  })();

  state.loading[kind] = request;
  return request;
};

const latestReleaseMeta = (kind: ProfileDocumentKind): string => {
  const release = state.releases[kind][0];
  return release
    ? `<span class="admin-document-meta__detail">Version ${escapeHtml(release.version)}</span><span class="admin-document-meta__detail">Published ${new Date(release.publishedAt).toLocaleString()}</span>`
    : '<span class="admin-document-meta__detail">Not published yet</span>';
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
    title: "Target profile",
    note: "Tailor the title and summary for this CV and role.",
    content: `${localizedFields("Professional title", "profile_title", content.profile.professionalTitle)}
    ${localizedAreas("Professional summary", "profile_summary", content.profile.summary)}`,
    actions: '<button class="button button--secondary" type="button" data-sync-target-profile>Sync from Professional Profile</button>',
  }),
].join("");

const backgroundRange = (start: string, end: string | null): string => `${start || "Start not set"} – ${end || "Present"}`;

const backgroundRow = ({
  group,
  id,
  index,
  total,
  title,
  meta,
}: {
  group: CvBackgroundGroup;
  id: string;
  index: number;
  total: number;
  title: string;
  meta: string;
}): string => `<article class="admin-cv-background__item" data-cv-background-item data-background-group="${group}" data-background-id="${escapeHtml(id)}">
  <button class="admin-cv-background__drag" type="button" draggable="true" data-background-drag aria-label="Drag ${escapeHtml(title)} to reorder" title="Drag to reorder"><span aria-hidden="true">⋮⋮</span></button>
  <span class="admin-cv-background__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
  <span class="admin-cv-background__identity"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></span>
  <span class="admin-cv-background__source">Profile</span>
  <span class="admin-cv-background__actions">
    <button type="button" data-background-move="up" aria-label="Move ${escapeHtml(title)} earlier" title="Move earlier"${index === 0 ? " disabled" : ""}>↑</button>
    <button type="button" data-background-move="down" aria-label="Move ${escapeHtml(title)} later" title="Move later"${index === total - 1 ? " disabled" : ""}>↓</button>
  </span>
</article>`;

const cvBackgroundPanel = (content: CvContent): string => {
  const background = orderedCvBackground(content);
  const experienceRows = background.experiences.map((item, index) => backgroundRow({
    group: "experiences",
    id: item.id,
    index,
    total: background.experiences.length,
    title: item.company,
    meta: [item.position.en, item.location.en, backgroundRange(item.startDate, item.endDate)].filter(Boolean).join(" · "),
  })).join("");
  const educationRows = background.education.map((item, index) => {
    const classification = degreeClassificationValue(item.classification?.en ?? "", "en");
    return backgroundRow({
      group: "education",
      id: item.id,
      index,
      total: background.education.length,
      title: item.field.en,
      meta: [
        item.institution.en,
        classification ? `Degree classification: ${classification}` : "",
        `${item.startDate} – ${item.endDate}`,
      ].filter(Boolean).join(" · "),
    });
  }).join("");
  const skillRows = background.skillGroups.map((item, index) => backgroundRow({
    group: "skillGroups",
    id: item.id,
    index,
    total: background.skillGroups.length,
    title: item.title.en,
    meta: item.items.map((skill) => skill.label.en).join(" · "),
  })).join("");
  const languageRows = background.languages.map((item, index) => backgroundRow({
    group: "languages",
    id: item.id,
    index,
    total: background.languages.length,
    title: item.name.en,
    meta: item.proficiency?.en || "Proficiency not set",
  })).join("");
  return renderAdminSectionCard({
    title: "CV background",
    note: "Content comes from Professional Profile. Drag within each group to control its order in this CV.",
    className: "admin-cv-background",
    content: `<div class="admin-cv-background__groups">
        <section><header><div><h4>Experience</h4><p>Employment history shown in the CV sidebar.</p></div><span>${background.experiences.length}</span></header><div class="admin-cv-background__list" data-background-list="experiences">${experienceRows || '<p class="admin-empty">No experience entries in Professional Profile.</p>'}</div></section>
        <section><header><div><h4>Education</h4><p>Qualifications shown before skills.</p></div><span>${background.education.length}</span></header><div class="admin-cv-background__list" data-background-list="education">${educationRows || '<p class="admin-empty">No education entries in Professional Profile.</p>'}</div></section>
        <section><header><div><h4>Skills</h4><p>Skill groups and languages shown in the CV sidebar.</p></div><span>${background.skillGroups.length + background.languages.length}</span></header>
          <div class="admin-cv-background__subsection"><h5>Skill groups</h5><div class="admin-cv-background__list" data-background-list="skillGroups">${skillRows || '<p class="admin-empty">No skill groups in Professional Profile.</p>'}</div></div>
          <div class="admin-cv-background__subsection"><h5>Languages</h5><div class="admin-cv-background__list" data-background-list="languages">${languageRows || '<p class="admin-empty">No languages in Professional Profile.</p>'}</div></div>
        </section>
      </div>`,
    actions: '<button class="button button--secondary" type="button" data-sync-professional-profile>Sync latest</button><button class="button button--secondary" type="button" data-admin-view="profile">Edit Professional Profile</button>',
  });
};

const moveCvBackgroundItem = (
  content: CvContent,
  group: CvBackgroundGroup,
  itemId: string,
  movement: "up" | "down" | { targetId: string },
): boolean => {
  const order = resolveCvBackgroundOrder(content);
  const key = backgroundOrderKey(group);
  const current = [...order[key]];
  const fromIndex = current.indexOf(itemId);
  if (fromIndex < 0) return false;
  const toIndex = typeof movement === "string"
    ? fromIndex + (movement === "up" ? -1 : 1)
    : current.indexOf(movement.targetId);
  if (toIndex < 0 || toIndex >= current.length || toIndex === fromIndex) return false;
  current.splice(fromIndex, 1);
  current.splice(toIndex, 0, itemId);
  content.backgroundOrder = { ...order, [key]: current };
  return true;
};

const cvSelectionPanel = (runtime: CvRuntimeData): string => {
  const selectedProjects = new Map([...runtime.detailedProjects, ...runtime.compactProjects].map((item) => [item.id, item]));
  const selectedTools = new Map(runtime.tools.map((item) => [item.id, item]));
  const projects = runtime.availableProjects ?? [...runtime.detailedProjects, ...runtime.compactProjects];
  const tools = runtime.availableTools ?? runtime.tools;
  return renderAdminSectionCard({
    title: "CV content selection",
    note: "Choose projects, presentation, responsibilities and tools for this CV draft.",
    content: `<div class="admin-cv-selection">
      <section><h4>Projects</h4><div class="admin-cv-selection__list">
        ${projects.map((item) => {
          const selection = selectedProjects.get(item.id);
          const display = selection?.cvDisplay ?? "excluded";
          const ready = item.status === undefined || item.status === "published";
          const displayStatus = ready ? "published" : item.status ?? "draft";
          const responsibilityIds = new Set(selection?.cvResponsibilityIds ?? item.cvResponsibilityIds);
          return `<article class="admin-cv-selection__project" data-cv-project-card>
            <div class="admin-cv-selection__identity"><strong>${escapeHtml(item.name.en)}</strong><small>${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"} Â· ${escapeHtml(item.location.en || item.id)}</small></div>
            <label><span>Display</span><select name="cv_project_display_${escapeHtml(item.id)}" data-cv-project-display${ready ? "" : " disabled"}><option value="excluded"${display === "excluded" ? " selected" : ""}>Not included</option><option value="detailed"${display === "detailed" ? " selected" : ""}>Detailed</option><option value="compact"${display === "compact" ? " selected" : ""}>Compact</option></select></label>
            <label class="admin-switch"><input type="checkbox" name="cv_project_summary_${escapeHtml(item.id)}"${selection?.cvShowSummary ? " checked" : ""}${ready ? "" : " disabled"}><span>Show summary</span></label>
            <span class="status status--${displayStatus}">${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}</span>
            <fieldset class="admin-cv-selection__responsibilities" data-cv-responsibilities${display === "detailed" ? "" : " hidden"}><legend>Responsibilities</legend>${item.responsibilities.length ? item.responsibilities.map((responsibility) => `<label><input type="checkbox" name="cv_project_responsibility_${escapeHtml(item.id)}" value="${escapeHtml(responsibility.id)}"${responsibilityIds.has(responsibility.id) ? " checked" : ""}${ready ? "" : " disabled"}><span>${escapeHtml(responsibility.text.en)}</span></label>`).join("") : '<p class="admin-empty">No responsibilities saved.</p>'}</fieldset>
          </article>`;
        }).join("")}
      </div></section>
      <section><h4>Automation tools</h4><div class="admin-cv-selection__list admin-cv-selection__list--tools">
        ${tools.map((item) => {
          const selection = selectedTools.get(item.id);
          const ready = item.status === undefined || item.status === "published";
          const displayStatus = ready ? "published" : item.status ?? "draft";
          return `<article class="admin-cv-selection__tool">
            <label class="admin-switch"><input type="checkbox" name="cv_tool" value="${escapeHtml(item.id)}"${selection ? " checked" : ""}${ready ? "" : " disabled"}><span>${escapeHtml(item.name)}</span></label>
            <span class="status status--${displayStatus}">${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}</span>
          </article>`;
        }).join("")}
      </div></section>
    </div>`,
  });
};

const readCvForm = (formElement: HTMLFormElement): CvContent => {
  const current = state.cv?.content ?? structuredClone(cvContentSeed);
  const form = new FormData(formElement);
  return {
    version: text(form, "cv_version") || current.version,
    themeId: readTheme(form).presetId,
    theme: readTheme(form),
    pageOneProjectCount: Math.max(1, Number(form.get("page_one_project_count")) || 3),
    profile: {
      ...current.profile,
      professionalTitle: { en: text(form, "profile_title_en"), vi: text(form, "profile_title_vi") },
      summary: { en: text(form, "profile_summary_en"), vi: text(form, "profile_summary_vi") },
    },
    experiences: current.experiences,
    education: current.education,
    skillGroups: current.skillGroups,
    languages: current.languages,
    backgroundOrder: resolveCvBackgroundOrder(current),
  };
};

const readCvRuntimeForm = (formElement: HTMLFormElement): CvRuntimeData => {
  const current = state.cv ?? {
    content: structuredClone(cvContentSeed),
    detailedProjects: [],
    compactProjects: [],
    tools: [],
    availableProjects: [],
    availableTools: [],
  };
  const form = new FormData(formElement);
  const currentProjects = current.availableProjects ?? [...current.detailedProjects, ...current.compactProjects];
  const currentTools = current.availableTools ?? current.tools;
  const availableProjects: CvRuntimeProject[] = currentProjects.map((item) => {
    const ready = item.status === undefined || item.status === "published";
    const rawDisplay = String(form.get(`cv_project_display_${item.id}`) ?? "excluded");
    const cvDisplay = rawDisplay === "detailed" ? "detailed" : "compact";
    const includeInCv = ready && (rawDisplay === "detailed" || rawDisplay === "compact");
    const selectedResponsibilityIds = new Set(form.getAll(`cv_project_responsibility_${item.id}`).map(String));
    return {
      ...item,
      includeInCv,
      cvDisplay,
      cvOrder: item.cvOrder,
      cvShowSummary: includeInCv && form.get(`cv_project_summary_${item.id}`) === "on",
      cvResponsibilityIds: item.responsibilities.filter((responsibility) => selectedResponsibilityIds.has(responsibility.id)).map((responsibility) => responsibility.id),
    };
  });
  const selectedToolIds = new Set(form.getAll("cv_tool").map(String));
  const availableTools: CvRuntimeTool[] = currentTools.map((item) => ({
    ...item,
    includeInCv: (item.status === undefined || item.status === "published") && selectedToolIds.has(item.id),
    cvOrder: item.cvOrder,
  }));
  return {
    content: readCvForm(formElement),
    detailedProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "detailed").sort((a, b) => a.cvOrder - b.cvOrder),
    compactProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "compact").sort((a, b) => a.cvOrder - b.cvOrder),
    tools: availableTools.filter((item) => item.includeInCv).sort((a, b) => a.cvOrder - b.cvOrder),
    availableProjects,
    availableTools,
  };
};

const portfolioContentPanel = (content: PortfolioContent): string => [
  renderAdminSectionCard({
    title: "Portfolio cover",
    note: "Control the document identity shown on the cover.",
    content: `<div class="admin-form-grid">
      ${field("Portfolio version", "portfolio_version", content.version)}
      ${field("Cover year", "portfolio_year", content.year)}
    </div>
    ${field("Document title", "portfolio_title", content.title)}
    ${localizedFields("Cover kicker", "portfolio_kicker", content.kicker)}`,
  }),
  renderAdminSectionCard({
    title: "Target profile",
    note: "Tailor the positioning used in this Portfolio.",
    content: `${localizedFields("Professional title", "portfolio_profile_title", content.profile.professionalTitle)}
    ${localizedAreas("Profile summary", "portfolio_summary", content.profile.summary)}`,
    actions: '<div class="admin-document-sync-actions"><button class="button button--secondary" type="button" data-sync-target-profile>Sync from Professional Profile</button><button class="button button--secondary" type="button" data-sync-cv-profile>Sync from active CV</button></div>',
  }),
  renderAdminSectionCard({
    title: "Portfolio narrative",
    note: "Edit the About and closing page content.",
    content: `${localizedFields("About kicker", "about_kicker", content.aboutKicker)}
    ${localizedFields("About heading", "about_heading", content.aboutHeading)}
    ${localizedFields("Closing kicker", "closing_kicker", content.closingKicker)}
    ${localizedFields("Closing heading", "closing_heading", content.closingHeading)}
    ${localizedAreas("Closing text", "closing_text", content.closingText, 3)}`,
  }),
].join("");

const portfolioSelectionPanel = (runtime: PortfolioRuntimeData): string => renderAdminSectionCard({
  title: "Portfolio content selection",
  note: "Choose projects and tools. Display order follows Projects and Automation Tools.",
  content: `<div class="admin-document-selection">
    <h4>Projects</h4>
    ${runtime.projects.map((item) => {
      const ready = item.status === "published";
      return `<article><label class="admin-switch"><input type="checkbox" name="portfolio_project" value="${escapeHtml(item.id)}"${ready && item.includeInPortfolio ? " checked" : ""}${ready ? "" : " disabled"}><span class="admin-document-selection__identity"><strong>${escapeHtml(item.name.en)}</strong><small>${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"} Â· ${escapeHtml(item.slug || item.id)}</small></span></label><select aria-label="Layout" name="project_layout_${escapeHtml(item.id)}"${ready ? "" : " disabled"}><option value="feature"${item.portfolioLayout === "feature" ? " selected" : ""}>Feature</option><option value="standard"${item.portfolioLayout === "standard" ? " selected" : ""}>Standard</option><option value="compact"${item.portfolioLayout === "compact" ? " selected" : ""}>Compact</option></select><span class="status status--${item.status}">${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}</span></article>`;
    }).join("")}
    <h4>Automation tools</h4>
    ${runtime.tools.map((item) => {
      const ready = item.status === "published";
      return `<article><label class="admin-switch"><input type="checkbox" name="portfolio_tool" value="${escapeHtml(item.id)}"${ready && item.includeInPortfolio ? " checked" : ""}${ready ? "" : " disabled"}><span class="admin-document-selection__identity"><strong>${escapeHtml(item.name)}</strong><small>${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"} Â· ${escapeHtml(item.slug || item.id)}</small></span></label><span></span><span class="status status--${item.status}">${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}</span></article>`;
    }).join("")}
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
    kicker: { en: text(form, "portfolio_kicker_en"), vi: text(form, "portfolio_kicker_vi") },
    aboutKicker: { en: text(form, "about_kicker_en"), vi: text(form, "about_kicker_vi") },
    aboutHeading: { en: text(form, "about_heading_en"), vi: text(form, "about_heading_vi") },
    closingKicker: { en: text(form, "closing_kicker_en"), vi: text(form, "closing_kicker_vi") },
    closingHeading: { en: text(form, "closing_heading_en"), vi: text(form, "closing_heading_vi") },
    closingText: { en: text(form, "closing_text_en"), vi: text(form, "closing_text_vi") },
    theme: readTheme(form),
    profile: {
      ...current.content.profile,
      professionalTitle: { en: text(form, "portfolio_profile_title_en"), vi: text(form, "portfolio_profile_title_vi") },
      summary: { en: text(form, "portfolio_summary_en"), vi: text(form, "portfolio_summary_vi") },
    },
  };
  return {
    content,
    projects: current.projects.map((item) => ({
      ...item,
      includeInPortfolio: projectIds.has(item.id),
      portfolioOrder: item.portfolioOrder,
      portfolioLayout: String(form.get(`project_layout_${item.id}`) ?? item.portfolioLayout) as typeof item.portfolioLayout,
    })),
    tools: current.tools.map((item) => ({
      ...item,
      includeInPortfolio: toolIds.has(item.id),
      portfolioOrder: item.portfolioOrder,
    })),
  };
};

const validation = (kind: ProfileDocumentKind, runtime?: CvRuntimeData | PortfolioRuntimeData | null): string[] => {
  if (kind === "cv") {
    const data = (runtime ?? state.cv) as CvRuntimeData | null;
    if (!data) return ["CV draft is not loaded."];
    return [
      !data.content.profile.name && "Add a full name in Professional Profile.",
      !data.content.profile.email && "Add an email address in Professional Profile.",
      !data.detailedProjects.length && "Select at least one detailed CV project.",
    ].filter((item): item is string => Boolean(item));
  }
  const data = (runtime ?? state.portfolio) as PortfolioRuntimeData | null;
  if (!data) return ["Portfolio draft is not loaded."];
  return [
    !data.content.profile.name && "Add a full name in Professional Profile.",
    !data.content.profile.email && "Add an email address in Professional Profile.",
    !data.content.title && "Document title is required.",
    !data.projects.some((item) => item.includeInPortfolio) && "Select at least one Portfolio project.",
  ].filter((item): item is string => Boolean(item));
};

const tabs = (kind: ProfileDocumentKind): Array<[DocumentTab, string]> => kind === "cv"
  ? [["content", "Profile"], ["background", "Background"], ["selection", "Projects & tools"], ["appearance", "Appearance"]]
  : [["content", "Content"], ["selection", "Projects & tools"], ["appearance", "Appearance"]];

const documentLabel = (kind: ProfileDocumentKind): string => kind === "cv" ? "CV" : "Portfolio";
const documentPlural = (kind: ProfileDocumentKind): string => kind === "cv" ? "CVs" : "Portfolios";
const formattedDate = (value: string): string => new Date(value).toLocaleDateString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

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
      <li class="admin-content-item admin-content-item--document ${selected?.id === item.id ? "is-selected" : ""}">
        <button class="admin-content-item__select" type="button" data-profile-document-select="${escapeHtml(item.id)}" aria-pressed="${selected?.id === item.id}">
          <strong title="${escapeHtml(item.internalTitle)}">${escapeHtml(item.internalTitle)}</strong>
          <small>Version ${escapeHtml(item.draftPayload?.content.version || "not set")}</small>
          <small>Updated ${formattedDate(item.updatedAt)}</small>
        </button>
        <div class="admin-content-item__meta"><span class="status status--${item.status}">${item.status}</span>${item.isActive ? '<span class="admin-document-active">Active</span>' : ""}</div>
      </li>`).join("");
};

const documentCollectionView = (kind: ProfileDocumentKind): string => {
  const isDrawer = Boolean(state.selectedId[kind]);
  return `
    <aside id="${kind}-document-library" class="admin-document-library__collection"${isDrawer ? ' data-document-library-drawer role="dialog" aria-label="Document library" aria-hidden="true" inert' : ""}>
      <div class="admin-collection__heading"><div><small>Profile & documents</small><h2>${documentPlural(kind)} <span>${state.documents[kind].length}</span></h2></div><div class="admin-collection__heading-actions"><button class="button admin-action-new" type="button" data-profile-document-new>+ New</button>${isDrawer ? '<button class="admin-drawer-close" type="button" data-profile-document-library-close aria-label="Close document library">×</button>' : ""}</div></div>
      <div class="admin-list-controls">
        <label class="admin-search"><span class="sr-only">Search ${documentPlural(kind)}</span><input type="search" placeholder="Search title or version..." value="${escapeHtml(state.search[kind])}" data-profile-document-search></label>
        <div class="admin-filter-row" aria-label="${documentLabel(kind)} status">${(["all", "draft", "published", "archived"] as DocumentFilter[]).map((filter) => `<button type="button" data-profile-document-filter="${filter}" class="${state.filter[kind] === filter ? "is-active" : ""}">${filter}</button>`).join("")}</div>
      </div>
      <div class="admin-collection__scroll"><ul class="admin-content-list" data-profile-document-list>${documentListView(kind)}</ul></div>
    </aside>`;
};

const documentWorkspaceError = (kind: ProfileDocumentKind, message: string): string => `
  <section class="admin-placeholder admin-placeholder--centered">
    <div><p class="section-kicker">Document workspace</p><h2>Could not open ${kind === "cv" ? "Curriculum Vitae" : "Portfolio"}</h2><p>${escapeHtml(message)}</p></div>
    <button class="button" type="button" data-profile-document-retry>Try again</button>
  </section>`;

const loadingDocumentWorkspace = (kind: ProfileDocumentKind): string => `
  <section class="admin-document-library admin-workspace-loading" aria-busy="true" aria-label="Loading ${documentPlural(kind)}">
    <aside class="admin-document-library__collection" aria-hidden="true">
      <div class="admin-collection__heading"><div><small>Profile & documents</small><h2>${documentPlural(kind)} <span>—</span></h2></div></div>
      <div class="admin-workspace-loading__controls"><span></span><span></span></div>
      <div class="admin-workspace-loading__list"><span></span><span></span><span></span></div>
    </aside>
    <div class="admin-document-library__workspace"><section class="admin-document-loading"><span></span><h2>Loading document workspace…</h2></section></div>
  </section>`;

export const profileDocumentWorkspaceView = (kind: ProfileDocumentKind): string => {
  if (state.phase[kind] === "idle" || state.phase[kind] === "loading") return loadingDocumentWorkspace(kind);
  if (state.errors[kind]) return documentWorkspaceError(kind, state.errors[kind] ?? "Document workspace could not be loaded.");
  const runtime = kind === "cv" ? state.cv : state.portfolio;
  const selected = selectedDocument(kind);
  if (!runtime || !selected) return documentWorkspaceError(kind, `No initialized ${documentLabel(kind)} document is available.`);
  const content = runtime.content;
  const availableTabs = tabs(kind);
  const activeTab = availableTabs.some(([id]) => id === state.tab[kind]) ? state.tab[kind] : availableTabs[0][0];
  state.tab[kind] = activeTab;
  const issues = validation(kind, runtime);
  const validationContent = issues.length
    ? `<ul data-document-validation-list>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : '<p data-document-validation-ready>Required content and document selection are ready.</p>';
  const releaseHistory = state.releases[kind].length
    ? `<ol class="admin-release-history__list">${state.releases[kind].map((item) => `<li><div><strong>${item.isActive ? "Active release" : "Published release"}</strong><span>${new Date(item.publishedAt).toLocaleString()}</span></div><code>${escapeHtml(item.version)}</code></li>`).join("")}</ol>`
    : `<p class="admin-empty">No ${documentLabel(kind)} release has been published yet.</p>`;
  const publicPath = kind === "cv" ? "cv/" : "portfolio/";
  const previewPath = `${publicPath}?preview=1&embedded=1`;
  const contentPanel = kind === "cv" ? cvContentPanel(content as CvContent) : portfolioContentPanel(content as PortfolioContent);
  const selectionPanel = kind === "cv" ? cvSelectionPanel(runtime as CvRuntimeData) : portfolioSelectionPanel(runtime as PortfolioRuntimeData);
  const backgroundPanel = kind === "cv" ? cvBackgroundPanel(content as CvContent) : "";
  const archived = selected.status === "archived";
  const initialPageCount = kind === "cv"
    ? 2
    : 4
      + (runtime as PortfolioRuntimeData).projects.filter((item) => item.includeInPortfolio).length
      + ((runtime as PortfolioRuntimeData).tools.some((item) => item.includeInPortfolio) ? 1 : 0);
  const zoomControls = renderPreviewZoomControls(state.zoom[kind]);
  const previewToolbar = renderAdminPreviewToolbar({
    title: `${documentLabel(kind)} preview`,
    meta: `${kind === "cv" ? "A4" : "A4 landscape"} · <span data-preview-page-count>${initialPageCount} pages</span> · <button type="button" class="admin-preview-status" data-document-validation-open data-kind="${issues.length ? "warning" : "success"}" aria-haspopup="dialog" aria-controls="${kind}-validation-dialog">${issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Ready"}</button>`,
    controls: zoomControls,
  });
  return `
    <section class="admin-document-library is-editing"><button class="admin-library-scrim" type="button" data-profile-document-library-close aria-label="Close document library" tabindex="-1"></button>${documentCollectionView(kind)}<div class="admin-document-library__workspace">
    <section class="admin-document-workspace" data-document-kind="${kind}">
      <header class="admin-document-header">
        <div class="admin-document-header__identity">
          <p class="section-kicker">${documentLabel(kind)} document</p>
          <h1 class="admin-document-title"><button class="admin-document-title-switcher" type="button" data-profile-document-library-open aria-haspopup="dialog" aria-controls="${kind}-document-library" aria-expanded="false" aria-label="Switch ${documentLabel(kind)}. Current document: ${escapeHtml(selected.internalTitle)}"><span class="admin-document-title-switcher__label">${escapeHtml(selected.internalTitle)}</span><span class="admin-document-title-switcher__icon" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg></span></button></h1>
          <p class="admin-document-meta"><span class="status status--${selected.status}">${selected.status}</span>${selected.isActive ? '<span class="admin-document-meta__active">Active public version</span>' : ""}${latestReleaseMeta(kind)}</p>
        </div>
        <div class="admin-document-actions">
          <span data-document-save-state>Saved</span>
          <button class="button button--secondary admin-action-utility" type="button" data-document-history-open aria-haspopup="dialog" aria-controls="${kind}-release-history-dialog">History (${state.releases[kind].length})</button>
          <details class="admin-document-more"><summary>More</summary><div><button type="button" data-document-print>Print / PDF</button><button type="button" data-profile-document-rename>Rename</button><button type="button" data-profile-document-duplicate>Duplicate</button>${!archived && !selected.isActive ? '<button type="button" data-profile-document-archive>Archive</button>' : ""}</div></details>
          ${archived ? "" : `<button class="button button--secondary admin-action-save" type="submit" form="${kind}-document-form">Save draft</button><button class="button admin-action-publish" type="button" data-document-publish>Publish</button>`}
        </div>
      </header>
      ${archived ? '<div class="admin-document-lock"><strong>Archived document</strong><span>This snapshot is read-only. Duplicate it to create an editable draft.</span></div>' : ""}
      <div class="admin-document-layout">
        <section class="admin-document-editor">
          <nav class="admin-document-tabs" role="tablist" aria-label="Document editor sections">
            ${availableTabs.map(([id, label]) => `<button type="button" role="tab" data-document-tab="${id}" aria-selected="${activeTab === id}" class="${activeTab === id ? "is-active" : ""}">${label}</button>`).join("")}
          </nav>
          <form id="${kind}-document-form" data-document-form>
            <section data-document-panel="content"${activeTab === "content" ? "" : " hidden"}>${contentPanel}</section>
            ${kind === "cv" ? `<section data-document-panel="background"${activeTab === "background" ? "" : " hidden"}>${backgroundPanel}</section>` : ""}
            <section data-document-panel="selection"${activeTab === "selection" ? "" : " hidden"}>${selectionPanel}</section>
            <section data-document-panel="appearance"${activeTab === "appearance" ? "" : " hidden"}>${renderAdminSectionCard({ title: `${documentLabel(kind)} appearance`, note: "Choose brand colors saved with this draft.", content: themeFields(content.theme) })}</section>
          </form>
        </section>
        <aside class="admin-document-preview">
          ${previewToolbar}
          <div class="admin-document-frame admin-document-frame--${kind}" data-zoom="${state.zoom[kind].mode}" tabindex="0" aria-label="Scrollable ${kind === "cv" ? "CV" : "Portfolio"} preview"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="${kind === "cv" ? "CV" : "Portfolio"} draft preview" src="${import.meta.env.BASE_URL + previewPath}" data-document-iframe scrolling="no" tabindex="-1"></iframe></div></div>
        </aside>
      </div>
      <dialog id="${kind}-release-history-dialog" class="admin-dialog admin-release-history" data-document-history-dialog aria-labelledby="${kind}-release-history-title"><form method="dialog"><div><p class="section-kicker">${documentLabel(kind)}</p><h2 id="${kind}-release-history-title">Release history</h2><p>Published releases remain read-only snapshots.</p></div>${releaseHistory}<div class="admin-actions"><button class="button button--secondary" type="button" data-document-history-close>Close</button></div></form></dialog>
      <dialog id="${kind}-validation-dialog" class="admin-dialog admin-document-check-dialog" data-document-validation-dialog aria-labelledby="${kind}-validation-title"><form method="dialog"><div><p class="section-kicker">${documentLabel(kind)}</p><h2 id="${kind}-validation-title">Pre-publish check</h2><p>Resolve required content issues before publishing.</p></div><div class="admin-document-check-dialog__content" data-document-validation-content>${validationContent}</div><div class="admin-actions"><button class="button button--secondary" type="button" data-document-validation-close>Close</button></div></form></dialog>
    </section></div></section>`;
};

const previewPayload = (kind: ProfileDocumentKind, form: HTMLFormElement): CvRuntimeData | PortfolioRuntimeData => {
  if (kind === "cv") return readCvRuntimeForm(form);
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
  previewZoomController?.disconnect();
  previewZoomController = undefined;
  state.zoom = { cv: createPreviewZoomState(), portfolio: createPreviewZoomState() };
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
  previewZoomController?.disconnect();
  previewZoomController = undefined;
  state.cv = null;
  state.portfolio = null;
  state.documents = { cv: [], portfolio: [] };
  state.selectedId = { cv: null, portfolio: null };
  state.releases = { cv: [], portfolio: [] };
  state.loading = {};
  state.phase = { cv: "idle", portfolio: "idle" };
  state.errors = {};
};

export const markProfileDocumentWorkspaceStale = (): void => {
  state.phase = { cv: "idle", portfolio: "idle" };
  state.errors = {};
};

export const bindProfileDocumentWorkspace = (root: ParentNode, kind: ProfileDocumentKind, callbacks: WorkspaceCallbacks): void => {
  root.querySelector<HTMLButtonElement>("[data-profile-document-retry]")?.addEventListener("click", () => {
    state.phase[kind] = "idle";
    delete state.errors[kind];
    const workspaceReady = ensureProfileDocumentWorkspace(kind);
    callbacks.rerender();
    void workspaceReady.then(callbacks.rerender);
  });
  const libraryShell = root.querySelector<HTMLElement>(".admin-document-library.is-editing");
  const libraryDrawer = root.querySelector<HTMLElement>("[data-document-library-drawer]");
  const libraryWorkspace = libraryShell?.querySelector<HTMLElement>(".admin-document-library__workspace");
  const libraryTrigger = root.querySelector<HTMLButtonElement>("[data-profile-document-library-open]");
  const setLibraryOpen = (open: boolean): void => {
    if (!libraryShell || !libraryDrawer) return;
    libraryShell.classList.toggle("is-library-open", open);
    libraryDrawer.inert = !open;
    if (libraryWorkspace) libraryWorkspace.inert = open;
    libraryDrawer.setAttribute("aria-hidden", String(!open));
    libraryTrigger?.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => libraryDrawer.querySelector<HTMLInputElement>("[data-profile-document-search]")?.focus());
    else libraryTrigger?.focus();
  };
  libraryTrigger?.addEventListener("click", () => setLibraryOpen(true));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-document-library-close]").forEach((button) => button.addEventListener("click", () => setLibraryOpen(false)));
  libraryDrawer?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setLibraryOpen(false);
  });
  const form = root.querySelector<HTMLFormElement>("[data-document-form]");
  const iframe = root.querySelector<HTMLIFrameElement>("[data-document-iframe]");
  const previewStage = root.querySelector<HTMLElement>("[data-embedded-preview-stage]");
  const previewFrame = root.querySelector<HTMLElement>(".admin-document-frame");
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = iframe && previewStage
    ? bindEmbeddedPreview(iframe, previewStage, { measurementHeight: kind === "cv" ? 1123 : 794 })
    : undefined;
  previewZoomController?.disconnect();
  previewZoomController = previewFrame && previewStage
    ? bindPreviewZoom(root, {
        frame: previewFrame,
        stage: previewStage,
        state: state.zoom[kind],
        contentWidth: () => kind === "cv" ? 793.7 : 1122.5,
        onScale: () => previewController?.refresh(),
      })
    : undefined;
  previewSender = iframe && form
    ? bindPreviewSender(iframe, kind, () => previewPayload(kind, form), () => {
      previewController?.refresh();
      const pageCount = iframe.contentDocument?.querySelectorAll(kind === "cv" ? ".cv-page" : ".portfolio-page").length ?? 0;
      const pageCountLabel = root.querySelector<HTMLElement>("[data-preview-page-count]");
      if (pageCountLabel && pageCount) pageCountLabel.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"}`;
    })
    : undefined;

  const openDocument = async (id: string): Promise<void> => {
    if (state.dirty[kind] && !(await confirmAdmin({ eyebrow: "Unsaved changes", title: `Leave this ${documentLabel(kind)}?`, message: "Your unsaved changes will be discarded if you open another document.", confirmLabel: "Discard changes", cancelLabel: "Keep editing", tone: "danger" }))) return;
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
    root.querySelectorAll<HTMLButtonElement>("[data-profile-document-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    const list = root.querySelector<HTMLElement>("[data-profile-document-list]");
    if (list) {
      list.innerHTML = documentListView(kind);
      bindSelectionButtons(list);
    }
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-document-new]").forEach((button) => button.addEventListener("click", async () => {
    if (state.dirty[kind] && !(await confirmAdmin({ eyebrow: `New ${documentLabel(kind)}`, title: "Keep the current document?", message: "A new document will be created from the current unsaved preview. The original document remains unchanged.", confirmLabel: "Create new document" }))) return;
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
  const activeDocument = selectedDocument(kind);
  const historyDialog = root.querySelector<HTMLDialogElement>("[data-document-history-dialog]");
  const validationDialog = root.querySelector<HTMLDialogElement>("[data-document-validation-dialog]");
  root.querySelector<HTMLButtonElement>("[data-document-history-open]")?.addEventListener("click", () => historyDialog?.showModal());
  root.querySelector<HTMLButtonElement>("[data-document-history-close]")?.addEventListener("click", () => historyDialog?.close());
  root.querySelector<HTMLButtonElement>("[data-document-validation-open]")?.addEventListener("click", () => validationDialog?.showModal());
  root.querySelector<HTMLButtonElement>("[data-document-validation-close]")?.addEventListener("click", () => validationDialog?.close());
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
  root.querySelector<HTMLButtonElement>("[data-profile-document-archive]")?.addEventListener("click", async () => {
    if (state.dirty[kind]) return callbacks.notify("Save or discard the current changes before archiving.", "info");
    if (!activeDocument || !(await confirmAdmin({ eyebrow: `${documentLabel(kind)} status`, title: `Archive ${activeDocument.internalTitle}?`, message: "The document will no longer be available as an active draft.", confirmLabel: "Archive document", tone: "danger" }))) return;
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
  const updateValidation = (issues: string[]): void => {
    const status = root.querySelector<HTMLButtonElement>("[data-document-validation-open]");
    const content = root.querySelector<HTMLElement>("[data-document-validation-content]");
    if (status) {
      status.dataset.kind = issues.length ? "warning" : "success";
      status.textContent = issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Ready";
    }
    if (content) {
      content.innerHTML = issues.length
        ? `<ul data-document-validation-list>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : '<p data-document-validation-ready>Required content and document selection are ready.</p>';
    }
  };
  const markDirty = (): void => {
    if (activeDocument?.status === "archived") return;
    state.dirty[kind] = true;
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-document-save-state]");
    if (status) status.textContent = "Unsaved changes";
    updateValidation(validation(kind, previewPayload(kind, form)));
    if (previewTimer !== undefined) window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => sendPreview(kind, form), 180);
  };
  form.addEventListener("input", markDirty);
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.name === "theme_preset" && target.value !== "custom") {
      const theme = documentThemes.find((item) => item.id === target.value);
      const primary = form.elements.namedItem("theme_primary");
      const accent = form.elements.namedItem("theme_accent");
      if (theme && primary instanceof HTMLInputElement && accent instanceof HTMLInputElement) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    }
    if (target instanceof HTMLSelectElement && target.matches("[data-cv-project-display]")) {
      const responsibilities = target.closest<HTMLElement>("[data-cv-project-card]")?.querySelector<HTMLElement>("[data-cv-responsibilities]");
      if (responsibilities) responsibilities.hidden = target.value !== "detailed";
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
  const commitBackgroundMove = (
    group: CvBackgroundGroup,
    itemId: string,
    movement: "up" | "down" | { targetId: string },
  ): void => {
    if (kind !== "cv" || !state.cv || activeDocument?.status === "archived") return;
    state.cv = readCvRuntimeForm(form);
    if (!moveCvBackgroundItem(state.cv.content, group, itemId, movement)) return;
    state.dirty.cv = true;
    callbacks.setDirty(true);
    callbacks.rerender();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-background-move]").forEach((button) => button.addEventListener("click", () => {
    const item = button.closest<HTMLElement>("[data-cv-background-item]");
    const group = item?.dataset.backgroundGroup as CvBackgroundGroup | undefined;
    const itemId = item?.dataset.backgroundId;
    const direction = button.dataset.backgroundMove as "up" | "down" | undefined;
    if (group && itemId && direction) commitBackgroundMove(group, itemId, direction);
  }));
  let draggedBackground: { group: CvBackgroundGroup; itemId: string } | null = null;
  root.querySelectorAll<HTMLButtonElement>("[data-background-drag]").forEach((handle) => {
    handle.addEventListener("dragstart", (event) => {
      const item = handle.closest<HTMLElement>("[data-cv-background-item]");
      const group = item?.dataset.backgroundGroup as CvBackgroundGroup | undefined;
      const itemId = item?.dataset.backgroundId;
      if (!item || !group || !itemId || handle.disabled || activeDocument?.status === "archived") return event.preventDefault();
      draggedBackground = { group, itemId };
      item.classList.add("is-dragging");
      event.dataTransfer?.setData("text/plain", `${group}:${itemId}`);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    handle.addEventListener("dragend", () => {
      handle.closest<HTMLElement>("[data-cv-background-item]")?.classList.remove("is-dragging");
      root.querySelectorAll(".admin-cv-background__item.is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
      draggedBackground = null;
    });
  });
  root.querySelectorAll<HTMLElement>("[data-cv-background-item]").forEach((item) => {
    item.addEventListener("dragover", (event) => {
      if (!draggedBackground || item.dataset.backgroundGroup !== draggedBackground.group || item.dataset.backgroundId === draggedBackground.itemId) return;
      event.preventDefault();
      item.classList.add("is-drop-target");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("dragleave", () => item.classList.remove("is-drop-target"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("is-drop-target");
      const targetId = item.dataset.backgroundId;
      if (draggedBackground && targetId && item.dataset.backgroundGroup === draggedBackground.group) {
        commitBackgroundMove(draggedBackground.group, draggedBackground.itemId, { targetId });
      }
    });
  });
  root.querySelector("[data-document-print]")?.addEventListener("click", () => iframe?.contentWindow?.print());
  root.querySelector("[data-sync-target-profile]")?.addEventListener("click", () => {
    void loadProfessionalProfile()
      .then((professional) => {
        if (kind === "cv" && state.cv) {
          state.cv = readCvRuntimeForm(form);
          state.cv.content.profile = {
            ...state.cv.content.profile,
            professionalTitle: structuredClone(professional.profile.professionalTitle),
            summary: structuredClone(professional.profile.summary),
          };
          state.dirty.cv = true;
        } else if (kind === "portfolio" && state.portfolio) {
          state.portfolio = readPortfolioForm(form);
          state.portfolio.content.profile = {
            ...state.portfolio.content.profile,
            professionalTitle: structuredClone(professional.profile.professionalTitle),
            summary: structuredClone(professional.profile.summary),
          };
          state.dirty.portfolio = true;
        }
        callbacks.setDirty(true);
        callbacks.rerender();
        callbacks.notify(`${documentLabel(kind)} title and summary synced from Professional Profile.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelectorAll("[data-sync-professional-profile]").forEach((button) => button.addEventListener("click", () => {
    void loadProfessionalProfile()
      .then((professional) => {
        if (kind === "cv" && state.cv) {
          state.cv = readCvRuntimeForm(form);
          const nextContent: CvContent = {
            ...state.cv.content,
            profile: inheritSharedProfile(professional.profile, state.cv.content.profile),
            experiences: structuredClone(professional.experiences),
            education: structuredClone(professional.education),
            skillGroups: structuredClone(professional.skillGroups),
            languages: structuredClone(professional.languages),
          };
          nextContent.backgroundOrder = resolveCvBackgroundOrder(nextContent);
          state.cv.content = nextContent;
          state.dirty.cv = true;
        }
        callbacks.setDirty(true);
        callbacks.rerender();
        callbacks.notify("CV background synced from Professional Profile.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  }));
  root.querySelector("[data-sync-cv-profile]")?.addEventListener("click", async () => {
    await ensureProfileDocumentWorkspace("cv");
    const source = state.documents.cv.find((item) => item.isActive)?.draftPayload
      ?? state.documents.cv.find((item) => item.status !== "archived")?.draftPayload;
    if (!state.portfolio || !source) return callbacks.notify("An active CV could not be loaded.", "error");
    state.portfolio = readPortfolioForm(form);
    const sourceProfile = (source as CvRuntimeData).content.profile;
    state.portfolio.content.profile = {
      ...state.portfolio.content.profile,
      professionalTitle: structuredClone(sourceProfile.professionalTitle),
      summary: structuredClone(sourceProfile.summary),
    };
    state.dirty.portfolio = true;
    callbacks.setDirty(true);
    callbacks.rerender();
    callbacks.notify("Portfolio title and summary copied from the active CV.", "success");
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
  root.querySelector<HTMLButtonElement>("[data-document-publish]")?.addEventListener("click", async (event) => {
    if (!activeDocument) return;
    const payload = previewPayload(kind, form);
    const issues = validation(kind, payload);
    if (issues.length) {
      updateValidation(issues);
      validationDialog?.showModal();
      callbacks.notify(`Resolve ${issues.length} pre-publish issue${issues.length === 1 ? "" : "s"} before publishing.`, "info");
      return;
    }
    if (!(await confirmAdmin({ eyebrow: `${documentLabel(kind)} release`, title: `Publish ${activeDocument.internalTitle}?`, message: `This will become the active public ${documentLabel(kind)} release.`, confirmLabel: `Publish ${documentLabel(kind)}` }))) return;
    const publishButton = event.currentTarget as HTMLButtonElement;
    setButtonBusy(publishButton, true, "Publishing…");
    void (async () => {
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
