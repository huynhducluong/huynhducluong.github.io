import { profile } from "../data/profile";
import { skillGroups } from "../data/skills";
import { assetUrl, escapeHtml, localize } from "../shared/format";
import type { PortfolioProject, PortfolioTool } from "../types/portfolio";

const tags = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const image = (project: PortfolioProject): string => {
  const media = project.images[0];
  if (!media) {
    return '<div class="portfolio-image-placeholder"><span>Project image placeholder</span></div>';
  }
  const source = media.publicUrl ?? (/^https?:\/\//i.test(media.storagePath) ? media.storagePath : assetUrl(media.storagePath));
  return `<img class="portfolio-project-image" src="${escapeHtml(source)}" alt="${localize(media.alt, "en")}">`;
};

const page = (content: string, className = ""): string =>
  `<section class="portfolio-page ${className}">${content}</section>`;

export const renderPortfolio = (
  projects: PortfolioProject[],
  tools: PortfolioTool[],
): string => {
  const selectedProjects = projects
    .filter((project) => project.status === "published" && project.includeInPortfolio)
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const selectedTools = tools
    .filter((tool) => tool.status === "published" && tool.includeInPortfolio)
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const totalPages = 4 + selectedProjects.length + (selectedTools.length ? 1 : 0);
  let pageNumber = 0;
  const numbered = (content: string, className = ""): string => {
    pageNumber += 1;
    return page(`${content}<span class="portfolio-page-number">${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}</span>`, className);
  };

  const cover = numbered(`
    <div class="portfolio-cover__rail"></div>
    <div class="portfolio-cover__content">
      <p class="portfolio-kicker">BIM · Infrastructure · Automation</p>
      <h1>PORTFOLIO</h1>
      <div class="portfolio-cover__identity"><strong>${escapeHtml(profile.name)}</strong><span>${localize(profile.professionalTitle, "en")}</span></div>
      <p class="portfolio-cover__year">${new Date().getFullYear()}</p>
    </div>`, "portfolio-page--cover");

  const about = numbered(`
    <div class="portfolio-split">
      <aside class="portfolio-about__aside">
        <img src="${assetUrl(profile.photoPath)}" alt="${escapeHtml(profile.name)}">
        <p class="portfolio-kicker">Profile</p>
        <h2>${escapeHtml(profile.name)}</h2>
        <p>${localize(profile.professionalTitle, "en")}</p>
        <address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span><span>${localize(profile.location, "en")}</span></address>
      </aside>
      <div class="portfolio-about__main">
        <p class="portfolio-kicker">About me</p>
        <h2>Coordination built on clear information and practical automation.</h2>
        <p class="portfolio-lead">${localize(profile.summary, "en")}</p>
        <div class="portfolio-skill-grid">${skillGroups.map((group) => `<section><h3>${localize(group.title, "en")}</h3><ul>${group.items.map((item) => `<li>${localize(item.label, "en")}</li>`).join("")}</ul></section>`).join("")}</div>
      </div>
    </div>`, "portfolio-page--about");

  const contents = numbered(`
    <div class="portfolio-page__inner">
      <p class="portfolio-kicker">Selected work</p>
      <h2 class="portfolio-title">Project index</h2>
      ${selectedProjects.length ? `<ol class="portfolio-index">${selectedProjects.map((project, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${localize(project.name, "en")}</strong><small>${localize(project.location, "en")}${project.role ? ` · ${localize(project.role, "en")}` : ""}</small></div></li>`).join("")}</ol>` : '<p class="portfolio-empty">No published projects have been selected for the Portfolio PDF.</p>'}
    </div>`, "portfolio-page--index");

  const projectPages = selectedProjects.map((project, index) => numbered(`
    <div class="portfolio-project__visual">${image(project)}<span class="portfolio-project__index">${String(index + 1).padStart(2, "0")}</span></div>
    <div class="portfolio-project__content">
      <p class="portfolio-kicker">${localize(project.location, "en")}</p>
      <h2>${localize(project.name, "en")}</h2>
      ${project.role ? `<p class="portfolio-project__role">${localize(project.role, "en")}</p>` : ""}
      ${project.summary ? `<p class="portfolio-project__summary">${localize(project.summary, "en")}</p>` : '<p class="portfolio-project__summary">Project details will be updated after verification.</p>'}
      ${project.responsibilities.length ? `<ul class="portfolio-responsibilities">${project.responsibilities.slice(0, 5).map((point) => `<li>${localize(point.text, "en")}</li>`).join("")}</ul>` : ""}
      <ul class="portfolio-tags">${tags(project.technologies)}</ul>
    </div>`, `portfolio-page--project portfolio-page--${project.portfolioLayout}`)).join("");

  const toolPage = selectedTools.length ? numbered(`
    <div class="portfolio-page__inner">
      <p class="portfolio-kicker">Selected BIM automation</p>
      <h2 class="portfolio-title">Tools built around real delivery constraints.</h2>
      <div class="portfolio-tools">${selectedTools.map((tool) => `<article><span>Automation ${String(tool.portfolioOrder).padStart(2, "0")}</span><h3>${escapeHtml(tool.name)}</h3><p><strong>Problem</strong>${localize(tool.problem, "en")}</p><p><strong>Solution</strong>${localize(tool.solution, "en")}</p><ul class="portfolio-tags">${tags(tool.technologies)}</ul></article>`).join("")}</div>
    </div>`, "portfolio-page--tools") : "";

  const closing = numbered(`
    <div class="portfolio-closing">
      <p class="portfolio-kicker">Thank you</p>
      <h2>Let’s build clearer BIM workflows.</h2>
      <p>Infrastructure BIM coordination · Model quality · Automation</p>
      <div><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span></div>
    </div>`, "portfolio-page--closing");

  return cover + about + contents + projectPages + toolPage + closing;
};
