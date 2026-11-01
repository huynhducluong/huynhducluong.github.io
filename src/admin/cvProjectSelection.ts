import { escapeHtml } from "../shared/format";
import type { CvProjectDisplay, CvRuntimeProject } from "../types/cvContent";
import { adminChevronIcon, renderAdminFieldLabel, renderAdminSegmented } from "./ui";

type CvProjectChoice = CvProjectDisplay | "excluded";

const displayOptions: Array<{ value: CvProjectChoice; label: string }> = [
  { value: "excluded", label: "Off" },
  { value: "compact", label: "Compact" },
  { value: "detailed", label: "Detailed" },
];

/**
 * The muted line under the project name (§6.7): location, then what this CV prints for the project.
 * Compact rows print only name and year, so summary and responsibilities apply to Detailed alone.
 */
export const cvProjectStateText = (
  display: CvProjectChoice,
  showSummary: boolean,
  selected: number,
  total: number,
): { text: string; warning: boolean } => {
  if (display === "excluded") return { text: "Not in this CV", warning: false };
  if (display === "compact") return { text: "Name and year only", warning: false };
  if (!selected) return { text: total ? "Choose at least one responsibility" : "No responsibilities saved in Projects", warning: true };
  return { text: `${showSummary ? "Summary" : "No summary"} · ${selected} of ${total} responsibilit${total === 1 ? "y" : "ies"}`, warning: false };
};

/** Live count beside the Responsibilities legend; "0 of N" reads as a warning (§6.7). */
const responsibilityCountText = (selected: number, total: number): string => total ? `${selected} of ${total}` : "None saved";

/**
 * One CV project row (§6.7): identity left, Off | Compact | Detailed right, and a disclosure for the
 * Detailed options. Draft or archived projects keep their row but cannot be chosen and are not counted.
 */
export const renderCvProjectRow = (item: CvRuntimeProject, selection: CvRuntimeProject | undefined): string => {
  const id = escapeHtml(item.id);
  const ready = item.status === undefined || item.status === "published";
  const display: CvProjectChoice = ready ? selection?.cvDisplay ?? "excluded" : "excluded";
  const name = item.name.en || "Untitled project";
  const location = item.location.en || "Location not set";
  const responsibilityIds = new Set(selection?.cvResponsibilityIds ?? item.cvResponsibilityIds);
  const selectedCount = item.responsibilities.filter((responsibility) => responsibilityIds.has(responsibility.id)).length;
  const showSummary = Boolean(selection?.cvShowSummary);
  const state = ready
    ? cvProjectStateText(display, showSummary, selectedCount, item.responsibilities.length)
    : { text: "Available once the project is Ready", warning: false };
  const optionsId = `cv-project-options-${id}`;
  const open = display === "detailed" && state.warning;
  const disabled = ready ? "" : " disabled";
  return `<article class="admin-cv-project${ready ? "" : " is-unavailable"}" data-cv-project-card data-display="${display}">
    <div class="admin-cv-project__row">
      <div class="admin-cv-project__identity">
        <span class="admin-cv-project__title"><strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong>${ready ? "" : `<span class="status status--${item.status === "archived" ? "archived" : "draft"}">${item.status === "archived" ? "Archived" : "Draft"}</span>`}</span>
        <small><span title="${escapeHtml(location)}">${escapeHtml(location)}</span><span class="${state.warning ? "is-warning" : ""}" data-cv-project-state>${escapeHtml(state.text)}</span></small>
      </div>
      ${renderAdminSegmented({
        legend: `CV display for ${name}`,
        hideLegend: true,
        name: `cv_project_display_${item.id}`,
        value: display,
        options: displayOptions,
        attributes: `data-cv-project-display${disabled}`,
        groupAttributes: ready ? 'data-selection-count-item data-selection-off="excluded"' : "",
      })}
      <button class="button button--secondary admin-icon-button admin-cv-project__toggle" type="button" aria-expanded="${open}" aria-controls="${optionsId}" aria-label="Detailed options for ${escapeHtml(name)}" title="Detailed options" data-cv-project-toggle${display === "detailed" ? "" : " hidden"}>${adminChevronIcon}</button>
    </div>
    <div class="admin-cv-project__options" id="${optionsId}" data-cv-project-options${open ? "" : " hidden"}>
      <label class="admin-switch"><input type="checkbox" name="cv_project_summary_${id}" data-cv-project-summary${showSummary ? " checked" : ""}${disabled}><span>Show summary</span></label>
      <fieldset class="admin-cv-project__responsibilities">
        <legend>${renderAdminFieldLabel("Responsibilities", true)}<span class="admin-cv-project__count${selectedCount ? "" : " is-warning"}" data-cv-responsibility-count aria-live="polite">${responsibilityCountText(selectedCount, item.responsibilities.length)}</span></legend>
        ${item.responsibilities.length
          ? item.responsibilities.map((responsibility) => `<label><input type="checkbox" name="cv_project_responsibility_${id}" value="${escapeHtml(responsibility.id)}" data-cv-project-responsibility${responsibilityIds.has(responsibility.id) ? " checked" : ""}${disabled}><span>${escapeHtml(responsibility.text.en)}</span></label>`).join("")
          : '<p class="admin-empty">No responsibilities saved. Add them in Projects.</p>'}
      </fieldset>
    </div>
  </article>`;
};

