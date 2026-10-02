import { coverLetterSenderDefaults, createCoverLetterDraft } from "../cover-letter/defaults";
import { renderCoverLetterMarkup } from "../cover-letter/renderCoverLetter";
import { coverLetterOverflows, validateCoverLetter } from "../cover-letter/validation";
import {
  archiveCoverLetter,
  createCoverLetter,
  deleteCoverLetterDraft,
  duplicateCoverLetter,
  finalizeCoverLetter,
  listCoverLetterEvidence,
  listCoverLetters,
  updateCoverLetterDraft,
} from "../services/coverLetterRepository";
import { escapeHtml } from "../shared/format";
import { loadProfessionalProfile } from "../services/websiteRepository";
import { applyDocumentTheme, createCustomDocumentTheme, findDocumentTheme } from "../themes/documentThemes";
import type { CoverLetterEvidenceOption, CoverLetterInput, CoverLetterRecord, CoverLetterSenderSnapshot, CoverLetterStatus } from "../types/coverLetter";
import type { ProfessionalProfileContent } from "../types/website";
import { renderDocumentThemeFields } from "./documentThemeFields";
import {
  renderAdminPreviewControlGroup,
  renderAdminPreviewToolbar,
  renderAdminSectionCard,
  setButtonBusy,
} from "./ui";

type CoverLetterFilter = CoverLetterStatus | "all";
type CoverLetterEditorTab = "application" | "body" | "evidence" | "appearance" | "notes";
type PreviewZoom = "fit" | "75" | "100";
type MessageKind = "info" | "error" | "success";

interface WorkspaceCallbacks {
  rerender: () => void;
  setDirty: (value: boolean) => void;
  notify: (text: string, kind?: MessageKind) => void;
}

let records: CoverLetterRecord[] = [];
let projects: CoverLetterEvidenceOption[] = [];
let tools: CoverLetterEvidenceOption[] = [];
let filter: CoverLetterFilter = "all";
let search = "";
let record: CoverLetterRecord | null = null;
let letter: CoverLetterInput = createCoverLetterDraft();
let editorOpen = false;
let dirty = false;
let loaded = false;
let loading: Promise<void> | null = null;
let loadError = "";
let stale = false;
let editorTab: CoverLetterEditorTab = "application";
let previewZoom: PreviewZoom = "fit";
let sharedSender: CoverLetterSenderSnapshot = coverLetterSenderDefaults;
const lastOpenedStorageKey = "hdl-admin-cover-letter-last-opened";

export const updateCoverLetterSharedProfile = (professional: ProfessionalProfileContent): void => {
  sharedSender = {
    name: professional.profile.name,
    professionalTitle: professional.profile.professionalTitle.en,
    email: professional.profile.email,
    phone: professional.profile.phone,
    location: professional.profile.location.en,
    portfolioUrl: null,
  };
};

const base = import.meta.env.BASE_URL;
const status = (): CoverLetterStatus => record?.status ?? "draft";
const locked = (): boolean => Boolean(record && record.status !== "draft");
const disabled = (): string => locked() ? " disabled" : "";
const fieldValue = (name: keyof CoverLetterInput): string => escapeHtml(String(letter[name]));

const input = (label: string, name: keyof CoverLetterInput, type = "text", required = false): string =>
  `<label>${label}<input name="${name}" type="${type}" value="${fieldValue(name)}"${required ? " required" : ""}${disabled()}></label>`;

const textarea = (label: string, name: keyof CoverLetterInput, rows: number, required = false): string =>
  `<label>${label}<textarea name="${name}" rows="${rows}"${required ? " required" : ""}${disabled()}>${fieldValue(name)}</textarea></label>`;

const date = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));

const syncUrl = (id?: string): void => {
  const url = new URL(window.location.href);
  url.pathname = `${base}admin/`;
  url.searchParams.set("view", "cover-letters");
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history.replaceState({}, "", url);
};

