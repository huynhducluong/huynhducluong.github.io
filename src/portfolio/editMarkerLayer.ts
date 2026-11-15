import { isPortfolioEditField, portfolioEditFieldLabel, type PortfolioEditField, type PortfolioEditTargetMessage } from "./editMarkers";

/**
 * The pencil buttons of the Admin's embedded Portfolio preview (ADR-030, admin-ui-guidelines §7.2).
 * They live in one absolutely positioned layer beside the pages (never inside a page), so they take no layout
 * space and are invisible to `findPortfolioLayoutIssues`, which only measures `.portfolio-page`.
 */
const LAYER_CLASS = "portfolio-edit-layer";
const TARGET_CLASS = "is-edit-target";

const pencilIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 13.5l.8-3.2 7.6-7.6a1.4 1.4 0 012 2l-7.6 7.6-2.8 1.2z"/><path d="M9.6 4l2.4 2.4"/></svg>';

export const clampEditScale = (value: unknown): number => {
  const scale = Number(value);
  return Number.isFinite(scale) && scale > 0 ? Math.min(4, Math.max(0.1, scale)) : 1;
};

/** Tells the shared CSS how big one screen pixel is inside the zoomed preview. */
export const setEditMarkerScale = (documentRoot: HTMLElement, scale: number): void => {
  documentRoot.style.setProperty("--edit-marker-scale", String(clampEditScale(scale)));
  // Pencil positions depend on the zoom (their size and gap are screen pixels).
  documentRoot.querySelectorAll(`.${LAYER_CLASS}`).forEach((layer) => layer.dispatchEvent(new Event("hdl-place")));
};

/** Removes the layer and any highlighted block; safe to call when nothing is mounted. */
export const clearEditMarkerLayer = (shell: ParentNode): void => {
  shell.querySelectorAll(`.${LAYER_CLASS}`).forEach((layer) => layer.remove());
  shell.querySelectorAll(`.${TARGET_CLASS}`).forEach((block) => block.classList.remove(TARGET_CLASS));
};

/** Builds one pencil per `[data-edit-field]` block and keeps them on their blocks while the layout settles. */
export const mountEditMarkerLayer = (shell: HTMLElement, onPick: (field: PortfolioEditField) => void): void => {
  clearEditMarkerLayer(shell);
  const blocks = [...shell.querySelectorAll<HTMLElement>("[data-edit-field]")]
    .filter((block) => isPortfolioEditField(block.dataset.editField));
  if (!blocks.length) return;
  const layer = document.createElement("div");
  layer.className = LAYER_CLASS;
  const entries = blocks.map((block) => {
    const field = block.dataset.editField as PortfolioEditField;
    const button = document.createElement("button");
    const label = `Edit ${portfolioEditFieldLabel(field)}`;
    button.type = "button";
    button.className = "portfolio-edit-marker";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = pencilIcon;
    button.addEventListener("click", () => onPick(field));
    const setTarget = (on: boolean): void => { block.classList.toggle(TARGET_CLASS, on); };
    button.addEventListener("pointerenter", () => setTarget(true));
    button.addEventListener("pointerleave", () => setTarget(false));
    button.addEventListener("focus", () => setTarget(true));
    button.addEventListener("blur", () => setTarget(false));
    layer.append(button);
    return { block, button };
  });
  shell.append(layer);

  const place = (): void => {
    const origin = shell.getBoundingClientRect();
    const scale = clampEditScale(Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--edit-marker-scale")));
    // Sizes below are screen pixels divided by the zoom, so the pencil, its gap and its step stay constant on screen.
    const size = 22 / scale;
    const gap = 4 / scale;
    const placed: Array<{ left: number; top: number }> = [];
    const hits = (left: number, top: number): boolean => placed.some((other) => Math.abs(other.left - left) < size + gap && Math.abs(other.top - top) < size + gap);
    const measured = entries.map(({ block, button }) => {
      const box = block.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(block);
      // The pencil follows the end of the first line of text, not the (full-column) block box.
      const line = [...range.getClientRects()].find((rect) => rect.width > 0 && rect.height > 0) ?? box;
      return { button, visible: box.width > 0 && box.height > 0, line };
    }).sort((first, second) => first.line.top - second.line.top || first.line.right - second.line.right);
    for (const { button, visible, line } of measured) {
      button.hidden = !visible;
      if (!visible) continue;
      let left = Math.min(Math.max(size / 2, line.right - origin.left + gap + size / 2), Math.max(size / 2, origin.width - size / 2));
      let top = Math.max(size / 2, line.top - origin.top + Math.min(line.height, size) / 2);
      // Avoid collisions: step down one pencil at a time, then sideways to the left when the page edge is near.
      for (let attempt = 0; attempt < 12 && hits(left, top); attempt += 1) top += size + gap;
      placed.push({ left, top });
      button.style.left = `${left}px`;
      button.style.top = `${top}px`;
    }
  };
  place();
  requestAnimationFrame(place);
  void document.fonts?.ready.then(place).catch(() => undefined);
  shell.addEventListener("load", place, true);
  layer.addEventListener("hdl-place", place);
  new ResizeObserver(place).observe(shell);
};

export const editTargetMessage = (field: PortfolioEditField): PortfolioEditTargetMessage => ({ type: "hdl:portfolio-edit-target", field });
