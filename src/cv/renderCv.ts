import { englishCvConfig } from "../config/cv.en";
import { automationTools } from "../data/tools";
import { education } from "../data/education";
import { experiences } from "../data/experience";
import { languageSkills } from "../data/languages";
import { profile } from "../data/profile";
import { projects } from "../data/projects";
import { skillGroups } from "../data/skills";
import {
  assetUrl,
  escapeHtml,
  formatNumericDate,
  localize,
} from "../shared/format";
import type { Project } from "../types/career";
import type { CvProjectSelection } from "../types/documents";
import { documentThemes } from "../themes/documentThemes";
import { findRequired } from "./validateCv";

const language = englishCvConfig.language;

const renderThemeOptions = (): string =>
  documentThemes
    .map(
      (theme) =>
        `<option value="${escapeHtml(theme.id)}"${
          theme.id === englishCvConfig.themeId ? " selected" : ""
        }>${escapeHtml(theme.name)}</option>`,
    )
    .join("");

const renderSectionHeading = (title: string): string =>
  `<h2 class="cv-section-heading">${escapeHtml(title)}</h2>`;

const formatRange = (
  startDate: string | undefined,
  endDate: string | null | undefined,
): string => {
  if (!startDate) {
    return "";
  }

  return `${formatNumericDate(startDate)} - ${
    endDate === null ? "Present" : endDate ? formatNumericDate(endDate) : ""
  }`;
};

const renderEducation = (): string =>
  englishCvConfig.pages[0].educationIds
    .map((id) => {
      const item = findRequired(education, id, "education");
      return `
        <article class="cv-sidebar-entry">
          <h3>${localize(item.field, language)}</h3>
          <p>${localize(item.institution, language)}</p>
          ${
            item.classification
              ? `<p class="cv-sidebar-entry__meta">${localize(item.classification, language)}</p>`
              : ""
          }
          <p class="cv-sidebar-entry__meta">${escapeHtml(item.startDate)} - ${escapeHtml(item.endDate)}</p>
        </article>
      `;
    })
    .join("");

const renderSkillGroups = (): string =>
  englishCvConfig.pages[0].skillGroupIds
    .map((id) => {
      const group = findRequired(skillGroups, id, "skill group");
      return `
        <section class="cv-sidebar-section">
          ${renderSectionHeading(localize(group.title, language))}
          <ul class="cv-sidebar-list">
            ${group.items
              .map((item) => `<li>${localize(item.label, language)}</li>`)
              .join("")}
          </ul>
        </section>
      `;
    })
    .join("");

const renderLanguages = (): string => {
  const items = englishCvConfig.pages[0].languageIds.map((id) =>
    findRequired(languageSkills, id, "language"),
  );

  return `
    <ul class="cv-sidebar-list cv-sidebar-list--compact">
      ${items
        .map(
          (item) =>
            `<li>${localize(item.name, language)}${
              item.proficiency
                ? ` - ${localize(item.proficiency, language)}`
                : ""
            }</li>`,
        )
        .join("")}
    </ul>
  `;
};

const renderEmployment = (): string =>
  englishCvConfig.pages[0].employmentIds
    .map((id) => {
      const experience = findRequired(experiences, id, "experience");
      return `
        <li class="cv-employment">
          <strong>${escapeHtml(experience.company)}</strong>
          <span>${formatRange(experience.startDate, experience.endDate)}</span>
        </li>
      `;
    })
    .join("");

const selectResponsibilities = (
  project: Project,
  selection: CvProjectSelection,
): Project["responsibilities"] =>
  selection.responsibilityIds.map((id) =>
    findRequired(project.responsibilities, id, "responsibility"),
  );

