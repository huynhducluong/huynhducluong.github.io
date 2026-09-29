import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/admin.css";
import { supabaseConfig } from "../config/supabase";
import { getAdminAccess, magicLinkRedirectUrl, safeReturnTo } from "./auth";
import { portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { cvContentSeed } from "../data/cvSeed";
import { escapeHtml } from "../shared/format";
import { loadCvData, publishCvRelease, saveCvContent } from "../services/cvRepository";
import { supabase } from "../services/supabaseClient";
import type { CvContent, CvProjectDisplay } from "../types/cvContent";
import type { PortfolioProject, PublicationStatus } from "../types/portfolio";

interface AdminMediaRow {
  id: string;
  storage_path: string;
  alt: { en: string; vi: string };
  kind: "cover" | "gallery";
  display_order: number;
  mime_type: string | null;
  file_size: number | null;
}

interface AdminProjectRow {
  id: string;
  slug: string;
  name: { en: string; vi: string };
  location: { en: string; vi: string };
  role: { en: string; vi: string } | null;
  summary: { en: string; vi: string } | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  year: number | null;
  responsibilities: Array<{ id: string; text: { en: string; vi: string } }>;
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  portfolio_layout: "feature" | "standard" | "compact";
  include_in_cv: boolean;
  cv_order: number;
  cv_display: CvProjectDisplay;
  cv_show_summary: boolean;
  cv_responsibility_ids: string[];
  project_images: AdminMediaRow[];
}

interface AdminToolRow {
  id: string;
  name: string;
  status: PublicationStatus;
  include_in_cv: boolean;
  cv_order: number;
}

interface PendingMedia {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
  kind: "cover" | "gallery";
}

type AdminView = "projects" | "cv-content" | "documents";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

let projects: AdminProjectRow[] = [];
let tools: AdminToolRow[] = [];
let selectedProject: AdminProjectRow | null = null;
let cvContent: CvContent = structuredClone(cvContentSeed);
let activeView: AdminView = "projects";
let pendingMedia: PendingMedia[] = [];
let magicLinkCooldown: number | undefined;

const resetMagicLinkButton = (button: HTMLButtonElement): void => {
  button.disabled = false;
  button.textContent = "Send magic link";
};

const startMagicLinkCooldown = (button: HTMLButtonElement): void => {
  if (magicLinkCooldown !== undefined) {
    window.clearInterval(magicLinkCooldown);
  }

  let secondsRemaining = 60;
  button.disabled = true;
  button.textContent = `Send again in ${secondsRemaining}s`;

  magicLinkCooldown = window.setInterval(() => {
    secondsRemaining -= 1;

    if (secondsRemaining <= 0) {
      window.clearInterval(magicLinkCooldown);
      magicLinkCooldown = undefined;
      resetMagicLinkButton(button);
      return;
    }

    button.textContent = `Send again in ${secondsRemaining}s`;
  }, 1000);
};

const message = (text: string, kind: "info" | "error" | "success" = "info"): void => {
  const target = document.querySelector<HTMLElement>("[data-admin-message]");
  if (!target) return;
  target.textContent = text;
  target.dataset.kind = kind;
};

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toRow = (project: PortfolioProject): AdminProjectRow => ({
  id: project.id,
  slug: project.slug,
  name: project.name,
  location: project.location,
  role: project.role ?? null,
  summary: project.summary ?? null,
  start_date: project.startDate ?? null,
  end_date: project.endDate ?? null,
  is_current: project.isCurrent,
  year: project.year ?? null,
  responsibilities: project.responsibilities,
  technologies: project.technologies,
  featured: project.featured,
  status: "draft",
  display_order: project.displayOrder,
  include_in_portfolio: false,
  portfolio_order: project.portfolioOrder,
  portfolio_layout: project.portfolioLayout,
  include_in_cv: project.includeInCv,
  cv_order: project.cvOrder,
  cv_display: project.cvDisplay,
  cv_show_summary: project.cvShowSummary,
  cv_responsibility_ids: project.cvResponsibilityIds,
  project_images: [],
});

const blankProject = (): AdminProjectRow => ({
  id: crypto.randomUUID(),
  slug: "",
  name: { en: "", vi: "" },
  location: { en: "", vi: "" },
  role: null,
  summary: null,
  start_date: null,
  end_date: null,
  is_current: false,
  year: null,
  responsibilities: [],
  technologies: [],
  featured: false,
  status: "draft",
  display_order: projects.length + 1,
  include_in_portfolio: false,
  portfolio_order: projects.length + 1,
  portfolio_layout: "standard",
  include_in_cv: false,
  cv_order: projects.length + 1,
  cv_display: "compact",
  cv_show_summary: true,
  cv_responsibility_ids: [],
  project_images: [],
});

const loginView = (): void => {
  if (magicLinkCooldown !== undefined) {
    window.clearInterval(magicLinkCooldown);
    magicLinkCooldown = undefined;
  }

  app.innerHTML = `
    <main class="admin-login">
      <section class="admin-login__card">
        <p class="section-kicker">Private CMS</p>
        <h1>Content administration</h1>
        <p>Sign in with your password, or use a one-time Magic Link as a backup.</p>
        <label class="admin-login__email">Email<input type="email" autocomplete="username" value="${escapeHtml(supabaseConfig.adminEmail)}" readonly></label>
        <div class="admin-auth-tabs" role="tablist" aria-label="Sign-in method">
          <button class="admin-auth-tabs__button is-active" type="button" role="tab" aria-selected="true" aria-controls="password-panel" data-auth-mode="password">Password</button>
          <button class="admin-auth-tabs__button" type="button" role="tab" aria-selected="false" aria-controls="magic-link-panel" data-auth-mode="magic-link">Magic Link</button>
        </div>
        <form id="password-panel" role="tabpanel" data-password-login-form>
          <label>Password
            <span class="admin-password-field">
              <input name="password" type="password" autocomplete="current-password" required autofocus>
              <button type="button" data-password-visibility aria-label="Show password">Show</button>
            </span>
          </label>
          <button class="button" type="submit" data-password-submit>Sign in</button>
        </form>
        <form id="magic-link-panel" role="tabpanel" data-magic-link-form hidden>
          <button class="button" type="submit" data-magic-link-submit>Send magic link</button>
        </form>
        <p class="admin-login__help" data-login-help>Password sign-in does not require email delivery.</p>
        <p class="admin-message" data-admin-message role="status"></p>
        <a href="${import.meta.env.BASE_URL}">← Return to website</a>
      </section>
    </main>`;

  const passwordPanel = app.querySelector<HTMLFormElement>("[data-password-login-form]");
  const magicLinkPanel = app.querySelector<HTMLFormElement>("[data-magic-link-form]");
  const loginHelp = app.querySelector<HTMLElement>("[data-login-help]");

  app.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const passwordMode = tab.dataset.authMode === "password";
      app.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      if (passwordPanel) passwordPanel.hidden = !passwordMode;
      if (magicLinkPanel) magicLinkPanel.hidden = passwordMode;
      if (loginHelp) {
        loginHelp.textContent = passwordMode
          ? "Password sign-in does not require email delivery."
          : "Allow a few minutes for delivery and check Spam or Promotions. Requests are limited to one per minute.";
      }
      message("");
      if (passwordMode) {
        passwordPanel?.querySelector<HTMLInputElement>("input[name='password']")?.focus();
      } else {
        magicLinkPanel?.querySelector<HTMLButtonElement>("[data-magic-link-submit]")?.focus();
      }
    });
  });

  app.querySelector<HTMLButtonElement>("[data-password-visibility]")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const input = passwordPanel?.querySelector<HTMLInputElement>("input[name='password']");
    if (!input) return;
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Show" : "Hide";
    button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    input.focus();
  });

  passwordPanel?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-password-submit]");

    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Signing in…";
    message("Checking your credentials…");

    const { error } = await supabase.auth.signInWithPassword({
      email: supabaseConfig.adminEmail,
      password,
    });

    if (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Sign in";
      message("Email or password is incorrect, or this account does not have a password yet.", "error");
      return;
    }

    await initialize();
  });

  magicLinkPanel?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-magic-link-submit]");

    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    message("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email: supabaseConfig.adminEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: magicLinkRedirectUrl(),
      },
    });

    if (error) {
      resetMagicLinkButton(submitButton);
      message(
        error.status === 429
          ? "Too many requests. Wait before requesting another Magic Link."
          : error.message,
        "error",
      );
      return;
    }

    message(
      "Request accepted by Supabase. Check Inbox, Spam, and Promotions. Delivery may take a few minutes.",
      "success",
    );
    startMagicLinkCooldown(submitButton);
  });
};

