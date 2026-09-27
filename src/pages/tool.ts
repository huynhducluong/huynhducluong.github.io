import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { portfolioRepository } from "../services/portfolioRepository";
import { renderMedia, renderTags } from "../site/renderers";
import { readSlug, siteFooter, siteHeader } from "../site/shell";
import { escapeHtml, localize } from "../shared/format";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const render = async (): Promise<void> => {
  const tool = await portfolioRepository.getPublishedTool(readSlug());
  if (!tool) {
    app.innerHTML = `${siteHeader("tools")}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">Not found</p><h1>This tool is unavailable.</h1><p>It may still be a draft, archived, or the link may be incorrect.</p></div></section></main>${siteFooter()}`;
    return;
  }
  document.title = `${tool.name} | Huynh Duc Luong`;
  app.innerHTML = `${siteHeader("tools")}<main id="main-content"><article><header class="detail-hero"><div class="container detail-hero__grid"><div><p class="section-kicker">BIM automation</p><h1>${escapeHtml(tool.name)}</h1><p class="detail-hero__summary">${localize(tool.solution, "en")}</p><ul class="tag-list">${renderTags(tool.technologies)}</ul></div>${renderMedia(tool.images[0], "en", "detail-hero__image")}</div></header><div class="container detail-body"><section><p class="section-kicker">Problem</p><h2>Why it was built</h2><p>${localize(tool.problem, "en")}</p></section><section><p class="section-kicker">Solution</p><h2>How it works</h2><p>${localize(tool.solution, "en")}</p></section>${tool.benefit ? `<section><p class="section-kicker">Benefit</p><h2>Delivery impact</h2><p>${localize(tool.benefit, "en")}</p></section>` : ""}</div></article></main>${siteFooter()}`;
};

void render();
