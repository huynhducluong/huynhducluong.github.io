import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { portfolioRepository } from "../services/portfolioRepository";
import { renderProjectCard } from "../site/renderers";
import { siteFooter, siteHeader } from "../site/shell";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const render = async (): Promise<void> => {
  app.innerHTML = `${siteHeader("projects")}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">Selected work</p><h1>Infrastructure projects shaped by BIM coordination.</h1><p>Published project records only. Draft work remains private until it is explicitly published.</p></div></section><section class="section"><div class="container"><p class="status-message">Loading projects…</p></div></section></main>${siteFooter()}`;
  try {
    const projects = await portfolioRepository.listPublishedProjects();
    const content = projects.length
      ? `<div class="listing-grid">${projects.map((item) => renderProjectCard(item, "en")).join("")}</div>`
      : `<p class="status-message">No published projects yet.</p>`;
    app.querySelector(".section .container")!.innerHTML = content;
  } catch {
    app.querySelector(".section .container")!.innerHTML = `<p class="status-message status-message--error">Projects could not be loaded. Please try again later.</p>`;
  }
};

void render();