const upsertLocalRecord = (next: CoverLetterRecord): void => {
  records = [next, ...records.filter((item) => item.id !== next.id)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const rememberedRecordId = (): string => {
  try {
    return window.localStorage.getItem(lastOpenedStorageKey) ?? "";
  } catch {
    return "";
  }
};

const rememberRecord = (id: string): void => {
  try {
    window.localStorage.setItem(lastOpenedStorageKey, id);
  } catch {
    // The workspace remains functional when browser storage is unavailable.
  }
};

const forgetRecord = (id: string): void => {
  try {
    if (window.localStorage.getItem(lastOpenedStorageKey) === id) {
      window.localStorage.removeItem(lastOpenedStorageKey);
    }
  } catch {
    // The workspace remains functional when browser storage is unavailable.
  }
};

const preferredRecord = (): CoverLetterRecord | null => {
  const rememberedId = rememberedRecordId();
  return records.find((item) => item.id === rememberedId && item.status !== "archived")
    ?? records.find((item) => item.status === "draft")
    ?? records.find((item) => item.status === "final")
    ?? null;
};

const selectRecord = (selected: CoverLetterRecord): void => {
  record = selected;
  letter = structuredClone(selected);
  editorOpen = true;
  dirty = false;
  editorTab = "application";
  rememberRecord(selected.id);
};

export const ensureCoverLetterWorkspace = async (): Promise<void> => {
  if (loaded && !stale) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const [letterRecords, evidence, professional] = await Promise.all([listCoverLetters(), listCoverLetterEvidence(), loadProfessionalProfile()]);
      records = letterRecords;
      projects = evidence.projects;
      tools = evidence.tools;
      updateCoverLetterSharedProfile(professional);
      const requestedId = new URLSearchParams(window.location.search).get("id");
      const requested = requestedId ? records.find((item) => item.id === requestedId) : null;
      const initialRecord = requested ?? preferredRecord();
      if (initialRecord) {
        selectRecord(initialRecord);
        syncUrl(initialRecord.id);
      }
      loaded = true;
      stale = false;
      loadError = "";
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Cover letters could not be loaded.";
    } finally {
      loading = null;
    }
  })();
  return loading;
};

export const coverLetterSummary = (): { loaded: boolean; total: number; drafts: number; final: number } => ({
  loaded,
  total: records.length,
  drafts: records.filter((item) => item.status === "draft").length,
  final: records.filter((item) => item.status === "final").length,
});

const visibleRecords = (): CoverLetterRecord[] => {
  const query = search.trim().toLowerCase();
  return records.filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    if (!query) return true;
    return [item.internalTitle, item.companyName, item.positionTitle].some((value) => value.toLowerCase().includes(query));
  });
};

const recordList = (): string => {
  const visible = visibleRecords();
  if (!records.length) return '<li class="admin-empty">No cover letters yet.</li>';
  if (!visible.length) return '<li class="admin-empty">No cover letters match this view.</li>';
  return visible.map((item) => `
    <li class="admin-content-item ${record?.id === item.id ? "is-selected" : ""}">
      <button class="admin-content-item__select" type="button" data-cl-select="${escapeHtml(item.id)}" aria-pressed="${record?.id === item.id}">
        <strong>${escapeHtml(item.internalTitle)}</strong>
        <small>${escapeHtml(item.positionTitle || "Position not set")} · ${escapeHtml(item.companyName || "Company not set")}</small>
        <small>Updated ${date(item.updatedAt)}</small>
      </button>
      <div class="admin-content-item__meta"><span class="status status--${item.status}">${item.status}</span></div>
    </li>`).join("");
};

const filterCount = (item: CoverLetterFilter): number => item === "all"
  ? records.length
  : records.filter((recordItem) => recordItem.status === item).length;

const tabButton = (tab: CoverLetterEditorTab, label: string): string =>
  `<button type="button" role="tab" data-cl-tab="${tab}" aria-selected="${editorTab === tab}" class="${editorTab === tab ? "is-active" : ""}">${label}</button>`;

