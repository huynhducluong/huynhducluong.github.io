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
import { profileName, type Language } from "../shared/format";
import type { PortfolioRuntimeData } from "../types/portfolio";
import type { StoredDocumentTheme } from "../types/theme";
import { renderPortfolio } from "./renderPortfolio";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

type PortfolioPreviewData = PortfolioRuntimeData & { previewLanguage?: Language };
interface PortfolioAppearancePreview {
  type: "hdl:portfolio-appearance-preview";
  theme: StoredDocumentTheme;
  imageOverlay: PortfolioRuntimeData["content"]["imageOverlay"];
}

const applyPortfolioAppearance = (
  documentRoot: HTMLElement,
  theme: StoredDocumentTheme,
  imageOverlay: PortfolioRuntimeData["content"]["imageOverlay"],
): void => {
  applyDocumentTheme(documentRoot, resolveDocumentTheme(theme));
  const overlayOpacity = Number(imageOverlay?.opacity);
  const normalizedOverlayOpacity = Number.isFinite(overlayOpacity)
    ? Math.min(1, Math.max(0, overlayOpacity))
    : 0.28;
  documentRoot.dataset.imageOverlay = imageOverlay?.enabled === false ? "off" : "on";
  documentRoot.style.setProperty("--portfolio-image-overlay-opacity", String(normalizedOverlayOpacity));
};

const render = (data: PortfolioRuntimeData, language: Language = "en"): void => {
  document.documentElement.lang = language;
  document.title = `${profileName(data.content.profile.name, language)} | Portfolio`;
  app.innerHTML = `<main class="portfolio-preview-shell portfolio-preview-shell--public"><div class="portfolio-document" id="portfolio-document">${renderPortfolio(data, language)}</div></main>`;
  const documentRoot = app.querySelector<HTMLElement>("#portfolio-document");
  if (!documentRoot) throw new Error("Portfolio document was not found.");
  applyPortfolioAppearance(documentRoot, data.content.theme, data.content.imageOverlay);
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
  const embeddedPreview = adminPreview && params.get("embedded") === "1";
  if (params.get("embedded") === "1") document.body.classList.add("document-embedded");
  if (embeddedPreview && params.get("scroll") === "internal") {
    document.documentElement.classList.add("document-preview-scroll");
    document.body.classList.add("document-preview-scroll");
  }
  if (embeddedPreview) {
    window.addEventListener("message", (event: MessageEvent<PortfolioAppearancePreview>) => {
      if (
        event.origin !== window.location.origin
        || event.source !== window.parent
        || event.data?.type !== "hdl:portfolio-appearance-preview"
      ) return;
      const documentRoot = app.querySelector<HTMLElement>("#portfolio-document");
      if (documentRoot) applyPortfolioAppearance(documentRoot, event.data.theme, event.data.imageOverlay);
    });
    previewReceiver?.activate((previewData) => render(previewData, previewData.previewLanguage ?? "en"));
    return;
  }
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