const projectList = (): string =>
  projects.length
    ? projects.map((project) => `
      <li class="admin-project">
        <button type="button" data-edit="${escapeHtml(project.id)}">
          <span>${escapeHtml(project.name.en || "Untitled project")}</span>
          <small>${escapeHtml(project.slug || "No slug")}</small>
        </button>
        <span class="status status--${project.status}">${project.status}</span>
        <button class="admin-project__status" type="button" data-status="${escapeHtml(project.id)}" data-next="${project.status === "published" ? "draft" : "published"}">
          ${project.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </li>`).join("")
    : '<li class="admin-empty">No projects. Create one or import starter data.</li>';

const toolList = (): string =>
  tools.length
    ? tools.map((tool) => `<li class="admin-project"><div><span>${escapeHtml(tool.name)}</span><small>BIM automation tool</small><label class="admin-inline-order">CV order <input type="number" min="1" value="${tool.cv_order}" data-tool-cv-order="${escapeHtml(tool.id)}"></label></div><span class="status status--${tool.status}">${tool.status}</span><button class="admin-project__status" type="button" data-tool-status="${escapeHtml(tool.id)}" data-next="${tool.status === "published" ? "draft" : "published"}">${tool.status === "published" ? "Unpublish" : "Publish"}</button><button class="admin-project__status" type="button" data-tool-cv="${escapeHtml(tool.id)}" data-next="${tool.include_in_cv ? "false" : "true"}">${tool.include_in_cv ? "Remove CV" : "Add CV"}</button></li>`).join("")
    : '<li class="admin-empty">No tools. Import starter data first.</li>';

const field = (label: string, name: string, value = "", type = "text"): string =>
  `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}"></label>`;

const publicMediaUrl = (path: string): string => supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path).data.publicUrl;

const mediaLibrary = (project: AdminProjectRow): string => {
  const media = [...project.project_images].sort((a, b) => a.display_order - b.display_order);
  if (!media.length) return '<p class="admin-empty">No saved images yet.</p>';
  return `<div class="admin-media-grid">${media.map((item, index) => `
    <article class="admin-media-card" data-media-id="${escapeHtml(item.id)}">
      <div class="admin-media-card__image"><img src="${escapeHtml(publicMediaUrl(item.storage_path))}" alt="${escapeHtml(item.alt.en)}"><span class="admin-media-badge admin-media-badge--${item.kind}">${item.kind}</span></div>
      <label>Alt text (English)<input value="${escapeHtml(item.alt.en)}" data-media-alt></label>
      <div class="admin-media-card__actions">
        <button type="button" data-media-cover ${item.kind === "cover" ? "disabled" : ""}>Set Cover</button>
        <button type="button" data-media-move="up" ${index === 0 ? "disabled" : ""} aria-label="Move image earlier">↑</button>
        <button type="button" data-media-move="down" ${index === media.length - 1 ? "disabled" : ""} aria-label="Move image later">↓</button>
        <button type="button" data-media-save>Save</button>
        <button type="button" class="admin-danger" data-media-delete>Delete</button>
      </div>
    </article>`).join("")}</div>`;
};

const responsibilityOptions = (project: AdminProjectRow): string => project.responsibilities.length
  ? `<fieldset class="admin-responsibility-picker"><legend>Responsibilities used in CV</legend>${project.responsibilities.map((item) => `
      <label><input type="checkbox" name="cv_responsibility" value="${escapeHtml(item.id)}" ${project.cv_responsibility_ids.includes(item.id) ? "checked" : ""}> ${escapeHtml(item.text.en)}</label>`).join("")}</fieldset>`
  : '<p class="admin-empty">Add and save responsibilities before selecting CV bullets.</p>';

