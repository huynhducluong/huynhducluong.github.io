import { escapeHtml } from "../shared/format";

const tabKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);
const adminDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const adminDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatAdminDate = (value: string | number | Date): string =>
  adminDateFormatter.format(new Date(value));

export const formatAdminDateTime = (value: string | number | Date): string =>
  adminDateTimeFormatter.format(new Date(value));

/** The only dropdown chevron glyph in Admin: selects, pickers, comboboxes and the document switcher all use it. */
export const adminChevronIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
export const adminCloseIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
export const adminZoomOutIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M3.5 8h9"/></svg>';
export const adminZoomInIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9"/></svg>';
export const adminArrowUpIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7"/></svg>';
export const adminArrowDownIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M8 3.5v9M4.5 9 8 12.5 11.5 9"/></svg>';
export const adminChevronRightIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>';

export const adminMoreIcon = '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M3.5 8h.01M8 8h.01M12.5 8h.01"/></svg>';

interface AdminMoreMenuItem {
  label: string;
  /** Data hooks for the existing click handler, for example `data-profile-education-delete data-education-id="…"`. */
  attributes: string;
  tone?: "danger";
}

/** Card-level More menu (⋯). Destructive and rare actions live here, never as loose buttons (§3, §6.4). */
export const renderAdminMoreMenu = ({ label, items }: { label: string; items: AdminMoreMenuItem[] }): string => items.length
  ? `<details class="admin-document-more admin-more-menu"><summary class="admin-more-menu__trigger" aria-label="${escapeHtml(label)}" title="More actions">${adminMoreIcon}</summary><div>${items.map((item) => `<button type="button"${item.tone === "danger" ? ' class="admin-danger"' : ""} ${item.attributes}>${escapeHtml(item.label)}</button>`).join("")}</div></details>`
  : "";

let adminMoreMenusInstalled = false;

/**
 * One behavior for every `details.admin-document-more` menu: only one open at a time, closes on an outside
 * click, on Escape and when an action is chosen. Choosing an action first returns focus to the trigger,
 * so a confirmation dialog restores focus to something visible.
 */
export const installAdminMoreMenus = (doc: Document = document): void => {
  if (adminMoreMenusInstalled) return;
  adminMoreMenusInstalled = true;
  const openMenus = (): HTMLDetailsElement[] => [...doc.querySelectorAll<HTMLDetailsElement>("details.admin-document-more[open]")];
  doc.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const current = target?.closest<HTMLDetailsElement>("details.admin-document-more") ?? null;
    openMenus().forEach((menu) => { if (menu !== current) menu.open = false; });
    if (current && target?.closest("details.admin-document-more > div :is(button, a)")) {
      current.open = false;
      current.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    }
  }, true);
  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const menus = openMenus();
    if (!menus.length) return;
    event.preventDefault();
    menus.forEach((menu) => {
      const hadFocus = menu.contains(doc.activeElement);
      menu.open = false;
      if (hadFocus) menu.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    });
  });
};

/**
 * "shown" counts entries whose visibility a toggle controls (CV Background, On website).
 * "selected" counts items picked from a library for a document (CV, Portfolio, Cover letter evidence). See §6.6.
 */
export type AdminSelectionCountMode = "shown" | "selected";

export const adminSelectionCountText = (mode: AdminSelectionCountMode, selected: number, total: number, extra = ""): string => {
  if (!total) return "None available";
  if (!selected) return mode === "shown" ? "Hidden" : "None selected";
  return `${selected} of ${total} ${mode}${extra ? ` · ${extra}` : ""}`;
};

/**
 * Group heading with its live count chip. The group element carries `data-selection-group` and
 * `data-selection-mode`; each eligible item carries `data-selection-count-item` (a checkbox, or a select whose
 * `data-selection-off` value means "not included"); optional `data-selection-extra-item` checkboxes add
 * "· N {extraLabel}". Draft items are not eligible, so the total counts only what can be chosen.
 */
