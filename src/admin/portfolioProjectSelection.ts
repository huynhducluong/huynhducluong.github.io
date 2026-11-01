import { escapeHtml } from "../shared/format";
import type { PortfolioProject } from "../types/portfolio";
import { adminChevronIcon, renderAdminFieldLabel } from "./ui";

/**
 * Muted state line of a Portfolio project row (§6.7): layout, then how many chosen responsibilities it prints.
 * Choosing more than the layout prints, or none, is a warning: the editor sees the slice before the PDF does.
 */
export const portfolioProjectStateText = (
  included: boolean,
  layoutLabel: string,
  selected: number,
  total: number,
  limit: number,
): { text: string; warning: boolean } => {
  if (!included) return { text: "Not in this Portfolio", warning: false };
  if (!total) return { text: `${layoutLabel} · No responsibilities saved in Projects`, warning: true };
  if (!selected) return { text: `${layoutLabel} · No responsibility selected`, warning: true };
  if (selected > limit) return { text: `${layoutLabel} · prints the first ${limit} of ${selected} selected`, warning: true };
  return { text: `${layoutLabel} · ${selected} of ${total} responsibilit${total === 1 ? "y" : "ies"}`, warning: false };
};

/**
 * A Portfolio project row: the CV project-row anatomy (§6.7) with an include switch instead of a display choice, and
 * the responsibilities to print disclosed below. Responsibilities belong to the project (Projects owns the text and
 * order); the Portfolio only selects them.
 */
export const renderPortfolioProjectRow = ({ project, ready, layoutLabel, limit, chosenIds }: {
  project: PortfolioProject;
  ready: boolean;
  layoutLabel: string;
  limit: number;
  chosenIds: string[] | undefined;
}): string => {
  const id = escapeHtml(project.id);
  const name = project.name.en || "Untitled project";
  const included = ready && Boolean(project.includeInPortfolio);
  const available = project.responsibilities.filter((point) => point.text.en.trim());
  const chosen = new Set(chosenIds ?? available.map((point) => point.id));
  const selected = available.filter((point) => chosen.has(point.id)).length;
  const state = ready ? portfolioProjectStateText(included, layoutLabel, selected, available.length, limit) : { text: "Available once the project is Ready", warning: false };
  const optionsId = `portfolio-project-options-${id}`;
  const disabled = ready ? "" : " disabled";
  return `<article class="admin-cv-project admin-portfolio-project${ready ? "" : " is-unavailable"}" data-portfolio-project-card data-display="${included ? "included" : "excluded"}" data-layout-label="${escapeHtml(layoutLabel)}" data-limit="${limit}">
    <div class="admin-cv-project__row">
      <div class="admin-cv-project__identity">
        <span class="admin-cv-project__title"><strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong>${ready ? "" : `<span class="status status--${project.status === "archived" ? "archived" : "draft"}">${project.status === "archived" ? "Archived" : "Draft"}</span>`}</span>
        <small><span title="${escapeHtml(project.location.en || "Location not set")}">${escapeHtml(project.location.en || "Location not set")}</span><span class="${state.warning ? "is-warning" : ""}" data-portfolio-project-state>${escapeHtml(state.text)}</span></small>
      </div>
      <label class="admin-switch admin-portfolio-project__include"><input type="checkbox" name="portfolio_project" value="${id}" data-selection-primary data-portfolio-project-include${included ? " checked" : ""}${ready ? " data-selection-count-item" : " disabled"}><span>In Portfolio</span></label>
      <button class="button button--secondary admin-icon-button admin-cv-project__toggle" type="button" aria-expanded="false" aria-controls="${optionsId}" aria-label="Responsibilities for ${escapeHtml(name)}" title="Responsibilities" data-portfolio-project-toggle${included ? "" : " hidden"}>${adminChevronIcon}</button>
    </div>
    <div class="admin-cv-project__options" id="${optionsId}" data-portfolio-project-options hidden>
      <input type="hidden" name="portfolio_responsibilities_${id}" value="1">
      <fieldset class="admin-cv-project__responsibilities">
        <legend>${renderAdminFieldLabel("Responsibilities")}<span class="admin-cv-project__count" data-portfolio-responsibility-count aria-live="polite">${available.length ? `${selected} of ${available.length}` : "None saved"}</span></legend>
        ${available.length
          ? available.map((point) => `<label><input type="checkbox" name="portfolio_responsibility_${id}" value="${escapeHtml(point.id)}" data-portfolio-project-responsibility${chosen.has(point.id) ? " checked" : ""}${disabled}><span>${escapeHtml(point.text.en)}</span></label>`).join("")
          : '<p class="admin-empty">No responsibilities saved. Add them in Projects.</p>'}
      </fieldset>
    </div>
  </article>`;
};

/** Re-derives a row after its switch, a responsibility or its layout changed. */
export const syncPortfolioProjectRow = (card: HTMLElement): void => {
  const include = card.querySelector<HTMLInputElement>("[data-portfolio-project-include]");
  if (!include || include.disabled) return;
  const boxes = [...card.querySelectorAll<HTMLInputElement>("[data-portfolio-project-responsibility]")];
  const selected = boxes.filter((box) => box.checked).length;
  const state = portfolioProjectStateText(include.checked, card.dataset.layoutLabel ?? "", selected, boxes.length, Number(card.dataset.limit) || 3);
  card.dataset.display = include.checked ? "included" : "excluded";
  const line = card.querySelector<HTMLElement>("[data-portfolio-project-state]");
  if (line) {
    line.textContent = state.text;
    line.classList.toggle("is-warning", state.warning);
  }
  const count = card.querySelector<HTMLElement>("[data-portfolio-responsibility-count]");
  if (count && boxes.length) count.textContent = `${selected} of ${boxes.length}`;
  const toggle = card.querySelector<HTMLButtonElement>("[data-portfolio-project-toggle]");
  const options = card.querySelector<HTMLElement>("[data-portfolio-project-options]");
  if (toggle) toggle.hidden = !include.checked;
  if (!include.checked && toggle && options) {
    toggle.setAttribute("aria-expanded", "false");
    options.hidden = true;
  }
};

/** Disclosure and live state for every Portfolio project row under `root`. */
export const bindPortfolioProjectRows = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>("[data-portfolio-project-card]").forEach((card) => {
    card.querySelector<HTMLButtonElement>("[data-portfolio-project-toggle]")?.addEventListener("click", (event) => {
      const toggle = event.currentTarget as HTMLButtonElement;
      const options = card.querySelector<HTMLElement>("[data-portfolio-project-options]");
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      if (options) options.hidden = !open;
    });
    card.addEventListener("change", () => syncPortfolioProjectRow(card));
  });
};
