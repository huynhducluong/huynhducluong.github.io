import { escapeHtml } from "../shared/format";

const tabKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

interface AdminSectionCardOptions {
  title: string;
  note?: string;
  content: string;
  actions?: string;
  className?: string;
}

interface AdminPreviewControlOption {
  label: string;
  value: string;
}

interface AdminPreviewControlGroupOptions {
  label: string;
  dataAttribute: string;
  activeValue: string;
  options: AdminPreviewControlOption[];
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

export const renderAdminSectionCard = ({
  title,
  note,
  content,
  actions,
  className = "",
}: AdminSectionCardOptions): string => {
  const classes = `admin-form-section${className ? ` ${className}` : ""}`;
  return `<section class="${escapeHtml(classes)}">
    <header class="admin-section-heading">
      <h3 class="admin-form-section__title">${escapeHtml(title)}</h3>
      ${note ? `<p class="admin-form-section__note" title="${escapeHtml(note)}">${escapeHtml(note)}</p>` : ""}
    </header>
    <div class="admin-form-section__body">${content}</div>
    ${actions ? `<footer class="admin-form-section__actions">${actions}</footer>` : ""}
  </section>`;
};

export const renderAdminPreviewControlGroup = ({
  label,
  dataAttribute,
  activeValue,
  options,
}: AdminPreviewControlGroupOptions): string => `<div class="admin-preview-toolbar__group" role="group" aria-label="${escapeHtml(label)}">
  ${options.map((option) => `<button type="button" ${escapeHtml(dataAttribute)}="${escapeHtml(option.value)}" class="${activeValue === option.value ? "is-active" : ""}" aria-pressed="${activeValue === option.value}">${escapeHtml(option.label)}</button>`).join("")}
</div>`;

export const renderAdminPreviewSelect = ({
  label,
  dataAttribute,
  activeValue,
  options,
  className = "",
}: AdminPreviewSelectOptions): string => `<label class="admin-preview-toolbar__select${className ? ` ${escapeHtml(className)}` : ""}">
  <span class="sr-only">${escapeHtml(label)}</span>
  <select ${escapeHtml(dataAttribute)} aria-label="${escapeHtml(label)}">
    ${options.map((option) => `<option value="${escapeHtml(option.value)}"${activeValue === option.value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
  </select>
</label>`;

export const renderAdminPreviewToolbar = ({
  title,
  meta,
  controls,
}: AdminPreviewToolbarOptions): string => `<div class="admin-preview-toolbar">
  <div class="admin-preview-toolbar__identity"><strong>${escapeHtml(title)}</strong><div class="admin-preview-toolbar__meta">${meta}</div></div>
  <div class="admin-preview-toolbar__controls">${controls}</div>
</div>`;

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
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
};
