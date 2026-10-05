import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { getAdminAccess } from "../admin/auth";
import { loadPublishedWebsiteRelease, loadWebsiteDraftData } from "../services/websiteRepository";
import { renderMedia, renderMediaFigure, renderTags } from "../site/renderers";
import { applyWebsiteTheme, readSlug, readWebsiteLanguage, siteFooter, siteHeader } from "../site/shell";
import { escapeHtml, localize, profileName, type Language } from "../shared/format";
import { createPreviewReceiver } from "../shared/previewProtocol";
import type { WebsiteRuntimeData } from "../types/website";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

type WebsitePreviewData = WebsiteRuntimeData & { previewLanguage?: Language };

const copy = {
  en: { unavailable: "This tool is unavailable.", unavailableNote: "It may not be part of the latest website release.", watch: "Watch tool video", problem: "Problem", problemTitle: "Why it was built", solution: "Solution", solutionTitle: "How it works", benefit: "Benefit", benefitTitle: "Delivery impact", gallery: "Tool gallery" },
  vi: { unavailable: "Công cụ này hiện không khả dụng.", unavailableNote: "Công cụ có thể chưa nằm trong bản phát hành Website mới nhất.", watch: "Xem video công cụ", problem: "Bài toán", problemTitle: "Lý do công cụ được xây dựng", solution: "Giải pháp", solutionTitle: "Cách công cụ hoạt động", benefit: "Lợi ích", benefitTitle: "Hiệu quả triển khai", gallery: "Hình ảnh công cụ" },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

const render = (release: WebsiteRuntimeData, language: Language): void => {
  applyWebsiteTheme(release.content);
  document.documentElement.lang = language;
  const profile = release.professional.profile;
  const tool = release.tools.find((item) => item.slug === readSlug()) ?? null;
  const text = copy[language];
  if (!tool) {
    app.innerHTML = `${siteHeader(profile, release.content, "tools", language)}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">404</p><h1>${text.unavailable}</h1><p>${text.unavailableNote}</p></div></section></main>${siteFooter(profile, release.content, language)}`;
    return;
  }
  document.title = `${tool.name} | ${profileName(profile.name, language)}`;
  app.innerHTML = `${siteHeader(profile, release.content, "tools", language)}<main id="main-content"><article><header class="detail-hero"><div class="container detail-hero__grid"><div><p class="section-kicker">${localized(release.content.toolsPage.kicker, language)}</p><h1>${escapeHtml(tool.name)}</h1><p class="detail-hero__summary">${localized(tool.solution, language)}</p><ul class="tag-list">${renderTags(tool.technologies)}</ul>${tool.youtubeUrl ? `<div class="detail-hero__actions"><a class="button" href="${escapeHtml(tool.youtubeUrl)}" target="_blank" rel="noopener noreferrer">${text.watch}</a></div>` : ""}</div>${renderMedia(tool.images[0], language, "detail-hero__image")}</div></header><div class="container detail-body"><section><p class="section-kicker">${text.problem}</p><h2>${text.problemTitle}</h2><p>${localized(tool.problem, language)}</p></section><section><p class="section-kicker">${text.solution}</p><h2>${text.solutionTitle}</h2><p>${localized(tool.solution, language)}</p></section>${tool.benefit ? `<section><p class="section-kicker">${text.benefit}</p><h2>${text.benefitTitle}</h2><p>${localized(tool.benefit, language)}</p></section>` : ""}${tool.images.length > 1 ? `<section class="detail-gallery-section"><p class="section-kicker">${text.gallery}</p><div class="detail-gallery">${tool.images.slice(1).map((media) => renderMediaFigure(media, language)).join("")}</div></section>` : ""}</div></article></main>${siteFooter(profile, release.content, language)}`;
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const wantsPreview = params.get("preview") === "1";
  const previewReceiver = wantsPreview ? createPreviewReceiver<WebsitePreviewData>("website") : null;
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  const embeddedPreview = adminPreview && params.get("embedded") === "1";
  if (params.get("embedded") === "1") document.body.classList.add("website-embedded");
  if (embeddedPreview) {
    previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
    return;
  }
  const data = adminPreview ? await loadWebsiteDraftData() : await loadPublishedWebsiteRelease();
  render(data, readWebsiteLanguage());
  if (adminPreview) previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
  else previewReceiver?.disconnect();
};

void initialize().catch(() => {
  app.innerHTML = '<main class="website-load-state"><h1>Tool unavailable</h1><p>Please try again later.</p></main>';
});
