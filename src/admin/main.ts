import "@fontsource-variable/inter/wght.css";
import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/admin.css";
import "../styles/admin-cover-letter.css";
import "../styles/admin-documents.css";
import "../styles/admin-site.css";
import "../styles/admin-typography.css";
import "../styles/admin-ui.css";
import "../styles/cover-letter-screen.css";
import { supabaseConfig } from "../config/supabase";
import { getAdminAccess, magicLinkRedirectUrl, safeReturnTo } from "./auth";
import { bindAdminTablists, renderAdminSectionCard } from "./ui";
import { portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { escapeHtml } from "../shared/format";
import { supabase } from "../services/supabaseClient";
import type { CvProjectDisplay } from "../types/cvContent";
import type { PortfolioProject, PublicationStatus } from "../types/portfolio";
import {
  bindCoverLetterWorkspace,
  coverLetterSummary,
  coverLetterWorkspaceView,
  discardCoverLetterChanges,
  ensureCoverLetterWorkspace,
  markCoverLetterWorkspaceStale,
} from "./coverLetterWorkspace";
import {
  bindProfileDocumentWorkspace,
  discardProfileDocumentChanges,
  ensureProfileDocumentWorkspace,
  markProfileDocumentWorkspaceStale,
  profileDocumentWorkspaceView,
  type ProfileDocumentKind,
} from "./profileDocumentWorkspace";
import {
  bindSiteWorkspace,
  discardSiteChanges,
  ensureSiteWorkspace,
  markSiteWorkspaceStale,
  siteWorkspaceView,
  type SiteWorkspaceKind,
} from "./siteWorkspace";

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
  deleted_at: string | null;
  deleted_by: string | null;
  purge_after: string | null;
  deleted_from_status: PublicationStatus | null;
}

interface AdminToolRow {
  id: string;
  slug: string;
  name: string;
  problem: { en: string; vi: string };
  solution: { en: string; vi: string };
  benefit: { en: string; vi: string } | null;
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  include_in_cv: boolean;
  cv_order: number;
  tool_images: AdminMediaRow[];
  deleted_at: string | null;
  deleted_by: string | null;
  purge_after: string | null;
  deleted_from_status: PublicationStatus | null;
}

interface PendingMedia {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
  kind: "cover" | "gallery";
}

type AdminView = "overview" | "homepage" | "projects" | "tools" | "profile" | "cv" | "portfolio" | "cover-letters" | "trash";
type AdminItemType = "project" | "tool";
type ContentFilter = "all" | "project" | "tool";
type ContentStatusFilter = "all" | PublicationStatus;
type EditorTab = "overview" | "content" | "distribution" | "media";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");
document.documentElement.classList.add("admin-app");

let projects: AdminProjectRow[] = [];
let tools: AdminToolRow[] = [];
let selectedProject: AdminProjectRow | null = null;
let selectedTool: AdminToolRow | null = null;
let selectedItemType: AdminItemType = "project";
let activeView: AdminView = "overview";
let contentFilter: ContentFilter = "all";
let contentStatusFilter: ContentStatusFilter = "all";
let contentSearch = "";
let activeEditorTab: EditorTab = "overview";
let adminFormDirty = false;
let pendingMedia: PendingMedia[] = [];
let magicLinkCooldown: number | undefined;

window.addEventListener("beforeunload", (event) => {
  if (adminFormDirty) event.preventDefault();
});

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
  deleted_at: null,
  deleted_by: null,
  purge_after: null,
  deleted_from_status: null,
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
  deleted_at: null,
  deleted_by: null,
  purge_after: null,
  deleted_from_status: null,
});

const blankTool = (): AdminToolRow => ({
  id: crypto.randomUUID(),
  slug: "",
  name: "",
  problem: { en: "", vi: "" },
  solution: { en: "", vi: "" },
  benefit: null,
  technologies: [],
  featured: false,
  status: "draft",
  display_order: tools.length + 1,
  include_in_portfolio: false,
  portfolio_order: tools.length + 1,
  include_in_cv: false,
  cv_order: tools.length + 1,
  tool_images: [],
  deleted_at: null,
  deleted_by: null,
  purge_after: null,
  deleted_from_status: null,
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
  bindAdminTablists(app);
};

interface AdminContentListItem {
  id: string;
  type: AdminItemType;
  name: string;
  slug: string;
  status: PublicationStatus;
  deletedAt: string | null;
  purgeAfter: string | null;
}

const contentItems = (): AdminContentListItem[] => [
  ...projects.map((project) => ({
    id: project.id,
    type: "project" as const,
    name: project.name.en || "Untitled project",
    slug: project.slug || "No slug",
    status: project.status,
    deletedAt: project.deleted_at,
    purgeAfter: project.purge_after,
  })),
  ...tools.map((tool) => ({
    id: tool.id,
    type: "tool" as const,
    name: tool.name || "Untitled tool",
    slug: tool.slug || "No slug",
    status: tool.status,
    deletedAt: tool.deleted_at,
    purgeAfter: tool.purge_after,
  })),
];

const visibleContentItems = (): AdminContentListItem[] => {
  const query = contentSearch.trim().toLowerCase();
  const scope = activeView === "trash" ? "trash" : "active";
  const type: ContentFilter = activeView === "projects" ? "project" : activeView === "tools" ? "tool" : contentFilter;
  return contentItems().filter((item) => {
    if ((scope === "trash") !== Boolean(item.deletedAt)) return false;
    if (type !== "all" && item.type !== type) return false;
    if (scope === "active" && contentStatusFilter !== "all" && item.status !== contentStatusFilter) return false;
    return !query || item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query);
  });
};

