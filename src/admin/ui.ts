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

interface AdminSectionCardOptions {
  title: string;
  note?: string;
  content: string;
  headerActions?: string;
  actions?: string;
  className?: string;
}

interface AdminPreviewControlOption {
  label: string;
  value: string;
  disabled?: boolean;
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
    <p class="admin-document-meta">${meta}</p>
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

export const renderAdminPreviewSelect = ({
  label,
  dataAttribute,
  activeValue,
  options,
  className = "",
}: AdminPreviewSelectOptions): string => `<label class="admin-preview-toolbar__select${className ? ` ${escapeHtml(className)}` : ""}">
  <span class="sr-only">${escapeHtml(label)}</span>
  <select ${escapeHtml(dataAttribute)} aria-label="${escapeHtml(label)}">
    ${options.map((option) => `<option value="${escapeHtml(option.value)}"${activeValue === option.value ? " selected" : ""}${option.disabled ? " disabled" : ""}>${escapeHtml(option.label)}</option>`).join("")}
  </select>
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
}: AdminSelectControlOptions): string => `<span class="admin-select-control${className ? ` ${escapeHtml(className)}` : ""}"><select${name ? ` name="${escapeHtml(name)}"` : ""}${attributes ? ` ${attributes}` : ""}>${options}</select><span class="admin-select-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg></span></span>`;

export const renderAdminYearSelect = ({
  label,
  name,
  value = "",
  minYear = 1950,
  maxYear = new Date().getFullYear() + 10,
  attributes = "",
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
    <span class="admin-year-field__label" id="${escapeHtml(controlId)}-label">${escapeHtml(label)}</span>
    <div class="admin-year-picker" data-admin-year-picker>
      <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${attributes ? ` ${attributes}` : ""} data-admin-year-input>
      <button class="admin-year-picker__control" type="button" aria-labelledby="${escapeHtml(controlId)}-label" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeHtml(listId)}" data-admin-year-toggle>
        <span data-admin-year-value>${escapeHtml(value || "Select year")}</span>
        <span class="admin-select-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg></span>
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