const panelState = (tab: CoverLetterEditorTab): string => editorTab === tab ? "" : "hidden";

const evidenceChecks = (items: CoverLetterEvidenceOption[], name: "projectIds" | "toolIds"): string => {
  if (!items.length) return '<p class="admin-empty">No records available.</p>';
  return [...items]
    .sort((a, b) => Number(b.status === "published") - Number(a.status === "published"))
    .map((item) => `<label class="evidence-option"><input type="checkbox" name="${name}" value="${escapeHtml(item.id)}" ${letter[name].includes(item.id) ? "checked" : ""}${disabled()}><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.status)}</small></span></label>`)
    .join("");
};

const collectionView = (): string => `
  <aside class="admin-cl-collection">
    <div class="admin-collection__heading"><div><small>Applications</small><h2>Cover letters <span>${records.length}</span></h2></div>${records.length ? '<button class="button admin-action-new" type="button" data-cl-new>+ New</button>' : ""}</div>
    <div class="admin-list-controls">
      <label class="admin-search"><span class="sr-only">Search cover letters</span><input type="search" placeholder="Search company, role or title..." value="${escapeHtml(search)}" data-cl-search></label>
      <div class="admin-filter-row" aria-label="Cover letter status">${(["all", "draft", "final", "archived"] as CoverLetterFilter[]).map((item) => `<button type="button" data-cl-filter="${item}" class="${filter === item ? "is-active" : ""}"><span>${item}</span><strong>${filterCount(item)}</strong></button>`).join("")}</div>
    </div>
    <div class="admin-collection__scroll"><ul class="admin-content-list" data-cl-list>${recordList()}</ul></div>
  </aside>`;

const emptyWorkspace = (): string => {
  if (records.length) {
    const recent = preferredRecord() ?? records[0];
    return `
      <section class="admin-cl-empty admin-cl-empty--selection">
        <div><p class="section-kicker">Applications</p><h1>Select a cover letter</h1><p>Choose a letter from the list or continue with the most recently updated application.</p></div>
        <article class="admin-cl-recent">
          <div><span>Recently updated</span><strong>${escapeHtml(recent.internalTitle)}</strong><small>${escapeHtml(recent.positionTitle || "Position not set")} · ${escapeHtml(recent.companyName || "Company not set")} · ${date(recent.updatedAt)}</small></div>
          <button class="button" type="button" data-cl-select="${escapeHtml(recent.id)}">Open letter</button>
        </article>
        <p class="admin-cl-empty__hint">Use <strong>+ New</strong> in the sidebar to start another application.</p>
      </section>`;
  }

  return `
    <section class="admin-cl-empty admin-cl-empty--onboarding">
      <div><p class="section-kicker">Applications</p><h1>Cover letter workspace</h1><p>Create tailored one-page letters using the same profile, projects and automation tools managed in this Admin.</p></div>
      <ol class="admin-cl-steps">
        <li><span>1</span><div><strong>Application</strong><small>Add the company, role and recipient.</small></div></li>
        <li><span>2</span><div><strong>Content & evidence</strong><small>Tailor the message with verified experience.</small></div></li>
        <li><span>3</span><div><strong>Review & finalize</strong><small>Check the A4 preview and lock the release.</small></div></li>
      </ol>
      <div class="admin-cl-empty__actions"><button class="button" type="button" data-cl-new>Create cover letter</button><p>Your Professional Profile provides the reusable sender details.</p></div>
    </section>`;
};

