import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/home.css";

import { profile } from "./data/profile";
import { experiences } from "./data/experience";
import { projects } from "./data/projects";
import { automationTools } from "./data/tools";
import type { LocalizedText } from "./types/career";

type Language = keyof LocalizedText;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container was not found.");
}

const copy = {
  en: {
    nav: ["Expertise", "Experience", "Projects", "Automation"],
    skip: "Skip to content",
    primaryNavigation: "Primary navigation",
    professionalOverview: "Professional overview",
    eyebrow: "BIM · Infrastructure · Automation",
    viewProjects: "View projects",
    contact: "Contact me",
    location: "Based in",
    focus: "Professional focus",
    specialization: "Specialization",
    specializationValue: "Infrastructure BIM",
    expertiseKicker: "Core expertise",
    expertiseTitle: "A practical combination of BIM coordination and automation.",
    experienceKicker: "Experience",
    experienceTitle: "Coordinating models, information and delivery workflows.",
    present: "Present",
    projectsKicker: "Selected work",
    projectsTitle: "Infrastructure projects developed around clear BIM outcomes.",
    project: "Project",
    automationKicker: "Automation",
    automationTitle: "Tools built to remove repetitive work from project delivery.",
    problem: "Problem",
    solution: "Solution",
    technologies: "Technologies",
    contactKicker: "Let’s work together",
    contactTitle: "Have an infrastructure or BIM automation challenge?",
    email: "Send an email",
    phone: "Call me",
    footer: "BIM coordination · Infrastructure · Automation",
    languageLabel: "Chuyển sang tiếng Việt",
  },
  vi: {
    nav: ["Chuyên môn", "Kinh nghiệm", "Dự án", "Tự động hóa"],
    skip: "Đi đến nội dung chính",
    primaryNavigation: "Điều hướng chính",
    professionalOverview: "Tổng quan chuyên môn",
    eyebrow: "BIM · Hạ tầng · Tự động hóa",
    viewProjects: "Xem dự án",
    contact: "Liên hệ",
    location: "Địa điểm",
    focus: "Định hướng chuyên môn",
    specialization: "Chuyên ngành",
    specializationValue: "BIM hạ tầng",
    expertiseKicker: "Năng lực cốt lõi",
    expertiseTitle: "Kết hợp thực tiễn giữa điều phối BIM và tự động hóa.",
    experienceKicker: "Kinh nghiệm",
    experienceTitle: "Điều phối mô hình, thông tin và quy trình bàn giao.",
    present: "Hiện tại",
    projectsKicker: "Dự án tiêu biểu",
    projectsTitle: "Các dự án hạ tầng hướng đến kết quả BIM rõ ràng.",
    project: "Dự án",
    automationKicker: "Tự động hóa",
    automationTitle: "Công cụ giúp loại bỏ công việc lặp lại trong quá trình triển khai dự án.",
    problem: "Vấn đề",
    solution: "Giải pháp",
    technologies: "Công nghệ",
    contactKicker: "Cùng hợp tác",
    contactTitle: "Bạn có bài toán về hạ tầng hoặc tự động hóa BIM?",
    email: "Gửi email",
    phone: "Gọi cho tôi",
    footer: "Điều phối BIM · Hạ tầng · Tự động hóa",
    languageLabel: "Switch to English",
  },
} as const;

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const localize = (value: LocalizedText, language: Language): string =>
  escapeHtml(value[language]);

const renderTags = (items: string[]): string =>
  items.map((item) => `<li class="tag">${escapeHtml(item)}</li>`).join("");

const formatDate = (date: string, language: Language): string => {
  const [year, month] = date.split("-").map(Number);

  if (!year || !month) {
    return escapeHtml(date);
  }

  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1)));
};

