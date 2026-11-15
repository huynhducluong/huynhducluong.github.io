import { escapeHtml } from "../shared/format";
import { adminChevronIcon } from "./ui";

/** Shared collapsible-card parts for Profile entries (Experience, Education); docs/admin-ui-guidelines.md §6.4. */

export const profileEntryFieldsId = (entryId: string): string => `profile-entry-fields-${entryId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

export const renderProfileEntryToggle = (entryId: string, name: string, expanded: boolean): string => {
  const label = `${expanded ? "Collapse" : "Expand"} ${name}`;
  return `<button class="button button--secondary admin-icon-button admin-profile-entry-card__toggle" type="button" data-profile-entry-toggle aria-expanded="${expanded}" aria-controls="${escapeHtml(profileEntryFieldsId(entryId))}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${adminChevronIcon}</button>`;
};

/** Subtitle shown only while the card is collapsed. `data-stress-text` lets `npm run shots -- --stress` lengthen it. */
export const renderProfileEntrySummary = (summary: string, expanded: boolean): string =>
  `<p class="admin-profile-entry-card__summary" data-profile-entry-summary data-stress-text title="${escapeHtml(summary)}"${expanded || !summary ? " hidden" : ""}>${escapeHtml(summary)}</p>`;

export const renderProfileEntryFieldsAttributes = (entryId: string, expanded: boolean): string =>
  `id="${escapeHtml(profileEntryFieldsId(entryId))}"${expanded ? "" : " hidden"}`;

export const setProfileEntryExpanded = (card: HTMLElement, expanded: boolean): void => {
  const toggle = card.querySelector<HTMLButtonElement>("[data-profile-entry-toggle]");
  const fields = card.querySelector<HTMLElement>(".admin-profile-entry-card__fields");
  const summary = card.querySelector<HTMLElement>("[data-profile-entry-summary]");
  if (!toggle || !fields) return;
  const label = (toggle.getAttribute("aria-label") ?? "").replace(/^(Expand|Collapse)/, expanded ? "Collapse" : "Expand");
  fields.hidden = !expanded;
  card.classList.toggle("is-collapsed", !expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
  if (summary) summary.hidden = expanded || !summary.textContent;
};

export const setProfileEntrySummary = (card: HTMLElement, text: string): void => {
  const summary = card.querySelector<HTMLElement>("[data-profile-entry-summary]");
  if (!summary) return;
  summary.textContent = text;
  summary.title = text;
  summary.hidden = !text || !card.classList.contains("is-collapsed");
};

/**
 * Wires every card in `panel`: ⌄ toggles (open ids live in `expanded`, so they survive the panel re-render)
 * and a live summary refreshed while the user types.
 */
export const bindProfileEntryCards = (
  panel: ParentNode,
  { cardSelector, idOf, expanded, summaryOf }: {
    cardSelector: string;
    idOf: (card: HTMLElement) => string;
    expanded: Set<string>;
    summaryOf: (card: HTMLElement, id: string) => string;
  },
): void => {
  panel.querySelectorAll<HTMLElement>(cardSelector).forEach((card) => {
    const id = idOf(card);
    card.querySelector<HTMLButtonElement>("[data-profile-entry-toggle]")?.addEventListener("click", () => {
      const open = !expanded.has(id);
      if (open) expanded.add(id); else expanded.delete(id);
      setProfileEntryExpanded(card, open);
    });
    const refresh = (): void => setProfileEntrySummary(card, summaryOf(card, id));
    card.addEventListener("input", refresh);
    card.addEventListener("change", refresh);
  });
};