const renderProjectExperience = (
  selection: CvProjectSelection,
  compact = false,
): string => {
  const project = findRequired(projects, selection.projectId, "project");
  const responsibilities = selectResponsibilities(project, selection);

  return `
    <article class="cv-experience-item${compact ? " cv-experience-item--compact" : ""}">
      <p class="cv-experience-item__date">
        ${formatRange(project.startDate, project.endDate)}
      </p>
      <div class="cv-experience-item__content">
        ${
          project.role
            ? `<h3>${localize(project.role, language)}</h3>`
            : ""
        }
        <p class="cv-experience-item__project">
          ${localize(project.name, language)}, ${localize(project.location, language)}
        </p>
        ${
          selection.showSummary && project.summary
            ? `<p class="cv-experience-item__summary">${localize(project.summary, language)}</p>`
            : ""
        }
        <ul class="cv-bullet-list">
          ${responsibilities
            .map((item) => `<li>${localize(item.text, language)}</li>`)
            .join("")}
        </ul>
      </div>
    </article>
  `;
};

const renderSelectedProjects = (): string =>
  englishCvConfig.pages[1].selectedProjectIds
    .map((id) => {
      const project = findRequired(projects, id, "project");
      return `
        <li>
          <span>${localize(project.name, language)}</span>
          <small>${project.year ?? ""}${
            project.location.en !== "Viet Nam"
              ? " · " + localize(project.location, language)
              : ""
          }</small>
        </li>
      `;
    })
    .join("");

