import { assetUrl, escapeHtml, localize, profileName, type Language } from "../shared/format";
import type { Profile } from "../types/career";

export const heroCopy = {
  en: {
    tagline: "I coordinate BIM models so infrastructure gets built right, starting from the drawing.",
    sheetName: "Name",
    sheetRole: "Role",
    sheetBasedIn: "Based in",
    sheetStack: "Stack",
    sheetNumber: "Sheet",
    sheetValue: "01 / 01",
  },
  vi: {
    tagline: "Tôi điều phối mô hình BIM để công trình hạ tầng được xây đúng ngay từ bản vẽ.",
    sheetName: "Tên",
    sheetRole: "Vai trò",
    sheetBasedIn: "Địa điểm",
    sheetStack: "Công nghệ",
    sheetNumber: "Sheet",
    sheetValue: "01 / 01",
  },
} as const;

/** Up to `limit` most common technologies; ties keep first-seen order, case-insensitive. */
export const heroStack = (technologyLists: string[][], limit = 4): string[] => {
  const counts = new Map<string, { label: string; count: number; order: number }>();
  let order = 0;
  for (const list of technologyLists) {
    for (const raw of list) {
      const label = raw.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { label, count: 1, order: order++ });
    }
  }
  return [...counts.values()]
    .sort((first, second) => second.count - first.count || first.order - second.order)
    .slice(0, limit)
    .map((entry) => entry.label);
};

export interface HeroInput {
  language: Language;
  profile: Profile;
  eyebrow: string;
  overviewLabel: string;
  stack: string[];
  actions: { projects: string; cv: string; portfolio: string; contact: string };
  actionLabels: { projects: string; cv: string; portfolio: string; contact: string };
}

const sheetCell = (label: string, value: string): string =>
  value
    ? `<div class="hero__cell"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`
    : "";

export const renderHero = (input: HeroInput): string => {
  const { language, profile, eyebrow, overviewLabel, stack, actions, actionLabels } = input;
  const labels = heroCopy[language];
  const name = profileName(profile.name, language);
  const photo = assetUrl(profile.photoPath ?? "");
  const media = photo
    ? `<img class="hero__photo" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" width="640" height="440" fetchpriority="high" decoding="async" />`
    : '<div class="hero__photo hero__photo--empty" aria-hidden="true">HDL</div>';
  const cells = [
    sheetCell(labels.sheetName, escapeHtml(name)),
    sheetCell(labels.sheetRole, localize(profile.professionalTitle, language)),
    sheetCell(labels.sheetBasedIn, localize(profile.location, language)),
    sheetCell(labels.sheetStack, escapeHtml(stack.join(" · "))),
  ].join("");

  return `
      <section id="top" class="hero">
        <div class="container hero__layout">
          <div class="hero__copy">
            <p class="hero__eyebrow">${eyebrow}</p>
            <h1 class="hero__name">${escapeHtml(name)}</h1>
            <p class="hero__tagline">${escapeHtml(labels.tagline)}</p>
            <div class="hero__actions">
              <a class="button" href="${actions.projects}">${actionLabels.projects}</a>
              <a class="button button--secondary" href="${actions.cv}">${actionLabels.cv}</a>
              <a class="button button--secondary" href="${actions.portfolio}">${actionLabels.portfolio}</a>
              <a class="button button--secondary" href="${actions.contact}">${actionLabels.contact}</a>
            </div>
          </div>

          <aside class="hero__sheet" aria-label="${overviewLabel}">
            <div class="hero__viewport">
              ${media}
              <span class="hero__corner hero__corner--start" aria-hidden="true"></span>
              <span class="hero__corner hero__corner--end" aria-hidden="true"></span>
            </div>
            <dl class="hero__titleblock">
              ${cells}
              <div class="hero__cell hero__cell--sheet"><dt>${escapeHtml(labels.sheetNumber)}</dt><dd>${labels.sheetValue}</dd></div>
            </dl>
          </aside>
        </div>
      </section>`;
};