const trashDaysRemaining = (purgeAfter: string | null): string => {
  if (!purgeAfter) return "Pending cleanup";
  const days = Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / 86_400_000));
  return days === 1 ? "1 day left" : `${days} days left`;
};

const isSelectedItem = (item: AdminContentListItem): boolean =>
  selectedItemType === item.type
  && (item.type === "project" ? selectedProject?.id === item.id : selectedTool?.id === item.id);

const contentList = (): string => {
  const items = visibleContentItems();
  if (!items.length) {
    return `<li class="admin-empty">${activeView === "trash" ? "Trash is empty." : "No content matches this view."}</li>`;
  }
  return items.map((item) => `
    <li class="admin-content-item ${isSelectedItem(item) ? "is-selected" : ""}">
      <button class="admin-content-item__select" type="button" data-select-item="${escapeHtml(item.id)}" data-item-type="${item.type}" aria-pressed="${isSelectedItem(item)}">
        ${activeView === "trash" ? `<span class="admin-content-item__type">${item.type}</span>` : ""}
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.slug)}</small>
      </button>
      <div class="admin-content-item__meta">
        <span class="status status--${item.status}">${item.status}</span>
        ${item.deletedAt ? `<small>${trashDaysRemaining(item.purgeAfter)}</small>` : ""}
      </div>
      ${item.deletedAt ? `<div class="admin-content-item__actions"><button type="button" data-restore-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Restore</button><button class="admin-danger" type="button" data-purge-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Delete permanently</button></div>` : ""}
    </li>`).join("");
};

const field = (label: string, name: string, value = "", type = "text"): string =>
  `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}"></label>`;

const publicMediaUrl = (path: string): string => supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path).data.publicUrl;

