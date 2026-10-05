import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { getAdminAccess } from "../admin/auth";
import { loadPublishedWebsiteRelease, loadWebsiteDraftData } from "../services/websiteRepository";
import { renderMedia, renderMediaFigure, renderTags } from "../site/renderers";
import { applyWebsiteTheme, readSlug, readWebsiteLanguage, siteFooter, siteHeader, withWebsiteLanguage } from "../site/shell";
import { escapeHtml, localize, type Language } from "../shared/format";
import { createPreviewReceiver } from "../shared/previewProtocol";
import type { WebsiteRuntimeData } from "../types/website";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

type WebsitePreviewData = WebsiteRuntimeData & { previewLanguage?: Language };

const copy = {
  en: { unavailable: "This project is unavailable.", unavailableNote: "It may not be part of the latest website release.", back: "Back to projects", watch: "Watch project video", contribution: "Contribution", responsibilities: "Responsibilities and delivery", responsibilityFallback: "Detailed contribution information will be added after verification.", challenge: "Challenge", challengeTitle: "Project context", approach: "Approach", approachTitle: "BIM approach", outcome: "Outcome", outcomeTitle: "Delivery result", gallery: "Project gallery" },
  vi: { unavailable: "Dự án này hiện không khả dụng.", unavailableNote: "Dự án có thể chưa nằm trong bản phát hành Website mới nhất.", back: "Quay lại danh sách dự án", watch: "Xem video dự án", contribution: "Đóng góp", responsibilities: "Trách nhiệm và phạm vi thực hiện", responsibilityFallback: "Thông tin đóng góp chi tiết sẽ được bổ sung sau khi xác minh.", challenge: "Thách thức", challengeTitle: "Bối cảnh dự án", approach: "Phương pháp", approachTitle: "Phương pháp BIM", outcome: "Kết quả", outcomeTitle: "Kết quả triển khai", gallery: "Hình ảnh dự án" },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

const render = (release: WebsiteRuntimeData, language: Language): void => {
  applyWebsiteTheme(release.content);
  document.documentElement.lang = language;
  const profile = release.professional.profile;
  const project = release.projects.find((item) => item.slug === readSlug()) ?? null;
  const text = copy[language];
  app.innerHTML = `${siteHeader(profile, release.content, "projects", language)}<main id="main-content"></main>${siteFooter(profile, release.content, language)}`;
  if (!project) {
    document.title = `${text.unavailable} | ${profile.name}`;
    app.querySelector("main")!.innerHTML = `<section class="page-hero"><div class="container"><p class="section-kicker">404</p><h1>${text.unavailable}</h1><p>${text.unavailableNote}</p><a class="button" href="${withWebsiteLanguage(`${import.meta.env.BASE_URL}projects/`, language)}">${text.back}</a></div></section>`;
    return;
  }
  document.title = `${localized(project.name, language)} | ${profile.name}`;
  app.querySelector("main")!.innerHTML = `
    <article>
      <header class="detail-hero"><div class="container detail-hero__grid"><div><p class="section-kicker">${localized(project.location, language)}</p><h1>${localized(project.name, language)}</h1>${project.role ? `<p class="detail-hero__role">${localized(project.role, language)}</p>` : ""}${project.summary ? `<p class="detail-hero__summary">${localized(project.summary, language)}</p>` : ""}<ul class="tag-list">${renderTags(project.technologies)}</ul>${project.youtubeUrl ? `<div class="detail-hero__actions"><a class="button" href="${escapeHtml(project.youtubeUrl)}" target="_blank" rel="noopener noreferrer">${text.watch}</a></div>` : ""}</div>${renderMedia(project.images[0], language, "detail-hero__image")}</div></header>
      <div class="container detail-body">
        <section><p class="section-kicker">${text.contribution}</p><h2>${text.responsibilities}</h2>${project.responsibilities.length ? `<ul class="detail-list">${project.responsibilities.map((point) => `<li>${localized(point.text, language)}</li>`).join("")}</ul>` : `<p>${text.responsibilityFallback}</p>`}</section>
        ${project.challenge ? `<section><p class="section-kicker">${text.challenge}</p><h2>${text.challengeTitle}</h2><p>${localized(project.challenge, language)}</p></section>` : ""}
        ${project.approach ? `<section><p class="section-kicker">${text.approach}</p><h2>${text.approachTitle}</h2><p>${localized(project.approach, language)}</p></section>` : ""}
        ${project.outcome ? `<section><p class="section-kicker">${text.outcome}</p><h2>${text.outcomeTitle}</h2><p>${localized(project.outcome, language)}</p></section>` : ""}
        ${project.images.length > 1 ? `<section class="detail-gallery-section"><p class="section-kicker">${text.gallery}</p><div class="detail-gallery">${project.images.slice(1).map((media) => renderMediaFigure(media, language)).join("")}</div></section>` : ""}
      </div>
    </article>`;
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const wantsPreview = params.get("preview") === "1";
  const previewReceiver = wantsPreview ? createPreviewReceiver<WebsitePreviewData>("website") : null;
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  if (params.get("embedded") === "1") document.body.classList.add("website-embedded");
  const data = adminPreview ? await loadWebsiteDraftData() : await loadPublishedWebsiteRelease();
  render(data, readWebsiteLanguage());
  if (adminPreview) previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
  else previewReceiver?.disconnect();
};

void initialize().catch(() => {
  app.innerHTML = '<main class="website-load-state"><h1>Project unavailable</h1><p>Please try again later.</p></main>';
});
