import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/cv-print.css";

import { getAdminAccess } from "../admin/auth";
import { loadCvData } from "../services/cvRepository";
import { initializeDocumentThemeControls } from "../themes/themeController";
import { renderDynamicCv } from "./renderDynamicCv";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("CV app container was not found.");

const initialize = async (): Promise<void> => {
  const wantsPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  const adminPreview = wantsPreview && await getAdminAccess() === "allowed";
  const data = await loadCvData({ adminPreview, preferRelease: !adminPreview });

  document.documentElement.lang = "en";
  document.title = `${data.content.profile.name} | English CV`;
  app.innerHTML = renderDynamicCv(data, adminPreview);

  const documentRoot = app.querySelector<HTMLElement>("#cv-document");
  const themeControls = app.querySelector<HTMLElement>("[data-theme-controls]");
  if (!documentRoot || !themeControls) throw new Error("CV theme elements were not found.");

  initializeDocumentThemeControls({
    documentRoot,
    controlsRoot: themeControls,
    defaultThemeId: data.content.themeId,
    storageKey: "hdl.cv.document-theme.v1",
  });

  app.querySelector<HTMLButtonElement>("[data-print-cv]")?.addEventListener("click", () => window.print());

  const photo = app.querySelector<HTMLImageElement>("[data-profile-photo]");
  const updatePhotoState = (): void => {
    photo?.closest(".cv-photo")?.classList.toggle("cv-photo--loaded", Boolean(photo.complete && photo.naturalWidth > 0));
  };
  photo?.addEventListener("load", updatePhotoState);
  photo?.addEventListener("error", updatePhotoState);
  updatePhotoState();

  const checkPageOverflow = (): void => {
    const pages = [...app.querySelectorAll<HTMLElement>("[data-cv-page]")];
    const overflowingPages = pages.filter((page) => page.scrollHeight > page.clientHeight + 1 || page.scrollWidth > page.clientWidth + 1);
    const status = app.querySelector<HTMLElement>("[data-cv-status]");
    pages.forEach((page) => page.classList.toggle("cv-page--overflow", overflowingPages.includes(page)));
    if (status) {
      status.textContent = overflowingPages.length ? `Overflow on page ${overflowingPages.map((page) => pages.indexOf(page) + 1).join(", ")}` : "Ready · 2 pages";
      status.classList.toggle("cv-toolbar__status--warning", Boolean(overflowingPages.length));
    }
  };

  requestAnimationFrame(checkPageOverflow);
  document.fonts.ready.then(checkPageOverflow).catch(checkPageOverflow);
  window.addEventListener("beforeprint", checkPageOverflow);
};

void initialize().catch((error: unknown) => {
  app.innerHTML = '<main class="cv-load-error"><h1>CV could not be loaded</h1><p data-cv-load-error></p></main>';
  const target = app.querySelector<HTMLElement>("[data-cv-load-error]");
  if (target) target.textContent = error instanceof Error ? error.message : "Unknown error";
});