const editor = (project: AdminProjectRow): string => `
  <form class="admin-editor" data-project-form>
    <input name="id" type="hidden" value="${escapeHtml(project.id)}">
    <div class="admin-editor__heading"><div><p class="section-kicker">${project.name.en ? "Edit project" : "New project"}</p><h2>${escapeHtml(project.name.en || "Untitled project")}</h2></div><span class="status status--${project.status}">${project.status}</span></div>
    <div class="admin-form-grid">
      ${field("Project name (English) *", "name_en", project.name.en)}
      ${field("Project name (Vietnamese)", "name_vi", project.name.vi)}
      ${field("Role (English)", "role_en", project.role?.en ?? "")}
      ${field("Role (Vietnamese)", "role_vi", project.role?.vi ?? "")}
      ${field("Location (English)", "location_en", project.location.en)}
      ${field("Location (Vietnamese)", "location_vi", project.location.vi)}
      ${field("Start", "start_date", project.start_date ?? "", "month")}
      <label>End date
        <span class="admin-end-date">
          <input name="end_date" type="month" value="${escapeHtml(project.end_date ?? "")}" ${project.is_current ? "disabled" : ""}>
          <button type="button" data-present-toggle aria-pressed="${project.is_current}">Present</button>
          <input name="is_current" type="hidden" value="${project.is_current ? "true" : "false"}">
        </span>
      </label>
      ${field("Display order", "display_order", String(project.display_order), "number")}
      ${field("Portfolio order", "portfolio_order", String(project.portfolio_order), "number")}
      ${field("CV order", "cv_order", String(project.cv_order), "number")}
      ${field("Slug *", "slug", project.slug)}
    </div>
    <label>Summary (English)<textarea name="summary_en" rows="4">${escapeHtml(project.summary?.en ?? "")}</textarea></label>
    <label>Summary (Vietnamese)<textarea name="summary_vi" rows="4">${escapeHtml(project.summary?.vi ?? "")}</textarea></label>
    <label>Responsibilities (one English item per line)<textarea name="responsibilities" rows="6">${escapeHtml(project.responsibilities.map((item) => item.text.en).join("\n"))}</textarea></label>
    <label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(project.technologies.join(", "))}"></label>
    <fieldset class="admin-fieldset"><legend>Publishing and documents</legend><div class="admin-checks">
      <label><input name="featured" type="checkbox" ${project.featured ? "checked" : ""}> Featured on website</label>
      <label><input name="include_in_portfolio" type="checkbox" ${project.include_in_portfolio ? "checked" : ""}> Include in Portfolio PDF</label>
      <label><input name="include_in_cv" type="checkbox" ${project.include_in_cv ? "checked" : ""}> Include in CV</label>
    </div></fieldset>
    <div class="admin-form-grid">
      <label>Portfolio layout<select name="portfolio_layout"><option value="standard" ${project.portfolio_layout === "standard" ? "selected" : ""}>Standard</option><option value="feature" ${project.portfolio_layout === "feature" ? "selected" : ""}>Feature</option><option value="compact" ${project.portfolio_layout === "compact" ? "selected" : ""}>Compact</option></select></label>
      <label>CV display<select name="cv_display"><option value="detailed" ${project.cv_display === "detailed" ? "selected" : ""}>Detailed experience</option><option value="compact" ${project.cv_display === "compact" ? "selected" : ""}>Compact project list</option></select></label>
    </div>
    <div class="admin-checks"><label><input name="cv_show_summary" type="checkbox" ${project.cv_show_summary ? "checked" : ""}> Show summary in CV</label></div>
    ${responsibilityOptions(project)}
    <div class="admin-actions"><button class="button" type="submit">Save as ${project.status}</button><button class="button button--secondary" type="button" data-cancel>Edit another project</button></div>
  </form>
  <form class="admin-upload" data-upload-form>
    <div><p class="section-kicker">Project media</p><h2>Upload sanitized images</h2><p>Select JPEG, PNG, WebP or AVIF images, maximum 5 MB each. Review Cover, Gallery, order and alt text before upload.</p></div>
    <label>Choose images<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label>
    <div data-upload-queue><p class="admin-empty">Selected images will appear here before upload.</p></div>
    <button class="button button--secondary" type="submit" data-upload-submit disabled>Upload selected images</button>
  </form>
  <section class="admin-upload admin-media-library">
    <div><p class="section-kicker">Saved media</p><h2>Project image library</h2><p>Choose one Cover, edit alt text, reorder Gallery images or remove obsolete media.</p></div>
    ${mediaLibrary(project)}
  </section>`;

