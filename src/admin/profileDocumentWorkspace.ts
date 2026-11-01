import { cvContentSeed } from "../data/cvSeed";
import { DEFAULT_IMAGE_OVERLAY_OPACITY, portfolioContentSeed } from "../data/portfolioSeed";
import { loadPortfolioDraftData, normalizePortfolioRuntimeData } from "../services/documentRepository";
import { loadCvData } from "../services/cvRepository";
import { loadProfessionalProfile } from "../services/websiteRepository";
import { credentialSnapshot, listProfessionalCredentials } from "../services/credentialRepository";
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
import { degreeClassificationValue, escapeHtml, type Language } from "../shared/format";
import { sortByMasterContentOrder } from "../shared/contentOrder";
import { profileDocumentRecommendations, validateProfileDocument } from "../shared/profileDocumentValidation";
import { bindPreviewSender, type PreviewSender } from "../shared/previewProtocol";
import { documentThemes, resolveDocumentTheme } from "../themes/documentThemes";
import { backgroundEntryKey, newCvBackgroundKeys, resolveCvBackgroundSelection } from "../cv/backgroundOrder";
import type { LocalizedText, Profile } from "../types/career";
import type { CredentialSnapshot, ProfessionalCredential } from "../types/credential";
import type { CvBackgroundGroup, CvContent, CvRuntimeData, CvRuntimeProject, CvRuntimeTool } from "../types/cvContent";
import type {
  AutomationLayout,
  CredentialsLayout,
  PortfolioContent,
  PortfolioProfileStat,
  PortfolioCredential,
  PortfolioRuntimeData,
  ProjectLayout,
} from "../types/portfolio";
import type {
  ProfileDocumentKind,
  ProfileDocumentRecord,
  ProfileDocumentReleaseSummary,
  ProfileDocumentStatus,
} from "../types/profileDocument";
import type { StoredDocumentTheme } from "../types/theme";
import type { ProfessionalProfileContent } from "../types/website";
import {
  PORTFOLIO_CREDENTIALS_PER_PAGE,
  PORTFOLIO_PROFILE_CARD_GROUPS,
  PORTFOLIO_PROFILE_CARD_ITEMS,
  portfolioCapabilityGroups,
  portfolioContributionLimit,
  automationLayoutOptions,
  closingLayoutOptions,
  coverLayoutOptions,
  credentialsLayoutOptions,
  indexLayoutOptions,
  portfolioPageCount,
  profileLayoutOptions,
  projectLayoutOptions,
  resolveAutomationLayout,
  resolveProjectLayout,
  type PortfolioLayoutOption,
} from "../portfolio/layouts";
import { findPortfolioLayoutIssues } from "../portfolio/safeArea";
import { bindCvProjectRows, renderCvProjectRow } from "./cvProjectSelection";
import { portfolioLayoutLabel, renderPortfolioFeatureRow, renderPortfolioMediaRow, syncPortfolioFeatureRow, syncPortfolioMediaPreview, syncPortfolioMediaRow } from "./portfolioMediaSelection";
import { bindPortfolioProjectRows, renderPortfolioProjectRow, syncPortfolioProjectRow } from "./portfolioProjectSelection";
import { renderDocumentThemeFields } from "./documentThemeFields";
import { bindEmbeddedPreview, type EmbeddedPreviewController } from "./embeddedPreview";
import { confirmAdmin } from "./confirmDialog";
import { readAdminRoute, updateAdminRoute } from "./adminRoute";
import { requestAdminText } from "./textInputDialog";
import {
  bindPreviewZoom,
  createPreviewZoomState,
  renderPreviewZoomControls,
  type PreviewZoomController,
  type PreviewZoomState,
} from "./previewZoom";
import {
  formatAdminDate,
  formatAdminDateTime,
  renderAdminDocumentHeader,
  renderAdminFieldLabel,
  renderAdminPreviewToolbar,
  renderAdminPreviewLanguageToggle,
  renderAdminSegmented,
  renderAdminSelectControl,
  renderAdminSelectionHeading,
  renderAdminSectionCard,
  renderAdminYearSelect,
  renderAdminWorkspaceState,
  setButtonBusy,
  adminChevronIcon,
  adminCloseIcon,
  bindAdminSelectionCounts,
} from "./ui";

export type { ProfileDocumentKind } from "../types/profileDocument";
type DocumentTab = "content" | "background" | "selection" | "appearance";
type DocumentFilter = ProfileDocumentStatus | "all";
type WorkspaceLoadPhase = "idle" | "loading" | "ready" | "error";
type CvPreviewData = CvRuntimeData & { previewLanguage?: Language };
type PortfolioPreviewData = PortfolioRuntimeData & { previewLanguage?: Language };

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
  previewLanguage: Record<ProfileDocumentKind, Language>;
  filter: Record<ProfileDocumentKind, DocumentFilter>;
  search: Record<ProfileDocumentKind, string>;
  dirty: Record<ProfileDocumentKind, boolean>;
  /** Unselected background entries added to Professional Profile since each draft was last saved. Never persisted. */
  newEntries: Record<ProfileDocumentKind, Map<string, Set<string>>>;
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
  previewLanguage: { cv: "en", portfolio: "en" },
  filter: { cv: "all", portfolio: "all" },
  search: { cv: "", portfolio: "" },
  dirty: { cv: false, portfolio: false },
  newEntries: { cv: new Map(), portfolio: new Map() },
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
let previewSender: PreviewSender | undefined;
let previewZoomController: PreviewZoomController | undefined;

const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const field = (label: string, name: string, value: string, type = "text", required = false): string =>
  `<label${type === "month" ? ' class="admin-date-field"' : ""}>${renderAdminFieldLabel(label, required)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"${required ? ' aria-required="true"' : ""}></label>`;
const area = (label: string, name: string, value: string, rows = 5, required = false): string =>
  `<label>${renderAdminFieldLabel(label, required)}<textarea name="${escapeHtml(name)}" rows="${rows}"${required ? ' aria-required="true"' : ""}>${escapeHtml(value)}</textarea></label>`;
const localizedFields = (label: string, name: string, value: LocalizedText, requiredEnglish = false): string =>
  `<div class="admin-site-bilingual">${field(`${label} (EN)`, `${name}_en`, value.en, "text", requiredEnglish)}${field(`${label} (VI)`, `${name}_vi`, value.vi)}</div>`;
const localizedAreas = (label: string, name: string, value: LocalizedText, rows = 5, requiredEnglish = false): string =>
  `<div class="admin-site-bilingual">${area(`${label} (EN)`, `${name}_en`, value.en, rows, requiredEnglish)}${area(`${label} (VI)`, `${name}_vi`, value.vi, rows)}</div>`;

const themeFields = (theme: StoredDocumentTheme): string => renderDocumentThemeFields({
  theme,
  names: { preset: "theme_preset", primary: "theme_primary", accent: "theme_accent" },
});

const defaultOverlayPercent = Math.round(DEFAULT_IMAGE_OVERLAY_OPACITY * 100);

/** Preview status chip: issues block publishing; recommendations only add a count to "Ready". */
const documentCheckStatus = (issues: string[], notes: string[]): string => issues.length
  ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
  : notes.length ? `Ready · ${notes.length} recommendation${notes.length === 1 ? "" : "s"}` : "Ready";

/** Pre-publish check body, the same two sections as the Website check: required fixes, then recommendations. */
const documentCheckContent = (issues: string[], notes: string[]): string => `<div class="admin-site-validation">
  <section><h3>Required fixes</h3>${issues.length ? `<ul data-document-validation-list>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p data-document-validation-ready>All required checks pass.</p>"}</section>
  <section><h3>Recommendations</h3>${notes.length ? `<ul data-document-recommendation-list>${notes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>No recommendations.</p>"}</section>
</div>`;

const portfolioImageTreatmentFields = (content: PortfolioContent): string => {
  const rawOpacity = Number(content.imageOverlay?.opacity);
  const opacity = Math.round((Number.isFinite(rawOpacity)
    ? Math.min(1, Math.max(0, rawOpacity))
    : portfolioContentSeed.imageOverlay.opacity) * 100);
  const primary = resolveDocumentTheme(content.theme).tokens.primary.toUpperCase();
  const enabled = content.imageOverlay?.enabled !== false;
  return renderAdminSectionCard({
    title: "Image treatment",
    note: "Primary color tint on every Portfolio image except the profile photo.",
    className: "admin-image-treatment-card",
    content: `<div class="admin-image-treatment" data-image-overlay-control>
      <div class="admin-image-treatment__top">
        <div class="admin-image-treatment__copy"><strong>Primary color overlay</strong><span id="portfolio-image-overlay-help">Adds a consistent theme tint while keeping the original image visible.</span></div>
        <label class="admin-image-treatment__switch">
          <input type="checkbox" name="portfolio_image_overlay_enabled" data-image-overlay-toggle aria-describedby="portfolio-image-overlay-help"${enabled ? " checked" : ""}>
          <span class="admin-image-treatment__switch-track" aria-hidden="true"></span>
          <span>Apply overlay</span>
        </label>
      </div>
      <div class="admin-image-treatment__settings" data-image-overlay-settings>
        <div class="admin-image-treatment__label-row">
          <label for="portfolio-image-overlay-opacity">Overlay opacity</label>
          <output for="portfolio-image-overlay-opacity" data-image-overlay-output>${opacity}%</output>
        </div>
        <input id="portfolio-image-overlay-opacity" name="portfolio_image_overlay_opacity" type="range" min="0" max="100" step="1" value="${opacity}" data-image-overlay-range aria-label="Overlay opacity" style="--admin-overlay-color: ${escapeHtml(primary)}; --admin-overlay-progress: ${opacity}%">
        <div class="admin-image-treatment__footer">
          <span class="admin-image-treatment__color"><i data-image-overlay-swatch style="--admin-overlay-color: ${escapeHtml(primary)}"></i><span>Using Primary</span><code data-image-overlay-primary>${escapeHtml(primary)}</code></span>
          <button class="admin-image-treatment__reset" type="button" data-image-overlay-reset${opacity === defaultOverlayPercent ? " disabled" : ""}>Reset to ${defaultOverlayPercent}%</button>
        </div>
      </div>
    </div>`,
  });
};

const selectedLayoutLabel = <T extends string>(value: T, options: readonly PortfolioLayoutOption<T>[]): string =>
  options.find((option) => option.id === value)?.label ?? String(value).replace(/^[^.]+\./, "").replaceAll("-", " ");

const portfolioLayoutPicker = <T extends string>(
  title: string,
  note: string,
  name: string,
  value: T,
  options: readonly PortfolioLayoutOption<T>[],
): string => `<details class="admin-layout-picker">
  <summary><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note)}</small></span><em data-layout-selected>${escapeHtml(selectedLayoutLabel(value, options))}</em></summary>
  <div class="admin-layout-picker__options">${options.map((option) => `<label class="admin-layout-option" data-layout-preview="${escapeHtml(option.preview)}"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.id)}"${option.id === value ? " checked" : ""}><span class="admin-layout-option__thumbnail" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="admin-layout-option__copy"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></span></label>`).join("")}</div>