export const renderAdminSelectionHeading = ({
  title,
  required = false,
  mode,
  selected,
  total,
  extra,
}: {
  title: string;
  required?: boolean;
  mode: AdminSelectionCountMode;
  selected: number;
  total: number;
  extra?: { label: string; count: number };
}): string => `<header class="admin-selection-heading"><h4>${renderAdminFieldLabel(title, required)}</h4><span class="admin-selection-count" data-selection-count${extra ? ` data-selection-extra-label="${escapeHtml(extra.label)}"` : ""} data-empty="${selected === 0}" aria-live="polite">${escapeHtml(adminSelectionCountText(mode, selected, total, extra?.count ? `${extra.count} ${extra.label}` : ""))}</span></header>`;

/** Recounts one selection group from its items. */
export const syncAdminSelectionCount = (group: HTMLElement): void => {
  const count = group.querySelector<HTMLElement>("[data-selection-count]");
  if (!count) return;
  const items = [...group.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-selection-count-item]")];
  const selected = items.filter((item) => item instanceof HTMLSelectElement ? item.value !== (item.dataset.selectionOff ?? "") : item.checked).length;
  const extraLabel = count.dataset.selectionExtraLabel;
  const extraCount = extraLabel ? group.querySelectorAll<HTMLInputElement>("[data-selection-extra-item]:checked").length : 0;
  count.textContent = adminSelectionCountText(group.dataset.selectionMode as AdminSelectionCountMode, selected, items.length, extraCount ? `${extraCount} ${extraLabel}` : "");
  count.dataset.empty = String(selected === 0);
};

/** Keeps every group's count live as its checkboxes and selects change. */
export const bindAdminSelectionCounts = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>("[data-selection-group]").forEach((group) => {
    group.addEventListener("change", () => syncAdminSelectionCount(group));
  });
};

export const adminUploadIcon ='<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>';

/**
 * File picker for bulk uploads (§6.5): a styled drop zone around a visually hidden native input, so the
 * browser's own "Choose Files" button never shows. Keyboard users tab to the input; the zone shows its focus.
 */
export const renderAdminFilePicker = ({
  name,
  accept,
  multiple = false,
  title,
  hint,
}: {
  name: string;
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
}): string => `<label class="admin-file-picker" data-admin-file-picker>
    <input class="sr-only" name="${escapeHtml(name)}" type="file" accept="${escapeHtml(accept)}"${multiple ? " multiple" : ""}>
    <span class="admin-file-picker__icon" aria-hidden="true">${adminUploadIcon}</span>
    <span class="admin-file-picker__text"><span><strong>${escapeHtml(title)}</strong> or drop ${multiple ? "them" : "it"} here</span><small>${escapeHtml(hint)}</small></span>
  </label>`;

