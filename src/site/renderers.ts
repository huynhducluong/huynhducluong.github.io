import { assetUrl, escapeHtml, localize, type Language } from "../shared/format";
import type { PortfolioMedia, PortfolioProject, PortfolioTool } from "../types/portfolio";
import { projectUrl, toolUrl } from "./shell";

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
    return `<div class="media-placeholder ${className}" aria-label="Project image placeholder"><span>Image will be added</span></div>`;
  }
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${localize(media.alt, language)}" loading="lazy">`;
};

export const renderProjectCard = (
  project: PortfolioProject,
  language: Language,
): string => `
  <article class="listing-card">
    <a class="listing-card__media" href="${projectUrl(project.slug)}">
      ${renderMedia(project.images[0], language, "listing-card__image")}
    </a>
    <div class="listing-card__body">
      <p class="listing-card__eyebrow">${localize(project.location, language)}</p>
      <h2><a href="${projectUrl(project.slug)}">${localize(project.name, language)}</a></h2>
      ${project.summary ? `<p>${localize(project.summary, language)}</p>` : ""}
      <ul class="tag-list">${renderTags(project.technologies)}</ul>
      <a class="text-link" href="${projectUrl(project.slug)}">View case study →</a>
    </div>
  </article>`;

export const renderToolCard = (tool: PortfolioTool, language: Language): string => `
  <article class="listing-card listing-card--tool">
    <div class="listing-card__body">
      <p class="listing-card__eyebrow">BIM automation</p>
      <h2><a href="${toolUrl(tool.slug)}">${escapeHtml(tool.name)}</a></h2>
      <p>${localize(tool.solution, language)}</p>
      <ul class="tag-list">${renderTags(tool.technologies)}</ul>
      <a class="text-link" href="${toolUrl(tool.slug)}">View tool →</a>
    </div>
  </article>`;