const renderAutomationTools = (): string =>
  englishCvConfig.pages[1].automationToolIds
    .map((id) => {
      const tool = findRequired(automationTools, id, "automation tool");
      return `
        <article class="cv-tool">
          <h3>${escapeHtml(tool.name)}</h3>
          <p>${localize(tool.solution, language)}</p>
          <ul class="cv-tool__technologies">
            ${tool.technologies
              .map((technology) => `<li>${escapeHtml(technology)}</li>`)
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");

const renderSidebar = (): string => `
  <aside class="cv-sidebar">
    <div class="cv-photo">
      <div class="cv-photo__placeholder" aria-hidden="true">HDL</div>
      <img
        class="cv-photo__image"
        src="${escapeHtml(assetUrl(profile.photoPath))}"
        alt="Portrait of ${escapeHtml(profile.name)}"
        data-profile-photo
      >
    </div>

    <section class="cv-sidebar-section">
      ${renderSectionHeading("Contact")}
      <address class="cv-contact">
        <div><strong>Phone</strong><a href="tel:${escapeHtml(profile.phone)}">${escapeHtml(profile.phone)}</a></div>
        <div><strong>Email</strong><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></div>
        <div><strong>Address</strong><span>${localize(profile.location, language)}</span></div>
      </address>
    </section>

    <section class="cv-sidebar-section">
      ${renderSectionHeading("Education")}
      ${renderEducation()}
    </section>

    ${renderSkillGroups()}

    <section class="cv-sidebar-section">
      ${renderSectionHeading("Language")}
      ${renderLanguages()}
    </section>

    <section class="cv-sidebar-section cv-sidebar-section--employment">
      ${renderSectionHeading("Experience")}
      <ul class="cv-employment-list">${renderEmployment()}</ul>
    </section>
  </aside>
`;

const renderPageOne = (): string => {
  const page = englishCvConfig.pages[0];

  return `
    <section class="cv-page cv-page--one" aria-label="CV page 1 of 2" data-cv-page>
      ${renderSidebar()}
      <main class="cv-page-one-main">
        <header class="cv-identity">
          <p class="cv-identity__name">${escapeHtml(profile.name)}</p>
          <h1>${localize(profile.professionalTitle, language)}</h1>
        </header>

        <section class="cv-main-section cv-summary">
          ${renderSectionHeading("Professional Summary")}
          <p>${localize(profile.summary, language)}</p>
        </section>

        <section class="cv-main-section cv-professional-experience">
          ${renderSectionHeading("Professional Experience")}
          <div class="cv-experience-list">
            ${page.projectExperience
              .map((selection) => renderProjectExperience(selection))
              .join("")}
          </div>
        </section>
      </main>
      <span class="cv-page-accent cv-page-accent--top" aria-hidden="true"></span>
      <span class="cv-page-accent cv-page-accent--middle" aria-hidden="true"></span>
      <span class="cv-page-accent cv-page-accent--bottom" aria-hidden="true"></span>
    </section>
  `;
};

const renderPageTwo = (): string => {
  const page = englishCvConfig.pages[1];

  return `
    <section class="cv-page cv-page--two" aria-label="CV page 2 of 2" data-cv-page>
      <header class="cv-page-two-header">
        <div class="cv-page-two-header__identity">
          <p>${escapeHtml(profile.name)}</p>
          <span>${localize(profile.professionalTitle, language)}</span>
        </div>
        <div class="cv-page-two-header__title">
          <span>Experience · Projects · Automation</span>
          <strong>Selected professional record</strong>
        </div>
      </header>

      <main class="cv-page-two-main">
        <section class="cv-main-section cv-professional-experience">
          ${renderSectionHeading("Professional Experience")}
          <div class="cv-experience-list cv-experience-list--page-two">
            ${page.projectExperience
              .map((selection) => renderProjectExperience(selection, true))
              .join("")}
          </div>
        </section>

        <div class="cv-page-two-bottom">
          <section class="cv-main-section cv-selected-projects">
            ${renderSectionHeading("Selected Projects")}
            <ul>${renderSelectedProjects()}</ul>
          </section>

          <section class="cv-main-section cv-selected-tools">
            ${renderSectionHeading("Selected BIM Automation Tools")}
            ${renderAutomationTools()}
          </section>
        </div>
      </main>
      <span class="cv-page-accent cv-page-accent--top" aria-hidden="true"></span>
      <span class="cv-page-accent cv-page-accent--bottom" aria-hidden="true"></span>
    </section>
  `;
};

export const renderCv = (): string => `
  <a class="cv-skip-link" href="#cv-document">Skip to CV</a>

  <header class="cv-toolbar" aria-label="CV actions">
    <div class="cv-toolbar__inner">
      <a class="cv-toolbar__back" href="${import.meta.env.BASE_URL}">Back to portfolio</a>
      <div class="cv-toolbar__title">
        <strong>English CV</strong>
        <span>2-page A4 preview</span>
      </div>
      <details class="cv-theme-panel" data-theme-controls>
        <summary>Customize theme</summary>
        <div class="cv-theme-panel__body">
          <div class="cv-theme-panel__heading">
            <strong>Document colors</strong>
            <span>Applies to CV and PDF only</span>
          </div>
          <label class="cv-theme-field">
            <span>Preset</span>
            <select data-theme-preset>
              ${renderThemeOptions()}
              <option value="custom">Custom colors</option>
            </select>
          </label>
          <div class="cv-theme-color-grid">
            <label class="cv-theme-field">
              <span>Primary</span>
              <input
                type="color"
                value="#087fb6"
                aria-label="Primary document color"
                data-theme-primary
              >
            </label>
            <label class="cv-theme-field">
              <span>Accent</span>
              <input
                type="color"
                value="#14a8d6"
                aria-label="Accent document color"
                data-theme-accent
              >
            </label>
          </div>
          <p class="cv-theme-panel__feedback" data-theme-feedback aria-live="polite"></p>
          <button class="cv-theme-reset" type="button" data-theme-reset>
            Reset to default
          </button>
        </div>
      </details>
      <p class="cv-toolbar__status" data-cv-status aria-live="polite"></p>
      <button class="cv-print-button" type="button" data-print-cv>
        Print / Save PDF
      </button>
    </div>
  </header>

  <div class="cv-preview-shell">
    <div id="cv-document" class="cv-preview">
      ${renderPageOne()}
      ${renderPageTwo()}
    </div>
  </div>
`;