const mediaLibrary = (project: AdminProjectRow): string => {
  const media = [...project.project_images].sort((a, b) => a.display_order - b.display_order);
  if (!media.length) return '<p class="admin-empty">No saved images yet.</p>';
  return `<div class="admin-media-grid">${media.map((item, index) => `
    <article class="admin-media-card" data-media-id="${escapeHtml(item.id)}">
      <div class="admin-media-card__image"><img src="${escapeHtml(publicMediaUrl(item.storage_path))}" alt="${escapeHtml(item.alt.en)}"><span class="admin-media-badge admin-media-badge--${item.kind}">${item.kind}</span></div>
      <label>Alt text (EN)<input value="${escapeHtml(item.alt.en)}" data-media-alt></label>
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

const editorTab = (tab: EditorTab, label: string): string =>
  `<button type="button" role="tab" data-editor-tab="${tab}" aria-selected="${activeEditorTab === tab}" class="${activeEditorTab === tab ? "is-active" : ""}">${label}</button>`;

const panelState = (tab: EditorTab): string => activeEditorTab === tab ? "" : "hidden";

const editor = (project: AdminProjectRow): string => `
  <section class="admin-editor-shell">
    <div class="admin-editor__heading">
      <div><p class="section-kicker">${project.name.en ? "Edit project" : "New project"}</p><h2>${escapeHtml(project.name.en || "Untitled project")}</h2><div class="admin-editor__meta"><span class="status status--${project.status}">${project.status}</span><small data-unsaved-state>Saved</small></div></div>
      <div class="admin-editor__status">${projects.some((item) => item.id === project.id) ? `<button type="button" class="button button--secondary admin-action-publish" data-selected-status data-item-type="project" data-next="${project.status === "published" ? "draft" : "published"}">${project.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" class="admin-icon-button admin-danger" data-delete-selected aria-label="Move project to Trash">•••</button>` : ""}<button class="button admin-action-save" type="submit" form="project-editor">Save changes</button></div>
    </div>
    <nav class="admin-editor-tabs" role="tablist" aria-label="Project editor sections">${editorTab("overview", "Overview")}${editorTab("content", "Content EN / VI")}${editorTab("distribution", "Website, CV & Portfolio")}${editorTab("media", `Media (${project.project_images.length})`)}</nav>
    <form id="project-editor" class="admin-editor" data-project-form>
      <input name="id" type="hidden" value="${escapeHtml(project.id)}">
      <section class="admin-editor-panel" data-editor-panel="overview" ${panelState("overview")}>
        ${renderAdminSectionCard({
          title: "Project overview",
          note: "Edit identity, dates, slug and display order.",
          content: `<div class="admin-form-grid">
          ${field("Project name (EN) *", "name_en", project.name.en)}${field("Project name (VI)", "name_vi", project.name.vi)}
          ${field("Role (EN)", "role_en", project.role?.en ?? "")}${field("Role (VI)", "role_vi", project.role?.vi ?? "")}
          ${field("Location (EN)", "location_en", project.location.en)}${field("Location (VI)", "location_vi", project.location.vi)}
          ${field("Start", "start_date", project.start_date ?? "", "month")}
          <label>End date<span class="admin-end-date"><input name="end_date" type="month" value="${escapeHtml(project.end_date ?? "")}" ${project.is_current ? "disabled" : ""}><button type="button" data-present-toggle aria-pressed="${project.is_current}">Present</button><input name="is_current" type="hidden" value="${project.is_current ? "true" : "false"}"></span></label>
          ${field("Slug *", "slug", project.slug)}${field("Website order", "display_order", String(project.display_order), "number")}
        </div>`,
        })}
      </section>
      <section class="admin-editor-panel" data-editor-panel="content" ${panelState("content")}>
        ${renderAdminSectionCard({
          title: "Project content",
          note: "Edit paired EN and VI project descriptions.",
          content: `<div class="admin-form-grid"><label>Summary (EN)<textarea name="summary_en" rows="7">${escapeHtml(project.summary?.en ?? "")}</textarea></label><label>Summary (VI)<textarea name="summary_vi" rows="7">${escapeHtml(project.summary?.vi ?? "")}</textarea></label></div>
            <label>Responsibilities (one EN item per line)<textarea name="responsibilities" rows="9">${escapeHtml(project.responsibilities.map((item) => item.text.en).join("\n"))}</textarea></label>
            <label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(project.technologies.join(", "))}"></label>`,
        })}
      </section>
      <section class="admin-editor-panel" data-editor-panel="distribution" ${panelState("distribution")}>
        ${renderAdminSectionCard({
          title: "Project distribution",
          note: "Choose where this project appears and how it is displayed.",
          content: `<div class="admin-channel-grid">
          <article><div><strong>Website</strong><small>Public portfolio website</small></div><label class="admin-switch"><input name="featured" type="checkbox" ${project.featured ? "checked" : ""}><span>Featured project</span></label></article>
          <article><div><strong>Portfolio PDF</strong><small>Printable landscape portfolio</small></div><label class="admin-switch"><input name="include_in_portfolio" type="checkbox" ${project.include_in_portfolio ? "checked" : ""}><span>Include in Portfolio</span></label><label>Layout<select name="portfolio_layout"><option value="standard" ${project.portfolio_layout === "standard" ? "selected" : ""}>Standard</option><option value="feature" ${project.portfolio_layout === "feature" ? "selected" : ""}>Feature</option><option value="compact" ${project.portfolio_layout === "compact" ? "selected" : ""}>Compact</option></select></label><label>Order<input name="portfolio_order" type="number" value="${project.portfolio_order}"></label></article>
          <article><div><strong>Curriculum Vitae</strong><small>Published CV project selection</small></div><label class="admin-switch"><input name="include_in_cv" type="checkbox" ${project.include_in_cv ? "checked" : ""}><span>Include in CV</span></label><label>Display<select name="cv_display"><option value="detailed" ${project.cv_display === "detailed" ? "selected" : ""}>Detailed experience</option><option value="compact" ${project.cv_display === "compact" ? "selected" : ""}>Compact project list</option></select></label><label>Order<input name="cv_order" type="number" value="${project.cv_order}"></label><label class="admin-switch"><input name="cv_show_summary" type="checkbox" ${project.cv_show_summary ? "checked" : ""}><span>Show summary</span></label></article>
        </div>
        ${responsibilityOptions(project)}`,
        })}
      </section>
    </form>
    <div class="admin-media-panel" data-editor-panel="media" ${panelState("media")}>
      <form class="admin-upload admin-form-section" data-upload-form><div class="admin-section-heading"><h3 class="admin-form-section__title">Project media</h3><p class="admin-form-section__note" title="Select JPEG, PNG, WebP or AVIF files up to 5 MB.">Select JPEG, PNG, WebP or AVIF files up to 5 MB.</p></div><label>Choose images<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label><div data-upload-queue><p class="admin-empty">Selected images will appear here before upload.</p></div><button class="button button--secondary" type="submit" data-upload-submit disabled>Upload selected images</button></form>
      <section class="admin-upload admin-form-section admin-media-library"><div class="admin-section-heading"><h3 class="admin-form-section__title">Saved media</h3><p class="admin-form-section__note" title="Choose the cover image, alt text and gallery order.">Choose the cover image, alt text and gallery order.</p></div>${mediaLibrary(project)}</section>
    </div>
  </section>`;

const toolEditor = (tool: AdminToolRow): string => `
  <section class="admin-editor-shell">
    <div class="admin-editor__heading">
      <div><p class="section-kicker">${tool.name ? "Edit tool" : "New tool"}</p><h2>${escapeHtml(tool.name || "Untitled tool")}</h2><div class="admin-editor__meta"><span class="status status--${tool.status}">${tool.status}</span><small data-unsaved-state>Saved</small></div></div>
      <div class="admin-editor__status">${tools.some((item) => item.id === tool.id) ? `<button type="button" class="button button--secondary admin-action-publish" data-selected-status data-item-type="tool" data-next="${tool.status === "published" ? "draft" : "published"}">${tool.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" class="admin-icon-button admin-danger" data-delete-selected aria-label="Move tool to Trash">•••</button>` : ""}<button class="button admin-action-save" type="submit" form="tool-editor">Save changes</button></div>
    </div>
    <nav class="admin-editor-tabs" role="tablist" aria-label="Tool editor sections">${editorTab("overview", "Overview")}${editorTab("content", "Content EN / VI")}${editorTab("distribution", "Website, CV & Portfolio")}</nav>
    <form id="tool-editor" class="admin-editor" data-tool-form>
      <input name="id" type="hidden" value="${escapeHtml(tool.id)}">
      <section class="admin-editor-panel" data-editor-panel="overview" ${panelState("overview")}>
        ${renderAdminSectionCard({ title: "Tool overview", note: "Edit the tool name, slug, order and technologies.", content: `<div class="admin-form-grid">${field("Tool name *", "name", tool.name)}${field("Slug *", "slug", tool.slug)}${field("Website order", "display_order", String(tool.display_order), "number")}</div><label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(tool.technologies.join(", "))}"></label>` })}
      </section>
      <section class="admin-editor-panel" data-editor-panel="content" ${panelState("content")}>
        ${renderAdminSectionCard({ title: "Tool content", note: "Edit paired EN and VI problem, solution and benefit.", content: `<div class="admin-form-grid"><label>Problem (EN)<textarea name="problem_en" rows="6">${escapeHtml(tool.problem.en)}</textarea></label><label>Problem (VI)<textarea name="problem_vi" rows="6">${escapeHtml(tool.problem.vi)}</textarea></label><label>Solution (EN)<textarea name="solution_en" rows="6">${escapeHtml(tool.solution.en)}</textarea></label><label>Solution (VI)<textarea name="solution_vi" rows="6">${escapeHtml(tool.solution.vi)}</textarea></label><label>Benefit (EN)<textarea name="benefit_en" rows="5">${escapeHtml(tool.benefit?.en ?? "")}</textarea></label><label>Benefit (VI)<textarea name="benefit_vi" rows="5">${escapeHtml(tool.benefit?.vi ?? "")}</textarea></label></div>` })}
      </section>
      <section class="admin-editor-panel" data-editor-panel="distribution" ${panelState("distribution")}>
        ${renderAdminSectionCard({ title: "Tool distribution", note: "Choose where this tool appears.", content: `<div class="admin-channel-grid"><article><div><strong>Website</strong><small>Public automation tool page</small></div><label class="admin-switch"><input name="featured" type="checkbox" ${tool.featured ? "checked" : ""}><span>Featured tool</span></label></article><article><div><strong>Portfolio PDF</strong><small>Printable portfolio</small></div><label class="admin-switch"><input name="include_in_portfolio" type="checkbox" ${tool.include_in_portfolio ? "checked" : ""}><span>Include in Portfolio</span></label><label>Order<input name="portfolio_order" type="number" value="${tool.portfolio_order}"></label></article><article><div><strong>Curriculum Vitae</strong><small>Published CV</small></div><label class="admin-switch"><input name="include_in_cv" type="checkbox" ${tool.include_in_cv ? "checked" : ""}><span>Include in CV</span></label><label>Order<input name="cv_order" type="number" value="${tool.cv_order}"></label></article></div>` })}
      </section>
    </form>
  </section>`;

const selectedTrashItem = (): AdminContentListItem | null => {
  const selectedId = selectedItemType === "project" ? selectedProject?.id : selectedTool?.id;
  return contentItems().find((item) => item.type === selectedItemType && item.id === selectedId && item.deletedAt) ?? null;
};

const trashInspector = (item: AdminContentListItem): string => `
  <section class="admin-editor admin-trash-detail">
    <div class="admin-editor__heading"><div><p class="section-kicker">${item.type} in Trash</p><h2>${escapeHtml(item.name)}</h2><p>This item is hidden from active Website, Portfolio and CV draft data.</p></div><span class="status status--archived">Trash</span></div>
    <dl><div><dt>Deleted</dt><dd>${item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "Unknown"}</dd></div><div><dt>Permanent deletion</dt><dd>${item.purgeAfter ? new Date(item.purgeAfter).toLocaleString() : "Pending cleanup"} (${trashDaysRemaining(item.purgeAfter)})</dd></div></dl>
    <div class="admin-actions"><button class="button" type="button" data-restore-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Restore as draft</button><button class="button admin-button--danger" type="button" data-purge-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Delete permanently</button></div>
  </section>`;

const overviewView = (): string => {
  const activeProjects = projects.filter((item) => !item.deleted_at);
  const activeTools = tools.filter((item) => !item.deleted_at);
  const activeItems = [...activeProjects, ...activeTools];
  const published = activeItems.filter((item) => item.status === "published").length;
  const drafts = activeItems.filter((item) => item.status === "draft").length;
  const trash = [...projects, ...tools].filter((item) => item.deleted_at).length;
  const letters = coverLetterSummary();
  const needsAttention = activeItems.filter((item) => item.status !== "published").slice(0, 6);
  return `
    <section class="admin-overview">
      <div class="admin-page-heading"><div><p class="section-kicker">Workspace overview</p><h1>Content dashboard</h1><p>Manage website content, CV data and publish-ready documents from one place.</p></div></div>
      <div class="admin-metric-grid">
        <article><span>Active projects</span><strong>${activeProjects.length}</strong><button type="button" data-admin-view="projects">View projects</button></article>
        <article><span>Automation tools</span><strong>${activeTools.length}</strong><button type="button" data-admin-view="tools">View tools</button></article>
        <article><span>Published items</span><strong>${published}</strong><small>${drafts} drafts still being prepared</small></article>
        <article><span>Cover letters</span><strong>${letters.loaded ? letters.total : "—"}</strong><button type="button" data-admin-view="cover-letters">${letters.loaded ? `${letters.drafts} drafts · ${letters.final} final` : "Open workspace"}</button></article>
        <article class="${trash ? "has-warning" : ""}"><span>Trash</span><strong>${trash}</strong><button type="button" data-admin-view="trash">Review trash</button></article>
      </div>
      <div class="admin-overview-grid">
        <section class="admin-overview-card admin-overview-card--attention${needsAttention.length ? "" : " is-empty"}"><div class="admin-card-heading"><div><h2>Needs attention</h2><p>Draft and archived content that is not public.</p></div><span>${needsAttention.length}</span></div>
          <div class="admin-attention-list">${needsAttention.length ? needsAttention.map((item) => { const isTool = typeof item.name === "string"; const itemName = isTool ? String(item.name) : (item.name as { en: string }).en; return `<button type="button" data-select-item="${escapeHtml(item.id)}" data-item-type="${isTool ? "tool" : "project"}"><span><strong>${escapeHtml(itemName)}</strong><small>${escapeHtml(item.slug)}</small></span><span class="status status--${item.status}">${item.status}</span></button>`; }).join("") : '<div class="admin-empty-state"><span aria-hidden="true">&#10003;</span><div><strong>Everything is published</strong><small>No draft or archived content needs attention.</small></div></div>'}</div>
        </section>
        <section class="admin-overview-card"><div class="admin-card-heading"><div><h2>Publishing workflow</h2><p>A shared path for Website, CV and Portfolio.</p></div></div><ol class="admin-workflow"><li><span>1</span><div><strong>Edit shared content</strong><small>Update Professional Profile, projects and tools once.</small></div></li><li><span>2</span><div><strong>Review channel preview</strong><small>Check Website or document output inside Admin.</small></div></li><li><span>3</span><div><strong>Publish release</strong><small>Freeze a new read-only public snapshot.</small></div></li></ol></section>
      </div>
    </section>`;
};

const workspaceView = (): string => {
  if (activeView === "overview") return overviewView();
  if (activeView === "homepage") return siteWorkspaceView("homepage");
  if (activeView === "profile") return siteWorkspaceView("profile");
  if (activeView === "cv") return profileDocumentWorkspaceView("cv");
  if (activeView === "portfolio") return profileDocumentWorkspaceView("portfolio");
  if (activeView === "cover-letters") return coverLetterWorkspaceView();
  if (activeView === "trash") {
    const item = selectedTrashItem();
    return item ? trashInspector(item) : '<section class="admin-placeholder admin-placeholder--centered"><div class="admin-placeholder__icon" aria-hidden="true">↺</div><div><p class="section-kicker">Trash</p><h2>Select an item to review</h2><p>Restore it as a draft or delete it permanently.</p></div></section>';
  }
  if (activeView === "tools") return toolEditor(selectedTool ?? blankTool());
  return editor(selectedProject ?? blankProject());
};

const selectedContentSummary = (): { type: AdminItemType; name: string; status: PublicationStatus; persisted: boolean; deleted: boolean } | null => {
  if (selectedItemType === "tool" && selectedTool) {
    return { type: "tool", name: selectedTool.name || "Untitled tool", status: selectedTool.status, persisted: tools.some((item) => item.id === selectedTool?.id), deleted: Boolean(selectedTool.deleted_at) };
  }
  if (selectedItemType === "project" && selectedProject) {
    return { type: "project", name: selectedProject.name.en || "Untitled project", status: selectedProject.status, persisted: projects.some((item) => item.id === selectedProject?.id), deleted: Boolean(selectedProject.deleted_at) };
  }
  return null;
};

const dashboardView = (): void => {
  const trashCount = projects.filter((item) => item.deleted_at).length + tools.filter((item) => item.deleted_at).length;
  const showCollection = activeView === "projects" || activeView === "tools" || activeView === "trash";
  const viewTitle: Record<AdminView, string> = { overview: "Overview", homepage: "Homepage", projects: "Projects", tools: "Automation tools", profile: "Professional Profile", cv: "Curriculum Vitae", portfolio: "Portfolio", "cover-letters": "Cover letters", trash: "Trash" };
  const collectionTitle = activeView === "projects" ? "Projects" : activeView === "tools" ? "Tools" : "Deleted items";
  const collectionCount = visibleContentItems().length;
  const navButton = (view: AdminView, label: string, marker: string): string => `<button type="button" data-admin-view="${view}" class="${activeView === view ? "is-active" : ""}"><span aria-hidden="true">${marker}</span>${label}${view === "trash" && trashCount ? `<b>${trashCount}</b>` : ""}</button>`;
  app.innerHTML = `
    <main class="admin-shell">
      <aside class="admin-rail">
        <a class="admin-brand" href="${import.meta.env.BASE_URL}admin/"><span>HDL</span><div><strong>Content Admin</strong><small>Portfolio workspace</small></div></a>
        <nav class="admin-nav" aria-label="Admin sections">
          <p>Overview</p>${navButton("overview", "Dashboard", "01")}
          <p>Website</p>${navButton("homepage", "Homepage", "02")}${navButton("projects", "Projects", "03")}${navButton("tools", "Automation tools", "04")}
          <p>Profile & documents</p>${navButton("profile", "Professional Profile", "05")}${navButton("cv", "Curriculum Vitae", "06")}${navButton("portfolio", "Portfolio", "07")}
          <p>Applications</p>${navButton("cover-letters", "Cover letters", "08")}
          <p>System</p>${navButton("trash", "Trash", "09")}
        </nav>
        <div class="admin-rail__footer"><button type="button" data-password-open>Account security</button><button type="button" data-sign-out>Sign out</button></div>
      </aside>
      <section class="admin-main">
        <header class="admin-header"><div><small>HDL Admin /</small><strong>${viewTitle[activeView]}</strong></div><p class="admin-message" data-admin-message role="status" aria-live="polite">Ready</p><a class="button button--secondary" href="${import.meta.env.BASE_URL}" target="_blank" rel="noreferrer">View website</a></header>
        <div class="admin-layout ${showCollection ? "has-collection" : ""}">
          ${showCollection ? `<aside class="admin-collection">
            <div class="admin-collection__heading"><div><small>Content</small><h2>${collectionTitle} <span>${collectionCount}</span></h2></div>${activeView === "projects" ? '<button class="button admin-action-new" type="button" data-new-project>+ New</button>' : activeView === "tools" ? '<button class="button admin-action-new" type="button" data-new-tool>+ New</button>' : ""}</div>
            <div class="admin-list-controls">
              <label class="admin-search"><span class="sr-only">Search content</span><input type="search" placeholder="Search by name or slug..." value="${escapeHtml(contentSearch)}" data-content-search></label>
              ${activeView === "trash" ? `<div class="admin-filter-row" aria-label="Content type">${(["all", "project", "tool"] as ContentFilter[]).map((filter) => `<button type="button" data-content-filter="${filter}" class="${contentFilter === filter ? "is-active" : ""}">${filter === "all" ? "All" : filter === "project" ? "Projects" : "Tools"}</button>`).join("")}</div>` : `<div class="admin-filter-row" aria-label="Publication status">${(["all", "draft", "published", "archived"] as ContentStatusFilter[]).map((filter) => `<button type="button" data-status-filter="${filter}" class="${contentStatusFilter === filter ? "is-active" : ""}">${filter}</button>`).join("")}</div>`}
            </div>
            <div class="admin-collection__scroll"><ul class="admin-content-list" data-content-list>${contentList()}</ul></div>
            ${activeView === "projects" ? '<details class="admin-more"><summary>More actions</summary><button type="button" data-import>Import starter data</button></details>' : ""}
          </aside>` : ""}
          <section class="admin-workspace">${workspaceView()}</section>
        </div>
      </section>
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
  bindAdminTablists(app);
};

const loadProjects = async (): Promise<void> => {
  const selectedProjectId = selectedProject?.id;
  const selectedToolId = selectedTool?.id;
  const selectedProjectWasPersisted = Boolean(selectedProjectId && projects.some((item) => item.id === selectedProjectId));
  const selectedToolWasPersisted = Boolean(selectedToolId && tools.some((item) => item.id === selectedToolId));
  const [projectResult, toolResult] = await Promise.all([
    supabase.from("projects").select("*, project_images(*)").order("display_order"),
    supabase.from("automation_tools").select("*, tool_images(*)").order("display_order"),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  projects = (projectResult.data as AdminProjectRow[]).map((item) => ({ ...item, deleted_at: item.deleted_at ?? null, deleted_by: item.deleted_by ?? null, purge_after: item.purge_after ?? null, deleted_from_status: item.deleted_from_status ?? null }));
  tools = (toolResult.data as AdminToolRow[]).map((item) => ({ ...item, tool_images: item.tool_images ?? [], deleted_at: item.deleted_at ?? null, deleted_by: item.deleted_by ?? null, purge_after: item.purge_after ?? null, deleted_from_status: item.deleted_from_status ?? null }));
  if (selectedProjectWasPersisted) selectedProject = projects.find((item) => item.id === selectedProjectId) ?? null;
  if (selectedToolWasPersisted) selectedTool = tools.find((item) => item.id === selectedToolId) ?? null;
  markSiteWorkspaceStale();
  markProfileDocumentWorkspaceStale();
  markCoverLetterWorkspaceStale();
};

const saveForm = async (formElement: HTMLFormElement): Promise<void> => {
  const form = new FormData(formElement);
  const current = projects.find((item) => item.id === String(form.get("id"))) ?? selectedProject ?? blankProject();
  const nameEn = String(form.get("name_en") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || nameEn);
  if (!nameEn || !slug) throw new Error("Name (EN) and slug are required.");
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
  adminFormDirty = false;
  await loadProjects();
  selectedProject = projects.find((item) => item.id === payload.id) ?? payload;
  dashboardView();
  message("Project saved. Status was not changed.", "success");
};

const saveToolForm = async (formElement: HTMLFormElement): Promise<void> => {
  const form = new FormData(formElement);
  const current = tools.find((item) => item.id === String(form.get("id"))) ?? selectedTool ?? blankTool();
  const name = formText(form, "name");
  const slug = slugify(formText(form, "slug") || name);
  if (!name || !slug) throw new Error("Tool name and slug are required.");
  const benefitEn = formText(form, "benefit_en");
  const benefitVi = formText(form, "benefit_vi");
  const payload: AdminToolRow = {
    ...current,
    id: formText(form, "id"),
    slug,
    name,
    problem: { en: formText(form, "problem_en"), vi: formText(form, "problem_vi") },
    solution: { en: formText(form, "solution_en"), vi: formText(form, "solution_vi") },
    benefit: benefitEn || benefitVi ? { en: benefitEn, vi: benefitVi } : null,
    technologies: commaList(formText(form, "technologies")),
    featured: form.get("featured") === "on",
    display_order: Number(form.get("display_order")) || 100,
    include_in_portfolio: form.get("include_in_portfolio") === "on",
    portfolio_order: Number(form.get("portfolio_order")) || 100,
    include_in_cv: form.get("include_in_cv") === "on",
    cv_order: Number(form.get("cv_order")) || 100,
  };
  const { tool_images: _toolImages, ...toolPayload } = payload;
  const { error } = await supabase.from("automation_tools").upsert(toolPayload);
  if (error) throw error;
  adminFormDirty = false;
  await loadProjects();
  selectedTool = tools.find((item) => item.id === payload.id) ?? payload;
  selectedItemType = "tool";
  dashboardView();
  message("Tool saved. Status was not changed.", "success");
};

const moveSelectedToTrash = async (): Promise<void> => {
  const selected = selectedContentSummary();
  if (!selected) return;
  if (!selected.persisted) {
    clearPendingMedia();
    if (selected.type === "project") selectedProject = null;
    else selectedTool = null;
    dashboardView();
    message("Unsaved draft discarded.", "success");
    return;
  }
  const id = selected.type === "project" ? selectedProject?.id : selectedTool?.id;
  if (!id || !window.confirm(`Move ${selected.type} “${selected.name}” to Trash? It will be hidden from active Website, Portfolio and CV draft data, and permanently deleted after 30 days.`)) return;
  const { error } = await supabase.rpc("move_admin_item_to_trash", { target_type: selected.type, target_id: id });
  if (error) throw error;
  clearPendingMedia();
  selectedProject = null;
  selectedTool = null;
  await loadProjects();
  dashboardView();
  message(`${selected.type === "project" ? "Project" : "Tool"} moved to Trash. Republish the CV if this item exists in the current public release.`, "success");
};

const restoreTrashItem = async (type: AdminItemType, id: string): Promise<void> => {
  const { error } = await supabase.rpc("restore_admin_item_from_trash", { target_type: type, target_id: id });
  if (error) throw error;
  await loadProjects();
  activeView = type === "project" ? "projects" : "tools";
  selectedItemType = type;
  if (type === "project") {
    selectedProject = projects.find((item) => item.id === id) ?? null;
    selectedTool = null;
  } else {
    selectedTool = tools.find((item) => item.id === id) ?? null;
    selectedProject = null;
  }
  dashboardView();
  message(`${type === "project" ? "Project" : "Tool"} restored as draft.`, "success");
};

const permanentlyDeleteTrashItem = async (type: AdminItemType, id: string): Promise<void> => {
  const item = contentItems().find((candidate) => candidate.type === type && candidate.id === id);
  if (!item?.deletedAt || !window.confirm(`Permanently delete ${type} “${item.name}”? This cannot be undone.`)) return;
  const media = type === "project"
    ? projects.find((project) => project.id === id)?.project_images ?? []
    : tools.find((tool) => tool.id === id)?.tool_images ?? [];
  const paths = media.map((entry) => entry.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(supabaseConfig.storageBucket).remove(paths);
    if (storageError) throw new Error(`Storage cleanup failed, so the record was kept in Trash: ${storageError.message}`);
  }
  const { error } = await supabase.rpc("purge_admin_item", { target_type: type, target_id: id });
  if (error) throw error;
  if (type === "project" && selectedProject?.id === id) selectedProject = null;
  if (type === "tool" && selectedTool?.id === id) selectedTool = null;
  await loadProjects();
  dashboardView();
  message(`${type === "project" ? "Project" : "Tool"} permanently deleted.`, "success");
};

const changeSelectedStatus = async (type: AdminItemType, next: PublicationStatus): Promise<void> => {
  const id = type === "project" ? selectedProject?.id : selectedTool?.id;
  if (!id) return;
  if (next === "published" && !window.confirm(`Publish this ${type} on the public website?`)) return;
  const table = type === "project" ? "projects" : "automation_tools";
  const { error } = await supabase.from(table).update({ status: next }).eq("id", id).is("deleted_at", null);
  if (error) throw error;
  await loadProjects();
  dashboardView();
  message(`${type === "project" ? "Project" : "Tool"} changed to ${next}.`, "success");
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
      <label>Alt text (EN)<input value="${escapeHtml(item.alt)}" data-pending-alt></label>
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
const commaList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);

const bindContentItemActions = (root: ParentNode = app): void => {
  root.querySelectorAll<HTMLElement>("[data-select-item]").forEach((button) => button.addEventListener("click", () => {
    if (adminFormDirty && !window.confirm("Discard unsaved changes and open another item?")) return;
    const type = button.dataset.itemType as AdminItemType;
    const id = button.dataset.selectItem;
    if (!id) return;
    adminFormDirty = false;
    activeEditorTab = "overview";
    activeView = type === "project" ? "projects" : "tools";
    clearPendingMedia();
    selectedItemType = type;
    if (type === "project") {
      selectedProject = projects.find((item) => item.id === id) ?? null;
      selectedTool = null;
    } else {
      selectedTool = tools.find((item) => item.id === id) ?? null;
      selectedProject = null;
    }
    dashboardView();
  }));
  root.querySelectorAll<HTMLElement>("[data-restore-item]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.itemType as AdminItemType;
    const id = button.dataset.restoreItem;
    if (id) void restoreTrashItem(type, id).catch((error: Error) => message(error.message, "error"));
  }));
  root.querySelectorAll<HTMLElement>("[data-purge-item]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.itemType as AdminItemType;
    const id = button.dataset.purgeItem;
    if (id) void permanentlyDeleteTrashItem(type, id).catch((error: Error) => message(error.message, "error"));
  }));
};