</details>`;

const portfolioOptionalLayoutPicker = <T extends string>(
  title: string,
  note: string,
  name: string,
  value: T,
  options: readonly PortfolioLayoutOption<T>[],
  enabledName: string,
  enabled: boolean,
): string => `<div class="admin-layout-picker admin-layout-picker--optional admin-selection-card admin-selection-card--disclosure" data-optional-layout-picker>
  <div class="admin-layout-picker__optional-header">
    <label class="admin-layout-picker__optional-toggle"><input type="checkbox" name="${escapeHtml(enabledName)}" data-selection-primary${enabled ? " checked" : ""}><span class="sr-only">Include ${escapeHtml(title)} page in portfolio</span></label>
    <button class="admin-layout-picker__optional-disclosure" type="button" aria-expanded="false" aria-controls="portfolio-credentials-layout-options" data-layout-disclosure>
      <span class="admin-layout-picker__optional-copy" data-selection-content><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note)}</small></span>
      <em data-layout-selected>${escapeHtml(selectedLayoutLabel(value, options))}</em>
      <span class="admin-layout-picker__optional-icon" aria-hidden="true"></span>
    </button>
  </div>
  <div class="admin-layout-picker__options" id="portfolio-credentials-layout-options" data-layout-panel hidden>${options.map((option) => `<label class="admin-layout-option" data-layout-preview="${escapeHtml(option.preview)}"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.id)}"${option.id === value ? " checked" : ""}><span class="admin-layout-option__thumbnail" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="admin-layout-option__copy"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></span></label>`).join("")}<p class="admin-layout-picker__note">Each credential prints its evidence shown in the Portfolio (Profile › Credentials › Adjust crops), exactly as cropped; the others print a placeholder.</p></div>
</div>`;

const legacyProjectLayoutLabel = (value: string): string => value === "feature" ? "Legacy Feature" : value === "compact" ? "Legacy Compact" : "Legacy Standard";
const projectOverrideOptions = (value: ProjectLayout | undefined): string => {
  const modern = projectLayoutOptions.map((option) => `<option value="${escapeHtml(option.id)}"${value === option.id ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  const legacy = value === "feature" || value === "standard" || value === "compact"
    ? `<option value="${value}" selected>${legacyProjectLayoutLabel(value)}</option>`
    : "";
  return `<option value="default"${value ? "" : " selected"}>Use project default</option>${legacy}${modern}`;
};

