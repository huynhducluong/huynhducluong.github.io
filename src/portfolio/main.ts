import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/cv-screen.css";
import "../styles/portfolio-screen.css";
import "../styles/portfolio-print.css";
import { portfolioRepository } from "../services/portfolioRepository";
import { initializeDocumentThemeControls } from "../themes/themeController";
import { documentThemes } from "../themes/documentThemes";
import { renderPortfolio } from "./renderPortfolio";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const themeOptions = documentThemes
  .map((theme) => `<option value="${theme.id}">${theme.name}</option>`)
  .join("");

app.innerHTML = `
  <a class="cv-skip-link" href="#portfolio-document">Skip to portfolio</a>
  <header class="cv-toolbar" data-toolbar>
    <div class="cv-toolbar__inner">
      <a class="cv-toolbar__back" href="${import.meta.env.BASE_URL}">← Website</a>
      <div class="cv-toolbar__title"><strong>English Portfolio</strong><span>A4 landscape · selectable text</span></div>
      <span class="cv-toolbar__status" data-status>Loading published content…</span>
      <details class="cv-theme-panel" data-theme-controls>
        <summary>Brand colors</summary>
        <div class="cv-theme-panel__body">
          <div class="cv-theme-panel__heading"><strong>Document theme</strong><span>Saved locally for the next PDF export.</span></div>
          <label class="cv-theme-field">Preset<select data-theme-preset>${themeOptions}<option value="custom">Custom</option></select></label>
          <div class="cv-theme-color-grid">
            <label class="cv-theme-field">Primary<input type="color" data-theme-primary value="#087fb6"></label>
            <label class="cv-theme-field">Accent<input type="color" data-theme-accent value="#14a8d6"></label>
          </div>
          <p class="cv-theme-panel__feedback" data-theme-feedback></p>
          <button class="cv-theme-reset" type="button" data-theme-reset>Reset theme</button>
        </div>
      </details>
      <button class="cv-print-button" type="button" data-print disabled>Print / Save PDF</button>
    </div>
  </header>
  <main class="portfolio-preview-shell">
    <div class="portfolio-document" id="portfolio-document" aria-busy="true"><p class="portfolio-loading">Preparing portfolio…</p></div>
  </main>`;

const documentRoot = app.querySelector<HTMLElement>("#portfolio-document")!;
const controlsRoot = app.querySelector<HTMLElement>("[data-theme-controls]")!;
const status = app.querySelector<HTMLElement>("[data-status]")!;
const printButton = app.querySelector<HTMLButtonElement>("[data-print]")!;

initializeDocumentThemeControls({
  documentRoot,
  controlsRoot,
  defaultThemeId: "personal-blue",
  storageKey: "hdl-portfolio-document-theme",
});

const waitForImages = async (): Promise<void> => {
  const images = [...documentRoot.querySelectorAll<HTMLImageElement>("img")];
  await Promise.all(images.map(async (image) => {
    if (image.complete) return;
    await new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
};

const initialize = async (): Promise<void> => {
  try {
    const [projects, tools] = await Promise.all([
      portfolioRepository.listPublishedProjects(),
      portfolioRepository.listPublishedTools(),
    ]);
    documentRoot.innerHTML = renderPortfolio(projects, tools);
    documentRoot.setAttribute("aria-busy", "false");
    await waitForImages();
    status.textContent = `${documentRoot.querySelectorAll(".portfolio-page").length} pages ready`;
    printButton.disabled = false;
  } catch {
    status.textContent = "Portfolio could not be loaded";
    status.classList.add("cv-toolbar__status--warning");
    documentRoot.innerHTML = '<p class="portfolio-loading">Portfolio content is unavailable. Please try again later.</p>';
  }
};

printButton.addEventListener("click", () => window.print());
void initialize();
