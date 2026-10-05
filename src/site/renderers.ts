import { assetUrl, escapeHtml, localize, type Language } from "../shared/format";
import type { PortfolioMedia, PortfolioProject, PortfolioTool } from "../types/portfolio";
import { projectUrl, toolUrl } from "./shell";

const copy = {
  en: {
    imagePlaceholder: "Project image placeholder",
    imagePending: "Image will be added",
    viewProject: "View case study",
    automation: "BIM automation",
    viewTool: "View tool",
  },
  vi: {
    imagePlaceholder: "Vị trí hình ảnh dự án",
    imagePending: "Hình ảnh sẽ được bổ sung",
    viewProject: "Xem dự án",
    automation: "Tự động hóa BIM",
    viewTool: "Xem công cụ",
  },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

export const renderTags = (items: string[]): string =>
  items.map((item) => `<li class="tag">${escapeHtml(item)}</li>`).join("");

const mediaSource = (media?: PortfolioMedia): string | null => {
  if (!media) return null;
  if (media.publicUrl) return media.publicUrl;
  if (/^https?:\/\//i.test(media.storagePath)) return media.storagePath;
  return assetUrl(media.storagePath);
};

export const renderMedia = (
  media: PortfolioMedia | undefined,
  language: Language,
  className = "content-image",
): string => {
  const source = mediaSource(media);
  if (!source || !media) {
    return `<div class="media-placeholder ${className}" aria-label="${copy[language].imagePlaceholder}"><span>${copy[language].imagePending}</span></div>`;
  }
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${localized(media.alt, language)}" loading="lazy">`;
};

export const renderMediaFigure = (
  media: PortfolioMedia,
  language: Language,
  className = "detail-gallery__image",
): string => `<figure>${renderMedia(media, language, className)}${media.caption && localized(media.caption, language) ? `<figcaption>${localized(media.caption, language)}</figcaption>` : ""}</figure>`;

export const renderProjectCard = (
  project: PortfolioProject,
  language: Language,
): string => `
  <article class="listing-card">
    <a class="listing-card__media" href="${projectUrl(project.slug, language)}">
      ${renderMedia(project.images[0], language, "listing-card__image")}
    </a>
    <div class="listing-card__body">
      ${localized(project.location, language) ? `<p class="listing-card__eyebrow">${localized(project.location, language)}</p>` : ""}
      <h2><a href="${projectUrl(project.slug, language)}">${localized(project.name, language)}</a></h2>
      ${project.summary ? `<p>${localized(project.summary, language)}</p>` : ""}
      <ul class="tag-list">${renderTags(project.technologies)}</ul>
      <a class="text-link" href="${projectUrl(project.slug, language)}">${copy[language].viewProject} →</a>
    </div>
  </article>`;

export const renderToolCard = (tool: PortfolioTool, language: Language): string => `
  <article class="listing-card listing-card--tool">
    <div class="listing-card__body">
      <p class="listing-card__eyebrow">${copy[language].automation}</p>
      <h2><a href="${toolUrl(tool.slug, language)}">${escapeHtml(tool.name)}</a></h2>
      <p>${localized(tool.solution, language)}</p>
      <ul class="tag-list">${renderTags(tool.technologies)}</ul>
      <a class="text-link" href="${toolUrl(tool.slug, language)}">${copy[language].viewTool} →</a>
    </div>
  </article>`;