const layoutOverrideOptions = <T extends string>(defaultLabel: string, options: readonly PortfolioLayoutOption<T>[], value: T | undefined): string =>
  `<option value="default"${value ? "" : " selected"}>${escapeHtml(defaultLabel)}</option>${options.map((option) => `<option value="${escapeHtml(option.id)}"${value === option.id ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}`;

type LayoutOverrideKind = "project" | "tool" | "credential";

/**
 * One "Item layout overrides" group (Projects, Automation, Credentials): a disclosure whose count and rows follow the
 * items selected for the Portfolio. Rows of unselected items stay in the form, hidden, so their saved override is kept.
 */
const layoutOverrideGroup = ({ kind, title, hint, label, items }: {
  kind: LayoutOverrideKind;
  title: string;
  hint: string;
  label: string;
  items: Array<{ id: string; name: string; selected: boolean; field: string; options: string }>;
}): string => {
  const selected = items.filter((item) => item.selected).length;
  return `<details class="admin-disclosure-group admin-layout-override-group" data-layout-override-group="${kind}"${selected ? "" : " hidden"}><summary>${escapeHtml(title)} <span data-layout-override-count>${selected}</span></summary><div>${items.map((item) => `<label data-layout-override-item data-layout-override-kind="${kind}" data-layout-override-id="${escapeHtml(item.id)}"${item.selected ? "" : " hidden"}><span><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${escapeHtml(hint)}</small></span>${renderAdminSelectControl({ name: item.field, attributes: `aria-label="${escapeHtml(`${label} for ${item.name}`)}"`, options: item.options })}</label>`).join("")}</div></details>`;
};

/** Portfolio media (§6.8): one media row per selected project or tool, grouped like the layout overrides. */
const portfolioMediaAssignmentsPanel = (runtime: PortfolioRuntimeData): string => {
  const projects = runtime.projects.filter((item) => item.status === "published");
  const tools = runtime.tools.filter((item) => item.status === "published");
  const selectedProjectCount = projects.filter((item) => item.includeInPortfolio).length;
  const selectedToolCount = tools.filter((item) => item.includeInPortfolio).length;
  const projectRows = projects.map((item) => renderPortfolioMediaRow({ kind: "project", id: item.id, name: item.name.en, images: item.images, assignment: runtime.content.mediaAssignments.projects[item.id], layout: resolveProjectLayout(runtime, item.id, item.portfolioLayout), selected: Boolean(item.includeInPortfolio) })).join("");
  const toolRows = tools.map((item) => renderPortfolioMediaRow({ kind: "tool", id: item.id, name: item.name, images: item.images, assignment: runtime.content.mediaAssignments.tools[item.id], layout: resolveAutomationLayout(runtime, item.id), selected: Boolean(item.includeInPortfolio) })).join("");
  const featureRow = projects.length ? renderPortfolioFeatureRow({
    projects: projects.map((item) => ({ id: item.id, name: item.name.en, images: item.images, selected: Boolean(item.includeInPortfolio) })),
    assignments: runtime.content.mediaAssignments.projects,
    choice: runtime.content.mediaAssignments.feature,
  }) : "";
  return `<div class="admin-portfolio-media-assignments" data-portfolio-media-assignments>
    ${featureRow ? `<details class="admin-disclosure-group admin-portfolio-media-group" data-portfolio-media-group="feature"${selectedProjectCount ? "" : " hidden"}><summary>Cover &amp; closing</summary><div>${featureRow}</div></details>` : ""}
    ${projectRows ? `<details class="admin-disclosure-group admin-portfolio-media-group" data-portfolio-media-group="project"${selectedProjectCount ? "" : " hidden"}><summary>Projects <span data-portfolio-media-group-count>${selectedProjectCount}</span></summary><div>${projectRows}</div></details>` : ""}
    ${toolRows ? `<details class="admin-disclosure-group admin-portfolio-media-group" data-portfolio-media-group="tool"${selectedToolCount ? "" : " hidden"}><summary>Automation tools <span data-portfolio-media-group-count>${selectedToolCount}</span></summary><div>${toolRows}</div></details>` : ""}
    <p class="admin-empty" data-portfolio-media-empty${selectedProjectCount || selectedToolCount ? " hidden" : ""}>Select projects or tools to configure their Portfolio visuals.</p>
  </div>`;
};

const portfolioAppearancePanel = (runtime: PortfolioRuntimeData): string => {
  const { content } = runtime;
  const availableProjects = runtime.projects.filter((item) => item.status === "published");
  const availableTools = runtime.tools.filter((item) => item.status === "published");
  const selectedProjects = availableProjects.filter((item) => item.includeInPortfolio);
  const selectedTools = availableTools.filter((item) => item.includeInPortfolio);
  // Credentials count only while the Credentials page is on (Page layouts › Credentials) and they are picked in Background.
  const availableCredentials = runtime.credentials ?? [];
  const selectedCredentials = content.layouts.includeCredentials ? availableCredentials.filter((item) => item.includeInPortfolio) : [];
  const overrides = availableProjects.length || availableTools.length || availableCredentials.length
    ? `<div class="admin-layout-overrides" data-layout-overrides>
      ${availableProjects.length ? layoutOverrideGroup({ kind: "project", title: "Project overrides", hint: "Uses the project default unless overridden.", label: "Project layout", items: availableProjects.map((item) => ({ id: item.id, name: item.name.en, selected: Boolean(item.includeInPortfolio), field: `project_layout_${item.id}`, options: projectOverrideOptions(content.layouts.projectOverrides[item.id]) })) }) : ""}
      ${availableTools.length ? layoutOverrideGroup({ kind: "tool", title: "Automation overrides", hint: "Classic groups tools; other styles create one page per tool.", label: "Automation layout", items: availableTools.map((item) => ({ id: item.id, name: item.name, selected: Boolean(item.includeInPortfolio), field: `tool_layout_${item.id}`, options: layoutOverrideOptions("Use automation default", automationLayoutOptions, content.layouts.automationOverrides[item.id]) })) }) : ""}
      ${availableCredentials.length ? layoutOverrideGroup({ kind: "credential", title: "Credentials overrides", hint: `Neighbours with the same layout share a page, ${PORTFOLIO_CREDENTIALS_PER_PAGE} per page.`, label: "Credentials layout", items: availableCredentials.map((item) => ({ id: item.id, name: item.title.en || "Untitled credential", selected: selectedCredentials.includes(item), field: `credential_layout_${item.id}`, options: layoutOverrideOptions("Use credentials default", credentialsLayoutOptions, content.layouts.credentialOverrides[item.id]) })) }) : ""}
      <p class="admin-empty" data-layout-overrides-empty${selectedProjects.length || selectedTools.length || selectedCredentials.length ? " hidden" : ""}>Select projects, tools or credentials to customize their layouts.</p>
    </div>`
    : '<p class="admin-empty">No published projects, tools or credentials are available for layout overrides.</p>';
  return [
    renderAdminSectionCard({ title: "Portfolio appearance", note: "Draft colors; published releases keep their theme.", content: themeFields(content.theme) }),
    portfolioImageTreatmentFields(content),
    renderAdminSectionCard({
      title: "Page layouts",
      note: "Pick one A4 landscape preset per page type.",
      className: "admin-layout-system-card",
      content: `<div class="admin-layout-system" role="group" aria-label="Portfolio page layouts" data-layout-accordion>
        ${portfolioLayoutPicker("Cover", "Document opening", "layout_cover", content.layouts.cover, coverLayoutOptions)}
        ${portfolioLayoutPicker("Profile", "Professional profile", "layout_profile", content.layouts.profile, profileLayoutOptions)}
        ${portfolioLayoutPicker("Project Index", "Selected work navigation", "layout_index", content.layouts.index, indexLayoutOptions)}
        ${portfolioLayoutPicker("Projects", "Default for selected projects", "layout_project_default", content.layouts.projectDefault, projectLayoutOptions)}
        ${portfolioLayoutPicker("Automation", "Default for selected tools", "layout_automation_default", content.layouts.automationDefault, automationLayoutOptions)}
        ${portfolioOptionalLayoutPicker("Credentials", `Education and supporting documents · ${PORTFOLIO_CREDENTIALS_PER_PAGE} per page`, "layout_credentials", content.layouts.credentials, credentialsLayoutOptions, "layout_credentials_enabled", content.layouts.includeCredentials)}
        ${portfolioLayoutPicker("Thank you", "Portfolio closing", "layout_closing", content.layouts.closing, closingLayoutOptions)}
      </div>`,
    }),
    renderAdminSectionCard({
      title: "Project pages",
      note: "Text beside the visuals on Technical and Editorial pages.",
      content: renderAdminSegmented({
        legend: "Project text",
        name: "portfolio_project_text",
        value: content.projectText,
        options: [{ value: "summary", label: "Summary" }, { value: "story", label: "Challenge · Approach · Outcome" }],
      }),
    }),
    renderAdminSectionCard({ title: "Item layout overrides", note: "Optional. Give an item its own layout.", content: overrides }),
    renderAdminSectionCard({
      title: "Portfolio media",
      note: "Cover and supporting visuals. Crops come from Media.",
      content: portfolioMediaAssignmentsPanel(runtime),
    }),
  ].join("");
};

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
  updateAdminRoute({ view: kind, item: id, tab: state.tab[kind] });
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
  const route = readAdminRoute();
  const urlId = route.view === kind ? route.item : null;
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

const composeCvDraft = (
  saved: CvRuntimeData,
  shared: CvRuntimeData,
  professional: ProfessionalProfileContent,
  sharedCredentials: CredentialSnapshot[] | null,
): CvRuntimeData => {
  const savedProjects = [...saved.detailedProjects, ...saved.compactProjects];
  const savedProjectSelection = new Map(savedProjects.map((item) => [item.id, item]));
  const savedToolSelection = new Map(saved.tools.map((item) => [item.id, item]));
  const sharedProjects = shared.availableProjects ?? [...shared.detailedProjects, ...shared.compactProjects];
  const sharedTools = shared.availableTools ?? shared.tools;
  const previousBackgroundSelection = resolveCvBackgroundSelection(saved.content);
  const nextContent: CvContent = {
    ...saved.content,
    profile: inheritSharedProfile(professional.profile, saved.content.profile),
    experiences: structuredClone(professional.experiences),
    education: structuredClone(professional.education),
    credentials: structuredClone(sharedCredentials ?? saved.content.credentials ?? []),
    skillGroups: structuredClone(professional.skillGroups),
    languages: structuredClone(professional.languages),
  };
  nextContent.backgroundSelection = resolveCvBackgroundSelection({
    ...nextContent,
    backgroundSelection: previousBackgroundSelection,
  });
  delete nextContent.backgroundOrder;
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
    content: nextContent,
    detailedProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "detailed").sort((a, b) => a.cvOrder - b.cvOrder),
    compactProjects: availableProjects.filter((item) => item.includeInCv && item.cvDisplay === "compact").sort((a, b) => a.cvOrder - b.cvOrder),
    tools: availableTools.filter((item) => item.includeInCv).sort((a, b) => a.cvOrder - b.cvOrder),
    availableProjects,
    availableTools,
  };
};

const publishedCredentialSnapshots = (credentials: ProfessionalCredential[]): CredentialSnapshot[] =>
  sortByMasterContentOrder(
    credentials.filter((credential) => credential.status === "published"),
    (credential) => credential.displayOrder,
  ).map(credentialSnapshot);

const portfolioCredentialLibrary = (credentials: ProfessionalCredential[]): PortfolioCredential[] => publishedCredentialSnapshots(credentials)
  .map((credential) => ({
    ...credential,
    includeInPortfolio: false,
    portfolioOrder: credential.displayOrder,
  }));

const composePortfolioDraft = (
  saved: PortfolioRuntimeData,
  shared: PortfolioRuntimeData,
  professional: ProfessionalProfileContent,
  sharedCredentials: PortfolioCredential[] | null,
): PortfolioRuntimeData => {
  const normalizedSaved = normalizePortfolioRuntimeData(saved);
  const savedProjects = new Map(normalizedSaved.projects.map((item) => [item.id, item]));
  const savedTools = new Map(normalizedSaved.tools.map((item) => [item.id, item]));
  const savedCredentials = new Map((normalizedSaved.credentials ?? []).map((item) => [item.id, item]));
  return {
    ...shared,
    content: {
      ...normalizedSaved.content,
      profile: inheritSharedProfile(professional.profile, normalizedSaved.content.profile),
      skillGroups: structuredClone(professional.skillGroups),
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
    credentials: (sharedCredentials ?? normalizedSaved.credentials ?? []).map((item) => {
      const selection = savedCredentials.get(item.id);
      return selection ? {
        ...item,
        includeInPortfolio: selection.includeInPortfolio,
        portfolioOrder: item.portfolioOrder,
      } : item;
    }),
  };
};

const composeCvDocument = (
  document: ProfileDocumentRecord<CvRuntimeData>,
  shared: CvRuntimeData,
  professional: ProfessionalProfileContent,
  sharedCredentials: CredentialSnapshot[] | null,
): ProfileDocumentRecord<CvRuntimeData> => {
  if (!document.draftPayload) return { ...document, draftPayload: null };
  if (document.status === "archived") return { ...document, draftPayload: structuredClone(document.draftPayload) };
  const draftPayload = composeCvDraft(document.draftPayload, shared, professional, sharedCredentials);
  state.newEntries.cv.set(document.id, newCvBackgroundKeys(document.draftPayload.content, draftPayload.content));
  return { ...document, draftPayload };
};

const composePortfolioDocument = (
  document: ProfileDocumentRecord<PortfolioRuntimeData>,
  shared: PortfolioRuntimeData,
  professional: ProfessionalProfileContent,
  sharedCredentials: PortfolioCredential[] | null,
): ProfileDocumentRecord<PortfolioRuntimeData> => {
  if (!document.draftPayload) return { ...document, draftPayload: null };
  if (document.status === "archived") return { ...document, draftPayload: normalizePortfolioRuntimeData(structuredClone(document.draftPayload)) };
  const draftPayload = composePortfolioDraft(document.draftPayload, shared, professional, sharedCredentials);
  const known = new Set((document.draftPayload.credentials ?? []).map((item) => item.id));
  state.newEntries.portfolio.set(document.id, new Set((draftPayload.credentials ?? [])
    .filter((item) => !item.includeInPortfolio && !known.has(item.id))
    .map((item) => backgroundEntryKey("credentials", item.id))));
  return { ...document, draftPayload };
};

const newEntryKeys = (kind: ProfileDocumentKind): Set<string> =>
  state.newEntries[kind].get(state.selectedId[kind] ?? "") ?? new Set();

const refreshDocuments = async (kind: ProfileDocumentKind): Promise<void> => {
  if (kind === "cv") {
    const [documents, shared, professional, credentials] = await Promise.all([
      listProfileDocuments<CvRuntimeData>(kind),
      loadCvData({ adminPreview: true, preferRelease: false }),
      loadProfessionalProfile(),
      listProfessionalCredentials().catch(() => null),
    ]);
    const sharedCredentials = credentials ? publishedCredentialSnapshots(credentials) : null;
    state.documents.cv = documents.map((document) => composeCvDocument(document, shared, professional, sharedCredentials));
    return;
  }
  const [documents, shared, professional, credentials] = await Promise.all([
    listProfileDocuments<PortfolioRuntimeData>(kind),
    loadPortfolioDraftData(),
    loadProfessionalProfile(),
    listProfessionalCredentials().catch(() => null),
  ]);
  const sharedCredentials = credentials ? portfolioCredentialLibrary(credentials) : null;
  state.documents.portfolio = documents.map((document) => composePortfolioDocument(document, shared, professional, sharedCredentials));
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
        const [shared, professional, credentials] = await Promise.all([
          loadCvData({ adminPreview: true, preferRelease: false }),
          loadProfessionalProfile(),
          listProfessionalCredentials().catch(() => null),
        ]);
        const sharedCredentials = credentials ? publishedCredentialSnapshots(credentials) : null;
        if (sharedCredentials) shared.content.credentials = structuredClone(sharedCredentials);
        const documents = await ensureProfileDocumentLibrary<CvRuntimeData>(kind, shared);
        state.documents.cv = documents.map((document) => composeCvDocument(document, shared, professional, sharedCredentials));
      } else {
        const [shared, professional, credentials] = await Promise.all([
          loadPortfolioDraftData(),
          loadProfessionalProfile(),
          listProfessionalCredentials().catch(() => null),
        ]);
        const sharedCredentials = credentials ? portfolioCredentialLibrary(credentials) : null;
        if (sharedCredentials) shared.credentials = structuredClone(sharedCredentials);
        const documents = await ensureProfileDocumentLibrary<PortfolioRuntimeData>(kind, shared);
        state.documents.portfolio = documents.map((document) => composePortfolioDocument(document, shared, professional, sharedCredentials));
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
    ? `<span class="admin-document-meta__detail">v${escapeHtml(release.version)}</span><span class="admin-document-meta__detail">Published ${formatAdminDate(release.publishedAt)}</span>`
    : '<span class="admin-document-meta__detail">Not published yet</span>';
};

const cvContentPanel = (content: CvContent): string => [
  renderAdminSectionCard({
    title: "CV document",
    note: "Control the draft version and first-page project density.",
    content: `<div class="admin-form-grid">
      ${field("CV version", "cv_version", content.version)}
      <label>Detailed projects on page 1 (recommended 2-3)<input name="page_one_project_count" type="number" min="1" max="3" step="1" value="${Math.min(3, Math.max(1, content.pageOneProjectCount))}"></label>
    </div>`,
  }),
  renderAdminSectionCard({
    title: "Target profile",
    note: "Tailor the title and summary for this CV and role.",
    content: `${localizedFields("Professional title", "profile_title", content.profile.professionalTitle, true)}
    ${localizedAreas("Professional summary", "profile_summary", content.profile.summary, 5, true)}`,
    actions: '<button class="button button--secondary" type="button" data-sync-target-profile>Sync from Professional Profile</button>',
  }),
].join("");

const backgroundRange = (start: string, end: string | null): string => `${start || "Start not set"} – ${end || "Present"}`;

const backgroundRow = ({ group, id, title, meta, selected, isNew = false, inputName = `cv_background_${group}` }: {
  group: CvBackgroundGroup;
  id: string;
  title: string;
  meta: string;
  selected: boolean;
  isNew?: boolean;
  inputName?: string;
}): string => `<label class="admin-switch admin-cv-background__item admin-selection-card admin-selection-card--single${selected ? " is-selected" : ""}">
  <input type="checkbox" name="${escapeHtml(inputName)}" value="${escapeHtml(id)}" data-cv-background-toggle data-selection-count-item data-selection-primary${selected ? " checked" : ""}>
  <span class="admin-cv-background__identity" data-selection-content><strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong><small title="${escapeHtml(meta)}">${escapeHtml(meta)}</small></span>
  ${isNew ? '<span class="status status--new" title="Added in Professional Profile after this draft was last saved">New</span>' : ""}
</label>`;

const backgroundNewNotice = (count: number, documentName: string): string => count
  ? `<p class="admin-cv-background__notice" role="status">${count} new item${count === 1 ? "" : "s"} in Professional Profile ${count === 1 ? "is" : "are"} not on this ${documentName} yet. Select ${count === 1 ? "it" : "them"} below to include ${count === 1 ? "it" : "them"}.</p>`
  : "";

const credentialBackgroundMeta = (item: CredentialSnapshot): string =>
  [item.issuer.en, item.issuedOn?.slice(0, 4), item.credentialNumber].filter(Boolean).join(" · ");


/** One Background group (§6.6): the shared heading and count, no per-group note (the card note covers it). */
const backgroundGroup = ({ group, title, rows, selected, total, empty }: {
  group: CvBackgroundGroup;
  title: string;
  rows: string;
  selected: number;
  total: number;
  empty: string;
}): string => `<section data-cv-background-group="${group}" data-selection-group data-selection-mode="shown">
  ${renderAdminSelectionHeading({ title, mode: "shown", selected, total })}
  <div class="admin-cv-background__list">${rows || `<p class="admin-empty">${empty}</p>`}</div>