const renderPage = (language: Language): void => {
  const text = copy[language];
  const sortedProjects = [...projects].sort(
    (first, second) => first.displayOrder - second.displayOrder,
  );

  document.documentElement.lang = language;
  document.title = `${profile.name} | ${profile.professionalTitle[language]}`;

  app.innerHTML = `
    <a class="skip-link" href="#main-content">${text.skip}</a>

    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-logo" href="#top" aria-label="${escapeHtml(profile.name)}">
          HDL
        </a>

        <nav class="site-nav" aria-label="${text.primaryNavigation}">
          <ul class="site-nav__links">
            <li><a href="#expertise">${text.nav[0]}</a></li>
            <li><a href="#experience">${text.nav[1]}</a></li>
            <li><a href="#projects">${text.nav[2]}</a></li>
            <li><a href="#automation">${text.nav[3]}</a></li>
          </ul>

          <button
            class="language-toggle"
            type="button"
            aria-label="${text.languageLabel}"
            data-language-toggle
          >
            ${language === "en" ? "VI" : "EN"}
          </button>
        </nav>
      </div>
    </header>

    <main id="main-content">
      <section id="top" class="hero">
        <div class="container hero__layout">
          <div>
            <p class="hero__eyebrow">${text.eyebrow}</p>
            <h1 class="hero__name">${escapeHtml(profile.name)}</h1>
            <p class="hero__title">${localize(profile.professionalTitle, language)}</p>
            <p class="hero__summary">${localize(profile.summary, language)}</p>

            <div class="hero__actions">
              <a class="button" href="#projects">${text.viewProjects}</a>
              <a class="button button--secondary" href="mailto:${escapeHtml(profile.email)}">
                ${text.contact}
              </a>
            </div>
          </div>

          <aside class="hero__meta" aria-label="${text.professionalOverview}">
            <div class="hero__meta-item">
              <span class="hero__meta-label">${text.location}</span>
              <span class="hero__meta-value">${localize(profile.location, language)}</span>
            </div>
            <div class="hero__meta-item">
              <span class="hero__meta-label">${text.focus}</span>
              <span class="hero__meta-value">BIM · Revit · Civil 3D</span>
            </div>
            <div class="hero__meta-item">
              <span class="hero__meta-label">${text.specialization}</span>
              <span class="hero__meta-value">${text.specializationValue}</span>
            </div>
          </aside>
        </div>
      </section>

      <section id="expertise" class="section">
        <div class="container">
          <div class="section-heading">
            <p class="section-kicker">${text.expertiseKicker}</p>
            <h2 class="section-title">${text.expertiseTitle}</h2>
          </div>

          <div class="expertise-grid">
            ${profile.coreSkills
              .map(
                (skill, index) => `
                  <article class="expertise-card">
                    <span class="expertise-card__number">${String(index + 1).padStart(2, "0")}</span>
                    <h3 class="expertise-card__title">${escapeHtml(skill)}</h3>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section id="experience" class="section section--muted">
        <div class="container">
          <div class="section-heading">
            <p class="section-kicker">${text.experienceKicker}</p>
            <h2 class="section-title">${text.experienceTitle}</h2>
          </div>

          <div class="timeline">
            ${experiences
              .map(
                (experience) => `
                  <article class="timeline-card">
                    <div>
                      <p class="timeline-card__period">
                        ${formatDate(experience.startDate, language)} —
                        ${experience.endDate ? formatDate(experience.endDate, language) : text.present}
                      </p>
                      <p class="timeline-card__company">${escapeHtml(experience.company)}</p>
                    </div>
                    <div>
                      <h3 class="timeline-card__title">${localize(experience.position, language)}</h3>
                      <p class="timeline-card__location">${localize(experience.location, language)}</p>
                      <ul class="responsibility-list">
                        ${experience.responsibilities
                          .map((item) => `<li>${localize(item, language)}</li>`)
                          .join("")}
                      </ul>
                      <ul class="tag-list" aria-label="${text.technologies}">
                        ${renderTags(experience.technologies)}
                      </ul>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section id="projects" class="section">
        <div class="container">
          <div class="section-heading">
            <p class="section-kicker">${text.projectsKicker}</p>
            <h2 class="section-title">${text.projectsTitle}</h2>
          </div>

          <div class="project-grid">
            ${sortedProjects
              .map(
                (project, index) => `
                  <article class="project-card">
                    <span class="project-card__index">
                      ${text.project} ${String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 class="project-card__title">${localize(project.name, language)}</h3>
                    <p class="project-card__meta">
                      ${localize(project.role, language)} · ${localize(project.location, language)}
                    </p>
                    <p class="project-card__summary">${localize(project.summary, language)}</p>
                    <ul class="tag-list" aria-label="${text.technologies}">
                      ${renderTags(project.technologies)}
                    </ul>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section id="automation" class="section section--muted">
        <div class="container">
          <div class="section-heading">
            <p class="section-kicker">${text.automationKicker}</p>
            <h2 class="section-title">${text.automationTitle}</h2>
          </div>

          <div class="tool-grid">
            ${automationTools
              .map(
                (tool) => `
                  <article class="tool-card">
                    <h3 class="tool-card__title">${escapeHtml(tool.name)}</h3>
                    <div class="tool-card__copy">
                      <span class="tool-card__label">${text.problem}</span>
                      <p>${localize(tool.problem, language)}</p>
                    </div>
                    <div class="tool-card__copy">
                      <span class="tool-card__label">${text.solution}</span>
                      <p>${localize(tool.solution, language)}</p>
                    </div>
                    <ul class="tag-list" aria-label="${text.technologies}">
                      ${renderTags(tool.technologies)}
                    </ul>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section contact">
        <div class="container contact__inner">
          <div>
            <p class="section-kicker">${text.contactKicker}</p>
            <h2 class="contact__title">${text.contactTitle}</h2>
          </div>
          <div class="contact__links">
            <a class="button" href="mailto:${escapeHtml(profile.email)}">${text.email}</a>
            <a class="button button--secondary" href="tel:${escapeHtml(profile.phone)}">${text.phone}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <p>© ${new Date().getFullYear()} ${escapeHtml(profile.name)}</p>
        <p>${text.footer}</p>
      </div>
    </footer>
  `;

  app.querySelector<HTMLButtonElement>("[data-language-toggle]")?.addEventListener(
    "click",
    () => renderPage(language === "en" ? "vi" : "en"),
  );
};

renderPage("en");