const bindDashboard = (): void => {
  const passwordDialog = app.querySelector<HTMLDialogElement>("[data-password-dialog]");
  app.querySelectorAll<HTMLButtonElement>("[data-admin-view]").forEach((button) => button.addEventListener("click", () => {
    if (adminFormDirty && !window.confirm("Discard unsaved changes and leave this editor?")) return;
    if (activeView === "cover-letters") discardCoverLetterChanges();
    if (activeView === "cv" || activeView === "portfolio") discardProfileDocumentChanges();
    if (activeView === "homepage" || activeView === "profile") discardSiteChanges();
    clearPendingMedia();
    const nextView = button.dataset.adminView as AdminView;
    activeView = nextView;
    adminFormDirty = false;
    activeEditorTab = "overview";
    if (activeView === "projects") {
      selectedItemType = "project";
      selectedTool = null;
    } else if (activeView === "tools") {
      selectedItemType = "tool";
      selectedProject = null;
    } else if (activeView === "trash") {
      selectedProject = null;
      selectedTool = null;
    }
    const url = new URL(window.location.href);
    if (nextView === "cover-letters" || nextView === "cv" || nextView === "portfolio" || nextView === "homepage" || nextView === "profile") url.searchParams.set("view", nextView);
    else {
      url.searchParams.delete("view");
      url.searchParams.delete("id");
    }
    window.history.replaceState({}, "", url);
    dashboardView();
    if (nextView === "cover-letters") {
      void ensureCoverLetterWorkspace().then(() => {
        if (activeView === "cover-letters") dashboardView();
      });
    }
    if (nextView === "cv" || nextView === "portfolio") {
      void ensureProfileDocumentWorkspace(nextView).then(() => {
        if (activeView === nextView) dashboardView();
      });
    }
    if (nextView === "homepage" || nextView === "profile") {
      void ensureSiteWorkspace().then(() => {
        if (activeView === nextView) dashboardView();
      });
    }
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-editor-tab]").forEach((button) => button.addEventListener("click", () => {
    activeEditorTab = button.dataset.editorTab as EditorTab;
    app.querySelectorAll<HTMLButtonElement>("[data-editor-tab]").forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    app.querySelectorAll<HTMLElement>("[data-editor-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.editorPanel !== activeEditorTab;
    });
  }));
  const markDirty = (): void => {
    adminFormDirty = true;
    const state = app.querySelector<HTMLElement>("[data-unsaved-state]");
    if (state) {
      state.textContent = "Unsaved changes";
      state.dataset.dirty = "true";
    }
  };
  app.querySelectorAll<HTMLFormElement>("[data-project-form], [data-tool-form]").forEach((form) => {
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
  });
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
  app.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
    if (adminFormDirty && !window.confirm("Discard unsaved changes and sign out?")) return;
    await supabase.auth.signOut();
    loginView();
  });
  app.querySelector("[data-new-project]")?.addEventListener("click", () => {
    if (adminFormDirty && !window.confirm("Discard unsaved changes and create a new project?")) return;
    clearPendingMedia(); adminFormDirty = false; activeEditorTab = "overview"; activeView = "projects"; selectedItemType = "project"; selectedTool = null; selectedProject = blankProject(); dashboardView();
  });
  app.querySelector("[data-new-tool]")?.addEventListener("click", () => {
    if (adminFormDirty && !window.confirm("Discard unsaved changes and create a new tool?")) return;
    clearPendingMedia(); adminFormDirty = false; activeEditorTab = "overview"; activeView = "tools"; selectedItemType = "tool"; selectedProject = null; selectedTool = blankTool(); dashboardView();
  });
  app.querySelector("[data-delete-selected]")?.addEventListener("click", () => { void moveSelectedToTrash().catch((error: Error) => message(error.message, "error")); });
  app.querySelectorAll<HTMLButtonElement>("[data-content-filter]").forEach((button) => button.addEventListener("click", () => { contentFilter = button.dataset.contentFilter as ContentFilter; dashboardView(); }));
  app.querySelectorAll<HTMLButtonElement>("[data-status-filter]").forEach((button) => button.addEventListener("click", () => { contentStatusFilter = button.dataset.statusFilter as ContentStatusFilter; dashboardView(); }));
  app.querySelector<HTMLInputElement>("[data-content-search]")?.addEventListener("input", (event) => {
    contentSearch = (event.currentTarget as HTMLInputElement).value;
    const list = app.querySelector<HTMLElement>("[data-content-list]");
    if (list) {
      list.innerHTML = contentList();
      bindContentItemActions(list);
    }
  });
  app.querySelectorAll<HTMLButtonElement>("[data-selected-status]").forEach((button) => button.addEventListener("click", () => {
    void changeSelectedStatus(button.dataset.itemType as AdminItemType, button.dataset.next as PublicationStatus).catch((error: Error) => message(error.message, "error"));
  }));
  bindContentItemActions();
  app.querySelector("[data-import]")?.addEventListener("click", async () => {
    if (!window.confirm("Import starter CV/Portfolio records as drafts? Existing matching IDs will be updated.")) return;
    const projectRows = portfolioProjectSeed.map(toRow).map(({ project_images: _images, deleted_at: _deletedAt, deleted_by: _deletedBy, purge_after: _purgeAfter, deleted_from_status: _deletedFromStatus, ...row }) => row);
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
    await loadProjects(); dashboardView(); message("Starter projects and tools imported as drafts.", "success");
  });
  app.querySelector<HTMLFormElement>("[data-project-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-tool-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveToolForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-upload-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void uploadImages(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  if (activeView === "cover-letters") {
    bindCoverLetterWorkspace(app, {
      rerender: dashboardView,
      setDirty: (value) => { adminFormDirty = value; },
      notify: message,
    });
  }
  if (activeView === "cv" || activeView === "portfolio") {
    bindProfileDocumentWorkspace(app, activeView as ProfileDocumentKind, {
      rerender: dashboardView,
      setDirty: (value) => { adminFormDirty = value; },
      notify: message,
    });
  }
  if (activeView === "homepage" || activeView === "profile") {
    bindSiteWorkspace(app, activeView as SiteWorkspaceKind, {
      rerender: dashboardView,
      setDirty: (value) => { adminFormDirty = value; },
      notify: message,
    });
  }
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
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view");
    if (requestedView === "cover-letters") {
      activeView = "cover-letters";
      await ensureCoverLetterWorkspace();
    } else if (requestedView === "cv" || requestedView === "portfolio") {
      activeView = requestedView;
      await ensureProfileDocumentWorkspace(requestedView);
    } else if (requestedView === "homepage" || requestedView === "profile") {
      activeView = requestedView;
      await ensureSiteWorkspace();
    }
    dashboardView();
    if (activeView === "overview") {
      void ensureCoverLetterWorkspace().then(() => {
        if (activeView === "overview" && !adminFormDirty) dashboardView();
      });
    }
  } catch (error) {
    loginView();
    message(error instanceof Error ? error.message : "Admin data could not be loaded.", "error");
  }
};

void initialize();
