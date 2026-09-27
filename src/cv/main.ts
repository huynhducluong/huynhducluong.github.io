import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/cv-print.css";

import { englishCvConfig } from "../config/cv.en";
import { initializeDocumentThemeControls } from "../themes/themeController";
import { renderCv } from "./renderCv";
import { validateCvConfig } from "./validateCv";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("CV app container was not found.");
}

validateCvConfig(englishCvConfig);

document.documentElement.lang = englishCvConfig.language;
document.title = "Huynh Duc Luong | English CV";
app.innerHTML = renderCv();

const documentRoot = app.querySelector<HTMLElement>("#cv-document");
const themeControls = app.querySelector<HTMLElement>("[data-theme-controls]");

if (!documentRoot || !themeControls) {
  throw new Error("CV theme elements were not found.");
}

initializeDocumentThemeControls({
  documentRoot,
  controlsRoot: themeControls,
  defaultThemeId: englishCvConfig.themeId,
  storageKey: "hdl.cv.document-theme.v1",
});

app.querySelector<HTMLButtonElement>("[data-print-cv]")?.addEventListener(
  "click",
  () => window.print(),
);

const photo = app.querySelector<HTMLImageElement>("[data-profile-photo]");

const updatePhotoState = (): void => {
  if (!photo) {
    return;
  }

  photo.closest(".cv-photo")?.classList.toggle(
    "cv-photo--loaded",
    photo.complete && photo.naturalWidth > 0,
  );
};

photo?.addEventListener("load", updatePhotoState);
photo?.addEventListener("error", updatePhotoState);
updatePhotoState();

const checkPageOverflow = (): void => {
  const pages = [...app.querySelectorAll<HTMLElement>("[data-cv-page]")];
  const overflowingPages = pages.filter(
    (page) =>
      page.scrollHeight > page.clientHeight + 1 ||
      page.scrollWidth > page.clientWidth + 1,
  );
  const status = app.querySelector<HTMLElement>("[data-cv-status]");

  pages.forEach((page) =>
    page.classList.toggle("cv-page--overflow", overflowingPages.includes(page)),
  );

  if (status) {
    status.textContent = overflowingPages.length
      ? "Content overflow detected"
      : "Ready to print";
    status.classList.toggle("cv-toolbar__status--warning", Boolean(overflowingPages.length));
  }

  if (overflowingPages.length) {
    console.warn("CV content exceeds the fixed A4 page area.", overflowingPages);
  }
};

requestAnimationFrame(checkPageOverflow);
document.fonts.ready.then(checkPageOverflow).catch(checkPageOverflow);
window.addEventListener("beforeprint", checkPageOverflow);
