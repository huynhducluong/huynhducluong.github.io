import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/cv-print.css";

import { getAdminAccess } from "../admin/auth";
import { loadCvData } from "../services/cvRepository";
import { applyDocumentTheme, resolveDocumentTheme } from "../themes/documentThemes";
import type { CvRuntimeData } from "../types/cvContent";
import { createPreviewReceiver } from "../shared/previewProtocol";
import { profileName, type Language } from "../shared/format";
import { renderDynamicCv } from "./renderDynamicCv";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("CV app container was not found.");

type CvPreviewData = CvRuntimeData & { previewLanguage?: Language };

const render = (data: CvRuntimeData, language: Language = "en"): void => {
  document.documentElement.lang = language;
  document.title = `${profileName(data.content.profile.name, language)} | ${language === "vi" ? "Vietnamese" : "English"} CV`;
  app.innerHTML = renderDynamicCv(data, false, language);
  app.querySelector(".cv-toolbar")?.remove();
  app.querySelector(".cv-skip-link")?.remove();
  const documentRoot = app.querySelector<HTMLElement>("#cv-document");
  if (!documentRoot) throw new Error("CV document was not found.");
  applyDocumentTheme(documentRoot, resolveDocumentTheme(data.content.theme, data.content.themeId));

  const photo = app.querySelector<HTMLImageElement>("[data-profile-photo]");
  const updatePhoto = (): void => {
    photo?.closest(".cv-photo")?.classList.toggle("cv-photo--loaded", Boolean(photo.complete && photo.naturalWidth > 0));
  };
  photo?.addEventListener("load", updatePhoto);
  photo?.addEventListener("error", updatePhoto);
  updatePhoto();
};

const checkOverflow = (): void => {
  const pages = [...app.querySelectorAll<HTMLElement>("[data-cv-page]")];
  pages.forEach((page) => page.classList.toggle("cv-page--overflow", page.scrollHeight > page.clientHeight + 1 || page.scrollWidth > page.clientWidth + 1));
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const wantsPreview = params.get("preview") === "1";
  const previewReceiver = wantsPreview ? createPreviewReceiver<CvPreviewData>("cv") : null;
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  const embeddedPreview = adminPreview && params.get("embedded") === "1";
  if (params.get("embedded") === "1") document.body.classList.add("document-embedded");
  if (embeddedPreview) {
    previewReceiver?.activate((previewData) => {
      render(previewData, previewData.previewLanguage ?? "en");
      requestAnimationFrame(checkOverflow);
    });
    return;
  }
  const data = await loadCvData({ adminPreview, preferRelease: !adminPreview });
  render(data);
  requestAnimationFrame(checkOverflow);
  document.fonts.ready.then(checkOverflow).catch(checkOverflow);
  window.addEventListener("beforeprint", checkOverflow);
  if (adminPreview) {
    previewReceiver?.activate((previewData) => {
      render(previewData, previewData.previewLanguage ?? "en");
      requestAnimationFrame(checkOverflow);
    });
  } else {
    previewReceiver?.disconnect();
  }
};

void initialize().catch((error: unknown) => {
  app.innerHTML = '<main class="cv-load-error"><h1>CV is not available</h1><p data-cv-load-error></p></main>';
  const target = app.querySelector<HTMLElement>("[data-cv-load-error]");
  if (target) target.textContent = error instanceof Error && !error.message.includes("No published") ? "The published CV could not be loaded. Please try again later." : "The owner has not published a CV release yet.";
});