/** Drag and drop for renderAdminFilePicker: dropped files go through the input's normal change handler. */
export const bindAdminFilePickers = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>("[data-admin-file-picker]").forEach((picker) => {
    const input = picker.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) return;
    const setDragging = (dragging: boolean): void => {
      picker.classList.toggle("is-dragging", dragging);
    };
    picker.addEventListener("dragover", (event) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    });
    picker.addEventListener("dragleave", (event) => {
      if (!picker.contains(event.relatedTarget as Node | null)) setDragging(false);
    });
    picker.addEventListener("drop", (event) => {
      event.preventDefault();
      setDragging(false);
      const files = event.dataTransfer?.files;
      if (!files?.length) return;
      const transfer = new DataTransfer();
      Array.from(files).slice(0, input.multiple ? files.length : 1).forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
};

/** Two or three mutually exclusive choices as one segmented control (native radios, so arrow keys work). */
export const renderAdminSegmented = ({
  legend,
  name,
  value,
  options,
  attributes = "",
}: {
  legend: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  attributes?: string;
}): string => `<div class="admin-segmented" role="radiogroup" aria-labelledby="${escapeHtml(name)}-label">
    <span class="admin-segmented__label" id="${escapeHtml(name)}-label">${escapeHtml(legend)}</span>
    <span class="admin-segmented__options">${options.map((option) => `<label><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}"${option.value === value ? " checked" : ""}${attributes ? ` ${attributes}` : ""}><span>${escapeHtml(option.label)}</span></label>`).join("")}</span>
  </div>`;

const scrollParent = (element: HTMLElement): HTMLElement | null => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
};

/**
 * Brings `element` into view by scrolling only its nearest real scroll container (§11).
 * Never call `element.scrollIntoView()` in Admin: it also scrolls `overflow: hidden` ancestors such as the
 * app shell, which shifts the whole layout up and leaves it stuck with an empty band below.
 */
export const revealAdminElement = (
  element: HTMLElement,
  { align = "nearest", inset = 8, scroller = scrollParent(element) }: { align?: "start" | "center" | "nearest"; inset?: number; scroller?: HTMLElement | null } = {},
): void => {
  if (!scroller) return;
  const viewport = scroller.getBoundingClientRect();
  const bounds = element.getBoundingClientRect();
  if (align === "start") scroller.scrollTop += bounds.top - viewport.top - inset;
  else if (align === "center") scroller.scrollTop += bounds.top - viewport.top - ((scroller.clientHeight - bounds.height) / 2);
  else if (bounds.top < viewport.top + inset) scroller.scrollTop += bounds.top - viewport.top - inset;
  else if (bounds.bottom > viewport.bottom - inset) scroller.scrollTop += bounds.bottom - viewport.bottom + inset;
};

/** Single-line user text that may be clipped: ellipsis plus the full value as a tooltip (docs/admin-ui-guidelines.md §6.2). */
export const renderAdminTruncatedText = (text: string, className = ""): string =>
  `<span class="admin-truncate${className ? ` ${escapeHtml(className)}` : ""}" title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;

interface AdminDialogHeaderOptions {
  eyebrow: string;
  title: string;
  titleId: string;
  /** One line, at most 80 characters (docs/admin-ui-guidelines.md §8.1). */
  note?: string;
  statusLabel: string;
  statusId?: string;
  /** Extra attributes for the title, such as a data hook that updates it. */
  titleAttributes?: string;
  close?: { label: string; attribute: string };
}

/** Shared dialog header: eyebrow, title, optional note, status slot and close button (§8.1). */
export const renderAdminDialogHeader = ({
  eyebrow,
  title,
  titleId,
  note,
  statusLabel,
  statusId,
  titleAttributes = "",
  close,
}: AdminDialogHeaderOptions): string => `<header class="admin-dialog__header">
    <p class="section-kicker">${escapeHtml(eyebrow)}</p>
    <h2 id="${escapeHtml(titleId)}"${titleAttributes ? ` ${titleAttributes}` : ""}>${escapeHtml(title)}</h2>
    ${note ? `<p class="admin-dialog__note">${escapeHtml(note)}</p>` : ""}
    ${close ? `<button class="admin-dialog__close" type="button" aria-label="${escapeHtml(close.label)}" title="Close" ${close.attribute}>${adminCloseIcon}</button>` : ""}
    <section${statusId ? ` id="${escapeHtml(statusId)}"` : ""} class="admin-dialog-status-region" data-admin-dialog-status aria-label="${escapeHtml(statusLabel)}" hidden></section>
  </header>`;

/** Zoom out, slider with visible value, zoom in and reset, for every cropper (§7.1). */
export const renderAdminCropZoomControls = ({
  prefix,
  maxZoom,
  resetLabel,
  resetTitle,
}: {
  prefix: string;
  maxZoom: number;
  resetLabel: string;
  resetTitle: string;
}): string => `<div class="admin-photo-crop-controls">
    <button class="button button--secondary admin-icon-button admin-crop-zoom-button" type="button" aria-label="Zoom out" title="Zoom out" data-${prefix}-zoom-out>${adminZoomOutIcon}</button>
    <label><span>Zoom</span><input type="range" min="1" max="${maxZoom}" step="0.05" value="1" aria-valuetext="100%" data-${prefix}-zoom><output data-${prefix}-zoom-value>100%</output></label>
    <button class="button button--secondary admin-icon-button admin-crop-zoom-button" type="button" aria-label="Zoom in" title="Zoom in" data-${prefix}-zoom-in>${adminZoomInIcon}</button>
    <button class="button button--secondary" type="button" title="${escapeHtml(resetTitle)}" data-${prefix}-reset>${escapeHtml(resetLabel)}</button>
  </div>`;

