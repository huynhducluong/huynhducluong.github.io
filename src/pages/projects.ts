import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { getAdminAccess } from "../admin/auth";
import { loadPublishedWebsiteRelease, loadWebsiteDraftData } from "../services/websiteRepository";
import { createPreviewReceiver } from "../shared/previewProtocol";
import { localize, type Language } from "../shared/format";
import { renderProjectCard } from "../site/renderers";
import { applyWebsiteTheme, siteFooter, siteHeader } from "../site/shell";
import type { WebsiteRuntimeData } from "../types/website";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

type WebsitePreviewData = WebsiteRuntimeData & { previewLanguage?: Language };

const emptyCopy = {
  en: "No projects are included in this Website view.",
  vi: "Chưa có dự án nào được chọn cho trang Website này.",
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

const render = (data: WebsiteRuntimeData, language: Language = "en"): void => {
  applyWebsiteTheme(data.content);
  document.documentElement.lang = language;
  const profile = data.professional.profile;
  const projects = data.projects
    .filter((item) => item.status === "published" && item.websiteVisible !== false)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const cards = projects.length
    ? `<div class="listing-grid">${projects.map((item) => renderProjectCard(item, language)).join("")}</div>`
    : `<p class="status-message">${emptyCopy[language]}</p>`;
  const page = data.content.projectsPage;
  document.title = `${localized(page.title, language)} | ${profile.name}`;
  app.innerHTML = `${siteHeader(profile, data.content, "projects", language)}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">${localized(page.kicker, language)}</p><h1>${localized(page.title, language)}</h1><p>${localized(page.description, language)}</p></div></section><section class="section"><div class="container">${cards}</div></section></main>${siteFooter(profile, data.content, language)}`;
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const wantsPreview = params.get("preview") === "1";
  const previewReceiver = wantsPreview ? createPreviewReceiver<WebsitePreviewData>("website") : null;
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  if (params.get("embedded") === "1") document.body.classList.add("website-embedded");
  const data = adminPreview ? await loadWebsiteDraftData() : await loadPublishedWebsiteRelease();
  render(data);
  if (adminPreview) {
    previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
  } else {
    previewReceiver?.disconnect();
  }
};

void initialize().catch(() => {
  app.innerHTML = '<main class="website-load-state"><h1>Projects unavailable</h1><p>Please try again later.</p></main>';
});