const editorView = (): string => {
  const isLocked = locked();
  const validation = validateCoverLetter(letter);
  const zoomControls = renderAdminPreviewControlGroup({
    label: "Preview zoom",
    dataAttribute: "data-cl-zoom",
    activeValue: previewZoom,
    options: [
      { label: "Fit", value: "fit" },
      { label: "75%", value: "75" },
      { label: "100%", value: "100" },
    ],
  });
  const previewToolbar = renderAdminPreviewToolbar({
    title: isLocked ? "Cover Letter snapshot" : "Cover Letter preview",
    meta: `A4 · <span data-cl-word-count>${validation.wordCount} words</span> · <span data-cl-fit-state>Checking page…</span>`,
    controls: zoomControls,
  });
  return `
    <section class="admin-cl-editor">
      <header class="admin-cl-editor__heading">
        <div class="admin-cl-editor__identity"><button type="button" class="admin-cl-back" data-cl-close>‹ Letters</button><div><p class="section-kicker">Applications</p><h1>${escapeHtml(letter.internalTitle)}</h1><div class="admin-editor__meta"><span class="status status--${status()}">${status()}</span><small data-cl-dirty-state>${dirty ? "Unsaved changes" : "Saved"}</small></div></div></div>
        <div class="admin-cl-editor__actions">
          ${record ? `<a class="button button--secondary admin-action-utility" href="${base}cover-letter/?id=${encodeURIComponent(record.id)}" target="_blank" rel="noreferrer">Print view</a>` : ""}
          ${record?.status === "draft" ? '<button class="admin-icon-button admin-danger" type="button" data-cl-delete aria-label="Delete draft">•••</button>' : ""}
          ${isLocked
            ? (record?.status === "final" ? '<button class="button button--secondary" type="button" data-cl-archive>Archive</button>' : "") + '<button class="button" type="button" data-cl-duplicate>Duplicate as draft</button>'
            : '<button class="button button--secondary admin-action-publish" type="button" data-cl-finalize>Finalize</button><button class="button admin-action-save" type="submit" form="admin-cover-letter-form">Save draft</button>'}
        </div>
      </header>
      ${isLocked ? '<div class="cover-letter-lock"><strong>Final content is locked.</strong><span>Duplicate this letter to create an editable draft.</span></div>' : ""}
      <div class="admin-cl-editor__body">
        <section class="admin-cl-form-pane">
          <nav class="admin-editor-tabs" role="tablist" aria-label="Cover letter sections">${tabButton("application", "Application")}${tabButton("body", "Letter body")}${tabButton("evidence", "Evidence")}${tabButton("appearance", "Appearance")}${tabButton("notes", "Notes")}</nav>
          <form id="admin-cover-letter-form" data-cl-form>
            <section class="admin-editor-panel" data-cl-panel="application" ${panelState("application")}>
              ${renderAdminSectionCard({
                title: "Application details",
                note: "Identify the role, company and recipient.",
                content: `<div class="admin-form-grid">${input("Internal title *", "internalTitle", "text", true)}${input("Application date *", "applicationDate", "date", true)}${input("Company name *", "companyName", "text", true)}${input("Position title *", "positionTitle", "text", true)}${input("Recipient name", "recipientName")}${input("Recipient title", "recipientTitle")}</div>
                  ${textarea("Company address", "companyAddress", 3)}
                  ${input("Salutation *", "salutation", "text", true)}
                  <article class="admin-cl-sender"><div><span>Candidate profile</span><strong>${escapeHtml(record?.senderSnapshot?.name ?? sharedSender.name)}</strong><small>${escapeHtml(record?.senderSnapshot?.professionalTitle ?? sharedSender.professionalTitle)}</small></div><p>The shared Professional Profile is captured as a locked snapshot when the letter is finalized.</p></article>`,
              })}
            </section>
            <section class="admin-editor-panel" data-cl-panel="body" ${panelState("body")}>
              ${renderAdminSectionCard({
                title: "Letter body",
                note: "Keep claims factual and aim for 250–400 words.",
                content: `${textarea("Opening paragraph *", "openingParagraph", 5, true)}
                  ${textarea("Experience and fit *", "fitParagraph", 7, true)}
                  ${textarea("Why this company *", "companyParagraph", 6, true)}
                  ${textarea("Closing paragraph *", "closingParagraph", 5, true)}
                  ${input("Sign-off *", "signOff", "text", true)}`,
                actions: isLocked ? undefined : '<button class="button button--secondary" type="button" data-cl-starter>Generate safe starter text</button>',
              })}
            </section>
            <section class="admin-editor-panel" data-cl-panel="evidence" ${panelState("evidence")}>
              ${renderAdminSectionCard({
                title: "Supporting evidence",
                note: "Private references only; published content appears first.",
                content: `<div class="admin-cl-evidence-heading"><h4>Projects</h4><small>${letter.projectIds.length} selected</small></div><div class="evidence-grid">${evidenceChecks(projects, "projectIds")}</div>
                  <div class="admin-cl-evidence-heading"><h4>Automation tools</h4><small>${letter.toolIds.length} selected</small></div><div class="evidence-grid">${evidenceChecks(tools, "toolIds")}</div>`,
              })}
            </section>
            <section class="admin-editor-panel" data-cl-panel="appearance" ${panelState("appearance")}>
              ${renderAdminSectionCard({
                title: "Document appearance",
                note: "Choose a preset or verified company colors.",
                content: renderDocumentThemeFields({
                  theme: letter.theme,
                  names: { preset: "themePreset", primary: "themePrimary", accent: "themeAccent" },
                  helpText: "Colors are stored in this draft and frozen when the cover letter is finalized.",
                  compact: true,
                  disabled: isLocked,
                  customLabel: "Custom company colors",
                }),
              })}
            </section>
            <section class="admin-editor-panel" data-cl-panel="notes" ${panelState("notes")}>
              ${renderAdminSectionCard({ title: "Private notes", note: "Visible only in Admin and never printed.", content: textarea("Notes", "privateNotes", 10) })}
            </section>
          </form>
        </section>
        <aside class="admin-cl-preview">
          ${previewToolbar}
          <div class="admin-cl-preview-scroll"><div class="admin-cl-preview-stage zoom-${previewZoom}"><div data-cl-preview></div></div></div>
          <details class="admin-cl-validation" ${validation.errors.length ? "open" : ""}><summary><span>Validation</span><strong data-cl-validation-count>${validation.errors.length} errors · ${validation.warnings.length} warnings</strong></summary><div data-cl-validation>${validation.errors.map((item) => `<p class="is-error">${escapeHtml(item)}</p>`).concat(validation.warnings.map((item) => `<p>${escapeHtml(item)}</p>`)).join("") || "<p>Ready for final review.</p>"}</div></details>
        </aside>
      </div>
    </section>`;
};

