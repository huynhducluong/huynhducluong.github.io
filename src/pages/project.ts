import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/content.css";
import { loadPublishedWebsiteRelease } from "../services/websiteRepository";
import { renderMedia, renderTags } from "../site/renderers";
import { applyWebsiteTheme, readSlug, siteFooter, siteHeader } from "../site/shell";
import { escapeHtml, localize } from "../shared/format";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

const render = async (): Promise<void> => {
  const release = await loadPublishedWebsiteRelease();
  applyWebsiteTheme(release.content);
  const profile = release.professional.profile;
  const project = release.projects.find((item) => item.slug === readSlug()) ?? null;
  app.innerHTML = `${siteHeader(profile, release.content, "projects")}<main id="main-content"></main>${siteFooter(profile, release.content)}`;
  if (!project) {
    document.title = `Project not found | ${profile.name}`;
    app.querySelector("main")!.innerHTML = '<section class="page-hero"><div class="container"><p class="section-kicker">Not found</p><h1>This project is unavailable.</h1><p>It may not be part of the latest website release.</p><a class="button" href="../projects/">Back to projects</a></div></section>';
    return;
  }
  document.title = `${project.name.en} | ${profile.name}`;
  app.querySelector("main")!.innerHTML = `
    <article>
      <header class="detail-hero"><div class="container detail-hero__grid"><div><p class="section-kicker">${localize(project.location, "en")}</p><h1>${localize(project.name, "en")}</h1>${project.role ? `<p class="detail-hero__role">${localize(project.role, "en")}</p>` : ""}${project.summary ? `<p class="detail-hero__summary">${localize(project.summary, "en")}</p>` : ""}<ul class="tag-list">${renderTags(project.technologies)}</ul>${project.youtubeUrl ? `<div class="detail-hero__actions"><a class="button" href="${escapeHtml(project.youtubeUrl)}" target="_blank" rel="noopener noreferrer">Watch project video</a></div>` : ""}</div>${renderMedia(project.images[0], "en", "detail-hero__image")}</div></header>
      <div class="container detail-body">
        <section><p class="section-kicker">Contribution</p><h2>Responsibilities and delivery</h2>${project.responsibilities.length ? `<ul class="detail-list">${project.responsibilities.map((point) => `<li>${localize(point.text, "en")}</li>`).join("")}</ul>` : "<p>Detailed contribution information will be added after verification.</p>"}</section>
        ${project.challenge ? `<section><p class="section-kicker">Challenge</p><h2>Project context</h2><p>${localize(project.challenge, "en")}</p></section>` : ""}
        ${project.approach ? `<section><p class="section-kicker">Approach</p><h2>BIM approach</h2><p>${localize(project.approach, "en")}</p></section>` : ""}
      </div>
    </article>`;
};

void render().catch(() => {
  app.innerHTML = '<main class="website-load-state"><h1>Project unavailable</h1><p>Please try again later.</p></main>';
});
