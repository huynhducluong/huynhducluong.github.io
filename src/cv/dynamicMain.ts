import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/cv-print.css";
import "../styles/document-print-preview.css";

import { getAdminAccess, requireAdminAccess } from "../admin/auth";
import { loadCvData } from "../services/cvRepository";
import { getProfileDocument } from "../services/profileDocumentRepository";
import { applyDocumentTheme, resolveDocumentTheme } from "../themes/documentThemes";
import type { CvRuntimeData } from "../types/cvContent";
import { createPreviewReceiver } from "../shared/previewProtocol";
import { profileName, type Language } from "../shared/format";
import { validateProfileDocument } from "../shared/profileDocumentValidation";
import {
  bindDocumentPrintButton,
  renderDocumentPrintStatus,
  renderDocumentPrintToolbar,
  updateDocumentPrintStatus,
} from "../shared/documentPrintPreview";
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

const checkOverflow = (): number => {
  const pages = [...app.querySelectorAll<HTMLElement>("[data-cv-page]")];
  const overflowing = pages.filter((page) => page.scrollHeight > page.clientHeight + 1 || page.scrollWidth > page.clientWidth + 1);
  pages.forEach((page) => page.classList.toggle("cv-page--overflow", overflowing.includes(page)));
  return overflowing.length;
};

const renderPrintPreviewChrome = (documentId: string, internalTitle: string, status: string, data: CvRuntimeData): void => {
  document.body.classList.add("document-print-preview", "document-print-preview--portrait");
  const pageCount = app.querySelectorAll("[data-cv-page]").length || 2;
  app.insertAdjacentHTML("afterbegin", [
    renderDocumentPrintToolbar({
      backHref: `${import.meta.env.BASE_URL}admin/?view=cv&item=${encodeURIComponent(documentId)}`,
      backLabel: "CVs",
      state: status,
      title: internalTitle,
      meta: `A4 portrait · ${pageCount} pages · Version ${data.content.version}`,
    }),
    renderDocumentPrintStatus({ kind: "checking", title: "Checking PDF readiness…", detail: "Verifying required content and fixed A4 page boundaries." }),
  ].join(""));

  const readiness = (): string[] => [
    ...validateProfileDocument("cv", data),
    ...(checkOverflow() ? ["Content exceeds one or more fixed A4 page boundaries."] : []),
  ];
  const updateReadiness = (): boolean => {
    const issues = readiness();
    updateDocumentPrintStatus(app, issues.length
      ? { kind: "error", title: "PDF export needs attention", detail: issues.join(" ") }
      : { kind: "success", title: `Ready for ${pageCount}-page A4 PDF`, detail: `Version ${data.content.version} · selectable text · saved theme` });
    return !issues.length;
  };
  bindDocumentPrintButton(app, updateReadiness);
  requestAnimationFrame(updateReadiness);
  document.fonts.ready.then(updateReadiness).catch(updateReadiness);
  window.addEventListener("beforeprint", updateReadiness);
};

const initialize = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const printMode = params.get("mode") === "print";
  if (printMode) {
    if (!await requireAdminAccess()) return;
    const documentId = params.get("document");
    if (!documentId) throw new Error("A CV document ID is required for print preview.");
    const document = await getProfileDocument<CvRuntimeData>("cv", documentId);
    if (!document?.draftPayload) throw new Error("The selected CV draft could not be loaded.");
    const language: Language = params.get("lang") === "vi" ? "vi" : "en";
    render(document.draftPayload, language);
    renderPrintPreviewChrome(document.id, document.internalTitle, document.status, document.draftPayload);
    return;
  }
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
  const printMode = new URLSearchParams(window.location.search).get("mode") === "print";
  app.innerHTML = '<main class="cv-load-error"><h1>CV is not available</h1><p data-cv-load-error></p></main>';
  const target = app.querySelector<HTMLElement>("[data-cv-load-error]");
  if (target) target.textContent = printMode
    ? error instanceof Error ? error.message : "The CV print preview could not be loaded."
    : error instanceof Error && !error.message.includes("No published") ? "The published CV could not be loaded. Please try again later." : "The owner has not published a CV release yet.";
});
