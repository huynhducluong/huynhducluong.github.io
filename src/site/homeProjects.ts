import { escapeHtml, localize, type Language } from "../shared/format";
import type { PortfolioProject } from "../types/portfolio";
import { renderMedia, renderTags } from "./renderers";
import { projectUrl } from "./shell";

export const projectsCopy = {
  en: {
    sheet: "SHEET",
    filterLabel: "Filter projects by technology",
    all: "All",
    technologies: "Technologies",
    viewProject: "View project",
    count: (shown: number, total: number) =>
      shown === total ? `Showing all ${total} projects` : `Showing ${shown} of ${total} projects`,
  },
  vi: {
    sheet: "SHEET",
    filterLabel: "Lọc dự án theo công nghệ",
    all: "Tất cả",
    technologies: "Công nghệ",
    viewProject: "Xem dự án",
    count: (shown: number, total: number) =>
      shown === total ? `Hiển thị tất cả ${total} dự án` : `Hiển thị ${shown} trong ${total} dự án`,
  },
} as const;

export interface ProjectChip {
  label: string;
  count: number;
}

/**
 * Up to `limit` most common technologies: by count, then by name; case-insensitive, blanks dropped.
 * Technologies shared by every project are skipped: a chip that hides no card does nothing (ADR-036).
 */
export const projectChips = (technologyLists: string[][], limit = 7): ProjectChip[] => {
  const counts = new Map<string, ProjectChip>();
  for (const list of technologyLists) {
    const seen = new Set<string>();
    for (const raw of list) {
      const label = raw.trim();
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { label, count: 1 });
    }
  }
  return [...counts.values()]
    .filter((entry) => entry.count < technologyLists.length)
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
    .slice(0, limit);
};

const sheetNumber = (index: number): string => String(index + 1).padStart(2, "0");

export const renderProjectSheet = (project: PortfolioProject, index: number, language: Language): string => {
  const text = projectsCopy[language];
  const href = projectUrl(project.slug, language);
  const number = `${text.sheet} ${sheetNumber(index)}`;
  const location = localize(project.location, language);
  const role = project.role ? localize(project.role, language) : "";
  const hasImage = Boolean(project.images[0]);
  const media = hasImage
    ? renderMedia(project.images[0], language, "project-card__image")
    : `<div class="project-card__image project-card__image--empty" aria-hidden="true"><span>${number}</span></div>`;
  const kicker = [number, location].filter(Boolean).join(" · ");
  const technologies = project.technologies.map((item) => item.trim()).filter(Boolean);
  const keys = technologies.map((item) => item.toLowerCase()).join("|");
  return `
    <article class="project-card" data-tech="${escapeHtml(keys)}">
      <a class="project-card__media" href="${href}" tabindex="-1" aria-hidden="true">
        ${media}
        <span class="project-card__corner project-card__corner--start"></span>
        <span class="project-card__corner project-card__corner--end"></span>
      </a>
      <div class="project-card__body">
        <p class="project-card__index">${kicker}</p>
        <h3 class="project-card__title"><a href="${href}">${localize(project.name, language)}</a></h3>
        ${role ? `<p class="project-card__meta">${role}</p>` : ""}
        ${project.summary ? `<p class="project-card__summary">${localize(project.summary, language)}</p>` : ""}
        ${technologies.length ? `<ul class="tag-list" aria-label="${text.technologies}">${renderTags(technologies.slice(0, 5))}</ul>` : ""}
        <a class="project-card__link" href="${href}">${text.viewProject} →</a>
      </div>
    </article>`;
};

export const renderProjectFilter = (chips: ProjectChip[], language: Language, total: number): string => {
  const text = projectsCopy[language];
  if (!chips.length) return "";
  const chip = (label: string, value: string, count: number, pressed: boolean): string =>
    `<button class="chip" type="button" data-filter="${escapeHtml(value)}" aria-pressed="${pressed}">${escapeHtml(label)} <span class="chip__count">${count}</span></button>`;
  return `
    <div class="chip-row" role="group" aria-label="${text.filterLabel}">
      ${chip(text.all, "", total, true)}
      ${chips.map((item) => chip(item.label, item.label.toLowerCase(), item.count, false)).join("")}
    </div>
    <p class="sr-only" aria-live="polite" data-filter-status>${text.count(total, total)}</p>`;
};

/** Wires chip buttons inside `root` to show / hide `.project-card` by `data-tech`. */
export const bindProjectFilter = (root: ParentNode, language: Language): void => {
  const text = projectsCopy[language];
  const chips = [...root.querySelectorAll<HTMLButtonElement>(".chip[data-filter]")];
  const cards = [...root.querySelectorAll<HTMLElement>(".project-card")];
  const status = root.querySelector<HTMLElement>("[data-filter-status]");
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const value = chip.dataset.filter ?? "";
      for (const other of chips) other.setAttribute("aria-pressed", String(other === chip));
      let shown = 0;
      for (const card of cards) {
        const match = !value || (card.dataset.tech ?? "").split("|").includes(value);
        card.hidden = !match;
        if (match) shown += 1;
      }
      if (status) status.textContent = text.count(shown, cards.length);
    });
  }
};