</section>`;

const cvBackgroundPanel = (content: CvContent): string => {
  const selection = resolveCvBackgroundSelection(content);
  const selected = {
    experiences: new Set(selection.experienceIds),
    education: new Set(selection.educationIds),
    credentials: new Set(selection.credentialIds),
    skillGroups: new Set(selection.skillGroupIds),
    languages: new Set(selection.languageIds),
  };
  const newKeys = newEntryKeys("cv");
  const isNew = (group: CvBackgroundGroup, id: string): boolean => newKeys.has(backgroundEntryKey(group, id));
  const experienceRows = content.experiences.map((item) => backgroundRow({
    group: "experiences",
    id: item.id,
    title: item.company,
    meta: [item.position.en, item.location.en, backgroundRange(item.startDate, item.endDate)].filter(Boolean).join(" · "),
    selected: selected.experiences.has(item.id),
    isNew: isNew("experiences", item.id),
  })).join("");
  const educationRows = content.education.map((item) => {
    const classification = degreeClassificationValue(item.classification?.en ?? "", "en");
    return backgroundRow({
      group: "education",
      id: item.id,
      title: item.field.en,
      meta: [
        item.institution.en,
        classification ? `Degree classification: ${classification}` : "",
        `${item.startDate} – ${item.endDate}`,
      ].filter(Boolean).join(" · "),
      selected: selected.education.has(item.id),
      isNew: isNew("education", item.id),
    });
  }).join("");
  const credentialRows = (content.credentials ?? []).map((item) => backgroundRow({
    group: "credentials",
    id: item.id,
    title: item.title.en,
    meta: credentialBackgroundMeta(item),
    selected: selected.credentials.has(item.id),
    isNew: isNew("credentials", item.id),
  })).join("");
  const skillRows = content.skillGroups.map((item) => backgroundRow({
    group: "skillGroups",
    id: item.id,
    title: item.title.en,
    meta: item.items.map((skill) => skill.label.en).join(" · "),
    selected: selected.skillGroups.has(item.id),
    isNew: isNew("skillGroups", item.id),
  })).join("");
  const languageRows = content.languages.map((item) => backgroundRow({
    group: "languages",
    id: item.id,
    title: item.name.en,
    meta: item.proficiency?.en || "Proficiency not set",
    selected: selected.languages.has(item.id),
    isNew: isNew("languages", item.id),
  })).join("");
  return renderAdminSectionCard({
    title: "CV background",
    note: "Choose what appears. Order follows Professional Profile.",
    className: "admin-cv-background",
    content: `${backgroundNewNotice(newKeys.size, "CV")}<div class="admin-cv-background__groups">
        ${backgroundGroup({ group: "experiences", title: "Experience", rows: experienceRows, selected: selection.experienceIds.length, total: content.experiences.length, empty: "No experience entries in Professional Profile." })}
        ${backgroundGroup({ group: "education", title: "Education", rows: educationRows, selected: selection.educationIds.length, total: content.education.length, empty: "No education entries in Professional Profile." })}
        ${backgroundGroup({ group: "credentials", title: "Credentials", rows: credentialRows, selected: selection.credentialIds.length, total: (content.credentials ?? []).length, empty: "No Ready credentials in Professional Profile." })}
        ${backgroundGroup({ group: "skillGroups", title: "Skill groups", rows: skillRows, selected: selection.skillGroupIds.length, total: content.skillGroups.length, empty: "No skill groups in Professional Profile." })}
        ${backgroundGroup({ group: "languages", title: "Languages", rows: languageRows, selected: selection.languageIds.length, total: content.languages.length, empty: "No languages in Professional Profile." })}
      </div>`,
    actions: '<button class="button button--secondary" type="button" data-admin-view="profile">Edit Professional Profile</button>',
  });
};

const cvSelectionPanel = (runtime: CvRuntimeData): string => {
  const selectedProjects = new Map([...runtime.detailedProjects, ...runtime.compactProjects].map((item) => [item.id, item]));
  const selectedTools = new Map(runtime.tools.map((item) => [item.id, item]));
  const projects = runtime.availableProjects ?? [...runtime.detailedProjects, ...runtime.compactProjects];
  const tools = runtime.availableTools ?? runtime.tools;
  const isReady = (status?: string): boolean => status === undefined || status === "published";
  const readyProjects = projects.filter((item) => isReady(item.status));
  const readyTools = tools.filter((item) => isReady(item.status));
  return renderAdminSectionCard({
    title: "CV content selection",
    note: "Projects, presentation, responsibilities and tools.",
    content: `<div class="admin-cv-selection">
      <section data-selection-group data-selection-mode="selected">${renderAdminSelectionHeading({ title: "Projects", required: true, mode: "selected", selected: readyProjects.filter((item) => (selectedProjects.get(item.id)?.cvDisplay ?? "excluded") !== "excluded").length, total: readyProjects.length })}<div class="admin-cv-selection__list">
        ${projects.map((item) => renderCvProjectRow(item, selectedProjects.get(item.id))).join("")}
      </div></section>
      <section data-selection-group data-selection-mode="selected">${renderAdminSelectionHeading({ title: "Automation tools", mode: "selected", selected: readyTools.filter((item) => selectedTools.has(item.id)).length, total: readyTools.length })}<div class="admin-cv-selection__list admin-cv-selection__list--tools">
        ${tools.map((item) => {
          const selection = selectedTools.get(item.id);
          const ready = item.status === undefined || item.status === "published";
          const displayStatus = ready ? "published" : item.status ?? "draft";
          return `<article class="admin-cv-selection__tool admin-selection-card admin-selection-card--single">
            <label class="admin-switch"><input type="checkbox" name="cv_tool" value="${escapeHtml(item.id)}" data-selection-primary${selection ? " checked" : ""}${ready ? " data-selection-count-item" : " disabled"}><span class="admin-cv-selection__identity" data-selection-content><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong></span></label>
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
  const savedSelection = resolveCvBackgroundSelection(current);
  const archived = selectedDocument("cv")?.status === "archived";
  const selectionIds = (group: CvBackgroundGroup, fallback: string[]): string[] => archived
    ? fallback
    : form.getAll(`cv_background_${group}`).map(String);
  return {
    version: text(form, "cv_version") || current.version,
    themeId: readTheme(form).presetId,
    theme: readTheme(form),
    pageOneProjectCount: Math.min(3, Math.max(1, Number(form.get("page_one_project_count")) || 3)),
    profile: {
      ...current.profile,
      professionalTitle: { en: text(form, "profile_title_en"), vi: text(form, "profile_title_vi") },
      summary: { en: text(form, "profile_summary_en"), vi: text(form, "profile_summary_vi") },
    },
    experiences: current.experiences,
    education: current.education,
    credentials: current.credentials ?? [],
    skillGroups: current.skillGroups,
    languages: current.languages,
    backgroundSelection: {
      experienceIds: selectionIds("experiences", savedSelection.experienceIds),
      educationIds: selectionIds("education", savedSelection.educationIds),
      credentialIds: selectionIds("credentials", savedSelection.credentialIds),
      skillGroupIds: selectionIds("skillGroups", savedSelection.skillGroupIds),
      languageIds: selectionIds("languages", savedSelection.languageIds),
    },
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
    note: "Cover identity, statement and the footer of every page.",
    content: `<div class="admin-form-grid">
      ${field("Portfolio version", "portfolio_version", content.version)}
      ${renderAdminYearSelect({ label: "Cover year", name: "portfolio_year", value: content.year })}
    </div>
    ${field("Document title", "portfolio_title", content.title, "text", true)}
    ${localizedFields("Cover kicker", "portfolio_kicker", content.kicker)}
    ${localizedFields("Cover statement", "portfolio_cover_statement", content.coverStatement)}
    ${localizedFields("Footer text", "portfolio_footer_text", content.footerText)}`,
  }),
  renderAdminSectionCard({
    title: "Cover highlight",
    note: "Up to 3 lines beside the Horizontal cover; empty prints none.",
    content: `${localizedFields("Highlight kicker", "portfolio_highlight_kicker", content.coverHighlight.kicker)}
    ${localizedAreas("Highlight lines, one per line", "portfolio_highlight_lines", { en: content.coverHighlight.lines.map((line) => line.en).join("\n"), vi: content.coverHighlight.lines.map((line) => line.vi).join("\n") }, 3)}`,
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
    note: "About, Automation and closing page content.",
    content: `${localizedFields("About kicker", "about_kicker", content.aboutKicker)}
    ${localizedFields("About heading", "about_heading", content.aboutHeading)}
    ${localizedFields("Automation statement", "automation_statement", content.automationStatement)}
    ${localizedFields("Closing kicker", "closing_kicker", content.closingKicker)}
    ${localizedFields("Closing heading", "closing_heading", content.closingHeading)}
    ${localizedAreas("Closing text", "closing_text", content.closingText, 3)}`,
  }),
].join("");

const portfolioSelectionPanel = (runtime: PortfolioRuntimeData): string => renderAdminSectionCard({
  title: "Portfolio content selection",
  note: "Order follows source libraries; layouts live in Appearance.",
  content: `<div class="admin-document-selection">
    <section data-selection-group data-selection-mode="selected">${renderAdminSelectionHeading({ title: "Projects", required: true, mode: "selected", selected: runtime.projects.filter((item) => item.status === "published" && item.includeInPortfolio).length, total: runtime.projects.filter((item) => item.status === "published").length })}
    <div class="admin-cv-selection__list">${runtime.projects.map((item) => {
      const layout = resolveProjectLayout(runtime, item.id, item.portfolioLayout);
      return renderPortfolioProjectRow({ project: item, ready: item.status === "published", layoutLabel: portfolioLayoutLabel("project", layout), limit: portfolioContributionLimit(layout), chosenIds: runtime.content.projectResponsibilities[item.id] });
    }).join("")}</div>
    </section>
    <section data-selection-group data-selection-mode="selected">${renderAdminSelectionHeading({ title: "Automation tools", mode: "selected", selected: runtime.tools.filter((item) => item.status === "published" && item.includeInPortfolio).length, total: runtime.tools.filter((item) => item.status === "published").length })}
    ${runtime.tools.map((item) => {
      const ready = item.status === "published";
      return `<article class="admin-document-selection__item admin-document-selection__item--tool admin-selection-card admin-selection-card--single"><label class="admin-switch"><input type="checkbox" name="portfolio_tool" value="${escapeHtml(item.id)}" data-selection-primary${ready && item.includeInPortfolio ? " checked" : ""}${ready ? " data-selection-count-item" : " disabled"}><span class="admin-document-selection__identity" data-selection-content><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small title="${escapeHtml(item.slug || "Slug not set")}">${item.slug ? `Slug: ${escapeHtml(item.slug)}` : "Slug not set"}</small></span></label><span class="status status--${item.status}">${ready ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}</span></article>`;
    }).join("")}
    </section>
  </div>`,
});

const portfolioBackgroundPanel = (runtime: PortfolioRuntimeData): string => {
  const credentials = runtime.credentials ?? [];
  const newKeys = newEntryKeys("portfolio");
  const rows = credentials.map((item) => backgroundRow({
    group: "credentials",
    id: item.id,
    title: item.title.en || "Untitled credential",
    meta: credentialBackgroundMeta(item) || item.kind.replaceAll("_", " "),
    selected: item.includeInPortfolio,
    isNew: newKeys.has(backgroundEntryKey("credentials", item.id)),
    inputName: "portfolio_credential",
  })).join("");
  return renderAdminSectionCard({
    title: "Portfolio background",
    note: "Choose what appears. Order follows Professional Profile.",
    className: "admin-cv-background",
    content: `${backgroundNewNotice(newKeys.size, "Portfolio")}<div class="admin-cv-background__groups">
        ${backgroundGroup({ group: "credentials", title: "Credentials", rows, selected: credentials.filter((item) => item.includeInPortfolio).length, total: credentials.length, empty: "No Ready credentials in Professional Profile. The Credentials page keeps safe placeholders." })}
      </div>`,
    actions: '<button class="button button--secondary" type="button" data-admin-view="profile">Edit Professional Profile</button>',
  }) + portfolioProfilePagePanel(runtime);
};

const profileStatOptions: Array<[PortfolioProfileStat, string]> = [["projects", "Selected projects"], ["tools", "Automation tools"], ["capabilities", "Capabilities"], ["credentials", "Credentials"]];

/** Background › Profile page: which skill groups become capability cards, and which two figures the Portrait profile prints. */
const portfolioProfilePagePanel = (runtime: PortfolioRuntimeData): string => {
  const groups = runtime.content.skillGroups;
  const chosen = new Set(portfolioCapabilityGroups(runtime).map((group) => group.id));
  const rows = groups.map((group) => backgroundRow({
    group: "skillGroups",
    id: group.id,
    title: group.title.en || "Untitled skill group",
    meta: `${group.items.length} item${group.items.length === 1 ? "" : "s"}${group.items.length > PORTFOLIO_PROFILE_CARD_ITEMS ? ` · first ${PORTFOLIO_PROFILE_CARD_ITEMS} printed` : ""}`,
    selected: chosen.has(group.id),
    inputName: "portfolio_capability_group",
  })).join("");
  const figure = (label: string, name: string, value: PortfolioProfileStat): string => `<label>${renderAdminFieldLabel(label)}${renderAdminSelectControl({ name, options: profileStatOptions.map(([id, text]) => `<option value="${id}"${id === value ? " selected" : ""}>${text}</option>`).join("") })}</label>`;
  return renderAdminSectionCard({
    title: "Profile page",
    note: `Up to ${PORTFOLIO_PROFILE_CARD_GROUPS} capability cards and two figures; zeros are hidden.`,
    className: "admin-cv-background",
    content: `<div class="admin-cv-background__groups">
      <section data-cv-background-group="skillGroups" data-selection-group data-selection-mode="selected" data-capability-groups data-capability-limit="${PORTFOLIO_PROFILE_CARD_GROUPS}">
        ${renderAdminSelectionHeading({ title: "Capability cards", mode: "selected", selected: chosen.size, total: groups.length })}
        <div class="admin-cv-background__list">${rows || '<p class="admin-empty">No skill groups in Professional Profile.</p>'}</div>
      </section>
      <section>
        <header class="admin-selection-heading"><h4>Figures</h4></header>
        <div class="admin-form-grid">${figure("First figure", "portfolio_stat_first", runtime.content.profilePage.stats[0])}${figure("Second figure", "portfolio_stat_second", runtime.content.profilePage.stats[1])}</div>
      </section>
    </div>`,
  });
};

const readPortfolioForm = (formElement: HTMLFormElement): PortfolioRuntimeData => {
  const current = state.portfolio ?? { content: structuredClone(portfolioContentSeed), projects: [], tools: [] };
  const form = new FormData(formElement);
  const projectIds = new Set(form.getAll("portfolio_project").map(String));
  const toolIds = new Set(form.getAll("portfolio_tool").map(String));
  const credentialIds = new Set(form.getAll("portfolio_credential").map(String));
  const rawOverlayOpacity = Number(form.get("portfolio_image_overlay_opacity"));
  const projectOverrides = { ...current.content.layouts.projectOverrides };
  current.projects.forEach((item) => {
    const key = `project_layout_${item.id}`;
    if (!form.has(key)) return;
    const value = String(form.get(key) ?? "default") as ProjectLayout | "default";
    if (value === "default") delete projectOverrides[item.id];
    else projectOverrides[item.id] = value;
  });
  const automationOverrides = { ...current.content.layouts.automationOverrides };
  current.tools.forEach((item) => {
    const key = `tool_layout_${item.id}`;
    if (!form.has(key)) return;
    const value = String(form.get(key) ?? "default") as AutomationLayout | "default";
    if (value === "default") delete automationOverrides[item.id];
    else automationOverrides[item.id] = value;
  });
  const credentialOverrides = { ...current.content.layouts.credentialOverrides };
  (current.credentials ?? []).forEach((item) => {
    const key = `credential_layout_${item.id}`;
    if (!form.has(key)) return;
    const value = String(form.get(key) ?? "default") as CredentialsLayout | "default";
    if (value === "default") delete credentialOverrides[item.id];
    else credentialOverrides[item.id] = value;
  });
  const projectMediaAssignments = { ...current.content.mediaAssignments.projects };
  current.projects.forEach((item) => {
    const primaryKey = `project_primary_media_${item.id}`;
    const supportingKey = `project_supporting_media_${item.id}`;
    if (!form.has(primaryKey) && !form.has(supportingKey)) return;
    const primaryMediaId = text(form, primaryKey);
    const supportingMediaId = text(form, supportingKey);
    projectMediaAssignments[item.id] = {
      ...(primaryMediaId ? { primaryMediaId } : {}),
      ...(supportingMediaId && supportingMediaId !== primaryMediaId ? { supportingMediaId } : {}),
    };
  });
  const toolMediaAssignments = { ...current.content.mediaAssignments.tools };
  current.tools.forEach((item) => {
    const primaryKey = `tool_primary_media_${item.id}`;
    const supportingKey = `tool_supporting_media_${item.id}`;
    if (!form.has(primaryKey) && !form.has(supportingKey)) return;
    const primaryMediaId = text(form, primaryKey);
    const supportingMediaId = text(form, supportingKey);
    toolMediaAssignments[item.id] = {
      ...(primaryMediaId ? { primaryMediaId } : {}),
      ...(supportingMediaId && supportingMediaId !== primaryMediaId ? { supportingMediaId } : {}),
    };
  });
  const localizedValue = (name: string): LocalizedText => ({ en: text(form, `${name}_en`), vi: text(form, `${name}_vi`) });
  const lines = (name: string): string[] => text(form, name).split("\n").map((line) => line.trim()).filter(Boolean);
  const highlightEn = lines("portfolio_highlight_lines_en");
  const highlightVi = lines("portfolio_highlight_lines_vi");
  const capabilityIds = form.getAll("portfolio_capability_group").map(String);
  const statValue = (name: string, fallback: PortfolioProfileStat): PortfolioProfileStat => {
    const value = text(form, name);
    return profileStatOptions.some(([id]) => id === value) ? value as PortfolioProfileStat : fallback;
  };
  // Responsibilities chosen per project; a project whose row was not rendered keeps its saved choice.
  const projectResponsibilities = { ...current.content.projectResponsibilities };
  current.projects.forEach((item) => {
    if (form.has(`portfolio_responsibilities_${item.id}`)) projectResponsibilities[item.id] = form.getAll(`portfolio_responsibility_${item.id}`).map(String);
  });
  const featureProjectId = text(form, "portfolio_feature_project");
  const featureMediaId = text(form, "portfolio_feature_media");
  const content: PortfolioContent = {
    ...current.content,
    coverStatement: form.has("portfolio_cover_statement_en") ? localizedValue("portfolio_cover_statement") : current.content.coverStatement,
    footerText: form.has("portfolio_footer_text_en") ? localizedValue("portfolio_footer_text") : current.content.footerText,
    coverHighlight: form.has("portfolio_highlight_kicker_en")
      ? {
        kicker: localizedValue("portfolio_highlight_kicker"),
        lines: Array.from({ length: Math.min(3, Math.max(highlightEn.length, highlightVi.length)) }, (_, index) => ({ en: highlightEn[index] ?? "", vi: highlightVi[index] ?? "" })),
      }
      : current.content.coverHighlight,
    projectResponsibilities,
    projectText: form.has("portfolio_project_text") ? (text(form, "portfolio_project_text") === "story" ? "story" : "summary") : current.content.projectText,
    automationStatement: form.has("automation_statement_en") ? localizedValue("automation_statement") : current.content.automationStatement,
    profilePage: form.has("portfolio_stat_first")
      ? {
        skillGroupIds: capabilityIds.slice(0, PORTFOLIO_PROFILE_CARD_GROUPS),
        stats: [statValue("portfolio_stat_first", current.content.profilePage.stats[0]), statValue("portfolio_stat_second", current.content.profilePage.stats[1])],
      }
      : current.content.profilePage,
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
    imageOverlay: {
      enabled: form.get("portfolio_image_overlay_enabled") === "on",
      opacity: Number.isFinite(rawOverlayOpacity)
        ? Math.min(100, Math.max(0, rawOverlayOpacity)) / 100
        : portfolioContentSeed.imageOverlay.opacity,
    },
    layouts: {
      configVersion: 2,
      cover: (text(form, "layout_cover") || current.content.layouts.cover) as PortfolioContent["layouts"]["cover"],
      profile: (text(form, "layout_profile") || current.content.layouts.profile) as PortfolioContent["layouts"]["profile"],
      index: (text(form, "layout_index") || current.content.layouts.index) as PortfolioContent["layouts"]["index"],
      projectDefault: (text(form, "layout_project_default") || current.content.layouts.projectDefault) as PortfolioContent["layouts"]["projectDefault"],
      projectOverrides,
      automationDefault: (text(form, "layout_automation_default") || current.content.layouts.automationDefault) as AutomationLayout,
      automationOverrides,
      credentials: (text(form, "layout_credentials") || current.content.layouts.credentials) as PortfolioContent["layouts"]["credentials"],
      credentialOverrides,
      includeCredentials: form.get("layout_credentials_enabled") === "on",
      closing: (text(form, "layout_closing") || current.content.layouts.closing) as PortfolioContent["layouts"]["closing"],
    },
    mediaAssignments: {
      projects: projectMediaAssignments,
      tools: toolMediaAssignments,
      ...(form.has("portfolio_feature_project")
        ? featureProjectId ? { feature: { projectId: featureProjectId, ...(featureMediaId ? { mediaId: featureMediaId } : {}) } } : {}
        : current.content.mediaAssignments.feature ? { feature: current.content.mediaAssignments.feature } : {}),
    },
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
      portfolioLayout: item.portfolioLayout,
    })),
    tools: current.tools.map((item) => ({
      ...item,
      includeInPortfolio: toolIds.has(item.id),
      portfolioOrder: item.portfolioOrder,
    })),
    credentials: (current.credentials ?? []).map((item) => ({
      ...item,
      includeInPortfolio: credentialIds.has(item.id),
      portfolioOrder: item.portfolioOrder,
    })),
  };
};

const tabs = (kind: ProfileDocumentKind): Array<[DocumentTab, string]> => kind === "cv"
  ? [["content", "Profile"], ["background", "Background"], ["selection", "Projects & tools"], ["appearance", "Appearance"]]
  : [["content", "Content"], ["selection", "Projects & tools"], ["background", "Background"], ["appearance", "Appearance"]];

const documentLabel = (kind: ProfileDocumentKind): string => kind === "cv" ? "CV" : "Portfolio";
const documentPlural = (kind: ProfileDocumentKind): string => kind === "cv" ? "CVs" : "Portfolios";
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
          <small>Updated ${formatAdminDate(item.updatedAt)}</small>
        </button>
        <div class="admin-content-item__meta"><span class="status status--${item.status}">${item.status}</span>${item.isActive ? '<span class="admin-document-active">Active</span>' : ""}</div>
      </li>`).join("");
};

const documentCollectionView = (kind: ProfileDocumentKind): string => {
  const isDrawer = Boolean(state.selectedId[kind]);
  return `
    <aside id="${kind}-document-library" class="admin-document-library__collection"${isDrawer ? ' data-document-library-drawer role="dialog" aria-label="Document library" aria-hidden="true" inert' : ""}>
      <div class="admin-collection__heading"><div><small>Profile & documents</small><h2>${documentPlural(kind)} <span>${state.documents[kind].length}</span></h2></div><div class="admin-collection__heading-actions"><button class="button admin-action-new" type="button" data-profile-document-new>+ New</button>${isDrawer ? `<button class="admin-drawer-close" type="button" data-profile-document-library-close aria-label="Close document library" title="Close">${adminCloseIcon}</button>` : ""}</div></div>
      <div class="admin-list-controls">
        <label class="admin-search"><span class="sr-only">Search ${documentPlural(kind)}</span><input type="search" placeholder="Search title or version..." value="${escapeHtml(state.search[kind])}" data-profile-document-search></label>
        <div class="admin-filter-row" aria-label="${documentLabel(kind)} status">${(["all", "draft", "published", "archived"] as DocumentFilter[]).map((filter) => `<button type="button" data-profile-document-filter="${filter}" class="${state.filter[kind] === filter ? "is-active" : ""}" aria-pressed="${state.filter[kind] === filter}">${filter}</button>`).join("")}</div>
      </div>
      <div class="admin-collection__scroll"><ul class="admin-content-list" data-profile-document-list>${documentListView(kind)}</ul></div>
    </aside>`;
};

const documentWorkspaceError = (kind: ProfileDocumentKind, message: string): string => renderAdminWorkspaceState({
  kind: "error",
  eyebrow: "Document workspace",
  title: `Could not open ${kind === "cv" ? "Curriculum Vitae" : "Portfolio"}`,
  message,
  actions: '<button class="button" type="button" data-profile-document-retry>Try again</button>',
});

const loadingDocumentWorkspace = (kind: ProfileDocumentKind): string => renderAdminWorkspaceState({
  kind: "loading",
  eyebrow: "Document workspace",
  title: `Loading ${documentPlural(kind)}`,
  message: "Preparing the document library, editor and preview.",
});

export const profileDocumentWorkspaceView = (kind: ProfileDocumentKind): string => {
  if (state.phase[kind] === "idle" || state.phase[kind] === "loading") return loadingDocumentWorkspace(kind);
  if (state.errors[kind]) return documentWorkspaceError(kind, state.errors[kind] ?? "Document workspace could not be loaded.");
  const runtime = kind === "cv" ? state.cv : state.portfolio;
  const selected = selectedDocument(kind);
  if (!runtime || !selected) return renderAdminWorkspaceState({ kind: "empty", eyebrow: "Document workspace", title: `No ${documentLabel(kind)} document yet`, message: `Create a ${documentLabel(kind)} document to start editing and publishing.` });
  const content = runtime.content;
  const availableTabs = tabs(kind);
  const route = readAdminRoute();
  if (route.view === kind && route.tab && availableTabs.some(([id]) => id === route.tab)) state.tab[kind] = route.tab as DocumentTab;
  const activeTab = availableTabs.some(([id]) => id === state.tab[kind]) ? state.tab[kind] : availableTabs[0][0];
  state.tab[kind] = activeTab;
  const issues = validateProfileDocument(kind, runtime);
  const notes = profileDocumentRecommendations(kind, runtime);
  const validationContent = documentCheckContent(issues, notes);
  const releaseHistory = state.releases[kind].length
    ? `<ol class="admin-release-history__list">${state.releases[kind].map((item) => `<li><div><strong>${item.isActive ? "Active release" : "Published release"}</strong><span>${formatAdminDateTime(item.publishedAt)}</span></div><code>${escapeHtml(item.version)}</code></li>`).join("")}</ol>`
    : `<p class="admin-empty">No ${documentLabel(kind)} release has been published yet.</p>`;
  const publicPath = kind === "cv" ? "cv/" : "portfolio/";
  const previewPath = `${publicPath}?preview=1&embedded=1${kind === "portfolio" ? "&scroll=internal" : ""}`;
  const contentPanel = kind === "cv" ? cvContentPanel(content as CvContent) : portfolioContentPanel(content as PortfolioContent);
  const selectionPanel = kind === "cv" ? cvSelectionPanel(runtime as CvRuntimeData) : portfolioSelectionPanel(runtime as PortfolioRuntimeData);
  const backgroundPanel = kind === "cv"
    ? cvBackgroundPanel(content as CvContent)
    : portfolioBackgroundPanel(runtime as PortfolioRuntimeData);
  const appearancePanel = kind === "portfolio"
    ? portfolioAppearancePanel(runtime as PortfolioRuntimeData)
    : renderAdminSectionCard({ title: `${documentLabel(kind)} appearance`, note: "Draft colors; published releases keep their theme.", content: themeFields(content.theme) });
  const archived = selected.status === "archived";
  const initialPageCount = kind === "cv"
    ? 2
    : portfolioPageCount(runtime as PortfolioRuntimeData);
  const languageControl = renderAdminPreviewLanguageToggle(state.previewLanguage[kind], "data-document-language-toggle");
  const zoomControls = renderPreviewZoomControls(state.zoom[kind]);
  const previewToolbar = renderAdminPreviewToolbar({
    title: `${documentLabel(kind)} preview`,
    meta: `${kind === "cv" ? "A4" : "A4 landscape"} · <span data-preview-page-count>${initialPageCount} pages</span> · <button type="button" class="admin-preview-status" data-document-validation-open data-kind="${issues.length ? "warning" : "success"}" aria-haspopup="dialog" aria-controls="${kind}-validation-dialog">${documentCheckStatus(issues, notes)}</button>`,
    controls: `${languageControl}${zoomControls}`,
  });
  return `
    <section class="admin-document-library is-editing"><button class="admin-library-scrim" type="button" data-profile-document-library-close aria-label="Close document library" tabindex="-1"></button>${documentCollectionView(kind)}<div class="admin-document-library__workspace">
    <section class="admin-document-workspace" data-document-kind="${kind}">
      ${renderAdminDocumentHeader({
        eyebrow: `${documentLabel(kind)} document`,
        title: selected.internalTitle,
        titleContent: `<button class="admin-document-title-switcher" type="button" data-profile-document-library-open aria-haspopup="dialog" aria-controls="${kind}-document-library" aria-expanded="false" aria-label="Switch ${documentLabel(kind)}. Current document: ${escapeHtml(selected.internalTitle)}"><span class="admin-document-title-switcher__label">${escapeHtml(selected.internalTitle)}</span><span class="admin-document-title-switcher__icon" aria-hidden="true">${adminChevronIcon}</span></button>`,
        meta: `<span class="status status--${selected.status}">${selected.status}</span>${selected.isActive ? '<span class="admin-document-meta__active">Live</span>' : ""}${latestReleaseMeta(kind)}`,
        saveState: '<span data-document-save-state data-dirty="false" aria-live="polite">Saved</span>',
        utilityActions: `<button class="button button--secondary admin-action-utility" type="button" data-document-history-open aria-haspopup="dialog" aria-controls="${kind}-release-history-dialog">History (${state.releases[kind].length})</button>`,
        moreActions: `<details class="admin-document-more"><summary>More</summary><div><button type="button" data-document-print>Print / PDF</button><button type="button" data-profile-document-rename>Rename</button><button type="button" data-profile-document-duplicate>Duplicate</button>${!archived && !selected.isActive ? '<button type="button" data-profile-document-archive>Archive</button>' : ""}</div></details>`,
        saveActions: archived ? "" : `<button class="button button--secondary admin-action-save" type="submit" form="${kind}-document-form">Save draft</button>`,
        primaryActions: archived ? "" : '<button class="button admin-action-publish" type="button" data-document-publish>Publish</button>',
      })}
      ${archived ? '<div class="admin-document-lock"><strong>Archived document</strong><span>This snapshot is read-only. Duplicate it to create an editable draft.</span></div>' : ""}
      <div class="admin-document-layout">
        <section class="admin-document-editor">
          <nav class="admin-document-tabs" role="tablist" aria-label="Document editor sections">
            ${availableTabs.map(([id, label]) => `<button type="button" role="tab" data-document-tab="${id}" aria-selected="${activeTab === id}" class="${activeTab === id ? "is-active" : ""}">${label}</button>`).join("")}
          </nav>
          <form id="${kind}-document-form" data-document-form>
            <section data-document-panel="content"${activeTab === "content" ? "" : " hidden"}>${contentPanel}</section>
            <section data-document-panel="background"${activeTab === "background" ? "" : " hidden"}>${backgroundPanel}</section>
            <section data-document-panel="selection"${activeTab === "selection" ? "" : " hidden"}>${selectionPanel}</section>
            <section data-document-panel="appearance"${activeTab === "appearance" ? "" : " hidden"}>${appearancePanel}</section>
          </form>
        </section>
        <aside class="admin-document-preview">
          ${previewToolbar}
          <div class="admin-document-frame admin-document-frame--${kind}" data-zoom="${state.zoom[kind].mode}" tabindex="0" aria-label="Scrollable ${kind === "cv" ? "CV" : "Portfolio"} preview frame"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="${kind === "cv" ? "CV" : "Portfolio"} draft preview${kind === "portfolio" ? "; scroll to review pages" : ""}" src="${import.meta.env.BASE_URL + previewPath}" data-document-iframe scrolling="${kind === "portfolio" ? "yes" : "no"}" tabindex="${kind === "portfolio" ? "0" : "-1"}"></iframe></div></div>
        </aside>
      </div>
      <dialog id="${kind}-release-history-dialog" class="admin-dialog admin-release-history" data-document-history-dialog aria-labelledby="${kind}-release-history-title"><form method="dialog"><div><p class="section-kicker">${documentLabel(kind)}</p><h2 id="${kind}-release-history-title">Release history</h2><p>Published releases remain read-only snapshots.</p><section class="admin-dialog-status-region" data-admin-dialog-status aria-label="${documentLabel(kind)} history status" hidden></section></div>${releaseHistory}<div class="admin-actions"><button class="button button--secondary" type="button" data-document-history-close>Close</button></div></form></dialog>
      <dialog id="${kind}-validation-dialog" class="admin-dialog admin-document-check-dialog" data-document-validation-dialog aria-labelledby="${kind}-validation-title"><form method="dialog"><div><p class="section-kicker">${documentLabel(kind)}</p><h2 id="${kind}-validation-title">Pre-publish check</h2><p>Required fixes block publishing; recommendations do not.</p><section class="admin-dialog-status-region" data-admin-dialog-status aria-label="${documentLabel(kind)} validation status" hidden></section></div><div class="admin-document-check-dialog__content" data-document-validation-content>${validationContent}</div><div class="admin-actions"><button class="button button--secondary" type="button" data-document-validation-close>Close</button></div></form></dialog>
    </section></div></section>`;
};

const previewPayload = (kind: ProfileDocumentKind, form: HTMLFormElement): CvRuntimeData | PortfolioRuntimeData => {
  if (kind === "cv") return readCvRuntimeForm(form);
  return readPortfolioForm(form);
};

const previewRenderPayload = (
  kind: ProfileDocumentKind,
  form: HTMLFormElement,
): CvPreviewData | PortfolioPreviewData => ({
  ...previewPayload(kind, form),
  previewLanguage: state.previewLanguage[kind],
});

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
  state.previewLanguage = { cv: "en", portfolio: "en" };
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
  state.previewLanguage = { cv: "en", portfolio: "en" };
  state.newEntries = { cv: new Map(), portfolio: new Map() };
};