/** Updates a zoom slider from renderAdminCropZoomControls and its visible, announced value. */
export const setAdminCropZoomValue = (input: HTMLInputElement, output: HTMLOutputElement | null, level: number): void => {
  const percent = `${Math.round(level * 100)}%`;
  input.value = String(level);
  input.setAttribute("aria-valuetext", percent);
  if (output) output.textContent = percent;
};

export const renderAdminFieldLabel = (label: string, required = false): string =>
  `<span class="admin-field-label">${escapeHtml(label)}${required ? '<span class="admin-required-mark" aria-hidden="true">*</span><span class="sr-only"> (required)</span>' : ""}</span>`;

interface AdminSectionCardOptions {
  title: string;
  note?: string;
  content: string;
  headerActions?: string;
  actions?: string;
  className?: string;
}

export interface AdminPreviewControlOption {
  label: string;
  value: string;
  disabled?: boolean;
  group?: string;
}

interface AdminPreviewSelectOptions {
  label: string;
  dataAttribute: string;
  activeValue: string;
  options: AdminPreviewControlOption[];
  className?: string;
}

interface AdminPreviewToolbarOptions {
  title: string;
  meta: string;
  controls: string;
}

interface AdminYearSelectOptions {
  label: string;
  name: string;
  value?: string;
  minYear?: number;
  maxYear?: number;
  attributes?: string;
  required?: boolean;
}

interface AdminSelectControlOptions {
  name?: string;
  options: string;
  attributes?: string;
  className?: string;
}

interface AdminWorkspaceStateOptions {
  kind: "loading" | "empty" | "error";
  title: string;
  message: string;
  eyebrow?: string;
  actions?: string;
}

interface AdminDocumentHeaderOptions {
  eyebrow: string;
  title: string;
  titleContent?: string;
  meta: string;
  saveState?: string;
  utilityActions?: string;
  moreActions?: string;
  saveActions?: string;
  primaryActions?: string;
}

interface AdminEditorHeaderOptions {
  eyebrow: string;
  title: string;
  meta: string;
  utilityActions?: string;
  moreActions?: string;
  saveActions?: string;
  primaryActions?: string;
}

export const renderAdminWorkspaceState = ({
  kind,
  title,
  message,
  eyebrow = "Admin workspace",
  actions = "",
}: AdminWorkspaceStateOptions): string => `<section class="admin-workspace-state" data-state="${kind}"${kind === "loading" ? ' aria-busy="true" role="status"' : kind === "error" ? ' role="alert"' : ' role="status"'}>
  <span class="admin-workspace-state__icon" aria-hidden="true">${kind === "loading" ? "" : kind === "error" ? "!" : "\u2713"}</span>
  <div><p class="section-kicker">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>${actions ? `<div class="admin-actions">${actions}</div>` : ""}</div>
</section>`;

// Meta markup is already escaped; separators replace span boundaries so the
// compact header can expose hidden details through the meta tooltip.
export const adminDocumentMetaText = (meta: string): string =>
  meta.replace(/<\/span>\s*<span[^>]*>/g, " · ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export const renderAdminDocumentHeader = ({
  eyebrow,
  title,
  titleContent,
  meta,
  saveState = "",
  utilityActions = "",
  moreActions = "",
  saveActions = "",
  primaryActions = "",
}: AdminDocumentHeaderOptions): string => `<header class="admin-document-header" data-page-shell="document">
  <div class="admin-document-header__identity">
    <p class="section-kicker">${escapeHtml(eyebrow)}</p>
    <h1 class="admin-document-title"${titleContent ? "" : ` title="${escapeHtml(title)}"`}>${titleContent ?? escapeHtml(title)}</h1>
    <p class="admin-document-meta" title="${adminDocumentMetaText(meta)}">${meta}</p>
  </div>
  <div class="admin-document-actions">
    ${saveState}${utilityActions}${moreActions}${saveActions}${primaryActions}
  </div>
</header>`;

