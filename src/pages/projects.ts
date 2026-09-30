import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { loadPublishedWebsiteRelease } from "../services/websiteRepository";
import { renderProjectCard } from "../site/renderers";
import { applyWebsiteTheme, siteFooter, siteHeader } from "../site/shell";
import { escapeHtml, localize } from "../shared/format";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const render = async (): Promise<void> => {
  const release = await loadPublishedWebsiteRelease();
  applyWebsiteTheme(release.content);
  const profile = release.professional.profile;
  const content = release.projects.length
    ? `<div class="listing-grid">${release.projects.map((item) => renderProjectCard(item, "en")).join("")}</div>`
    : '<p class="status-message">No projects are included in the latest website release.</p>';
  const page = release.content.projectsPage;
  document.title = `${localize(page.title, "en")} | ${profile.name}`;
  app.innerHTML = `${siteHeader(profile, release.content, "projects")}<main id="main-content"><section class="page-hero"><div class="container"><p class="section-kicker">${escapeHtml(localize(page.kicker, "en"))}</p><h1>${escapeHtml(localize(page.title, "en"))}</h1><p>${escapeHtml(localize(page.description, "en"))}</p></div></section><section class="section"><div class="container">${content}</div></section></main>${siteFooter(profile, release.content)}`;
};

void render().catch(() => {
  app.innerHTML = '<main class="website-load-state"><h1>Projects unavailable</h1><p>Please try again later.</p></main>';
});
