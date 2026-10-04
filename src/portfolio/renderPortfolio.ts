import { assetUrl, escapeHtml, localize, type Language } from "../shared/format";
import type { PortfolioProject, PortfolioRuntimeData } from "../types/portfolio";

const copy = {
  en: {
    profile: "Profile",
    selectedWork: "Selected work",
    projectIndex: "Project index",
    noProjects: "No published projects have been selected for the Portfolio PDF.",
    imagePlaceholder: "Project image placeholder",
    projectFallback: "Project details will be updated after verification.",
    selectedAutomation: "Selected BIM automation",
    toolsTitle: "Tools built around real delivery constraints.",
    automation: "Automation",
    problem: "Problem",
    solution: "Solution",
  },
  vi: {
    profile: "Hồ sơ",
    selectedWork: "Dự án tiêu biểu",
    projectIndex: "Danh mục dự án",
    noProjects: "Chưa có dự án đã xuất bản nào được chọn cho Portfolio PDF.",
    imagePlaceholder: "Vị trí hình ảnh dự án",
    projectFallback: "Thông tin dự án sẽ được cập nhật sau khi xác minh.",
    selectedAutomation: "Tự động hóa BIM tiêu biểu",
    toolsTitle: "Các công cụ được xây dựng từ yêu cầu triển khai thực tế.",
    automation: "Tự động hóa",
    problem: "Vấn đề",
    solution: "Giải pháp",
  },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

const tags = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const image = (project: PortfolioProject, language: Language): string => {
  const media = project.images[0];
  if (!media) {
    return `<div class="portfolio-image-placeholder"><span>${copy[language].imagePlaceholder}</span></div>`;
  }
  const source = media.publicUrl ?? (/^https?:\/\//i.test(media.storagePath) ? media.storagePath : assetUrl(media.storagePath));
  return `<img class="portfolio-project-image" src="${escapeHtml(source)}" alt="${localized(media.alt, language)}">`;
};

const page = (content: string, className = ""): string =>
  `<section class="portfolio-page ${className}">${content}</section>`;

export const renderPortfolio = (data: PortfolioRuntimeData, language: Language = "en"): string => {
  const { content, projects, tools } = data;
  const text = copy[language];
  const { profile, skillGroups } = content;
  const profileInitials = profile.name.trim().split(/\s+/).slice(0, 3).map((part) => part[0] ?? "").join("").toUpperCase() || "HDL";
  const selectedProjects = projects
    .filter((project) => project.includeInPortfolio)
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const selectedTools = tools
    .filter((tool) => tool.includeInPortfolio)
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
      <p class="portfolio-kicker">${localized(content.kicker, language)}</p>
      <h1>${escapeHtml(content.title)}</h1>
      <div class="portfolio-cover__identity"><strong>${escapeHtml(profile.name)}</strong><span>${localized(profile.professionalTitle, language)}</span></div>
      <p class="portfolio-cover__year">${escapeHtml(content.year)}</p>
    </div>`, "portfolio-page--cover");

  const about = numbered(`
    <div class="portfolio-split">
      <aside class="portfolio-about__aside">
        <div class="portfolio-about__photo" data-portfolio-profile-photo-frame>
          <span aria-hidden="true">${escapeHtml(profileInitials)}</span>
          <img src="${escapeHtml(assetUrl(profile.photoPath))}" alt="${escapeHtml(profile.name)}" data-portfolio-profile-photo>
        </div>
        <p class="portfolio-kicker">${text.profile}</p>
        <h2>${escapeHtml(profile.name)}</h2>
        <p>${localized(profile.professionalTitle, language)}</p>
        <address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span><span>${localized(profile.location, language)}</span></address>
      </aside>
      <div class="portfolio-about__main">
        <p class="portfolio-kicker">${localized(content.aboutKicker, language)}</p>
        <h2>${localized(content.aboutHeading, language)}</h2>
        <p class="portfolio-lead">${localized(profile.summary, language)}</p>
        <div class="portfolio-skill-grid">${skillGroups.map((group) => `<section><h3>${localized(group.title, language)}</h3><ul>${group.items.map((item) => `<li>${localized(item.label, language)}</li>`).join("")}</ul></section>`).join("")}</div>
      </div>
    </div>`, "portfolio-page--about");

  const contents = numbered(`
    <div class="portfolio-page__inner">
      <p class="portfolio-kicker">${text.selectedWork}</p>
      <h2 class="portfolio-title">${text.projectIndex}</h2>
      ${selectedProjects.length ? `<ol class="portfolio-index">${selectedProjects.map((project, index) => {
        const meta = [localized(project.location, language), project.role ? localized(project.role, language) : ""].filter(Boolean).join(" · ");
        return `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${localized(project.name, language)}</strong>${meta ? `<small>${meta}</small>` : ""}</div></li>`;
      }).join("")}</ol>` : `<p class="portfolio-empty">${text.noProjects}</p>`}
    </div>`, "portfolio-page--index");

  const projectPages = selectedProjects.map((project, index) => numbered(`
    <div class="portfolio-project__visual">${image(project, language)}<span class="portfolio-project__index">${String(index + 1).padStart(2, "0")}</span></div>
    <div class="portfolio-project__content">
      ${localized(project.location, language) ? `<p class="portfolio-kicker">${localized(project.location, language)}</p>` : ""}
      <h2>${localized(project.name, language)}</h2>
      ${project.role ? `<p class="portfolio-project__role">${localized(project.role, language)}</p>` : ""}
      ${project.summary ? `<p class="portfolio-project__summary">${localized(project.summary, language)}</p>` : `<p class="portfolio-project__summary">${text.projectFallback}</p>`}
      ${project.responsibilities.length ? `<ul class="portfolio-responsibilities">${project.responsibilities.slice(0, 5).map((point) => `<li>${localized(point.text, language)}</li>`).join("")}</ul>` : ""}
      <ul class="portfolio-tags">${tags(project.technologies)}</ul>
    </div>`, `portfolio-page--project portfolio-page--${project.portfolioLayout}`)).join("");

  const toolPage = selectedTools.length ? numbered(`
    <div class="portfolio-page__inner">
      <p class="portfolio-kicker">${text.selectedAutomation}</p>
      <h2 class="portfolio-title">${text.toolsTitle}</h2>
      <div class="portfolio-tools">${selectedTools.map((tool) => `<article><span>${text.automation} ${String(tool.portfolioOrder).padStart(2, "0")}</span><h3>${escapeHtml(tool.name)}</h3><p><strong>${text.problem}</strong>${localized(tool.problem, language)}</p><p><strong>${text.solution}</strong>${localized(tool.solution, language)}</p><ul class="portfolio-tags">${tags(tool.technologies)}</ul></article>`).join("")}</div>
    </div>`, "portfolio-page--tools") : "";

  const closing = numbered(`
    <div class="portfolio-closing">
      <p class="portfolio-kicker">${localized(content.closingKicker, language)}</p>
      <h2>${localized(content.closingHeading, language)}</h2>
      <p>${localized(content.closingText, language)}</p>
      <div><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span></div>
    </div>`, "portfolio-page--closing");

  return cover + about + contents + projectPages + toolPage + closing;
};
