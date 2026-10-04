import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/portfolio-screen.css";
import "../styles/portfolio-print.css";
import { loadPublishedPortfolioRelease } from "../services/documentRepository";
import { loadPortfolioDraftData } from "../services/documentRepository";
import { getAdminAccess } from "../admin/auth";
import { applyDocumentTheme, resolveDocumentTheme } from "../themes/documentThemes";
import { createPreviewReceiver } from "../shared/previewProtocol";
import type { Language } from "../shared/format";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { renderPortfolio } from "./renderPortfolio";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

type PortfolioPreviewData = PortfolioRuntimeData & { previewLanguage?: Language };

const render = (data: PortfolioRuntimeData, language: Language = "en"): void => {
  document.documentElement.lang = language;
  document.title = `${data.content.profile.name} | Portfolio`;
  app.innerHTML = `<main class="portfolio-preview-shell portfolio-preview-shell--public"><div class="portfolio-document" id="portfolio-document">${renderPortfolio(data, language)}</div></main>`;
  const documentRoot = app.querySelector<HTMLElement>("#portfolio-document");
  if (!documentRoot) throw new Error("Portfolio document was not found.");
  applyDocumentTheme(documentRoot, resolveDocumentTheme(data.content.theme));
  const photo = app.querySelector<HTMLImageElement>("[data-portfolio-profile-photo]");
  const updatePhoto = (): void => {
    photo?.closest("[data-portfolio-profile-photo-frame]")?.classList.toggle("has-image", Boolean(photo.complete && photo.naturalWidth > 0));
  };
  photo?.addEventListener("load", updatePhoto);
  photo?.addEventListener("error", updatePhoto);
  updatePhoto();
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const wantsPreview = params.get("preview") === "1";
  const previewReceiver = wantsPreview ? createPreviewReceiver<PortfolioPreviewData>("portfolio") : null;
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  if (params.get("embedded") === "1") document.body.classList.add("document-embedded");
  const data = adminPreview ? await loadPortfolioDraftData() : await loadPublishedPortfolioRelease();
  render(data);
  if (adminPreview) {
    previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
  } else {
    previewReceiver?.disconnect();
  }
};

void initialize().catch((error: unknown) => {
  app.innerHTML = '<main class="cv-load-error"><h1>Portfolio is not available</h1><p data-portfolio-load-error>The owner has not published a Portfolio release yet.</p></main>';
  const target = app.querySelector<HTMLElement>("[data-portfolio-load-error]");
  if (target && error instanceof Error && !error.message.includes("No published")) {
    target.textContent = "The published Portfolio could not be loaded. Please try again later.";
  }
});