export const renderAdminEditorHeader = ({
  eyebrow,
  title,
  meta,
  utilityActions = "",
  moreActions = "",
  saveActions = "",
  primaryActions = "",
}: AdminEditorHeaderOptions): string => `<div class="admin-editor__heading" data-page-shell="editor">
  <div class="admin-editor__identity"><p class="section-kicker">${escapeHtml(eyebrow)}</p><h2 title="${escapeHtml(title)}">${escapeHtml(title)}</h2><div class="admin-editor__meta">${meta}</div></div>
  <div class="admin-editor__status">${utilityActions}${moreActions}${saveActions}${primaryActions}</div>
</div>`;

export const renderAdminSectionCard = ({
  title,
  note,
  content,
  headerActions,
  actions,
  className = "",
}: AdminSectionCardOptions): string => {
  const classes = `admin-form-section${className ? ` ${className}` : ""}`;
  return `<section class="${escapeHtml(classes)}">
    <header class="admin-section-heading">
      <h3 class="admin-form-section__title">${escapeHtml(title)}</h3>
      ${note ? `<p class="admin-form-section__note" title="${escapeHtml(note)}">${escapeHtml(note)}</p>` : ""}
      ${headerActions ? `<div class="admin-form-section__header-actions">${headerActions}</div>` : ""}
    </header>
    <div class="admin-form-section__body">${content}</div>
    ${actions ? `<footer class="admin-form-section__actions">${actions}</footer>` : ""}
  </section>`;
};

export const renderAdminPreviewOptions = (
  options: AdminPreviewControlOption[],
  activeValue: string,
): string => {
  let activeGroup: string | undefined;
  let markup = "";

  for (const option of options) {
    if (option.group !== activeGroup) {
      if (activeGroup !== undefined) markup += "</optgroup>";
      activeGroup = option.group;
      if (activeGroup !== undefined) markup += `<optgroup label="${escapeHtml(activeGroup)}">`;
    }
    markup += `<option value="${escapeHtml(option.value)}"${activeValue === option.value ? " selected" : ""}${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`;
  }

  if (activeGroup !== undefined) markup += "</optgroup>";
  return markup;
};

export const renderAdminPreviewSelect = ({
  label,
  dataAttribute,
  activeValue,
  options,
  className = "",
}: AdminPreviewSelectOptions): string => `<label class="admin-preview-toolbar__select${className ? ` ${escapeHtml(className)}` : ""}">
  <span class="sr-only">${escapeHtml(label)}</span>
  ${renderAdminSelectControl({
    className: "admin-select-control--compact",
    attributes: `${escapeHtml(dataAttribute)} aria-label="${escapeHtml(label)}"`,
    options: renderAdminPreviewOptions(options, activeValue),
  })}
</label>`;

export const renderAdminPreviewLanguageToggle = (
  language: "en" | "vi",
  dataAttribute: string,
): string => {
  const targetLanguage = language === "en" ? "vi" : "en";
  const targetLabel = targetLanguage === "vi" ? "Vietnamese" : "English";
  return `<button class="admin-preview-toolbar__language-toggle" type="button" ${escapeHtml(dataAttribute)} aria-label="Preview in ${targetLabel}" title="Preview in ${targetLabel}">${targetLanguage.toUpperCase()}</button>`;
};

export const renderAdminPreviewToolbar = ({
  title,
  meta,
  controls,
}: AdminPreviewToolbarOptions): string => `<div class="admin-preview-toolbar">
  <div class="admin-preview-toolbar__identity"><strong>${escapeHtml(title)}</strong><div class="admin-preview-toolbar__meta">${meta}</div></div>
  <div class="admin-preview-toolbar__controls">${controls}</div>
</div>`;