export const coverLetterWorkspaceView = (): string => {
  if (!loaded && !loadError) return '<section class="admin-cl-loading"><strong>Loading Cover Letters…</strong><p>Preparing applications and supporting evidence.</p></section>';
  if (loadError) return `<section class="admin-cl-loading"><strong>Cover Letter workspace unavailable</strong><p>${escapeHtml(loadError)}</p><button class="button" type="button" data-cl-retry>Try again</button></section>`;
  return `<section class="admin-cl-shell ${editorOpen ? "is-editing" : ""}">${collectionView()}<div class="admin-cl-workspace">${editorOpen ? editorView() : emptyWorkspace()}</div></section>`;
};

const selectedValues = (form: HTMLFormElement, name: string): string[] =>
  [...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((item) => item.value);

const readForm = (root: ParentNode): CoverLetterInput => {
  const form = root.querySelector<HTMLFormElement>("[data-cl-form]");
  if (!form) return letter;
  if (locked()) return letter;
  const data = new FormData(form);
  const text = (name: string): string => String(data.get(name) ?? "");
  return {
    internalTitle: text("internalTitle"),
    companyName: text("companyName"),
    positionTitle: text("positionTitle"),
    recipientName: text("recipientName"),
    recipientTitle: text("recipientTitle"),
    companyAddress: text("companyAddress"),
    applicationDate: text("applicationDate"),
    salutation: text("salutation"),
    openingParagraph: text("openingParagraph"),
    fitParagraph: text("fitParagraph"),
    companyParagraph: text("companyParagraph"),
    closingParagraph: text("closingParagraph"),
    signOff: text("signOff"),
    privateNotes: text("privateNotes"),
    theme: { presetId: text("themePreset"), primary: text("themePrimary"), accent: text("themeAccent") },
    projectIds: selectedValues(form, "projectIds"),
    toolIds: selectedValues(form, "toolIds"),
  };
};

const updatePreview = (root: ParentNode): void => {
  letter = readForm(root);
  const preview = root.querySelector<HTMLElement>("[data-cl-preview]");
  if (!preview) return;
  preview.innerHTML = renderCoverLetterMarkup(letter, record?.senderSnapshot ?? sharedSender);
  const page = preview.querySelector<HTMLElement>("[data-cover-letter-page]");
  if (page) applyDocumentTheme(page, createCustomDocumentTheme(letter.theme.primary, letter.theme.accent));
  const validation = validateCoverLetter(letter);
  const wordCount = root.querySelector<HTMLElement>("[data-cl-word-count]");
  if (wordCount) wordCount.textContent = `${validation.wordCount} words`;
  const validationCount = root.querySelector<HTMLElement>("[data-cl-validation-count]");
  if (validationCount) validationCount.textContent = `${validation.errors.length} errors · ${validation.warnings.length} warnings`;
  const validationList = root.querySelector<HTMLElement>("[data-cl-validation]");
  if (validationList) validationList.innerHTML = validation.errors.map((item) => `<p class="is-error">${escapeHtml(item)}</p>`).concat(validation.warnings.map((item) => `<p>${escapeHtml(item)}</p>`)).join("") || "<p>Ready for final review.</p>";
  requestAnimationFrame(() => {
    const overflow = page ? coverLetterOverflows(page) : false;
    const fitState = root.querySelector<HTMLElement>("[data-cl-fit-state]");
    if (fitState) {
      fitState.textContent = overflow ? "Page overflow" : "Fits one page";
      fitState.dataset.kind = overflow ? "error" : "success";
    }
  });
};

const markDirty = (root: ParentNode, callbacks: WorkspaceCallbacks): void => {
  dirty = true;
  callbacks.setDirty(true);
  const state = root.querySelector<HTMLElement>("[data-cl-dirty-state]");
  if (state) state.textContent = "Unsaved changes";
};

const resetEditor = (): void => {
  record = null;
  letter = createCoverLetterDraft();
  editorOpen = false;
  dirty = false;
  editorTab = "application";
};

export const discardCoverLetterChanges = (): void => {
  if (record) letter = structuredClone(record);
  else letter = createCoverLetterDraft();
  dirty = false;
};

export const markCoverLetterWorkspaceStale = (): void => {
  stale = true;
};

const openRecord = (id: string, callbacks: WorkspaceCallbacks): void => {
  if (dirty && !window.confirm("Discard unsaved changes and open another letter?")) return;
  const selected = records.find((item) => item.id === id);
  if (!selected) return;
  selectRecord(selected);
  callbacks.setDirty(false);
  syncUrl(selected.id);
  callbacks.rerender();
};

const openNew = (callbacks: WorkspaceCallbacks): void => {
  if (dirty && !window.confirm("Discard unsaved changes and create a new letter?")) return;
  record = null;
  letter = createCoverLetterDraft();
  editorOpen = true;
  dirty = false;
  editorTab = "application";
  callbacks.setDirty(false);
  syncUrl();
  callbacks.rerender();
};

const saveDraft = async (root: ParentNode, callbacks: WorkspaceCallbacks): Promise<void> => {
  letter = readForm(root);
  callbacks.notify("Saving cover letter draft…");
  const saved = record ? await updateCoverLetterDraft(record.id, letter) : await createCoverLetter(letter);
  record = saved;
  letter = structuredClone(saved);
  upsertLocalRecord(saved);
  rememberRecord(saved.id);
  dirty = false;
  callbacks.setDirty(false);
  syncUrl(saved.id);
  callbacks.rerender();
  callbacks.notify("Cover letter draft saved.", "success");
};

const finalize = async (root: ParentNode, callbacks: WorkspaceCallbacks): Promise<void> => {
  letter = readForm(root);
  updatePreview(root);
  const validation = validateCoverLetter(letter);
  const page = root.querySelector<HTMLElement>("[data-cover-letter-page]");
  if (validation.errors.length || (page && coverLetterOverflows(page))) {
    callbacks.notify("Resolve validation errors and page overflow before finalizing.", "error");
    return;
  }
  if (!window.confirm("Finalize and lock this cover letter? Future edits will require a duplicate draft.")) return;
  callbacks.notify("Finalizing cover letter…");
  const saved = record ?? await createCoverLetter(letter);
  const finalized = await finalizeCoverLetter(saved.id, letter, sharedSender);
  record = finalized;
  letter = structuredClone(finalized);
  upsertLocalRecord(finalized);
  rememberRecord(finalized.id);
  dirty = false;
  callbacks.setDirty(false);
  syncUrl(finalized.id);
  callbacks.rerender();
  callbacks.notify("Cover letter finalized and locked.", "success");
};

const bindRecordButtons = (root: ParentNode, callbacks: WorkspaceCallbacks): void => {
  root.querySelectorAll<HTMLButtonElement>("[data-cl-select]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.clSelect;
    if (id) openRecord(id, callbacks);
  }));
};