const cvContentEditor = (): string => `
  <form class="admin-editor admin-cv-editor" data-cv-content-form>
    <div class="admin-editor__heading"><div><p class="section-kicker">CV content</p><h2>Shared professional information</h2><p>Edit once here; the CV preview reads this Supabase content.</p></div><a class="button button--secondary" href="${import.meta.env.BASE_URL}cv/?preview=1" target="_blank" rel="noreferrer">Preview CV</a></div>
    <fieldset class="admin-fieldset"><legend>Document settings</legend><div class="admin-form-grid">
      ${field("CV version", "cv_version", cvContent.version)}
      ${field("Detailed projects on page 1", "page_one_project_count", String(cvContent.pageOneProjectCount), "number")}
    </div></fieldset>
    <fieldset class="admin-fieldset"><legend>Profile</legend>
      <div class="admin-form-grid">
        ${field("Full name", "profile_name", cvContent.profile.name)}
        ${field("Professional title (English)", "profile_title_en", cvContent.profile.professionalTitle.en)}
        ${field("Professional title (Vietnamese)", "profile_title_vi", cvContent.profile.professionalTitle.vi)}
        ${field("Email", "profile_email", cvContent.profile.email, "email")}
        ${field("Phone", "profile_phone", cvContent.profile.phone, "tel")}
        ${field("Photo path", "profile_photo", cvContent.profile.photoPath)}
        ${field("Location (English)", "profile_location_en", cvContent.profile.location.en)}
        ${field("Location (Vietnamese)", "profile_location_vi", cvContent.profile.location.vi)}
      </div>
      <label>Professional summary (English)<textarea name="profile_summary_en" rows="5">${escapeHtml(cvContent.profile.summary.en)}</textarea></label>
      <label>Professional summary (Vietnamese)<textarea name="profile_summary_vi" rows="5">${escapeHtml(cvContent.profile.summary.vi)}</textarea></label>
    </fieldset>
    <fieldset class="admin-fieldset"><legend>Work experience</legend>
      <div class="admin-cv-collection">${cvContent.experiences.map((item, index) => `
        <article class="admin-cv-card">
          <input type="hidden" name="experience_id_${index}" value="${escapeHtml(item.id)}"><div class="admin-cv-card__heading"><h3>${escapeHtml(item.company || `Experience ${index + 1}`)}</h3><button type="button" class="admin-danger" data-remove-experience="${index}">Remove</button></div>
          <div class="admin-form-grid">
            ${field("Company", `experience_company_${index}`, item.company)}
            ${field("Position (English)", `experience_position_en_${index}`, item.position.en)}
            ${field("Position (Vietnamese)", `experience_position_vi_${index}`, item.position.vi)}
            ${field("Location (English)", `experience_location_en_${index}`, item.location.en)}
            ${field("Location (Vietnamese)", `experience_location_vi_${index}`, item.location.vi)}
            ${field("Start", `experience_start_${index}`, item.startDate, "month")}
            <label>End date<span class="admin-end-date"><input name="experience_end_${index}" type="month" value="${escapeHtml(item.endDate ?? "")}" ${item.endDate === null ? "disabled" : ""}><button type="button" data-cv-present="${index}" aria-pressed="${item.endDate === null}">Present</button><input name="experience_current_${index}" type="hidden" value="${item.endDate === null ? "true" : "false"}"></span></label>
          </div>
          <label>Responsibilities (one English item per line)<textarea name="experience_responsibilities_${index}" rows="4">${escapeHtml(item.responsibilities.map((point) => point.text.en).join("\n"))}</textarea></label>
          <label>Technologies (comma separated)<input name="experience_technologies_${index}" value="${escapeHtml(item.technologies.join(", "))}"></label>
        </article>`).join("")}</div><button class="button button--secondary" type="button" data-add-experience>Add work experience</button>
    </fieldset>
    <fieldset class="admin-fieldset"><legend>Education</legend><div class="admin-cv-collection">${cvContent.education.map((item, index) => `
      <article class="admin-cv-card"><input type="hidden" name="education_id_${index}" value="${escapeHtml(item.id)}"><div class="admin-form-grid">
        ${field("Field (English)", `education_field_en_${index}`, item.field.en)}${field("Field (Vietnamese)", `education_field_vi_${index}`, item.field.vi)}
        ${field("Institution (English)", `education_institution_en_${index}`, item.institution.en)}${field("Institution (Vietnamese)", `education_institution_vi_${index}`, item.institution.vi)}
        ${field("Classification (English)", `education_classification_en_${index}`, item.classification?.en ?? "")}${field("Classification (Vietnamese)", `education_classification_vi_${index}`, item.classification?.vi ?? "")}
        ${field("Start year", `education_start_${index}`, item.startDate)}${field("End year", `education_end_${index}`, item.endDate)}
      </div></article>`).join("")}</div></fieldset>
    <fieldset class="admin-fieldset"><legend>Skills and languages</legend><div class="admin-cv-collection">
      ${cvContent.skillGroups.map((group, index) => `<article class="admin-cv-card"><input type="hidden" name="skill_id_${index}" value="${escapeHtml(group.id)}"><div class="admin-form-grid">${field("Group title (English)", `skill_title_en_${index}`, group.title.en)}${field("Group title (Vietnamese)", `skill_title_vi_${index}`, group.title.vi)}</div><label>Items (one per line)<textarea name="skill_items_${index}" rows="5">${escapeHtml(group.items.map((item) => item.label.en).join("\n"))}</textarea></label></article>`).join("")}
      ${cvContent.languages.map((item, index) => `<article class="admin-cv-card"><input type="hidden" name="language_id_${index}" value="${escapeHtml(item.id)}"><div class="admin-form-grid">${field("Language (English)", `language_name_en_${index}`, item.name.en)}${field("Language (Vietnamese)", `language_name_vi_${index}`, item.name.vi)}${field("Proficiency (English)", `language_proficiency_en_${index}`, item.proficiency?.en ?? "")}${field("Proficiency (Vietnamese)", `language_proficiency_vi_${index}`, item.proficiency?.vi ?? "")}</div></article>`).join("")}
    </div></fieldset>
    <div class="admin-actions"><button class="button" type="submit">Save CV content</button><a class="button button--secondary" href="${import.meta.env.BASE_URL}cv/?preview=1" target="_blank" rel="noreferrer">Open draft preview</a></div>
  </form>`;

const documentsView = (): string => `
  <section class="admin-editor admin-documents"><div><p class="section-kicker">Documents</p><h2>Preview and publish</h2><p>Review the latest Admin data before publishing a stable CV release.</p></div>
    <div class="admin-document-grid"><article><h3>Curriculum Vitae</h3><p>The draft preview uses current Admin content. The public CV uses the latest published release.</p><div class="admin-actions"><a class="button button--secondary" href="${import.meta.env.BASE_URL}cv/?preview=1" target="_blank" rel="noreferrer">Preview draft CV</a><a class="button button--secondary" href="${import.meta.env.BASE_URL}cv/" target="_blank" rel="noreferrer">View public CV</a><button class="button" type="button" data-publish-cv>Publish CV</button></div></article><article><h3>Portfolio PDF</h3><p>The Portfolio uses published projects selected with Include in Portfolio PDF.</p><div class="admin-actions"><a class="button button--secondary" href="${import.meta.env.BASE_URL}portfolio/" target="_blank" rel="noreferrer">Preview Portfolio</a></div></article></div>
  </section>`;

const workspaceView = (): string => activeView === "cv-content" ? cvContentEditor() : activeView === "documents" ? documentsView() : editor(selectedProject ?? blankProject());

const dashboardView = (): void => {
  app.innerHTML = `
    <header class="admin-header"><div><p>HDL Content Admin</p><small>Website · CV · Portfolio</small></div><div><a href="${import.meta.env.BASE_URL}admin/cover-letters/">Cover letters</a><a href="${import.meta.env.BASE_URL}" target="_blank" rel="noreferrer">View website</a><button type="button" data-password-open>Account security</button><button type="button" data-sign-out>Sign out</button></div></header>
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <nav class="admin-nav" aria-label="Admin sections"><button type="button" data-admin-view="projects" class="${activeView === "projects" ? "is-active" : ""}">Projects & Media</button><button type="button" data-admin-view="cv-content" class="${activeView === "cv-content" ? "is-active" : ""}">CV Content</button><button type="button" data-admin-view="documents" class="${activeView === "documents" ? "is-active" : ""}">Documents</button></nav>
        <div class="admin-sidebar__actions" ${activeView === "projects" ? "" : "hidden"}><button class="button" type="button" data-new-project>New project</button><button class="button button--secondary" type="button" data-import>Import starter data</button></div>
        <p class="admin-message" data-admin-message role="status"></p>
        <div ${activeView === "projects" ? "" : "hidden"}><h2 class="admin-sidebar__title">Projects</h2><ul class="admin-projects">${projectList()}</ul><h2 class="admin-sidebar__title">Tools</h2><ul class="admin-projects">${toolList()}</ul></div>
      </aside>
      <section class="admin-workspace">${workspaceView()}</section>
    </main>
    <dialog class="admin-dialog" data-password-dialog>
      <form data-password-update-form>
        <div><p class="section-kicker">Account security</p><h2>Set or change password</h2></div>
        <p>Use at least 12 characters. The password is sent directly to Supabase Auth and is never stored in this website's code.</p>
        <label>New password<input name="new_password" type="password" autocomplete="new-password" minlength="12" required></label>
        <label>Confirm password<input name="confirm_password" type="password" autocomplete="new-password" minlength="12" required></label>
        <p class="admin-message" data-password-message role="status"></p>
        <div class="admin-actions"><button class="button" type="submit" data-password-update-submit>Save password</button><button class="button button--secondary" type="button" data-password-close>Cancel</button></div>
      </form>
    </dialog>`;
  bindDashboard();
};