export const markProfileDocumentWorkspaceStale = (): void => {
  state.phase = { cv: "idle", portfolio: "idle" };
  state.errors = {};
};

export const bindProfileDocumentWorkspace = (root: ParentNode, kind: ProfileDocumentKind, callbacks: WorkspaceCallbacks): void => {
  let layoutIssues: string[] = [];
  bindAdminSelectionCounts(root);
  bindCvProjectRows(root);
  bindPortfolioProjectRows(root);
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
    ? bindEmbeddedPreview(iframe, previewStage, {
        measurementHeight: kind === "cv" ? 1123 : 794,
        scrollMode: kind === "portfolio" ? "internal" : "outer",
      })
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
    ? bindPreviewSender(iframe, kind, () => previewRenderPayload(kind, form), () => {
      previewController?.refresh();
      previewController?.reveal();
      const pageCount = iframe.contentDocument?.querySelectorAll(kind === "cv" ? ".cv-page" : ".portfolio-page").length ?? 0;
      const pageCountLabel = root.querySelector<HTMLElement>("[data-preview-page-count]");
      if (pageCountLabel && pageCount) pageCountLabel.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"}`;
      if (kind === "portfolio" && iframe.contentDocument) {
        layoutIssues = findPortfolioLayoutIssues(iframe.contentDocument);
        recheckDocument();
      }
    })
    : undefined;
  iframe?.addEventListener("error", () => previewController?.setError(`${documentLabel(kind)} preview is unavailable.`));
  root.querySelector<HTMLButtonElement>("[data-document-language-toggle]")?.addEventListener("click", (event) => {
    state.previewLanguage[kind] = state.previewLanguage[kind] === "en" ? "vi" : "en";
    const button = event.currentTarget as HTMLButtonElement;
    const targetLabel = state.previewLanguage[kind] === "en" ? "Vietnamese" : "English";
    button.textContent = state.previewLanguage[kind] === "en" ? "VI" : "EN";
    button.setAttribute("aria-label", `Preview in ${targetLabel}`);
    button.title = `Preview in ${targetLabel}`;
    previewSender?.send();
  });

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
    root.querySelectorAll<HTMLButtonElement>("[data-profile-document-filter]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    const list = root.querySelector<HTMLElement>("[data-profile-document-list]");
    if (list) {
      list.innerHTML = documentListView(kind);
      bindSelectionButtons(list);
    }
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-document-new]").forEach((button) => button.addEventListener("click", async () => {
    if (state.dirty[kind] && !(await confirmAdmin({ eyebrow: `New ${documentLabel(kind)}`, title: "Keep the current document?", message: "A new document will be created from the current unsaved preview. The original document remains unchanged.", confirmLabel: "Create new document" }))) return;
    const title = await requestAdminText({
      eyebrow: `New ${documentLabel(kind)}`,
      title: `Name this ${documentLabel(kind)}`,
      description: "Use an internal name that makes this version easy to find later.",
      label: "Document name",
      initialValue: `New ${documentLabel(kind)}`,
      submitLabel: "Create document",
    });
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
  root.querySelector<HTMLButtonElement>("[data-profile-document-rename]")?.addEventListener("click", async () => {
    if (!activeDocument) return;
    if (state.dirty[kind]) return callbacks.notify("Save the document before renaming it.", "info");
    const title = await requestAdminText({
      eyebrow: `Rename ${documentLabel(kind)}`,
      title: "Choose a clear internal name",
      description: "This changes the Admin library name only; published releases remain unchanged.",
      label: "Document name",
      initialValue: activeDocument.internalTitle,
      submitLabel: "Rename",
    });
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
  root.querySelector<HTMLButtonElement>("[data-profile-document-duplicate]")?.addEventListener("click", async (event) => {
    if (!activeDocument?.draftPayload) return;
    const payload = form && state.dirty[kind] ? previewPayload(kind, form) : activeDocument.draftPayload;
    const title = await requestAdminText({
      eyebrow: `Duplicate ${documentLabel(kind)}`,
      title: "Name the new draft",
      description: "The duplicate is independent and can be edited without changing the original.",
      label: "Document name",
      initialValue: `${activeDocument.internalTitle} copy`,
      submitLabel: "Duplicate",
    });
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
  const overlayToggle = form.querySelector<HTMLInputElement>("[data-image-overlay-toggle]");
  const overlayRange = form.querySelector<HTMLInputElement>("[data-image-overlay-range]");
  const overlayOutput = form.querySelector<HTMLOutputElement>("[data-image-overlay-output]");
  const overlaySettings = form.querySelector<HTMLElement>("[data-image-overlay-settings]");
  const overlayReset = form.querySelector<HTMLButtonElement>("[data-image-overlay-reset]");
  const overlaySwatch = form.querySelector<HTMLElement>("[data-image-overlay-swatch]");
  const overlayPrimary = form.querySelector<HTMLElement>("[data-image-overlay-primary]");
  const syncImageOverlayControl = (): void => {
    if (!overlayToggle || !overlayRange) return;
    const enabled = overlayToggle.checked;
    const opacity = Math.min(100, Math.max(0, Number(overlayRange.value) || 0));
    overlayOutput?.replaceChildren(`${Math.round(opacity)}%`);
    overlayRange.style.setProperty("--admin-overlay-progress", `${opacity}%`);
    overlaySettings?.classList.toggle("is-disabled", !enabled);
    overlayRange.setAttribute("aria-disabled", String(!enabled));
    overlayRange.tabIndex = enabled ? 0 : -1;
    if (overlayReset) overlayReset.disabled = !enabled || activeDocument?.status === "archived" || Math.round(opacity) === defaultOverlayPercent;
    const primaryInput = form.elements.namedItem("theme_primary");
    if (primaryInput instanceof HTMLInputElement) {
      const primary = primaryInput.value.toUpperCase();
      overlayRange.style.setProperty("--admin-overlay-color", primary);
      overlaySwatch?.style.setProperty("--admin-overlay-color", primary);
      if (overlayPrimary) overlayPrimary.textContent = primary;
    }
  };
  syncImageOverlayControl();
  let appearancePreviewFrame: number | undefined;
  const schedulePortfolioAppearancePreview = (): void => {
    if (kind !== "portfolio" || !iframe || appearancePreviewFrame !== undefined) return;
    appearancePreviewFrame = window.requestAnimationFrame(() => {
      appearancePreviewFrame = undefined;
      if (!iframe.isConnected) return;
      const content = readPortfolioForm(form).content;
      iframe.contentWindow?.postMessage({
        type: "hdl:portfolio-appearance-preview",
        theme: content.theme,
        imageOverlay: content.imageOverlay,
      }, window.location.origin);
    });
  };
  const isPortfolioAppearanceControl = (target: EventTarget | null): boolean => kind === "portfolio" && (
    target instanceof HTMLInputElement && [
      "theme_primary",
      "theme_accent",
      "portfolio_image_overlay_enabled",
      "portfolio_image_overlay_opacity",
    ].includes(target.name)
    || target instanceof HTMLSelectElement && target.name === "theme_preset"
  );
  // Layout issues come from the rendered preview; they are reported but do not block publishing.
  const updateValidation = (contentIssues: string[], notes: string[] = []): void => {
    const issues = [...contentIssues, ...layoutIssues];
    const status = root.querySelector<HTMLButtonElement>("[data-document-validation-open]");
    const content = root.querySelector<HTMLElement>("[data-document-validation-content]");
    if (status) {
      status.dataset.kind = issues.length ? "warning" : "success";
      status.textContent = documentCheckStatus(issues, notes);
    }
    if (content) {
      content.innerHTML = documentCheckContent(issues, notes);
    }
  };
  const recheckDocument = (): void => {
    const payload = previewPayload(kind, form);
    updateValidation(validateProfileDocument(kind, payload), profileDocumentRecommendations(kind, payload));
  };
  const markDirty = (previewMode: "full" | "appearance" = "full"): void => {
    if (activeDocument?.status === "archived") return;
    state.dirty[kind] = true;
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-document-save-state]");
    if (status) {
      status.textContent = "Unsaved changes";
      status.dataset.dirty = "true";
    }
    recheckDocument();
    if (previewMode === "appearance") {
      schedulePortfolioAppearancePreview();
      return;
    }
    if (previewTimer !== undefined) window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => sendPreview(kind, form), 180);
  };
  const setOptionalLayoutPickerOpen = (picker: HTMLElement, open: boolean): void => {
    const trigger = picker.querySelector<HTMLButtonElement>("[data-layout-disclosure]");
    const panel = picker.querySelector<HTMLElement>("[data-layout-panel]");
    if (!trigger || !panel) return;
    trigger.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    picker.classList.toggle("is-open", open);
  };
  const closeOtherLayoutPickers = (current: HTMLElement): void => {
    const accordion = current.closest<HTMLElement>("[data-layout-accordion]");
    if (!accordion) return;
    accordion.querySelectorAll<HTMLDetailsElement>("details.admin-layout-picker[open]").forEach((picker) => {
      if (picker !== current) picker.open = false;
    });
    const optionalPicker = accordion.querySelector<HTMLElement>("[data-optional-layout-picker]");
    if (optionalPicker && optionalPicker !== current) setOptionalLayoutPickerOpen(optionalPicker, false);
  };
  form.querySelectorAll<HTMLDetailsElement>("[data-layout-accordion] details.admin-layout-picker").forEach((picker) => {
    picker.addEventListener("toggle", () => {
      if (picker.open) closeOtherLayoutPickers(picker);
    });
  });
  const syncPortfolioLayoutOverrides = (): void => {
    const overrides = form.querySelector<HTMLElement>("[data-layout-overrides]");
    const mediaAssignments = form.querySelector<HTMLElement>("[data-portfolio-media-assignments]");
    if (!overrides && !mediaAssignments) return;
    const credentialsPageOn = form.querySelector<HTMLInputElement>('input[name="layout_credentials_enabled"]')?.checked ?? false;
    const syncGroup = (kind: LayoutOverrideKind, inputName: "portfolio_project" | "portfolio_tool" | "portfolio_credential"): number => {
      const selectedIds = kind === "credential" && !credentialsPageOn
        ? new Set<string>()
        : new Set(Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${inputName}"]:checked`), (input) => input.value));
      const group = overrides?.querySelector<HTMLDetailsElement>(`[data-layout-override-group="${kind}"]`);
      group?.querySelectorAll<HTMLElement>(`[data-layout-override-item][data-layout-override-kind="${kind}"]`).forEach((item) => {
          item.hidden = !selectedIds.has(item.dataset.layoutOverrideId ?? "");
        });
      const count = group?.querySelector<HTMLElement>("[data-layout-override-count]");
      if (count) count.textContent = String(selectedIds.size);
      if (group) {
        group.hidden = selectedIds.size === 0;
        if (group.hidden) group.open = false;
      }
      mediaAssignments?.querySelectorAll<HTMLElement>(`[data-portfolio-media-item][data-portfolio-media-kind="${kind}"]`).forEach((item) => {
        item.hidden = !selectedIds.has(item.dataset.portfolioMediaId ?? "");
      });
      const mediaGroup = mediaAssignments?.querySelector<HTMLDetailsElement>(`[data-portfolio-media-group="${kind}"]`);
      const mediaCount = mediaGroup?.querySelector<HTMLElement>("[data-portfolio-media-group-count]");
      if (mediaCount) mediaCount.textContent = String(selectedIds.size);
      if (mediaGroup) {
        mediaGroup.hidden = selectedIds.size === 0;
        if (mediaGroup.hidden) mediaGroup.open = false;
      }
      return selectedIds.size;
    };
    const selectedCount = syncGroup("project", "portfolio_project") + syncGroup("tool", "portfolio_tool");
    const credentialCount = syncGroup("credential", "portfolio_credential");
    const empty = overrides?.querySelector<HTMLElement>("[data-layout-overrides-empty]");
    if (empty) empty.hidden = selectedCount + credentialCount > 0;
    const mediaEmpty = mediaAssignments?.querySelector<HTMLElement>("[data-portfolio-media-empty]");
    if (mediaEmpty) mediaEmpty.hidden = selectedCount > 0;
    // Cover & closing follows the selected projects: it is offered only while at least one is selected.
    const selectedProjectIds = new Set(Array.from(form.querySelectorAll<HTMLInputElement>('input[name="portfolio_project"]:checked'), (input) => input.value));
    const featureGroup = mediaAssignments?.querySelector<HTMLDetailsElement>('[data-portfolio-media-group="feature"]');
    if (featureGroup) {
      featureGroup.hidden = selectedProjectIds.size === 0;
      if (featureGroup.hidden) featureGroup.open = false;
    }
    const featureRow = mediaAssignments?.querySelector<HTMLElement>("[data-portfolio-feature-row]");
    if (featureRow) syncPortfolioFeatureRow(featureRow, selectedProjectIds);
  };
  /** Background › Profile page: at most PORTFOLIO_PROFILE_CARD_GROUPS capability cards; the rest wait disabled. */
  const syncCapabilityLimit = (): void => {
    const group = form.querySelector<HTMLElement>("[data-capability-groups]");
    if (!group) return;
    const limit = Number(group.dataset.capabilityLimit) || PORTFOLIO_PROFILE_CARD_GROUPS;
    const boxes = [...group.querySelectorAll<HTMLInputElement>('input[name="portfolio_capability_group"]')];
    const full = boxes.filter((box) => box.checked).length >= limit;
    const archived = activeDocument?.status === "archived";
    boxes.forEach((box) => {
      box.disabled = archived || (full && !box.checked);
    });
  };
  const syncPortfolioMediaRequirements = (): void => {
    if (kind !== "portfolio" || !state.portfolio) return;
    form.querySelectorAll<HTMLElement>("[data-portfolio-media-item]").forEach((item) => {
      const itemKind = item.dataset.portfolioMediaKind as "project" | "tool" | undefined;
      const itemId = item.dataset.portfolioMediaId;
      if (!itemKind || !itemId) return;
      const defaultName = itemKind === "project" ? "layout_project_default" : "layout_automation_default";
      const overrideName = itemKind === "project" ? `project_layout_${itemId}` : `tool_layout_${itemId}`;
      const defaultLayout = (form.elements.namedItem(defaultName) as HTMLSelectElement | null)?.value;
      const overrideLayout = (form.elements.namedItem(overrideName) as HTMLSelectElement | null)?.value;
      const layout = overrideLayout && overrideLayout !== "default" ? overrideLayout : defaultLayout;
      if (layout) syncPortfolioMediaRow(item, layout);
    });
  };
  /** Project rows name their current layout and its print limit, so the state line follows Appearance changes. */
  const syncPortfolioProjectLayouts = (): void => {
    form.querySelectorAll<HTMLElement>("[data-portfolio-project-card]").forEach((card) => {
      const id = card.querySelector<HTMLInputElement>("[data-portfolio-project-include]")?.value;
      if (!id) return;
      const defaultLayout = (form.elements.namedItem("layout_project_default") as HTMLSelectElement | null)?.value;
      const overrideLayout = (form.elements.namedItem(`project_layout_${id}`) as HTMLSelectElement | null)?.value;
      const layout = (overrideLayout && overrideLayout !== "default" ? overrideLayout : defaultLayout) as ProjectLayout | undefined;
      if (!layout) return;
      card.dataset.layoutLabel = portfolioLayoutLabel("project", layout);
      card.dataset.limit = String(portfolioContributionLimit(layout));
      syncPortfolioProjectRow(card);
    });
  };
  const keepMediaAssignmentsDistinct = (item: HTMLElement): void => {
    const primary = item.querySelector<HTMLSelectElement>("[data-portfolio-primary-select]");
    const supporting = item.querySelector<HTMLSelectElement>("[data-portfolio-supporting-select]");
    if (primary?.value && supporting?.value === primary.value) supporting.value = "";
    syncPortfolioMediaPreview(item);
  };
  syncPortfolioLayoutOverrides();
  syncPortfolioMediaRequirements();
  syncCapabilityLimit();
  form.querySelector<HTMLElement>("[data-portfolio-feature-row]")?.addEventListener("change", () => syncPortfolioLayoutOverrides());
  form.querySelector<HTMLElement>("[data-capability-groups]")?.addEventListener("change", () => syncCapabilityLimit());
  form.querySelectorAll<HTMLElement>("[data-portfolio-media-item]").forEach((item) => {
    item.querySelectorAll<HTMLSelectElement>("[data-portfolio-primary-select], [data-portfolio-supporting-select]")
      .forEach((select) => select.addEventListener("change", () => keepMediaAssignmentsDistinct(item)));
  });
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement;
    if (target.name === "layout_project_default"
      || target.name === "layout_automation_default"
      || target.name.startsWith("project_layout_")
      || target.name.startsWith("tool_layout_")) {
      syncPortfolioMediaRequirements();
      syncPortfolioProjectLayouts();
    }
  });
  form.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLButtonElement>("[data-layout-disclosure]");
    if (!trigger) return;
    const picker = trigger.closest<HTMLElement>("[data-optional-layout-picker]");
    const panel = picker?.querySelector<HTMLElement>("[data-layout-panel]");
    if (!picker || !panel) return;
    const open = trigger.getAttribute("aria-expanded") !== "true";
    if (open) closeOtherLayoutPickers(picker);
    setOptionalLayoutPickerOpen(picker, open);
  });
  form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement && ["portfolio_project", "portfolio_tool", "portfolio_credential", "layout_credentials_enabled"].includes(event.target.name)) {
      syncPortfolioLayoutOverrides();
    }
    if (event.target instanceof HTMLInputElement && event.target.matches("[data-cv-background-toggle]")) {
      event.target.closest<HTMLElement>(".admin-cv-background__item")?.classList.toggle("is-selected", event.target.checked);
    }
    syncImageOverlayControl();
    markDirty(isPortfolioAppearanceControl(event.target) ? "appearance" : "full");
  });
  form.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target instanceof HTMLInputElement && target.type === "radio" && target.name.startsWith("layout_")) {
      const picker = target.closest<HTMLDetailsElement>(".admin-layout-picker");
      const label = target.closest<HTMLElement>(".admin-layout-option")?.querySelector<HTMLElement>(".admin-layout-option__copy strong")?.textContent;
      const selected = picker?.querySelector<HTMLElement>("[data-layout-selected]");
      if (selected && label) selected.textContent = label;
    }
    if (target.name === "theme_preset" && target.value !== "custom") {
      const theme = documentThemes.find((item) => item.id === target.value);
      const primary = form.elements.namedItem("theme_primary");
      const accent = form.elements.namedItem("theme_accent");
      if (theme && primary instanceof HTMLInputElement && accent instanceof HTMLInputElement) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    }
    syncImageOverlayControl();
    markDirty(isPortfolioAppearanceControl(event.target) ? "appearance" : "full");
  });
  overlayReset?.addEventListener("click", () => {
    if (!overlayRange || activeDocument?.status === "archived") return;
    overlayRange.value = String(defaultOverlayPercent);
    syncImageOverlayControl();
    markDirty("appearance");
  });
  root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((button) => button.addEventListener("click", () => {
    state.tab[kind] = button.dataset.documentTab as DocumentTab;
    updateAdminRoute({ view: kind, item: state.selectedId[kind], tab: state.tab[kind] });
    root.querySelectorAll<HTMLButtonElement>("[data-document-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-document-panel]").forEach((panel) => { panel.hidden = panel.dataset.documentPanel !== state.tab[kind]; });
  }));
  root.querySelector<HTMLButtonElement>("[data-document-print]")?.addEventListener("click", () => {
    if (!activeDocument) return;
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      callbacks.notify("Allow pop-ups to open the print preview.", "error");
      return;
    }
    previewWindow.document.title = `Preparing ${documentLabel(kind)} preview`;
    previewWindow.document.body.textContent = "Preparing print preview…";
    const payload = previewPayload(kind, form);
    void (async () => {
      const wasDirty = state.dirty[kind];
      if (activeDocument.status !== "archived") {
        if (wasDirty) {
          callbacks.notify(`Saving the latest ${documentLabel(kind)} draft…`);
        }
        await saveProfileDocument(activeDocument.id, payload);
        activeDocument.draftPayload = structuredClone(payload);
        if (kind === "cv") state.cv = payload as CvRuntimeData;
        else state.portfolio = payload as PortfolioRuntimeData;
        state.dirty[kind] = false;
        callbacks.setDirty(false);
      }
      const params = new URLSearchParams({
        mode: "print",
        document: activeDocument.id,
        lang: state.previewLanguage[kind],
      });
      previewWindow.location.replace(`${import.meta.env.BASE_URL}${kind}/?${params.toString()}`);
      callbacks.notify(`${documentLabel(kind)} print preview opened.`, "success");
      callbacks.rerender();
    })().catch((error: Error) => {
      previewWindow.close();
      callbacks.notify(error.message, "error");
    });
  });
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
    const issues = validateProfileDocument(kind, payload);
    if (issues.length) {
      updateValidation(issues, profileDocumentRecommendations(kind, payload));
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
