import { revealAdminElement, scrollParent } from "./ui";

/**
 * Admin side of the Portfolio "Edit markers" pencils (ADR-030, admin-ui-guidelines §7.2): the toolbar toggle, its
 * remembered state, and the jump from a clicked pencil to the Content-tab field.
 */
export const EDIT_MARKERS_STORAGE_KEY = "hdl.admin.portfolio.editMarkers";
export const EDIT_TARGET_HIGHLIGHT_MS = 1200;

type MarkerStorage = Pick<Storage, "getItem" | "setItem">;

const browserStorage = (): MarkerStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Off unless the viewer turned it on; storage that is blocked or throws simply means "off". */
export const readEditMarkersPreference = (storage: MarkerStorage | null = browserStorage()): boolean => {
  try {
    return storage?.getItem(EDIT_MARKERS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeEditMarkersPreference = (enabled: boolean, storage: MarkerStorage | null = browserStorage()): void => {
  try {
    storage?.setItem(EDIT_MARKERS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Remembering is a convenience only.
  }
};

/** One `aria-pressed` toggle in the Portfolio preview toolbar; reuses the zoom group's button look. */
export const renderEditMarkersToggle = (enabled: boolean): string => `
  <div class="admin-preview-toolbar__group" role="group" aria-label="Edit markers">
    <button type="button" data-document-edit-markers class="${enabled ? "is-active" : ""}" aria-pressed="${enabled}" title="Show a pencil on the text that comes from the Content tab">Edit markers</button>
  </div>`;

export const syncEditMarkersToggle = (button: HTMLButtonElement, enabled: boolean): void => {
  button.classList.toggle("is-active", enabled);
  button.setAttribute("aria-pressed", String(enabled));
};

const highlightTimers = new WeakMap<HTMLElement, number>();

/** Holds a visible highlight on the field's label for about 1.2 s; no animation, so reduced motion needs no special case. */
const highlight = (target: HTMLElement): void => {
  const previous = highlightTimers.get(target);
  if (previous !== undefined) window.clearTimeout(previous);
  target.classList.add("is-edit-target");
  highlightTimers.set(target, window.setTimeout(() => {
    target.classList.remove("is-edit-target");
    highlightTimers.delete(target);
  }, EDIT_TARGET_HIGHLIGHT_MS));
};

/** Sticky header and tab bar cover the top of the scroller; the field has to stop below them (MASTER_PLAN #12). */
const stickyInset = (root: ParentNode, scrollerTop: number): number => {
  const bottoms = [".admin-document-header", ".admin-document-tabs"].map((selector) => {
    const element = root.querySelector<HTMLElement>(selector);
    return element && getComputedStyle(element).position === "sticky" ? element.getBoundingClientRect().bottom : 0;
  });
  return Math.max(0, Math.max(...bottoms) - scrollerTop) + 16;
};

/**
 * Opens any collapsed card around the control, brings it into view below the sticky bars, focuses and highlights it.
 * An archived document's controls are disabled, so its label takes focus instead. Returns the focused element.
 */
export const focusPortfolioEditControl = (root: ParentNode, form: HTMLFormElement, controlName: string): HTMLElement | null => {
  const control = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].find((item) => item.name === controlName);
  if (!control) return null;
  for (let node = control.parentElement; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true;
  }
  const label = control.closest<HTMLElement>("label") ?? control;
  const focusable: HTMLElement = control.disabled ? label : control;
  if (control.disabled && !label.hasAttribute("tabindex")) label.tabIndex = -1;
  // One frame so a just-shown tab panel and just-opened card have layout before measuring.
  requestAnimationFrame(() => {
    const scroller = scrollParent(label);
    revealAdminElement(label, { align: "nearest", inset: stickyInset(root, scroller?.getBoundingClientRect().top ?? 0), scroller });
    focusable.focus({ preventScroll: true });
    highlight(label);
  });
  return focusable;
};