export const bindCoverLetterWorkspace = (root: HTMLElement, callbacks: WorkspaceCallbacks): void => {
  root.querySelector("[data-cl-retry]")?.addEventListener("click", () => {
    loadError = "";
    loaded = false;
    callbacks.rerender();
    void ensureCoverLetterWorkspace().then(callbacks.rerender);
  });
  root.querySelectorAll<HTMLElement>("[data-cl-new]").forEach((button) => button.addEventListener("click", () => openNew(callbacks)));
  bindRecordButtons(root, callbacks);
  root.querySelector<HTMLInputElement>("[data-cl-search]")?.addEventListener("input", (event) => {
    search = (event.currentTarget as HTMLInputElement).value;
    const list = root.querySelector<HTMLElement>("[data-cl-list]");
    if (list) {
      list.innerHTML = recordList();
      bindRecordButtons(list, callbacks);
    }
  });
  root.querySelectorAll<HTMLButtonElement>("[data-cl-filter]").forEach((button) => button.addEventListener("click", () => {
    filter = button.dataset.clFilter as CoverLetterFilter;
    callbacks.rerender();
  }));
  root.querySelector("[data-cl-close]")?.addEventListener("click", () => {
    if (dirty && !window.confirm("Discard unsaved changes and return to the letter list?")) return;
    resetEditor();
    callbacks.setDirty(false);
    syncUrl();
    callbacks.rerender();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-cl-tab]").forEach((button) => button.addEventListener("click", () => {
    editorTab = button.dataset.clTab as CoverLetterEditorTab;
    root.querySelectorAll<HTMLButtonElement>("[data-cl-tab]").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll<HTMLElement>("[data-cl-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.clPanel !== editorTab;
    });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-cl-zoom]").forEach((button) => button.addEventListener("click", () => {
    previewZoom = button.dataset.clZoom as PreviewZoom;
    root.querySelectorAll<HTMLButtonElement>("[data-cl-zoom]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    const stage = root.querySelector<HTMLElement>(".admin-cl-preview-stage");
    if (stage) stage.className = `admin-cl-preview-stage zoom-${previewZoom}`;
  }));

  const form = root.querySelector<HTMLFormElement>("[data-cl-form]");
  form?.addEventListener("input", () => { markDirty(root, callbacks); updatePreview(root); });
  form?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.name === "themePreset" && target.value !== "custom") {
      const theme = findDocumentTheme(target.value);
      const primary = form.querySelector<HTMLInputElement>('input[name="themePrimary"]');
      const accent = form.querySelector<HTMLInputElement>('input[name="themeAccent"]');
      if (theme && primary && accent) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    } else if (target.name === "themePrimary" || target.name === "themeAccent") {
      const preset = form.querySelector<HTMLSelectElement>('select[name="themePreset"]');
      if (preset) preset.value = "custom";
    }
    markDirty(root, callbacks);
    updatePreview(root);
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>('[form="admin-cover-letter-form"].admin-action-save');
    setButtonBusy(saveButton, true, "Saving…");
    void saveDraft(root, callbacks)
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  root.querySelector("[data-cl-starter]")?.addEventListener("click", () => {
    const company = form?.querySelector<HTMLInputElement>('input[name="companyName"]')?.value || "[Company]";
    const position = form?.querySelector<HTMLInputElement>('input[name="positionTitle"]')?.value || "[Position]";
    const fill = (name: string, text: string): void => {
      const field = form?.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
      if (field && !field.value.trim()) field.value = text;
    };
    fill("openingParagraph", `I am writing to apply for the ${position} position at ${company}. With more than five years of BIM experience, including multidisciplinary coordination for infrastructure, bridge, structural, and architectural projects, I can contribute practical coordination and model-quality expertise to your team.`);
    fill("fitParagraph", "In my current BIM coordination work, I manage model quality control, clash detection, and coordination workflows across disciplines. I use Revit, Civil 3D, Navisworks, Dynamo, Python, and C# to improve consistency, reduce repetitive work, and support clear technical communication among project stakeholders.");
    fill("companyParagraph", `[Add one specific, verified reason why ${company} and this role fit your goals.]`);
    fill("closingParagraph", "I would welcome the opportunity to discuss how my BIM coordination and automation experience can support your project delivery. Thank you for your time and consideration.");
    markDirty(root, callbacks);
    updatePreview(root);
  });
  root.querySelector<HTMLButtonElement>("[data-cl-finalize]")?.addEventListener("click", (event) => {
    const finalizeButton = event.currentTarget as HTMLButtonElement;
    setButtonBusy(finalizeButton, true, "Finalizing…");
    void finalize(root, callbacks)
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (finalizeButton.isConnected) setButtonBusy(finalizeButton, false); });
  });
  root.querySelector("[data-cl-duplicate]")?.addEventListener("click", () => {
    if (!record) return;
    void duplicateCoverLetter(record).then((copy) => {
      upsertLocalRecord(copy);
      record = copy;
      letter = structuredClone(copy);
      editorOpen = true;
      dirty = false;
      editorTab = "application";
      rememberRecord(copy.id);
      callbacks.setDirty(false);
      syncUrl(copy.id);
      callbacks.rerender();
      callbacks.notify("Editable draft created.", "success");
    }).catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector("[data-cl-archive]")?.addEventListener("click", () => {
    if (!record || !window.confirm("Archive this final cover letter?")) return;
    void archiveCoverLetter(record.id).then(async () => {
      records = await listCoverLetters();
      record = records.find((item) => item.id === record?.id) ?? null;
      if (record) letter = structuredClone(record);
      callbacks.rerender();
      callbacks.notify("Cover letter archived.", "success");
    }).catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  root.querySelector("[data-cl-delete]")?.addEventListener("click", () => {
    if (!record || !window.confirm("Permanently delete this draft? This cannot be undone.")) return;
    const id = record.id;
    void deleteCoverLetterDraft(id).then(() => {
      records = records.filter((item) => item.id !== id);
      forgetRecord(id);
      resetEditor();
      callbacks.setDirty(false);
      syncUrl();
      callbacks.rerender();
      callbacks.notify("Cover letter draft deleted.", "success");
    }).catch((error: Error) => callbacks.notify(error.message, "error"));
  });
  updatePreview(root);
};
