import { documentThemes } from "../themes/documentThemes";
import { assetUrl, escapeHtml, formatDegreeClassification, formatNumericDate, localize, type Language } from "../shared/format";
import type { ContentPoint } from "../types/career";
import type { CvRuntimeData, CvRuntimeProject } from "../types/cvContent";
import { orderedCvBackground } from "./backgroundOrder";

const copy = {
  en: {
    contact: "Contact",
    phone: "Phone",
    email: "Email",
    address: "Address",
    education: "Education",
    language: "Language",
    experience: "Experience",
    professionalSummary: "Professional Summary",
    professionalExperience: "Professional Experience",
    selectedProjects: "Selected Projects",
    selectedTools: "Selected BIM Automation Tools",
    pageTwoTitle: "Experience · Projects · Automation",
    pageTwoSubtitle: "Selected professional record",
    present: "Present",
  },
  vi: {
    contact: "Liên hệ",
    phone: "Điện thoại",
    email: "Email",
    address: "Địa chỉ",
    education: "Học vấn",
    language: "Ngôn ngữ",
    experience: "Kinh nghiệm",
    professionalSummary: "Tóm tắt chuyên môn",
    professionalExperience: "Kinh nghiệm chuyên môn",
    selectedProjects: "Dự án tiêu biểu",
    selectedTools: "Công cụ tự động hóa BIM tiêu biểu",
    pageTwoTitle: "Kinh nghiệm · Dự án · Tự động hóa",
    pageTwoSubtitle: "Hồ sơ chuyên môn tiêu biểu",
    present: "Hiện tại",
  },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

const renderThemeOptions = (themeId: string): string => documentThemes.map((theme) =>
  `<option value="${escapeHtml(theme.id)}"${theme.id === themeId ? " selected" : ""}>${escapeHtml(theme.name)}</option>`,
).join("");

const heading = (title: string): string => `<h2 class="cv-section-heading">${escapeHtml(title)}</h2>`;

const formatRange = (startDate: string | undefined, endDate: string | null | undefined, language: Language): string => {
  if (!startDate) return "";
  return `${formatNumericDate(startDate)} - ${endDate === null ? copy[language].present : endDate ? formatNumericDate(endDate) : ""}`;
};

const selectedResponsibilities = (project: CvRuntimeProject): ContentPoint[] => {
  if (!project.cvResponsibilityIds.length) return project.responsibilities;
  const byId = new Map(project.responsibilities.map((item) => [item.id, item]));
  return project.cvResponsibilityIds.map((id) => byId.get(id)).filter((item): item is ContentPoint => Boolean(item));
};

const renderProject = (project: CvRuntimeProject, language: Language, compact = false): string => {
  const location = localized(project.location, language);
  return `
  <article class="cv-experience-item${compact ? " cv-experience-item--compact" : ""}">
    <p class="cv-experience-item__date">${formatRange(project.startDate, project.endDate, language)}</p>
    <div class="cv-experience-item__content">
      ${project.role ? `<h3>${localized(project.role, language)}</h3>` : ""}
      <p class="cv-experience-item__project">${localized(project.name, language)}${location ? `, ${location}` : ""}</p>
      ${project.cvShowSummary && project.summary ? `<p class="cv-experience-item__summary">${localized(project.summary, language)}</p>` : ""}
      <ul class="cv-bullet-list">${selectedResponsibilities(project).map((item) => `<li>${localized(item.text, language)}</li>`).join("")}</ul>
    </div>
  </article>`;
};

export const renderDynamicCv = (data: CvRuntimeData, adminPreview = false, language: Language = "en"): string => {
  const { content } = data;
  const text = copy[language];
  const pageOneProjects = data.detailedProjects.slice(0, content.pageOneProjectCount);
  const pageTwoProjects = data.detailedProjects.slice(content.pageOneProjectCount);
  const profile = content.profile;
  const background = orderedCvBackground(content);

  const sidebar = `
    <aside class="cv-sidebar">
      <div class="cv-photo">
        <div class="cv-photo__placeholder" aria-hidden="true">HDL</div>
        <img class="cv-photo__image" src="${escapeHtml(assetUrl(profile.photoPath))}" alt="Portrait of ${escapeHtml(profile.name)}" data-profile-photo>
      </div>
      <section class="cv-sidebar-section">
        ${heading(text.contact)}
        <address class="cv-contact">
          <div><strong>${text.phone}</strong><a href="tel:${escapeHtml(profile.phone)}">${escapeHtml(profile.phone)}</a></div>
          <div><strong>${text.email}</strong><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></div>
          <div><strong>${text.address}</strong><span>${localized(profile.location, language)}</span></div>
        </address>
      </section>
      <section class="cv-sidebar-section">
        ${heading(text.education)}
        ${background.education.map((item) => {
          const classification = formatDegreeClassification(item.classification, language);
          return `<article class="cv-sidebar-entry">
            <h3>${localized(item.field, language)}</h3>
            <p>${localized(item.institution, language)}</p>
            ${classification ? `<p class="cv-sidebar-entry__meta">${classification}</p>` : ""}
            <p class="cv-sidebar-entry__meta">${escapeHtml(item.startDate)} - ${escapeHtml(item.endDate)}</p>
          </article>`;
        }).join("")}
      </section>
      ${background.skillGroups.map((group) => `
        <section class="cv-sidebar-section">
          ${heading(localized(group.title, language))}
          <ul class="cv-sidebar-list">${group.items.map((item) => `<li>${localized(item.label, language)}</li>`).join("")}</ul>
        </section>`).join("")}
      <section class="cv-sidebar-section">
        ${heading(text.language)}
        <ul class="cv-sidebar-list cv-sidebar-list--compact">${background.languages.map((item) => `<li>${localized(item.name, language)}${item.proficiency ? ` - ${localized(item.proficiency, language)}` : ""}</li>`).join("")}</ul>
      </section>
      <section class="cv-sidebar-section cv-sidebar-section--employment">
        ${heading(text.experience)}
        <ul class="cv-employment-list">${background.experiences.map((item) => `
          <li class="cv-employment"><strong>${escapeHtml(item.company)}</strong><span>${formatRange(item.startDate, item.endDate, language)}</span></li>`).join("")}</ul>
      </section>
    </aside>`;

  const selectedProjects = data.compactProjects.map((project) => {
    const location = localized(project.location, language);
    const meta = [project.year ? String(project.year) : "", project.location.en !== "Viet Nam" ? location : ""].filter(Boolean).join(" · ");
    return `<li><span>${localized(project.name, language)}</span>${meta ? `<small>${meta}</small>` : ""}</li>`;
  }).join("");

  const selectedTools = data.tools.map((tool) => `
    <article class="cv-tool">
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${localized(tool.solution, language)}</p>
      <ul class="cv-tool__technologies">${tool.technologies.map((technology) => `<li>${escapeHtml(technology)}</li>`).join("")}</ul>
    </article>`).join("");

  return `
    <a class="cv-skip-link" href="#cv-document">Skip to CV</a>
    <header class="cv-toolbar" aria-label="CV actions">
      <div class="cv-toolbar__inner">
        <a class="cv-toolbar__back" href="${adminPreview ? `${import.meta.env.BASE_URL}admin/` : import.meta.env.BASE_URL}">${adminPreview ? "Back to Admin" : "Back to portfolio"}</a>
        <div class="cv-toolbar__title"><strong>English CV${adminPreview ? " · Admin preview" : ""}</strong><span>2-page A4 preview · ${escapeHtml(content.version)}</span></div>
        <details class="cv-theme-panel" data-theme-controls>
          <summary>Customize theme</summary>
          <div class="cv-theme-panel__body">
            <div class="cv-theme-panel__heading"><strong>Document colors</strong><span>Applies to CV and PDF only</span></div>
            <label class="cv-theme-field"><span>Preset</span><select data-theme-preset>${renderThemeOptions(content.themeId)}<option value="custom">Custom colors</option></select></label>
            <div class="cv-theme-color-grid">
              <label class="cv-theme-field"><span>Primary</span><input type="color" value="#087fb6" aria-label="Primary document color" data-theme-primary></label>
              <label class="cv-theme-field"><span>Accent</span><input type="color" value="#14a8d6" aria-label="Accent document color" data-theme-accent></label>
            </div>
            <p class="cv-theme-panel__feedback" data-theme-feedback aria-live="polite"></p>
            <button class="cv-theme-reset" type="button" data-theme-reset>Reset to default</button>
          </div>
        </details>
        <p class="cv-toolbar__status" data-cv-status aria-live="polite"></p>
        <button class="cv-print-button" type="button" data-print-cv>Print / Save PDF</button>
      </div>
    </header>
    <div class="cv-preview-shell">
      <div id="cv-document" class="cv-preview">
        <section class="cv-page cv-page--one" aria-label="CV page 1 of 2" data-cv-page>
          ${sidebar}
          <main class="cv-page-one-main">
            <header class="cv-identity"><p class="cv-identity__name">${escapeHtml(profile.name)}</p><h1>${localized(profile.professionalTitle, language)}</h1></header>
            <section class="cv-main-section cv-summary">${heading(text.professionalSummary)}<p>${localized(profile.summary, language)}</p></section>
            <section class="cv-main-section cv-professional-experience">${heading(text.professionalExperience)}<div class="cv-experience-list">${pageOneProjects.map((project) => renderProject(project, language)).join("")}</div></section>
          </main>
          <span class="cv-page-accent cv-page-accent--top" aria-hidden="true"></span><span class="cv-page-accent cv-page-accent--middle" aria-hidden="true"></span><span class="cv-page-accent cv-page-accent--bottom" aria-hidden="true"></span>
        </section>
        <section class="cv-page cv-page--two" aria-label="CV page 2 of 2" data-cv-page>
          <header class="cv-page-two-header">
            <div class="cv-page-two-header__identity"><p>${escapeHtml(profile.name)}</p><span>${localized(profile.professionalTitle, language)}</span></div>
            <div class="cv-page-two-header__title"><span>${text.pageTwoTitle}</span><strong>${text.pageTwoSubtitle}</strong></div>
          </header>
          <main class="cv-page-two-main">
            <section class="cv-main-section cv-professional-experience">${heading(text.professionalExperience)}<div class="cv-experience-list cv-experience-list--page-two">${pageTwoProjects.map((project) => renderProject(project, language, true)).join("")}</div></section>
            <div class="cv-page-two-bottom">
              <section class="cv-main-section cv-selected-projects">${heading(text.selectedProjects)}<ul>${selectedProjects}</ul></section>
              <section class="cv-main-section cv-selected-tools">${heading(text.selectedTools)}${selectedTools}</section>
            </div>
          </main>
          <span class="cv-page-accent cv-page-accent--top" aria-hidden="true"></span><span class="cv-page-accent cv-page-accent--bottom" aria-hidden="true"></span>
        </section>
      </div>
    </div>`;
};