const setOpen = (card: HTMLElement, open: boolean): void => {
  const toggle = card.querySelector<HTMLButtonElement>("[data-cv-project-toggle]");
  const options = card.querySelector<HTMLElement>("[data-cv-project-options]");
  if (!toggle || !options) return;
  toggle.setAttribute("aria-expanded", String(open));
  options.hidden = !open;
};

/**
 * Re-derives a row from its inputs after a change. Choosing Detailed opens the options, leaving it closes
 * them, and a Detailed row with no responsibility stays open so the problem is never collapsed away.
 */
export const syncCvProjectRow = (card: HTMLElement, changed?: Element | null): void => {
  const display = (card.querySelector<HTMLInputElement>("[data-cv-project-display]:checked")?.value ?? "excluded") as CvProjectChoice;
  const responsibilities = [...card.querySelectorAll<HTMLInputElement>("[data-cv-project-responsibility]")];
  const selected = responsibilities.filter((input) => input.checked).length;
  const showSummary = Boolean(card.querySelector<HTMLInputElement>("[data-cv-project-summary]")?.checked);
  const state = cvProjectStateText(display, showSummary, selected, responsibilities.length);
  card.dataset.display = display;
  const stateLine = card.querySelector<HTMLElement>("[data-cv-project-state]");
  if (stateLine) {
    stateLine.textContent = state.text;
    stateLine.classList.toggle("is-warning", state.warning);
  }
  const count = card.querySelector<HTMLElement>("[data-cv-responsibility-count]");
  if (count) {
    count.textContent = responsibilityCountText(selected, responsibilities.length);
    count.classList.toggle("is-warning", !selected);
  }
  const toggle = card.querySelector<HTMLButtonElement>("[data-cv-project-toggle]");
  if (toggle) toggle.hidden = display !== "detailed";
  if (display !== "detailed") setOpen(card, false);
  else if (state.warning || (changed instanceof HTMLInputElement && changed.matches("[data-cv-project-display]"))) setOpen(card, true);
};

/** Disclosure and live state for every CV project row under `root`. */
export const bindCvProjectRows = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>("[data-cv-project-card]").forEach((card) => {
    card.querySelector<HTMLButtonElement>("[data-cv-project-toggle]")?.addEventListener("click", (event) => {
      const toggle = event.currentTarget as HTMLButtonElement;
      setOpen(card, toggle.getAttribute("aria-expanded") !== "true");
    });
    card.addEventListener("change", (event) => syncCvProjectRow(card, event.target as Element | null));
  });
};