export const renderAdminSelectControl = ({
  name,
  options,
  attributes = "",
  className = "",
}: AdminSelectControlOptions): string => `<span class="admin-select-control${className ? ` ${escapeHtml(className)}` : ""}"><select${name ? ` name="${escapeHtml(name)}"` : ""}${attributes ? ` ${attributes}` : ""}>${options}</select><span class="admin-select-chevron" aria-hidden="true">${adminChevronIcon}</span></span>`;

export const renderAdminYearSelect = ({
  label,
  name,
  value = "",
  minYear = 1950,
  maxYear = new Date().getFullYear() + 10,
  attributes = "",
  required = false,
}: AdminYearSelectOptions): string => {
  const currentValue = /^\d{4}$/.test(value) ? Number(value) : null;
  const years = Array.from(
    new Set([
      ...Array.from({ length: Math.max(0, maxYear - minYear + 1) }, (_, index) => maxYear - index),
      ...(currentValue === null ? [] : [currentValue]),
    ]),
  ).sort((left, right) => right - left);
  const controlId = `admin-year-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const listId = `${controlId}-list`;
  const option = (optionValue: string, optionLabel: string): string => `<button type="button" role="option" aria-selected="${optionValue === value}" data-admin-year-option data-year-value="${escapeHtml(optionValue)}">${escapeHtml(optionLabel)}</button>`;

  return `<div class="admin-year-field">
    <span class="admin-year-field__label" id="${escapeHtml(controlId)}-label">${renderAdminFieldLabel(label, required)}</span>
    <div class="admin-year-picker" data-admin-year-picker>
      <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${attributes ? ` ${attributes}` : ""} data-admin-year-input>
      <button class="admin-year-picker__control" type="button" aria-labelledby="${escapeHtml(controlId)}-label" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeHtml(listId)}"${required ? ' aria-required="true"' : ""} data-admin-year-toggle>
        <span data-admin-year-value>${escapeHtml(value || "Select year")}</span>
        <span class="admin-select-chevron" aria-hidden="true">${adminChevronIcon}</span>
      </button>
      <div class="admin-year-picker__list" id="${escapeHtml(listId)}" role="listbox" aria-labelledby="${escapeHtml(controlId)}-label" data-admin-year-list hidden>
        ${option("", "Select year")}${years.map((year) => option(String(year), String(year))).join("")}
      </div>
    </div>
  </div>`;
};

export const bindAdminYearPickers = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>("[data-admin-year-picker]").forEach((picker) => {
    if (picker.dataset.adminYearPickerBound === "true") return;
    picker.dataset.adminYearPickerBound = "true";
    const input = picker.querySelector<HTMLInputElement>("[data-admin-year-input]");
    const toggle = picker.querySelector<HTMLButtonElement>("[data-admin-year-toggle]");
    const valueLabel = picker.querySelector<HTMLElement>("[data-admin-year-value]");
    const list = picker.querySelector<HTMLElement>("[data-admin-year-list]");
    const options = Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-admin-year-option]"));
    if (!input || !toggle || !valueLabel || !list) return;

    const closeList = (restoreFocus = false): void => {
      picker.classList.remove("is-open", "opens-upward");
      list.hidden = true;
      list.style.removeProperty("max-height");
      toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) toggle.focus({ preventScroll: true });
    };
    const positionList = (): void => {
      const bounds = picker.getBoundingClientRect();
      const spaceBelow = window.innerHeight - bounds.bottom - 12;
      const spaceAbove = bounds.top - 12;
      const opensUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
      const availableSpace = opensUpward ? spaceAbove : spaceBelow;
      picker.classList.toggle("opens-upward", opensUpward);
      list.style.maxHeight = `${Math.min(216, Math.max(96, availableSpace - 8))}px`;
    };
    const focusOption = (optionButton: HTMLButtonElement | undefined): void => {
      if (!optionButton) return;
      optionButton.focus({ preventScroll: true });
      const optionTop = optionButton.offsetTop;
      const optionBottom = optionTop + optionButton.offsetHeight;
      if (optionTop < list.scrollTop) list.scrollTop = optionTop;
      else if (optionBottom > list.scrollTop + list.clientHeight) list.scrollTop = optionBottom - list.clientHeight;
    };
    const openList = (): void => {
      root.querySelectorAll<HTMLElement>("[data-admin-year-picker].is-open").forEach((other) => {
        if (other === picker) return;
        other.classList.remove("is-open", "opens-upward");
        const otherList = other.querySelector<HTMLElement>("[data-admin-year-list]");
        const otherToggle = other.querySelector<HTMLButtonElement>("[data-admin-year-toggle]");
        if (otherList) {
          otherList.hidden = true;
          otherList.style.removeProperty("max-height");
        }
        otherToggle?.setAttribute("aria-expanded", "false");
      });
      picker.classList.add("is-open");
      list.hidden = false;
      positionList();
      toggle.setAttribute("aria-expanded", "true");
      const selected = options.find((item) => item.dataset.yearValue === input.value) ?? options[0];
      requestAnimationFrame(() => focusOption(selected));
    };
    const selectOption = (selected: HTMLButtonElement): void => {
      const nextValue = selected.dataset.yearValue ?? "";
      input.value = nextValue;
      valueLabel.textContent = nextValue || "Select year";
      options.forEach((item) => item.setAttribute("aria-selected", String(item === selected)));
      closeList(true);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    toggle.addEventListener("click", () => {
      if (list.hidden) openList();
      else closeList();
    });
    toggle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      openList();
    });
    options.forEach((optionButton, optionIndex) => {
      optionButton.addEventListener("click", () => selectOption(optionButton));
      optionButton.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeList(true);
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectOption(optionButton);
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : Math.max(0, Math.min(options.length - 1, optionIndex + (event.key === "ArrowDown" ? 1 : -1)));
        focusOption(options[nextIndex]);
      });
    });
    picker.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        if (!picker.contains(document.activeElement)) closeList();
      });
    });
  });
};

const connectTabPanel = (root: ParentNode, tab: HTMLButtonElement): void => {
  const bindings: Array<[string | undefined, string, string]> = [
    [tab.dataset.editorTab, "editor", "editorPanel"],
    [tab.dataset.clTab, "cover-letter", "clPanel"],
    [tab.dataset.documentTab, "document", "documentPanel"],
    [tab.dataset.websiteTab, "website", "websitePanel"],
    [tab.dataset.profileTab, "profile", "profilePanel"],
  ];
  const binding = bindings.find(([value]) => value !== undefined);
  if (binding) {
    const [value, namespace, panelKey] = binding;
    const panel = Array.from(root.querySelectorAll<HTMLElement>(`[data-${panelKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`))
      .find((item) => item.dataset[panelKey] === value);
    if (!panel || !value) return;
    tab.id ||= `admin-${namespace}-tab-${value}`;
    panel.id ||= `admin-${namespace}-panel-${value}`;
    tab.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    return;
  }

  const controlledId = tab.getAttribute("aria-controls");
  const panel = controlledId ? root.querySelector<HTMLElement>(`#${controlledId}`) : null;
  if (!panel) return;
  tab.id ||= `${controlledId}-tab`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tab.id);
};

export const bindAdminTablists = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>('[role="tablist"]').forEach((tablist) => {
    const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    if (!tabs.length) return;
    tabs.forEach((tab) => connectTabPanel(root, tab));

    const syncTabStops = (): void => {
      const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
      tabs.forEach((tab) => { tab.tabIndex = tab === selected ? 0 : -1; });
    };

    syncTabStops();
    tablist.addEventListener("click", () => window.queueMicrotask(syncTabStops));
    tablist.addEventListener("keydown", (event) => {
      if (!tabKeys.has(event.key)) return;
      const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (currentIndex < 0) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });
};

export const setButtonBusy = (button: HTMLButtonElement | null, busy: boolean, busyLabel?: string): void => {
  if (!button) return;
  if (busy) {
    button.dataset.idleLabel = button.textContent ?? "";
    if (busyLabel) button.textContent = busyLabel;
  } else if (button.dataset.idleLabel !== undefined) {
    button.textContent = button.dataset.idleLabel;
    delete button.dataset.idleLabel;
  }
  button.classList.toggle("is-busy", busy);
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
};
