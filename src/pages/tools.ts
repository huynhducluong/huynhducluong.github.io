import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { portfolioRepository } from "../services/portfolioRepository";
import { renderToolCard } from "../site/renderers";
import { siteFooter, siteHeader } from "../site/shell";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const render = async (): Promise<void> => {
  const tools = await portfolioRepository.listPublishedTools();
  app.innerHTML = `${siteHeader("tools")}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">BIM automation</p><h1>Tools that remove repetitive work.</h1><p>Practical automation for infrastructure modeling, coordination and quality control.</p></div></section><section class="section"><div class="container">${tools.length ? `<div class="listing-grid">${tools.map((tool) => renderToolCard(tool, "en")).join("")}</div>` : `<p class="status-message">No published tools yet.</p>`}</div></section></main>${siteFooter()}`;
};

void render();