const loadProjects = async (): Promise<void> => {
  const [projectResult, toolResult, cvData] = await Promise.all([
    supabase.from("projects").select("*, project_images(*)").order("display_order"),
    supabase.from("automation_tools").select("id,name,status,include_in_cv,cv_order").order("display_order"),
    loadCvData({ adminPreview: true, preferRelease: false }),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  projects = projectResult.data as AdminProjectRow[];
  tools = toolResult.data as AdminToolRow[];
  cvContent = cvData.content;
};

const saveForm = async (formElement: HTMLFormElement): Promise<void> => {
  const form = new FormData(formElement);
  const current = projects.find((item) => item.id === String(form.get("id"))) ?? selectedProject ?? blankProject();
  const nameEn = String(form.get("name_en") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || nameEn);
  if (!nameEn || !slug) throw new Error("English name and slug are required.");
  const responsibilities = String(form.get("responsibilities") ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map((text, index) => ({
    id: current.responsibilities[index]?.id ?? `${slug}-${index + 1}`,
    text: { en: text, vi: current.responsibilities[index]?.text.vi ?? "" },
  }));
  const selectedResponsibilityIds = form.getAll("cv_responsibility").map(String).filter((id) => responsibilities.some((item) => item.id === id));
  const isCurrent = form.get("is_current") === "true";
  const roleEn = String(form.get("role_en") ?? "").trim();
  const roleVi = String(form.get("role_vi") ?? "").trim();
  const summaryEn = String(form.get("summary_en") ?? "").trim();
  const summaryVi = String(form.get("summary_vi") ?? "").trim();
  const payload: AdminProjectRow = {
    ...current,
    id: String(form.get("id")),
    slug,
    name: { en: nameEn, vi: String(form.get("name_vi") ?? "").trim() },
    location: { en: String(form.get("location_en") ?? "").trim(), vi: String(form.get("location_vi") ?? "").trim() },
    role: roleEn || roleVi ? { en: roleEn, vi: roleVi } : null,
    summary: summaryEn || summaryVi ? { en: summaryEn, vi: summaryVi } : null,
    start_date: String(form.get("start_date") ?? "").trim() || null,
    end_date: isCurrent ? null : String(form.get("end_date") ?? "").trim() || null,
    is_current: isCurrent,
    responsibilities,
    technologies: String(form.get("technologies") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    featured: form.get("featured") === "on",
    include_in_portfolio: form.get("include_in_portfolio") === "on",
    display_order: Number(form.get("display_order")) || 100,
    portfolio_order: Number(form.get("portfolio_order")) || 100,
    portfolio_layout: String(form.get("portfolio_layout")) as AdminProjectRow["portfolio_layout"],
    include_in_cv: form.get("include_in_cv") === "on",
    cv_order: Number(form.get("cv_order")) || 100,
    cv_display: String(form.get("cv_display")) as CvProjectDisplay,
    cv_show_summary: form.get("cv_show_summary") === "on",
    cv_responsibility_ids: selectedResponsibilityIds,
  };
  const { project_images: _projectImages, ...projectPayload } = payload;
  const { error } = await supabase.from("projects").upsert(projectPayload);
  if (error) throw error;
  await loadProjects();
  selectedProject = projects.find((item) => item.id === payload.id) ?? payload;
  dashboardView();
  message("Project saved. Status was not changed.", "success");
};

const clearPendingMedia = (): void => {
  pendingMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  pendingMedia = [];
};

const renderUploadQueue = (): void => {
  const root = app.querySelector<HTMLElement>("[data-upload-queue]");
  const submit = app.querySelector<HTMLButtonElement>("[data-upload-submit]");
  if (!root || !submit) return;
  submit.disabled = !pendingMedia.length;
  submit.textContent = pendingMedia.length ? `Upload ${pendingMedia.length} ${pendingMedia.length === 1 ? "image" : "images"}` : "Upload selected images";
  root.innerHTML = pendingMedia.length ? `<div class="admin-media-grid">${pendingMedia.map((item, index) => `
    <article class="admin-media-card" data-pending-id="${item.id}">
      <div class="admin-media-card__image"><img src="${item.previewUrl}" alt=""><span class="admin-media-badge admin-media-badge--${item.kind}">${item.kind}</span></div>
      <strong>${escapeHtml(item.file.name)}</strong><small>${(item.file.size / 1024 / 1024).toFixed(2)} MB</small>
      <label>Use as<select data-pending-kind><option value="cover" ${item.kind === "cover" ? "selected" : ""}>Cover</option><option value="gallery" ${item.kind === "gallery" ? "selected" : ""}>Gallery</option></select></label>
      <label>Alt text (English)<input value="${escapeHtml(item.alt)}" data-pending-alt></label>
      <div class="admin-media-card__actions"><button type="button" data-pending-move="up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-pending-move="down" ${index === pendingMedia.length - 1 ? "disabled" : ""}>↓</button><button type="button" class="admin-danger" data-pending-remove>Remove</button></div>
    </article>`).join("")}</div>` : '<p class="admin-empty">Selected images will appear here before upload.</p>';
  bindPendingMedia();
};

const moveItem = <T,>(items: T[], index: number, direction: "up" | "down"): T[] => {
  const destination = direction === "up" ? index - 1 : index + 1;
  if (destination < 0 || destination >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[destination]] = [copy[destination], copy[index]];
  return copy;
};

const bindPendingMedia = (): void => {
  app.querySelectorAll<HTMLElement>("[data-pending-id]").forEach((card) => {
    const id = card.dataset.pendingId;
    if (!id) return;
    card.querySelector<HTMLSelectElement>("[data-pending-kind]")?.addEventListener("change", (event) => {
      const kind = (event.currentTarget as HTMLSelectElement).value as "cover" | "gallery";
      pendingMedia = pendingMedia.map((item) => ({ ...item, kind: item.id === id ? kind : kind === "cover" ? "gallery" : item.kind }));
      renderUploadQueue();
    });
    card.querySelector<HTMLInputElement>("[data-pending-alt]")?.addEventListener("input", (event) => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) item.alt = (event.currentTarget as HTMLInputElement).value;
    });
    card.querySelector("[data-pending-remove]")?.addEventListener("click", () => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      pendingMedia = pendingMedia.filter((entry) => entry.id !== id);
      renderUploadQueue();
    });
    card.querySelectorAll<HTMLElement>("[data-pending-move]").forEach((button) => button.addEventListener("click", () => {
      const index = pendingMedia.findIndex((entry) => entry.id === id);
      pendingMedia = moveItem(pendingMedia, index, button.dataset.pendingMove as "up" | "down");
      renderUploadQueue();
    }));
  });
};

const choosePendingMedia = (files: FileList): void => {
  clearPendingMedia();
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const selected = Array.from(files);
  const invalid = selected.find((file) => !allowed.includes(file.type) || file.size > 5 * 1024 * 1024);
  if (invalid) throw new Error(`Use JPEG, PNG, WebP or AVIF files smaller than 5 MB. Check "${invalid.name}".`);
  const hasCover = selectedProject?.project_images.some((item) => item.kind === "cover") ?? false;
  pendingMedia = selected.map((file, index) => ({
    id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), alt: selectedProject?.name.en ?? "",
    kind: !hasCover && index === 0 ? "cover" : "gallery",
  }));
  renderUploadQueue();
};

const uploadImages = async (formElement: HTMLFormElement): Promise<void> => {
  if (!selectedProject || !projects.some((project) => project.id === selectedProject?.id)) throw new Error("Save or select a project before uploading.");
  if (!pendingMedia.length) throw new Error("Choose one or more images.");
  const submitButton = formElement.querySelector<HTMLButtonElement>("[data-upload-submit]");
  const failures: Array<{ name: string; reason: string }> = [];
  const uploadedCoverIds: string[] = [];
  let uploaded = 0;
  if (submitButton) submitButton.disabled = true;
  try {
    for (const [index, item] of pendingMedia.entries()) {
      if (submitButton) submitButton.textContent = `Uploading ${index + 1} of ${pendingMedia.length}...`;
      message(`Uploading image ${index + 1} of ${pendingMedia.length}...`);
      try {
        const extension = item.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `projects/${selectedProject.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(supabaseConfig.storageBucket).upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (uploadError) throw uploadError;
        const currentMaxOrder = Math.max(0, ...selectedProject.project_images.map((media) => media.display_order));
        const { data, error: metadataError } = await supabase.from("project_images").insert({ project_id: selectedProject.id, storage_path: path, alt: { en: item.alt.trim(), vi: "" }, kind: "gallery", display_order: currentMaxOrder + index + 1, mime_type: item.file.type, file_size: item.file.size }).select("id").single();
        if (metadataError) { await supabase.storage.from(supabaseConfig.storageBucket).remove([path]); throw metadataError; }
        if (item.kind === "cover") uploadedCoverIds.push(String(data.id));
        uploaded += 1;
      } catch (error) {
        failures.push({ name: item.file.name, reason: error instanceof Error ? error.message : "Upload failed." });
      }
    }
    const coverId = uploadedCoverIds.at(-1);
    if (coverId) {
      const { error } = await supabase.rpc("set_project_image_cover", { target_image_id: coverId });
      if (error) throw error;
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
  const total = pendingMedia.length;
  clearPendingMedia();
  formElement.reset();
  await loadProjects();
  selectedProject = projects.find((project) => project.id === selectedProject?.id) ?? null;
  dashboardView();
  if (failures.length) throw new Error(`${uploaded} of ${total} images uploaded. Failed: ${failures.map((failure) => `${failure.name}: ${failure.reason}`).join("; ")}`);
  message(`${uploaded} ${uploaded === 1 ? "image" : "images"} uploaded.`, "success");
};

const refreshSelectedProject = async (projectId: string): Promise<void> => {
  await loadProjects();
  selectedProject = projects.find((project) => project.id === projectId) ?? null;
  dashboardView();
};

const setMediaCover = async (mediaId: string): Promise<void> => {
  if (!selectedProject) return;
  const projectId = selectedProject.id;
  const { error } = await supabase.rpc("set_project_image_cover", { target_image_id: mediaId });
  if (error) throw error;
  await refreshSelectedProject(projectId);
  message("Cover image updated.", "success");
};

const saveMediaAlt = async (card: HTMLElement): Promise<void> => {
  if (!selectedProject || !card.dataset.mediaId) return;
  const projectId = selectedProject.id;
  const alt = card.querySelector<HTMLInputElement>("[data-media-alt]")?.value.trim() ?? "";
  const current = selectedProject.project_images.find((item) => item.id === card.dataset.mediaId);
  const { error } = await supabase.from("project_images").update({ alt: { en: alt, vi: current?.alt.vi ?? "" } }).eq("id", card.dataset.mediaId);
  if (error) throw error;
  await refreshSelectedProject(projectId);
  message("Image alt text saved.", "success");
};

const moveSavedMedia = async (mediaId: string, direction: "up" | "down"): Promise<void> => {
  if (!selectedProject) return;
  const projectId = selectedProject.id;
  const ordered = [...selectedProject.project_images].sort((a, b) => a.display_order - b.display_order);
  const index = ordered.findIndex((item) => item.id === mediaId);
  const moved = moveItem(ordered, index, direction);
  const results = await Promise.all(moved.map((item, order) => supabase.from("project_images").update({ display_order: order + 1 }).eq("id", item.id)));
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
  await refreshSelectedProject(projectId);
  message("Image order updated.", "success");
};

const deleteSavedMedia = async (mediaId: string): Promise<void> => {
  if (!selectedProject) return;
  const media = selectedProject.project_images.find((item) => item.id === mediaId);
  if (!media || !window.confirm("Delete this image from the project and Storage?")) return;
  const projectId = selectedProject.id;
  const { error: metadataError } = await supabase.from("project_images").delete().eq("id", mediaId);
  if (metadataError) throw metadataError;
  const { error: storageError } = await supabase.storage.from(supabaseConfig.storageBucket).remove([media.storage_path]);
  await refreshSelectedProject(projectId);
  if (storageError) throw new Error(`Image record deleted, but Storage cleanup failed: ${storageError.message}`);
  message("Image deleted.", "success");
};

const formText = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (value: string): string[] => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);

const readCvContentForm = (formElement: HTMLFormElement): CvContent => {
  const form = new FormData(formElement);
  return {
    version: formText(form, "cv_version") || cvContent.version,
    themeId: cvContent.themeId,
    pageOneProjectCount: Math.max(1, Number(form.get("page_one_project_count")) || 3),
    profile: {
      name: formText(form, "profile_name"),
      professionalTitle: { en: formText(form, "profile_title_en"), vi: formText(form, "profile_title_vi") },
      email: formText(form, "profile_email"), phone: formText(form, "profile_phone"),
      location: { en: formText(form, "profile_location_en"), vi: formText(form, "profile_location_vi") },
      summary: { en: formText(form, "profile_summary_en"), vi: formText(form, "profile_summary_vi") },
      photoPath: formText(form, "profile_photo"),
    },
    experiences: cvContent.experiences.map((item, index) => {
      const responsibilityLines = lines(formText(form, `experience_responsibilities_${index}`));
      return {
        id: formText(form, `experience_id_${index}`) || item.id,
        company: formText(form, `experience_company_${index}`),
        position: { en: formText(form, `experience_position_en_${index}`), vi: formText(form, `experience_position_vi_${index}`) },
        location: { en: formText(form, `experience_location_en_${index}`), vi: formText(form, `experience_location_vi_${index}`) },
        startDate: formText(form, `experience_start_${index}`),
        endDate: form.get(`experience_current_${index}`) === "true" ? null : formText(form, `experience_end_${index}`) || null,
        responsibilities: responsibilityLines.map((text, pointIndex) => ({ id: item.responsibilities[pointIndex]?.id ?? `${item.id}-${pointIndex + 1}`, text: { en: text, vi: item.responsibilities[pointIndex]?.text.vi ?? "" } })),
        technologies: commaList(formText(form, `experience_technologies_${index}`)),
      };
    }),
    education: cvContent.education.map((item, index) => {
      const classificationEn = formText(form, `education_classification_en_${index}`);
      const classificationVi = formText(form, `education_classification_vi_${index}`);
      return {
        id: formText(form, `education_id_${index}`) || item.id,
        field: { en: formText(form, `education_field_en_${index}`), vi: formText(form, `education_field_vi_${index}`) },
        institution: { en: formText(form, `education_institution_en_${index}`), vi: formText(form, `education_institution_vi_${index}`) },
        classification: classificationEn || classificationVi ? { en: classificationEn, vi: classificationVi } : undefined,
        startDate: formText(form, `education_start_${index}`), endDate: formText(form, `education_end_${index}`),
      };
    }),
    skillGroups: cvContent.skillGroups.map((group, index) => ({
      id: formText(form, `skill_id_${index}`) || group.id,
      title: { en: formText(form, `skill_title_en_${index}`), vi: formText(form, `skill_title_vi_${index}`) },
      items: lines(formText(form, `skill_items_${index}`)).map((label, itemIndex) => ({ id: group.items[itemIndex]?.id ?? `${group.id}-${itemIndex + 1}`, label: { en: label, vi: group.items[itemIndex]?.label.vi ?? label } })),
    })),
    languages: cvContent.languages.map((item, index) => {
      const proficiencyEn = formText(form, `language_proficiency_en_${index}`);
      const proficiencyVi = formText(form, `language_proficiency_vi_${index}`);
      return { id: formText(form, `language_id_${index}`) || item.id, name: { en: formText(form, `language_name_en_${index}`), vi: formText(form, `language_name_vi_${index}`) }, proficiency: proficiencyEn || proficiencyVi ? { en: proficiencyEn, vi: proficiencyVi } : undefined };
    }),
  };
};

const saveCvContentForm = async (formElement: HTMLFormElement): Promise<void> => {
  const content = readCvContentForm(formElement);
  await saveCvContent(content);
  cvContent = content;
  dashboardView();
  message("CV content saved. Open the draft preview to check the two-page layout.", "success");
};

const bindDashboard = (): void => {
  const passwordDialog = app.querySelector<HTMLDialogElement>("[data-password-dialog]");
  app.querySelectorAll<HTMLButtonElement>("[data-admin-view]").forEach((button) => button.addEventListener("click", () => {
    clearPendingMedia();
    activeView = button.dataset.adminView as AdminView;
    dashboardView();
  }));
  app.querySelector<HTMLButtonElement>("[data-present-toggle]")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const form = button.closest<HTMLFormElement>("form");
    const endDate = form?.elements.namedItem("end_date");
    const current = form?.elements.namedItem("is_current");
    if (!(endDate instanceof HTMLInputElement) || !(current instanceof HTMLInputElement)) return;
    const isPresent = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(isPresent));
    current.value = String(isPresent);
    endDate.disabled = isPresent;
    if (isPresent) endDate.value = "";
  });
  app.querySelectorAll<HTMLButtonElement>("[data-cv-present]").forEach((button) => button.addEventListener("click", () => {
    const index = button.dataset.cvPresent;
    const form = button.closest<HTMLFormElement>("form");
    const endDate = form?.elements.namedItem(`experience_end_${index}`);
    const current = form?.elements.namedItem(`experience_current_${index}`);
    if (!(endDate instanceof HTMLInputElement) || !(current instanceof HTMLInputElement)) return;
    const isPresent = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(isPresent));
    current.value = String(isPresent);
    endDate.disabled = isPresent;
    if (isPresent) endDate.value = "";
  }));
  app.querySelector("[data-add-experience]")?.addEventListener("click", () => {
    const form = app.querySelector<HTMLFormElement>("[data-cv-content-form]");
    if (form) cvContent = readCvContentForm(form);
    cvContent.experiences.push({ id: `experience-${crypto.randomUUID()}`, company: "", position: { en: "", vi: "" }, location: { en: "Viet Nam", vi: "Việt Nam" }, startDate: "", endDate: "", responsibilities: [], technologies: [] });
    dashboardView();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-remove-experience]").forEach((button) => button.addEventListener("click", () => {
    const form = app.querySelector<HTMLFormElement>("[data-cv-content-form]");
    if (form) cvContent = readCvContentForm(form);
    const index = Number(button.dataset.removeExperience);
    if (!Number.isInteger(index) || !window.confirm("Remove this work experience from the CV content draft?")) return;
    cvContent.experiences.splice(index, 1);
    dashboardView();
  }));
  app.querySelector<HTMLInputElement>('input[name="images"]')?.addEventListener("change", (event) => {
    const files = (event.currentTarget as HTMLInputElement).files;
    if (!files) return;
    try { choosePendingMedia(files); } catch (error) { message(error instanceof Error ? error.message : "Images could not be selected.", "error"); }
  });
  app.querySelectorAll<HTMLElement>("[data-media-id]").forEach((card) => {
    const mediaId = card.dataset.mediaId;
    if (!mediaId) return;
    card.querySelector("[data-media-cover]")?.addEventListener("click", () => { void setMediaCover(mediaId).catch((error: Error) => message(error.message, "error")); });
    card.querySelector("[data-media-save]")?.addEventListener("click", () => { void saveMediaAlt(card).catch((error: Error) => message(error.message, "error")); });
    card.querySelector("[data-media-delete]")?.addEventListener("click", () => { void deleteSavedMedia(mediaId).catch((error: Error) => message(error.message, "error")); });
    card.querySelectorAll<HTMLElement>("[data-media-move]").forEach((button) => button.addEventListener("click", () => { void moveSavedMedia(mediaId, button.dataset.mediaMove as "up" | "down").catch((error: Error) => message(error.message, "error")); }));
  });
  app.querySelector("[data-password-open]")?.addEventListener("click", () => passwordDialog?.showModal());
  app.querySelector("[data-password-close]")?.addEventListener("click", () => passwordDialog?.close());
  app.querySelector<HTMLFormElement>("[data-password-update-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const newPassword = String(form.get("new_password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    const status = formElement.querySelector<HTMLElement>("[data-password-message]");
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-password-update-submit]");
    const setStatus = (text: string, kind: "error" | "success" | "info" = "info"): void => {
      if (!status) return;
      status.textContent = text;
      status.dataset.kind = kind;
    };

    if (newPassword.length < 12) return setStatus("Use a password with at least 12 characters.", "error");
    if (newPassword !== confirmPassword) return setStatus("The passwords do not match.", "error");
    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Saving…";
    setStatus("Updating your Supabase Auth password…");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    submitButton.disabled = false;
    submitButton.textContent = "Save password";

    if (error) return setStatus(error.message, "error");

    formElement.reset();
    setStatus("Password updated. You can use Password sign-in next time.", "success");
  });
  app.querySelector("[data-sign-out]")?.addEventListener("click", async () => { await supabase.auth.signOut(); loginView(); });
  app.querySelector("[data-new-project]")?.addEventListener("click", () => { clearPendingMedia(); selectedProject = blankProject(); dashboardView(); });
  app.querySelector("[data-cancel]")?.addEventListener("click", () => { clearPendingMedia(); selectedProject = null; dashboardView(); });
  app.querySelectorAll<HTMLElement>("[data-edit]").forEach((button) => button.addEventListener("click", () => { clearPendingMedia(); selectedProject = projects.find((item) => item.id === button.dataset.edit) ?? null; dashboardView(); }));
  app.querySelectorAll<HTMLElement>("[data-status]").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.next === "published" && !window.confirm("Publish this project on the public website?")) return;
    const { error } = await supabase.from("projects").update({ status: button.dataset.next }).eq("id", button.dataset.status);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message(`Project changed to ${button.dataset.next}.`, "success");
  }));
  app.querySelectorAll<HTMLElement>("[data-tool-status]").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.next === "published" && !window.confirm("Publish this automation tool on the public website?")) return;
    const { error } = await supabase.from("automation_tools").update({ status: button.dataset.next }).eq("id", button.dataset.toolStatus);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message(`Tool changed to ${button.dataset.next}.`, "success");
  }));
  app.querySelectorAll<HTMLElement>("[data-tool-cv]").forEach((button) => button.addEventListener("click", async () => {
    const { error } = await supabase.from("automation_tools").update({ include_in_cv: button.dataset.next === "true" }).eq("id", button.dataset.toolCv);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message("Tool CV selection updated.", "success");
  }));
  app.querySelectorAll<HTMLInputElement>("[data-tool-cv-order]").forEach((input) => input.addEventListener("change", async () => {
    const { error } = await supabase.from("automation_tools").update({ cv_order: Math.max(1, Number(input.value) || 100) }).eq("id", input.dataset.toolCvOrder);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message("Tool CV order updated.", "success");
  }));
  app.querySelector("[data-import]")?.addEventListener("click", async () => {
    if (!window.confirm("Import starter CV/Portfolio records as drafts? Existing matching IDs will be updated.")) return;
    const projectRows = portfolioProjectSeed.map(toRow).map(({ project_images: _images, ...row }) => row);
    const projectResult = await supabase.from("projects").upsert(projectRows);
    if (projectResult.error) return message(projectResult.error.message, "error");
    const toolResult = await supabase.from("automation_tools").upsert(portfolioToolSeed.map((tool) => ({
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      problem: tool.problem,
      solution: tool.solution,
      benefit: tool.benefit ?? null,
      technologies: tool.technologies,
      featured: tool.featured,
      status: "draft",
      display_order: tool.displayOrder,
      include_in_portfolio: false,
      portfolio_order: tool.portfolioOrder,
      include_in_cv: tool.includeInCv,
      cv_order: tool.cvOrder,
    })));
    if (toolResult.error) return message(toolResult.error.message, "error");
    try { await saveCvContent(cvContentSeed); } catch (error) { return message(error instanceof Error ? error.message : "CV content could not be imported.", "error"); }
    await loadProjects(); dashboardView(); message("Starter projects and CV content imported as drafts.", "success");
  });
  app.querySelector<HTMLFormElement>("[data-project-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-upload-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void uploadImages(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-cv-content-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveCvContentForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector("[data-publish-cv]")?.addEventListener("click", () => {
    if (!window.confirm("Publish the current Admin data as the new public CV release?")) return;
    void publishCvRelease().then(() => message("CV release published.", "success")).catch((error: Error) => message(error.message, "error"));
  });
};

const initialize = async (): Promise<void> => {
  const access = await getAdminAccess();
  if (access === "signed-out") return loginView();
  if (access === "forbidden") {
    await supabase.auth.signOut();
    loginView();
    message("This account is not in the Portfolio admin allowlist.", "error");
    return;
  }

  const returnTo = safeReturnTo();
  if (returnTo) {
    window.location.replace(returnTo);
    return;
  }

  try {
    await loadProjects();
    dashboardView();
  } catch (error) {
    loginView();
    message(error instanceof Error ? error.message : "Admin data could not be loaded.", "error");
  }
};

void initialize();
