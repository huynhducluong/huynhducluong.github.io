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
import { bindAdminTablists, bindAdminYearPickers, formatAdminDateTime, renderAdminSectionCard } from "./ui";
import { clearAdminToasts, showAdminToast } from "./toast";
import { confirmAdmin } from "./confirmDialog";
import { bindProjectCoverCropper, renderProjectCoverCropDialog } from "./projectCoverCropper";
import { escapeHtml } from "../shared/format";
import { normalizeYouTubeUrl } from "../shared/youtube";
import { supabase } from "../services/supabaseClient";
import { downloadStoredMedia, type ProjectImageCropRow } from "../services/projectCoverCropRepository";
import { loadAdminSchemaHealth, removeUnreferencedStoragePaths, type AdminSchemaHealth } from "../services/adminSystemRepository";
import { projectFromRow, toolFromRow, type ProjectRow, type ToolRow } from "../services/supabasePortfolioRepository";
import type { CvProjectDisplay } from "../types/cvContent";
import type { PublicationStatus } from "../types/portfolio";
import { validateProjectReadiness, validateToolReadiness, type ContentValidationResult } from "./contentValidation";
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
  caption: { en: string; vi: string } | null;
  kind: "cover" | "gallery";
  display_order: number;
  mime_type: string | null;
  file_size: number | null;
  project_image_crops?: ProjectImageCropRow[];
}

interface AdminProjectRow {
  id: string;
  slug: string;
  youtube_url: string | null;
  name: { en: string; vi: string };
  location: { en: string; vi: string };
  role: { en: string; vi: string } | null;
  summary: { en: string; vi: string } | null;
  challenge: { en: string; vi: string } | null;
  approach: { en: string; vi: string } | null;
  outcome: { en: string; vi: string } | null;
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
  youtube_url: string | null;
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
  altEn: string;
  altVi: string;
  captionEn: string;
  captionVi: string;
  kind: "cover" | "gallery";
}

type AdminView = "overview" | "homepage" | "projects" | "tools" | "profile" | "cv" | "portfolio" | "cover-letters" | "trash";
type AdminItemType = "project" | "tool";
type ContentFilter = "all" | "project" | "tool";
type ContentStatusFilter = "all" | PublicationStatus;
type EditorTab = "overview" | "content" | "media";
type CollectionView = "projects" | "tools" | "trash";
type ReorderMovement = "up" | "down" | "first" | "last" | { targetId: string };
type CollectionFocusTarget = "select" | "up" | "down" | "more";

interface CollectionRevealIntent {
  view: CollectionView;
  itemId: string;
  align: "nearest" | "center";
  focus: CollectionFocusTarget;
}

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
let contentEditorDirty = false;
let dirtyMediaIds = new Set<string>();
let pendingMedia: PendingMedia[] = [];
let adminSchemaHealth: AdminSchemaHealth = { healthy: false, version: "unknown", message: "Schema health has not been checked." };
let magicLinkCooldown: number | undefined;
let reorderBusy = false;
let navigationSequence = 0;
let dashboardRenderSequence = 0;
let pendingCollectionReveal: CollectionRevealIntent | null = null;
const collectionScrollPositions: Record<CollectionView, number> = { projects: 0, tools: 0, trash: 0 };

const captureCollectionScroll = (): void => {
  const scroller = app.querySelector<HTMLElement>("[data-collection-view]");
  const view = scroller?.dataset.collectionView as CollectionView | undefined;
  if (scroller && view && view in collectionScrollPositions) collectionScrollPositions[view] = scroller.scrollTop;
};

const resetCurrentCollectionScroll = (): void => {
  const scroller = app.querySelector<HTMLElement>("[data-collection-view]");
  const view = scroller?.dataset.collectionView as CollectionView | undefined;
  if (!scroller || !view || !(view in collectionScrollPositions)) return;
  scroller.scrollTop = 0;
  collectionScrollPositions[view] = 0;
};

const ensureCollectionItemVisible = (
  scroller: HTMLElement,
  row: HTMLElement,
  align: CollectionRevealIntent["align"],
): void => {
  const viewport = scroller.getBoundingClientRect();
  const bounds = row.getBoundingClientRect();
  if (align === "center") {
    scroller.scrollTop += bounds.top - viewport.top - ((scroller.clientHeight - bounds.height) / 2);
    return;
  }
  const inset = 8;
  if (bounds.top < viewport.top + inset) scroller.scrollTop += bounds.top - viewport.top - inset;
  else if (bounds.bottom > viewport.bottom - inset) scroller.scrollTop += bounds.bottom - viewport.bottom + inset;
};

const restoreCollectionScroll = (renderId: number): void => {
  const view = activeView as CollectionView;
  if (!(view in collectionScrollPositions)) return;
  requestAnimationFrame(() => {
    if (renderId !== dashboardRenderSequence || activeView !== view) return;
    const scroller = app.querySelector<HTMLElement>(`[data-collection-view="${view}"]`);
    if (!scroller) return;
    scroller.scrollTop = collectionScrollPositions[view];
    const intent = pendingCollectionReveal?.view === view ? pendingCollectionReveal : null;
    if (!intent) return;
    const row = Array.from(scroller.querySelectorAll<HTMLElement>("[data-content-item]")).find((item) => item.dataset.contentItem === intent.itemId);
    if (row) {
      ensureCollectionItemVisible(scroller, row, intent.align);
      const focusSelector: Record<CollectionFocusTarget, string> = {
        select: "[data-select-item]",
        up: '[data-reorder-direction="up"]',
        down: '[data-reorder-direction="down"]',
        more: "[data-reorder-menu-trigger]",
      };
      row.querySelector<HTMLElement>(focusSelector[intent.focus])?.focus({ preventScroll: true });
      collectionScrollPositions[view] = scroller.scrollTop;
    }
    pendingCollectionReveal = null;
  });
};

window.addEventListener("beforeunload", (event) => {
  if (adminFormDirty) event.preventDefault();
});

const syncContentDirtyState = (): void => {
  if (activeView !== "projects" && activeView !== "tools") return;
  adminFormDirty = contentEditorDirty || dirtyMediaIds.size > 0 || pendingMedia.length > 0;
  const state = app.querySelector<HTMLElement>("[data-unsaved-state]");
  if (state) {
    state.textContent = adminFormDirty ? "Unsaved changes" : "Saved";
    state.dataset.dirty = adminFormDirty ? "true" : "false";
  }
};

const resetContentDirtyState = (): void => {
  contentEditorDirty = false;
  dirtyMediaIds = new Set<string>();
  adminFormDirty = false;
};

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
  if (target) {
    target.textContent = text;
    target.dataset.kind = kind;
  }
  if (text && document.querySelector(".admin-shell")) showAdminToast(text, kind);
};

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const blankProject = (): AdminProjectRow => ({
  id: crypto.randomUUID(),
  slug: "",
  youtube_url: null,
  name: { en: "", vi: "" },
  location: { en: "", vi: "" },
  role: null,
  summary: null,
  challenge: null,
  approach: null,
  outcome: null,
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
  youtube_url: null,
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
  clearAdminToasts();
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
  displayOrder: number;
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
    displayOrder: project.display_order,
  })),
  ...tools.map((tool) => ({
    id: tool.id,
    type: "tool" as const,
    name: tool.name || "Untitled tool",
    slug: tool.slug || "No slug",
    status: tool.status,
    deletedAt: tool.deleted_at,
    purgeAfter: tool.purge_after,
    displayOrder: tool.display_order,
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

const itemOrderPosition = (item: AdminContentListItem): { first: boolean; last: boolean; only: boolean } => {
  const orderedIds = (item.type === "project" ? projects : tools)
    .filter((entry) => !entry.deleted_at)
    .sort((left, right) => left.display_order - right.display_order)
    .map((entry) => entry.id);
  const index = orderedIds.indexOf(item.id);
  return { first: index === 0, last: index === orderedIds.length - 1, only: orderedIds.length <= 1 };
};

const contentList = (): string => {
  const items = visibleContentItems();
  if (!items.length) {
    return `<li class="admin-empty">${activeView === "trash" ? "Trash is empty." : "No content matches this view."}</li>`;
  }
  return items.map((item) => {
    const position = itemOrderPosition(item);
    return `
    <li class="admin-content-item${activeView === "trash" ? " admin-content-item--trash" : ""} ${isSelectedItem(item) ? "is-selected" : ""}" data-content-item="${escapeHtml(item.id)}">
      ${activeView !== "trash" && !item.deletedAt ? `<div class="admin-content-item__reorder" aria-label="Reorder ${escapeHtml(item.name)}"><span class="admin-content-item__drag" draggable="true" data-reorder-drag data-reorder-type="${item.type}" data-reorder-item="${escapeHtml(item.id)}" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span><button type="button" data-reorder-direction="up" data-reorder-type="${item.type}" data-reorder-item="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.name)} earlier" title="Move earlier"${position.first ? " disabled" : ""}>↑</button><button type="button" data-reorder-direction="down" data-reorder-type="${item.type}" data-reorder-item="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.name)} later" title="Move later"${position.last ? " disabled" : ""}>↓</button><button type="button" data-reorder-menu-trigger data-reorder-type="${item.type}" data-reorder-item="${escapeHtml(item.id)}" aria-label="More reorder actions for ${escapeHtml(item.name)}" aria-haspopup="menu" aria-expanded="false" title="More reorder actions"${position.only ? " disabled" : ""}>⋯</button></div>` : ""}
      <button class="admin-content-item__select" type="button" data-select-item="${escapeHtml(item.id)}" data-item-type="${item.type}" aria-pressed="${isSelectedItem(item)}">
        ${activeView === "trash" ? `<span class="admin-content-item__type">${item.type}</span>` : ""}
        <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
        <small title="${escapeHtml(item.slug)}">${escapeHtml(item.slug)}</small>
      </button>
      <div class="admin-content-item__meta">
        <span class="status status--${item.status}">${contentStatusLabel(item.status)}</span>
        ${item.deletedAt ? `<small>${trashDaysRemaining(item.purgeAfter)}</small>` : ""}
      </div>
      ${item.deletedAt ? `<div class="admin-content-item__actions"><button type="button" data-restore-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Restore</button><button class="admin-danger" type="button" data-purge-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Delete permanently</button></div>` : ""}
    </li>`;
  }).join("");
};

const field = (label: string, name: string, value = "", type = "text", placeholder = ""): string =>
  `<label${type === "month" ? ' class="admin-date-field"' : ""}>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ""}></label>`;

const contentStatusLabel = (status: PublicationStatus): string =>
  status === "published" ? "Ready" : status.charAt(0).toUpperCase() + status.slice(1);

const publicMediaUrl = (path: string): string => supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path).data.publicUrl;

const formatMediaSize = (bytes: number | null): string => bytes === null ? "Size unavailable" : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const formatMediaType = (mimeType: string | null): string => mimeType?.split("/").at(-1)?.toUpperCase() || "IMAGE";

const orderedProjectMedia = (media: AdminMediaRow[]): AdminMediaRow[] => [...media].sort((left, right) => {
  if (left.kind !== right.kind) return left.kind === "cover" ? -1 : 1;
  return left.display_order - right.display_order;
});

const downloadIcon = `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>`;

const mediaLibrary = (type: AdminItemType, mediaRows: AdminMediaRow[]): string => {
  const media = orderedProjectMedia(mediaRows);
  if (!media.length) return '<p class="admin-empty">No saved images yet.</p>';
  const firstGalleryIndex = media[0]?.kind === "cover" ? 1 : 0;
  return `<div class="admin-media-list">${media.map((item, index) => `
    <article class="admin-media-row" data-media-id="${escapeHtml(item.id)}">
      <div class="admin-media-row__preview"><img src="${escapeHtml(publicMediaUrl(item.storage_path))}" alt="${escapeHtml(item.alt.en)}"><span class="admin-media-badge admin-media-badge--${item.kind}">${item.kind}</span></div>
      <div class="admin-media-row__details"><strong>Image ${String(index + 1).padStart(2, "0")}</strong><small>${formatMediaType(item.mime_type)} · ${formatMediaSize(item.file_size)}</small></div>
      <div class="admin-media-row__fields">
        <label><span>Alt text (EN)</span><input value="${escapeHtml(item.alt.en)}" data-media-alt-en></label>
        <label><span>Alt text (VI)</span><input value="${escapeHtml(item.alt.vi)}" data-media-alt-vi></label>
        <label><span>Caption (EN)</span><input value="${escapeHtml(item.caption?.en ?? "")}" data-media-caption-en></label>
        <label><span>Caption (VI)</span><input value="${escapeHtml(item.caption?.vi ?? "")}" data-media-caption-vi></label>
      </div>
      <div class="admin-media-row__actions">
        <button type="button" class="admin-media-action--icon" data-media-download aria-label="Download original image" title="Download original">${downloadIcon}</button>
        ${type === "project" && item.kind === "cover" ? `<button type="button" data-media-crops>Adjust crops <small>${item.project_image_crops?.length ?? 0}/3</small></button>` : ""}
        ${item.kind === "cover" ? "" : `<button type="button" data-media-cover>Set cover</button>
        <button type="button" class="admin-media-action--icon" data-media-move="up" ${index === firstGalleryIndex ? "disabled" : ""} aria-label="Move image earlier" title="Move earlier">&uarr;</button>
        <button type="button" class="admin-media-action--icon" data-media-move="down" ${index === media.length - 1 ? "disabled" : ""} aria-label="Move image later" title="Move later">&darr;</button>`}
        <button type="button" data-media-save>Save</button>
        <button type="button" class="admin-danger" data-media-delete>Delete</button>
      </div>
    </article>`).join("")}</div>`;
};

const mediaPanel = (type: AdminItemType, media: AdminMediaRow[]): string => {
  const isProject = type === "project";
  const uploadTitle = isProject ? "Project media" : "Tool media";
  const uploadNote = isProject
    ? "Add a cover and gallery images for the project. JPEG, PNG, WebP or AVIF up to 5 MB."
    : "Add a primary cover and gallery screenshots showing the tool workflow or output. JPEG, PNG, WebP or AVIF up to 5 MB.";
  const libraryNote = isProject
    ? "Choose the cover image, alt text and gallery order."
    : "Choose the primary tool visual, edit alt text and order supporting screenshots.";
  return `<div class="admin-media-panel" data-editor-panel="media" data-media-owner="${type}" ${panelState("media")}>
    <form class="admin-upload admin-form-section" data-upload-form data-media-owner="${type}"><div class="admin-section-heading admin-media-section-heading"><h3 class="admin-form-section__title">${uploadTitle}</h3><p class="admin-form-section__note" title="${uploadNote}">${uploadNote}</p><span class="admin-media-section-heading__count" data-upload-count>0 selected</span></div><label>Choose images<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label><div data-upload-queue><p class="admin-empty">Selected images will appear here before upload.</p></div><button class="button button--secondary admin-media-upload-action" type="submit" data-upload-submit disabled>Upload</button></form>
    <section class="admin-upload admin-form-section admin-media-library"><div class="admin-section-heading admin-media-section-heading"><h3 class="admin-form-section__title">Saved media</h3><p class="admin-form-section__note" title="${libraryNote}">${libraryNote}</p><span class="admin-media-section-heading__count">${media.length} ${media.length === 1 ? "image" : "images"}</span></div>${mediaLibrary(type, media)}</section>
  </div>`;
};

const editorTab = (tab: EditorTab, label: string): string =>
  `<button type="button" role="tab" data-editor-tab="${tab}" aria-selected="${activeEditorTab === tab}" class="${activeEditorTab === tab ? "is-active" : ""}">${label}</button>`;

const panelState = (tab: EditorTab): string => activeEditorTab === tab ? "" : "hidden";

const editorMoreMenu = (type: AdminItemType, status: PublicationStatus): string => `<details class="admin-document-more admin-editor-more"><summary>More</summary><div>
  <button type="button" data-selected-status data-item-type="${type}" data-next="${status === "published" ? "draft" : "published"}">${status === "published" ? "Return to draft" : "Mark ready"}</button>
  <button class="admin-danger" type="button" data-delete-selected>Move to Trash</button>
</div></details>`;

const readinessFor = (type: AdminItemType, item: AdminProjectRow | AdminToolRow): ContentValidationResult =>
  type === "project"
    ? validateProjectReadiness(projectFromRow(item as unknown as ProjectRow))
    : validateToolReadiness(toolFromRow(item as unknown as ToolRow));

const readinessCard = (type: AdminItemType, item: AdminProjectRow | AdminToolRow): string => {
  const result = readinessFor(type, item);
  const content = result.errors.length || result.warnings.length
    ? `<div class="admin-readiness-grid">
        <div><strong>${result.errors.length ? `${result.errors.length} required fix${result.errors.length === 1 ? "" : "es"}` : "Required content complete"}</strong>${result.errors.length ? `<ul>${result.errors.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>` : ""}</div>
        <div><strong>${result.warnings.length ? `${result.warnings.length} recommendation${result.warnings.length === 1 ? "" : "s"}` : "No recommendations"}</strong>${result.warnings.length ? `<ul>${result.warnings.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>` : ""}</div>
      </div>`
    : '<p class="admin-readiness-ready">Required content and recommended translations are complete.</p>';
  return renderAdminSectionCard({ title: "Ready check", note: "Required fixes block Ready status. Recommendations do not block publishing.", content, className: result.errors.length ? "admin-readiness admin-readiness--blocked" : "admin-readiness" });
};

const savedDetailPreviewUrl = (type: AdminItemType, slug: string): string =>
  `${import.meta.env.BASE_URL}${type === "project" ? "project" : "tool"}/?preview=1&id=${encodeURIComponent(slug)}`;

const editor = (project: AdminProjectRow): string => `
  <section class="admin-editor-shell">
    <div class="admin-editor__heading">
      <div class="admin-editor__identity"><p class="section-kicker">${project.name.en ? "Edit project" : "New project"}</p><h2 title="${escapeHtml(project.name.en || "Untitled project")}">${escapeHtml(project.name.en || "Untitled project")}</h2><div class="admin-editor__meta"><span class="status status--${project.status}">${contentStatusLabel(project.status)}</span><small data-unsaved-state>Saved</small></div></div>
      <div class="admin-editor__status">${projects.some((item) => item.id === project.id) && project.slug ? `<a class="button button--secondary" href="${savedDetailPreviewUrl("project", project.slug)}" target="_blank" rel="noreferrer">Preview detail</a>` : ""}${projects.some((item) => item.id === project.id) ? editorMoreMenu("project", project.status) : ""}<button class="button admin-action-save" type="submit" form="project-editor">Save changes</button></div>
    </div>
    <nav class="admin-editor-tabs" role="tablist" aria-label="Project editor sections">${editorTab("overview", "Overview")}${editorTab("content", "Content EN / VI")}${editorTab("media", `Media (${project.project_images.length})`)}</nav>
    <form id="project-editor" class="admin-editor" data-project-form>
      <input name="id" type="hidden" value="${escapeHtml(project.id)}">
      <section class="admin-editor-panel" data-editor-panel="overview" ${panelState("overview")}>
        ${renderAdminSectionCard({
          title: "Project overview",
          note: "Edit identity, dates, slug and optional video. Output selection is managed in Website, CV and Portfolio.",
          content: `<div class="admin-form-grid">
          ${field("Project name (EN) *", "name_en", project.name.en)}${field("Project name (VI)", "name_vi", project.name.vi)}
          ${field("Role (EN)", "role_en", project.role?.en ?? "")}${field("Role (VI)", "role_vi", project.role?.vi ?? "")}
          ${field("Location (EN)", "location_en", project.location.en)}${field("Location (VI)", "location_vi", project.location.vi)}
          ${field("Start", "start_date", project.start_date ?? "", "month")}
          ${field("End (blank = Present)", "end_date", project.is_current ? "" : project.end_date ?? "", "month")}
          ${field("Slug *", "slug", project.slug)}
          ${field("YouTube URL (optional)", "youtube_url", project.youtube_url ?? "", "url", "https://www.youtube.com/watch?v=...")}
        </div>`,
        })}
        ${readinessCard("project", project)}
      </section>
      <section class="admin-editor-panel" data-editor-panel="content" ${panelState("content")}>
        ${renderAdminSectionCard({
          title: "Project content",
          note: "Edit paired EN and VI project descriptions.",
          content: `<div class="admin-form-grid"><label>Summary (EN)<textarea name="summary_en" rows="7">${escapeHtml(project.summary?.en ?? "")}</textarea></label><label>Summary (VI)<textarea name="summary_vi" rows="7">${escapeHtml(project.summary?.vi ?? "")}</textarea></label></div>
            <div class="admin-form-grid"><label>Challenge (EN)<textarea name="challenge_en" rows="6">${escapeHtml(project.challenge?.en ?? "")}</textarea></label><label>Challenge (VI)<textarea name="challenge_vi" rows="6">${escapeHtml(project.challenge?.vi ?? "")}</textarea></label></div>
            <div class="admin-form-grid"><label>Approach (EN)<textarea name="approach_en" rows="6">${escapeHtml(project.approach?.en ?? "")}</textarea></label><label>Approach (VI)<textarea name="approach_vi" rows="6">${escapeHtml(project.approach?.vi ?? "")}</textarea></label></div>
            <div class="admin-form-grid"><label>Outcome (EN)<textarea name="outcome_en" rows="6">${escapeHtml(project.outcome?.en ?? "")}</textarea></label><label>Outcome (VI)<textarea name="outcome_vi" rows="6">${escapeHtml(project.outcome?.vi ?? "")}</textarea></label></div>
            <div class="admin-form-grid"><label>Responsibilities (EN, one item per line)<textarea name="responsibilities_en" rows="9">${escapeHtml(project.responsibilities.map((item) => item.text.en).join("\n"))}</textarea></label><label>Responsibilities (VI, one item per line)<textarea name="responsibilities_vi" rows="9">${escapeHtml(project.responsibilities.map((item) => item.text.vi).join("\n"))}</textarea></label></div>
            <label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(project.technologies.join(", "))}"></label>`,
        })}
      </section>
    </form>
    ${mediaPanel("project", project.project_images)}
  </section>`;

const toolEditor = (tool: AdminToolRow): string => `
  <section class="admin-editor-shell">
    <div class="admin-editor__heading">
      <div class="admin-editor__identity"><p class="section-kicker">${tool.name ? "Edit tool" : "New tool"}</p><h2 title="${escapeHtml(tool.name || "Untitled tool")}">${escapeHtml(tool.name || "Untitled tool")}</h2><div class="admin-editor__meta"><span class="status status--${tool.status}">${contentStatusLabel(tool.status)}</span><small data-unsaved-state>Saved</small></div></div>
      <div class="admin-editor__status">${tools.some((item) => item.id === tool.id) && tool.slug ? `<a class="button button--secondary" href="${savedDetailPreviewUrl("tool", tool.slug)}" target="_blank" rel="noreferrer">Preview detail</a>` : ""}${tools.some((item) => item.id === tool.id) ? editorMoreMenu("tool", tool.status) : ""}<button class="button admin-action-save" type="submit" form="tool-editor">Save changes</button></div>
    </div>
    <nav class="admin-editor-tabs" role="tablist" aria-label="Tool editor sections">${editorTab("overview", "Overview")}${editorTab("content", "Content EN / VI")}${editorTab("media", `Media (${tool.tool_images.length})`)}</nav>
    <form id="tool-editor" class="admin-editor" data-tool-form>
      <input name="id" type="hidden" value="${escapeHtml(tool.id)}">
      <section class="admin-editor-panel" data-editor-panel="overview" ${panelState("overview")}>
        ${renderAdminSectionCard({ title: "Tool overview", note: "Edit the tool name, slug, technologies and optional video. Output selection is managed in Website, CV and Portfolio.", content: `<div class="admin-form-grid">${field("Tool name *", "name", tool.name)}${field("Slug *", "slug", tool.slug)}</div><label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(tool.technologies.join(", "))}"></label>${field("YouTube URL (optional)", "youtube_url", tool.youtube_url ?? "", "url", "https://www.youtube.com/watch?v=...")}` })}
        ${readinessCard("tool", tool)}
      </section>
      <section class="admin-editor-panel" data-editor-panel="content" ${panelState("content")}>
        ${renderAdminSectionCard({ title: "Tool content", note: "Edit paired EN and VI problem, solution and benefit.", content: `<div class="admin-form-grid"><label>Problem (EN)<textarea name="problem_en" rows="6">${escapeHtml(tool.problem.en)}</textarea></label><label>Problem (VI)<textarea name="problem_vi" rows="6">${escapeHtml(tool.problem.vi)}</textarea></label><label>Solution (EN)<textarea name="solution_en" rows="6">${escapeHtml(tool.solution.en)}</textarea></label><label>Solution (VI)<textarea name="solution_vi" rows="6">${escapeHtml(tool.solution.vi)}</textarea></label><label>Benefit (EN)<textarea name="benefit_en" rows="5">${escapeHtml(tool.benefit?.en ?? "")}</textarea></label><label>Benefit (VI)<textarea name="benefit_vi" rows="5">${escapeHtml(tool.benefit?.vi ?? "")}</textarea></label></div>` })}
      </section>
    </form>
    ${mediaPanel("tool", tool.tool_images)}
  </section>`;

const selectedTrashItem = (): AdminContentListItem | null => {
  const selectedId = selectedItemType === "project" ? selectedProject?.id : selectedTool?.id;
  return contentItems().find((item) => item.type === selectedItemType && item.id === selectedId && item.deletedAt) ?? null;
};

const trashInspector = (item: AdminContentListItem): string => `
  <section class="admin-editor admin-trash-detail">
    <div class="admin-editor__heading"><div><p class="section-kicker">${item.type} in Trash</p><h2 title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h2><p>This item is hidden from active Website, Portfolio and CV draft data.</p></div><span class="status status--archived">Trash</span></div>
    <dl><div><dt>Deleted</dt><dd>${item.deletedAt ? formatAdminDateTime(item.deletedAt) : "Unknown"}</dd></div><div><dt>Permanent deletion</dt><dd>${item.purgeAfter ? formatAdminDateTime(item.purgeAfter) : "Pending cleanup"} (${trashDaysRemaining(item.purgeAfter)})</dd></div></dl>
    <div class="admin-actions"><button class="button" type="button" data-restore-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Restore as draft</button><button class="button admin-button--danger" type="button" data-purge-item="${escapeHtml(item.id)}" data-item-type="${item.type}">Delete permanently</button></div>
  </section>`;

const overviewView = (): string => {
  const activeProjects = projects.filter((item) => !item.deleted_at);
  const activeTools = tools.filter((item) => !item.deleted_at);
  const activeItems = [...activeProjects, ...activeTools];
  const ready = activeItems.filter((item) => item.status === "published").length;
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
        <article><span>Ready items</span><strong>${ready}</strong><small>${drafts} drafts still being prepared</small></article>
        <article><span>Cover letters</span><strong>${letters.loaded ? letters.total : "—"}</strong><button type="button" data-admin-view="cover-letters">${letters.loaded ? `${letters.drafts} drafts · ${letters.final} final` : "Open workspace"}</button></article>
        <article class="${trash ? "has-warning" : ""}"><span>Trash</span><strong>${trash}</strong><button type="button" data-admin-view="trash">Review trash</button></article>
        <article class="${adminSchemaHealth.healthy ? "" : "has-warning"}"><span>Database schema</span><strong>${adminSchemaHealth.healthy ? "Current" : "Update"}</strong><small>${escapeHtml(adminSchemaHealth.version)}</small></article>
      </div>
      <div class="admin-overview-grid">
        <section class="admin-overview-card admin-overview-card--attention${needsAttention.length ? "" : " is-empty"}"><div class="admin-card-heading"><div><h2>Needs attention</h2><p>Draft and archived content that is not public.</p></div><span>${needsAttention.length}</span></div>
          <div class="admin-attention-list">${needsAttention.length ? needsAttention.map((item) => { const isTool = typeof item.name === "string"; const itemName = isTool ? String(item.name) : (item.name as { en: string }).en; return `<button type="button" data-select-item="${escapeHtml(item.id)}" data-item-type="${isTool ? "tool" : "project"}"><span><strong title="${escapeHtml(itemName)}">${escapeHtml(itemName)}</strong><small title="${escapeHtml(item.slug)}">${escapeHtml(item.slug)}</small></span><span class="status status--${item.status}">${contentStatusLabel(item.status)}</span></button>`; }).join("") : '<div class="admin-empty-state"><span aria-hidden="true">&#10003;</span><div><strong>Everything is ready</strong><small>No draft or archived content needs attention.</small></div></div>'}</div>
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
  captureCollectionScroll();
  const renderId = ++dashboardRenderSequence;
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
        <header class="admin-header"><div><small>HDL Admin /</small><strong>${viewTitle[activeView]}</strong></div><p class="admin-message sr-only" data-admin-message></p><a class="button button--secondary" href="${import.meta.env.BASE_URL}" target="_blank" rel="noreferrer">View website</a></header>
        <div class="admin-layout ${showCollection ? "has-collection" : ""}">
          ${showCollection ? `<aside class="admin-collection">
            <div class="admin-collection__heading"><div><small>Content</small><h2>${collectionTitle} <span>${collectionCount}</span></h2></div>${activeView === "projects" ? '<button class="button admin-action-new" type="button" data-new-project>+ New</button>' : activeView === "tools" ? '<button class="button admin-action-new" type="button" data-new-tool>+ New</button>' : ""}</div>
            <div class="admin-list-controls">
              <label class="admin-search"><span class="sr-only">Search content</span><input type="search" placeholder="Search by name or slug..." value="${escapeHtml(contentSearch)}" data-content-search></label>
              ${activeView === "trash" ? `<div class="admin-filter-row" aria-label="Content type">${(["all", "project", "tool"] as ContentFilter[]).map((filter) => `<button type="button" data-content-filter="${filter}" class="${contentFilter === filter ? "is-active" : ""}">${filter === "all" ? "All" : filter === "project" ? "Projects" : "Tools"}</button>`).join("")}</div>` : `<div class="admin-filter-row" aria-label="Content status">${(["all", "draft", "published", "archived"] as ContentStatusFilter[]).map((filter) => `<button type="button" data-status-filter="${filter}" class="${contentStatusFilter === filter ? "is-active" : ""}">${filter === "all" ? "All" : contentStatusLabel(filter)}</button>`).join("")}</div>`}
            </div>
            <div class="admin-collection__scroll" data-collection-view="${activeView}"><ul class="admin-content-list" data-content-list>${contentList()}</ul></div>
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
    </dialog>
    ${renderProjectCoverCropDialog()}
    <div class="admin-reorder-menu" data-reorder-menu popover="auto" role="menu" aria-label="Reorder item">
      <button type="button" role="menuitem" data-reorder-edge="first"><span aria-hidden="true">⇈</span>Move to first</button>
      <button type="button" role="menuitem" data-reorder-edge="last"><span aria-hidden="true">⇊</span>Move to last</button>
    </div>`;
  bindDashboard();
  bindAdminTablists(app);
  bindAdminYearPickers(app);
  restoreCollectionScroll(renderId);
};

const loadProjects = async (): Promise<void> => {
  const selectedProjectId = selectedProject?.id;
  const selectedToolId = selectedTool?.id;
  const selectedProjectWasPersisted = Boolean(selectedProjectId && projects.some((item) => item.id === selectedProjectId));
  const selectedToolWasPersisted = Boolean(selectedToolId && tools.some((item) => item.id === selectedToolId));
  const [projectResult, toolResult] = await Promise.all([
    supabase.from("projects").select("*, project_images(*, project_image_crops(*))").order("display_order"),
    supabase.from("automation_tools").select("*, tool_images(*)").order("display_order"),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  projects = (projectResult.data as AdminProjectRow[]).map((item) => ({ ...item, youtube_url: item.youtube_url ?? null, project_images: item.project_images ?? [], deleted_at: item.deleted_at ?? null, deleted_by: item.deleted_by ?? null, purge_after: item.purge_after ?? null, deleted_from_status: item.deleted_from_status ?? null }));
  tools = (toolResult.data as AdminToolRow[]).map((item) => ({ ...item, youtube_url: item.youtube_url ?? null, tool_images: item.tool_images ?? [], deleted_at: item.deleted_at ?? null, deleted_by: item.deleted_by ?? null, purge_after: item.purge_after ?? null, deleted_from_status: item.deleted_from_status ?? null }));
  if (selectedProjectWasPersisted) selectedProject = projects.find((item) => item.id === selectedProjectId) ?? null;
  if (selectedToolWasPersisted) selectedTool = tools.find((item) => item.id === selectedToolId) ?? null;
  markSiteWorkspaceStale();
  markProfileDocumentWorkspaceStale();
  markCoverLetterWorkspaceStale();
};

const saveForm = async (formElement: HTMLFormElement): Promise<void> => {
  if (dirtyMediaIds.size) throw new Error("Save the edited media metadata before saving project details.");
  const form = new FormData(formElement);
  const current = projects.find((item) => item.id === String(form.get("id"))) ?? selectedProject ?? blankProject();
  const nameEn = String(form.get("name_en") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || nameEn);
  if (!nameEn || !slug) throw new Error("Name (EN) and slug are required.");
  const responsibilityEn = String(form.get("responsibilities_en") ?? "").split(/\r?\n/).map((item) => item.trim());
  const responsibilityVi = String(form.get("responsibilities_vi") ?? "").split(/\r?\n/).map((item) => item.trim());
  const responsibilities = Array.from({ length: Math.max(responsibilityEn.length, responsibilityVi.length) }, (_, index) => ({
    id: current.responsibilities[index]?.id ?? `${slug}-${index + 1}`,
    text: { en: responsibilityEn[index] ?? "", vi: responsibilityVi[index] ?? "" },
  })).filter((item) => item.text.en || item.text.vi);
  const endDate = String(form.get("end_date") ?? "").trim();
  const isCurrent = !endDate;
  const roleEn = String(form.get("role_en") ?? "").trim();
  const roleVi = String(form.get("role_vi") ?? "").trim();
  const summaryEn = String(form.get("summary_en") ?? "").trim();
  const summaryVi = String(form.get("summary_vi") ?? "").trim();
  const challengeEn = String(form.get("challenge_en") ?? "").trim();
  const challengeVi = String(form.get("challenge_vi") ?? "").trim();
  const approachEn = String(form.get("approach_en") ?? "").trim();
  const approachVi = String(form.get("approach_vi") ?? "").trim();
  const outcomeEn = String(form.get("outcome_en") ?? "").trim();
  const outcomeVi = String(form.get("outcome_vi") ?? "").trim();
  const payload: AdminProjectRow = {
    ...current,
    id: String(form.get("id")),
    slug,
    youtube_url: normalizeYouTubeUrl(String(form.get("youtube_url") ?? "")),
    name: { en: nameEn, vi: String(form.get("name_vi") ?? "").trim() },
    location: { en: String(form.get("location_en") ?? "").trim(), vi: String(form.get("location_vi") ?? "").trim() },
    role: roleEn || roleVi ? { en: roleEn, vi: roleVi } : null,
    summary: summaryEn || summaryVi ? { en: summaryEn, vi: summaryVi } : null,
    challenge: challengeEn || challengeVi ? { en: challengeEn, vi: challengeVi } : null,
    approach: approachEn || approachVi ? { en: approachEn, vi: approachVi } : null,
    outcome: outcomeEn || outcomeVi ? { en: outcomeEn, vi: outcomeVi } : null,
    start_date: String(form.get("start_date") ?? "").trim() || null,
    end_date: isCurrent ? null : endDate,
    is_current: isCurrent,
    responsibilities,
    technologies: String(form.get("technologies") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
  };
  const readiness = readinessFor("project", payload);
  const nextStatus: PublicationStatus = payload.status === "published" && readiness.errors.length ? "draft" : payload.status;
  const projectPayload = {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    location: payload.location,
    role: payload.role,
    summary: payload.summary,
    challenge: payload.challenge,
    approach: payload.approach,
    outcome: payload.outcome,
    start_date: payload.start_date,
    end_date: payload.end_date,
    is_current: payload.is_current,
    year: payload.year,
    responsibilities: payload.responsibilities,
    technologies: payload.technologies,
    status: nextStatus,
  };
  let { error } = await supabase.from("projects").upsert({ ...projectPayload, youtube_url: payload.youtube_url });
  if (missingYouTubeColumn(error, "projects")) {
    if (payload.youtube_url) throw new Error("Apply the latest database migration before saving a YouTube URL.");
    ({ error } = await supabase.from("projects").upsert(projectPayload));
  }
  if (error) throw error;
  contentEditorDirty = false;
  syncContentDirtyState();
  await loadProjects();
  selectedProject = projects.find((item) => item.id === payload.id) ?? payload;
  dashboardView();
  message(nextStatus !== payload.status ? "Project saved and returned to Draft because required Ready checks no longer pass. Existing releases are unchanged." : "Project saved. Existing Website, CV and Portfolio releases are unchanged until republished.", "success");
};

const saveToolForm = async (formElement: HTMLFormElement): Promise<void> => {
  if (dirtyMediaIds.size) throw new Error("Save the edited media metadata before saving tool details.");
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
    youtube_url: normalizeYouTubeUrl(formText(form, "youtube_url")),
    name,
    problem: { en: formText(form, "problem_en"), vi: formText(form, "problem_vi") },
    solution: { en: formText(form, "solution_en"), vi: formText(form, "solution_vi") },
    benefit: benefitEn || benefitVi ? { en: benefitEn, vi: benefitVi } : null,
    technologies: commaList(formText(form, "technologies")),
  };
  const readiness = readinessFor("tool", payload);
  const nextStatus: PublicationStatus = payload.status === "published" && readiness.errors.length ? "draft" : payload.status;
  const toolPayload = {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    problem: payload.problem,
    solution: payload.solution,
    benefit: payload.benefit,
    technologies: payload.technologies,
    status: nextStatus,
  };
  let { error } = await supabase.from("automation_tools").upsert({ ...toolPayload, youtube_url: payload.youtube_url });
  if (missingYouTubeColumn(error, "automation_tools")) {
    if (payload.youtube_url) throw new Error("Apply the latest database migration before saving a YouTube URL.");
    ({ error } = await supabase.from("automation_tools").upsert(toolPayload));
  }
  if (error) throw error;
  contentEditorDirty = false;
  syncContentDirtyState();
  await loadProjects();
  selectedTool = tools.find((item) => item.id === payload.id) ?? payload;
  selectedItemType = "tool";
  dashboardView();
  message(nextStatus !== payload.status ? "Tool saved and returned to Draft because required Ready checks no longer pass. Existing releases are unchanged." : "Tool saved. Existing Website, CV and Portfolio releases are unchanged until republished.", "success");
};

const moveSelectedToTrash = async (): Promise<void> => {
  const selected = selectedContentSummary();
  if (!selected) return;
  if (!selected.persisted) {
    clearPendingMedia();
    resetContentDirtyState();
    if (selected.type === "project") selectedProject = null;
    else selectedTool = null;
    dashboardView();
    message("Unsaved draft discarded.", "success");
    return;
  }
  const id = selected.type === "project" ? selectedProject?.id : selectedTool?.id;
  if (!id || !(await confirmAdmin({ eyebrow: "Move to trash", title: `Move ${selected.name} to Trash?`, message: "It will be hidden from active Website, Portfolio and CV draft data, and permanently deleted after 30 days.", confirmLabel: "Move to Trash", tone: "danger" }))) return;
  const { error } = await supabase.rpc("move_admin_item_to_trash", { target_type: selected.type, target_id: id });
  if (error) throw error;
  clearPendingMedia();
  resetContentDirtyState();
  selectedProject = null;
  selectedTool = null;
  await loadProjects();
  dashboardView();
  message(`${selected.type === "project" ? "Project" : "Tool"} moved to Trash. Existing Website, CV and Portfolio releases remain unchanged until you republish them.`, "success");
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
  if (!item?.deletedAt || !(await confirmAdmin({ eyebrow: "Permanent deletion", title: `Delete ${item.name} permanently?`, message: "This cannot be undone.", confirmLabel: "Delete permanently", tone: "danger" }))) return;
  const media = type === "project"
    ? projects.find((project) => project.id === id)?.project_images ?? []
    : tools.find((tool) => tool.id === id)?.tool_images ?? [];
  const paths = media.flatMap((entry) => [entry.storage_path, ...(entry.project_image_crops ?? []).map((crop) => crop.storage_path)]);
  const { error } = await supabase.rpc("purge_admin_item", { target_type: type, target_id: id });
  if (error) throw error;
  let cleanup = { removed: [] as string[], retained: [] as string[] };
  let cleanupWarning = "";
  try {
    if (paths.length) cleanup = await removeUnreferencedStoragePaths(paths);
  } catch (cleanupError) {
    cleanupWarning = ` Storage cleanup was deferred: ${cleanupError instanceof Error ? cleanupError.message : "unknown error"}`;
  }
  if (type === "project" && selectedProject?.id === id) selectedProject = null;
  if (type === "tool" && selectedTool?.id === id) selectedTool = null;
  await loadProjects();
  dashboardView();
  message(`${type === "project" ? "Project" : "Tool"} permanently deleted.${cleanup.retained.length ? ` ${cleanup.retained.length} media asset${cleanup.retained.length === 1 ? " was" : "s were"} retained because a release still references them.` : ""}${cleanupWarning}`, "success");
};

const changeSelectedStatus = async (type: AdminItemType, next: PublicationStatus): Promise<void> => {
  const id = type === "project" ? selectedProject?.id : selectedTool?.id;
  if (!id) return;
  if (adminFormDirty) throw new Error("Save or discard the current editor and media changes before changing status.");
  if (next === "published") {
    const item = type === "project" ? selectedProject : selectedTool;
    if (!item) return;
    const validation = readinessFor(type, item);
    if (validation.errors.length) {
      activeEditorTab = "overview";
      dashboardView();
      throw new Error(`Cannot mark Ready: ${validation.errors.slice(0, 3).join(" ")}${validation.errors.length > 3 ? ` (+${validation.errors.length - 3} more)` : ""}`);
    }
    if (!(await confirmAdmin({ eyebrow: "Content status", title: `Mark this ${type} as Ready?`, message: validation.warnings.length ? `Required checks passed. ${validation.warnings.length} recommendation${validation.warnings.length === 1 ? " remains" : "s remain"}; you can still mark it Ready.` : "It will become available for Website, CV and Portfolio selection.", confirmLabel: "Mark ready" }))) return;
  }
  const table = type === "project" ? "projects" : "automation_tools";
  const { error } = await supabase.from(table).update({ status: next }).eq("id", id).is("deleted_at", null);
  if (error) throw error;
  await loadProjects();
  dashboardView();
  message(`${type === "project" ? "Project" : "Tool"} ${next === "published" ? "marked Ready" : `changed to ${contentStatusLabel(next)}`}.`, "success");
};

const clearPendingMedia = (): void => {
  pendingMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  pendingMedia = [];
  syncContentDirtyState();
};

const renderUploadQueue = (): void => {
  const root = app.querySelector<HTMLElement>("[data-upload-queue]");
  const submit = app.querySelector<HTMLButtonElement>("[data-upload-submit]");
  const count = app.querySelector<HTMLElement>("[data-upload-count]");
  if (!root || !submit) return;
  submit.disabled = !pendingMedia.length;
  submit.textContent = "Upload";
  if (count) count.textContent = `${pendingMedia.length} selected`;
  root.innerHTML = pendingMedia.length ? `<div class="admin-media-list">${pendingMedia.map((item, index) => `
    <article class="admin-media-row admin-media-row--pending" data-pending-id="${item.id}">
      <div class="admin-media-row__preview"><img src="${item.previewUrl}" alt=""><span class="admin-media-badge admin-media-badge--${item.kind}">${item.kind}</span></div>
      <div class="admin-media-row__details"><strong title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</strong><small>${formatMediaType(item.file.type)} · ${formatMediaSize(item.file.size)}</small></div>
      <div class="admin-media-row__fields admin-media-row__fields--pending">
        <label><span>Use as</span><select data-pending-kind><option value="cover" ${item.kind === "cover" ? "selected" : ""}>Cover</option><option value="gallery" ${item.kind === "gallery" ? "selected" : ""}>Gallery</option></select></label>
        <label><span>Alt text (EN)</span><input value="${escapeHtml(item.altEn)}" data-pending-alt-en></label>
        <label><span>Alt text (VI)</span><input value="${escapeHtml(item.altVi)}" data-pending-alt-vi></label>
        <label><span>Caption (EN)</span><input value="${escapeHtml(item.captionEn)}" data-pending-caption-en></label>
        <label><span>Caption (VI)</span><input value="${escapeHtml(item.captionVi)}" data-pending-caption-vi></label>
      </div>
      <div class="admin-media-row__actions"><button type="button" class="admin-media-action--icon" data-pending-move="up" ${index === 0 ? "disabled" : ""} aria-label="Move image earlier" title="Move earlier">&uarr;</button><button type="button" class="admin-media-action--icon" data-pending-move="down" ${index === pendingMedia.length - 1 ? "disabled" : ""} aria-label="Move image later" title="Move later">&darr;</button><button type="button" class="admin-danger" data-pending-remove>Remove</button></div>
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

interface SelectedMediaOwner {
  type: AdminItemType;
  id: string;
  name: string;
  media: AdminMediaRow[];
  table: "project_images" | "tool_images";
  foreignKey: "project_id" | "tool_id";
  storageFolder: "projects" | "tools";
  coverRpc: "set_project_image_cover" | "set_tool_image_cover";
  label: "Project" | "Tool";
}

const selectedMediaOwner = (type: AdminItemType): SelectedMediaOwner | null => {
  if (type === "project" && selectedProject) return {
    type,
    id: selectedProject.id,
    name: selectedProject.name.en,
    media: selectedProject.project_images,
    table: "project_images",
    foreignKey: "project_id",
    storageFolder: "projects",
    coverRpc: "set_project_image_cover",
    label: "Project",
  };
  if (type === "tool" && selectedTool) return {
    type,
    id: selectedTool.id,
    name: selectedTool.name,
    media: selectedTool.tool_images,
    table: "tool_images",
    foreignKey: "tool_id",
    storageFolder: "tools",
    coverRpc: "set_tool_image_cover",
    label: "Tool",
  };
  return null;
};

const ensureEditorSavedBeforeImmediateMutation = (): void => {
  if (contentEditorDirty) throw new Error("Save the content form before changing media or shared order.");
  if (dirtyMediaIds.size) throw new Error("Save the edited media metadata before changing media or shared order.");
};

const persistMediaOrder = async (type: AdminItemType, ordered: Array<{ id: string }>): Promise<void> => {
  const { error } = await supabase.rpc("reorder_admin_media", { target_type: type, ordered_ids: ordered.map((item) => item.id) });
  if (error) throw error;
};

const masterOrder = (type: AdminItemType): Array<AdminProjectRow | AdminToolRow> =>
  (type === "project" ? projects : tools)
    .filter((item) => !item.deleted_at)
    .sort((left, right) => left.display_order - right.display_order);

const persistMasterOrder = async (type: AdminItemType, ordered: Array<AdminProjectRow | AdminToolRow>): Promise<void> => {
  const { error } = await supabase.rpc("reorder_admin_content", { target_type: type, ordered_ids: ordered.map((item) => item.id) });
  if (error) throw error;
};

const reorderMasterItem = async (type: AdminItemType, id: string, movement: ReorderMovement): Promise<void> => {
  if (reorderBusy) return;
  ensureEditorSavedBeforeImmediateMutation();
  const ordered = masterOrder(type);
  const index = ordered.findIndex((item) => item.id === id);
  if (index < 0) return;
  const next = (() => {
    if (movement === "up" || movement === "down") return moveItem(ordered, index, movement);
    const target = movement === "first"
      ? 0
      : movement === "last"
        ? ordered.length - 1
        : ordered.findIndex((item) => item.id === movement.targetId);
    if (target < 0 || target === index) return ordered;
    const copy = [...ordered];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    return copy;
  })();
  if (next.every((item, position) => item.id === ordered[position]?.id)) return;
  reorderBusy = true;
  try {
    await persistMasterOrder(type, next);
    [, adminSchemaHealth] = await Promise.all([loadProjects(), loadAdminSchemaHealth()]);
    pendingCollectionReveal = {
      view: type === "project" ? "projects" : "tools",
      itemId: id,
      align: movement === "first" || movement === "last" ? "center" : "nearest",
      focus: movement === "up" || movement === "down" ? movement : movement === "first" || movement === "last" ? "more" : "select",
    };
    dashboardView();
    if (!adminSchemaHealth.healthy) message(adminSchemaHealth.message, "error");
    const position = movement === "first" ? " moved to first position" : movement === "last" ? " moved to last position" : " order updated";
    message(`${type === "project" ? "Project" : "Tool"}${position}.`, "success");
  } finally {
    reorderBusy = false;
  }
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
    card.querySelector<HTMLInputElement>("[data-pending-alt-en]")?.addEventListener("input", (event) => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) item.altEn = (event.currentTarget as HTMLInputElement).value;
    });
    card.querySelector<HTMLInputElement>("[data-pending-alt-vi]")?.addEventListener("input", (event) => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) item.altVi = (event.currentTarget as HTMLInputElement).value;
    });
    card.querySelector<HTMLInputElement>("[data-pending-caption-en]")?.addEventListener("input", (event) => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) item.captionEn = (event.currentTarget as HTMLInputElement).value;
    });
    card.querySelector<HTMLInputElement>("[data-pending-caption-vi]")?.addEventListener("input", (event) => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) item.captionVi = (event.currentTarget as HTMLInputElement).value;
    });
    card.querySelector("[data-pending-remove]")?.addEventListener("click", () => {
      const item = pendingMedia.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      pendingMedia = pendingMedia.filter((entry) => entry.id !== id);
      syncContentDirtyState();
      renderUploadQueue();
    });
    card.querySelectorAll<HTMLElement>("[data-pending-move]").forEach((button) => button.addEventListener("click", () => {
      const index = pendingMedia.findIndex((entry) => entry.id === id);
      pendingMedia = moveItem(pendingMedia, index, button.dataset.pendingMove as "up" | "down");
      renderUploadQueue();
    }));
  });
};

const choosePendingMedia = (files: FileList, type: AdminItemType): void => {
  clearPendingMedia();
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const selected = Array.from(files);
  const invalid = selected.find((file) => !allowed.includes(file.type) || file.size > 5 * 1024 * 1024);
  if (invalid) throw new Error(`Use JPEG, PNG, WebP or AVIF files smaller than 5 MB. Check "${invalid.name}".`);
  const owner = selectedMediaOwner(type);
  const hasCover = owner?.media.some((item) => item.kind === "cover") ?? false;
  pendingMedia = selected.map((file, index) => ({
    id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), altEn: owner?.name ?? "", altVi: "", captionEn: "", captionVi: "",
    kind: !hasCover && index === 0 ? "cover" : "gallery",
  }));
  syncContentDirtyState();
  renderUploadQueue();
};

const uploadImages = async (formElement: HTMLFormElement): Promise<void> => {
  const type = formElement.dataset.mediaOwner as AdminItemType;
  const owner = selectedMediaOwner(type);
  const persisted = type === "project" ? projects.some((item) => item.id === owner?.id) : tools.some((item) => item.id === owner?.id);
  if (!owner || !persisted) throw new Error(`Save or select a ${type} before uploading.`);
  ensureEditorSavedBeforeImmediateMutation();
  if (!pendingMedia.length) throw new Error("Choose one or more images.");
  const submitButton = formElement.querySelector<HTMLButtonElement>("[data-upload-submit]");
  const failures: Array<{ name: string; reason: string }> = [];
  const uploadedMediaIds: string[] = [];
  const uploadedCoverIds: string[] = [];
  let uploaded = 0;
  if (submitButton) submitButton.disabled = true;
  try {
    for (const [index, item] of pendingMedia.entries()) {
      if (submitButton) submitButton.textContent = "Uploading…";
        message(`Uploading image ${index + 1} of ${pendingMedia.length}...`);
      try {
        const extension = item.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${owner.storageFolder}/${owner.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(supabaseConfig.storageBucket).upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (uploadError) throw uploadError;
        const currentMaxOrder = Math.max(0, ...owner.media.map((media) => media.display_order));
        const caption = item.captionEn.trim() || item.captionVi.trim() ? { en: item.captionEn.trim(), vi: item.captionVi.trim() } : null;
        const { data, error: metadataError } = await supabase.from(owner.table).insert({ [owner.foreignKey]: owner.id, storage_path: path, alt: { en: item.altEn.trim(), vi: item.altVi.trim() }, caption, kind: "gallery", display_order: currentMaxOrder + index + 1, mime_type: item.file.type, file_size: item.file.size }).select("id").single();
        if (metadataError) { await supabase.storage.from(supabaseConfig.storageBucket).remove([path]); throw metadataError; }
        const uploadedId = String(data.id);
        uploadedMediaIds.push(uploadedId);
        if (item.kind === "cover") uploadedCoverIds.push(uploadedId);
        uploaded += 1;
      } catch (error) {
        failures.push({ name: item.file.name, reason: error instanceof Error ? error.message : "Upload failed." });
      }
    }
    const coverId = uploadedCoverIds.at(-1);
    if (coverId) {
      const { error } = await supabase.rpc(owner.coverRpc, { target_image_id: coverId });
      if (error) throw error;
      const existingMedia = orderedProjectMedia(owner.media);
      await persistMediaOrder(type, [
        { id: coverId },
        ...existingMedia.map((item) => ({ id: item.id })),
        ...uploadedMediaIds.filter((id) => id !== coverId).map((id) => ({ id })),
      ]);
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
  const total = pendingMedia.length;
  clearPendingMedia();
  formElement.reset();
  await refreshSelectedMediaOwner(type, owner.id);
  if (failures.length) throw new Error(`${uploaded} of ${total} images uploaded. Failed: ${failures.map((failure) => `${failure.name}: ${failure.reason}`).join("; ")}`);
  message(`${uploaded} ${uploaded === 1 ? "image" : "images"} uploaded.`, "success");
};

const refreshSelectedMediaOwner = async (type: AdminItemType, ownerId: string): Promise<void> => {
  await loadProjects();
  if (type === "project") selectedProject = projects.find((project) => project.id === ownerId) ?? null;
  else selectedTool = tools.find((tool) => tool.id === ownerId) ?? null;
  dashboardView();
};

const setMediaCover = async (type: AdminItemType, mediaId: string): Promise<void> => {
  ensureEditorSavedBeforeImmediateMutation();
  const owner = selectedMediaOwner(type);
  if (!owner) return;
  const ordered = orderedProjectMedia(owner.media);
  const cover = ordered.find((item) => item.id === mediaId);
  if (!cover) return;
  const ownerIsReady = type === "project" ? selectedProject?.status === "published" : selectedTool?.status === "published";
  if (ownerIsReady && !cover.alt.en.trim()) throw new Error("Add English alt text before using this image as the cover of a Ready item.");
  const { error } = await supabase.rpc(owner.coverRpc, { target_image_id: mediaId });
  if (error) throw error;
  await persistMediaOrder(type, [cover, ...ordered.filter((item) => item.id !== mediaId)]);
  await refreshSelectedMediaOwner(type, owner.id);
  message(`${owner.label} cover image updated.${type === "project" ? " Adjust its Portfolio crops when needed." : ""}`, "success");
};

const mediaFileExtension = (media: AdminMediaRow): string => {
  const fromPath = media.storage_path.split(".").at(-1)?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromPath) return fromPath;
  const mimeExtension: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
  return media.mime_type ? mimeExtension[media.mime_type] ?? "image" : "image";
};

const downloadSavedMedia = async (type: AdminItemType, mediaId: string, button: HTMLButtonElement): Promise<void> => {
  const owner = selectedMediaOwner(type);
  const media = owner?.media.find((item) => item.id === mediaId);
  if (!owner || !media) return;
  const idleContent = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "…";
  try {
    const blob = await downloadStoredMedia(media.storage_path);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(owner.name) || type}-${media.kind}.${mediaFileExtension(media)}`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    message("Original image downloaded.", "success");
  } finally {
    if (button.isConnected) {
      button.innerHTML = idleContent;
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
    }
  }
};

const saveMediaAlt = async (type: AdminItemType, card: HTMLElement): Promise<void> => {
  const owner = selectedMediaOwner(type);
  if (!owner || !card.dataset.mediaId) return;
  const alt = {
    en: card.querySelector<HTMLInputElement>("[data-media-alt-en]")?.value.trim() ?? "",
    vi: card.querySelector<HTMLInputElement>("[data-media-alt-vi]")?.value.trim() ?? "",
  };
  const captionValue = {
    en: card.querySelector<HTMLInputElement>("[data-media-caption-en]")?.value.trim() ?? "",
    vi: card.querySelector<HTMLInputElement>("[data-media-caption-vi]")?.value.trim() ?? "",
  };
  const caption = captionValue.en || captionValue.vi ? captionValue : null;
  const current = owner.media.find((item) => item.id === card.dataset.mediaId);
  const ownerIsReady = type === "project" ? selectedProject?.status === "published" : selectedTool?.status === "published";
  if (ownerIsReady && current?.kind === "cover" && !alt.en) {
    throw new Error("A Ready item must keep English alt text on its cover image. Return it to Draft first or add alt text.");
  }
  const { error } = await supabase.from(owner.table).update({ alt, caption }).eq("id", card.dataset.mediaId);
  if (error) throw error;
  if (current) {
    current.alt = alt;
    current.caption = caption;
  }
  dirtyMediaIds.delete(card.dataset.mediaId);
  syncContentDirtyState();
  message("Image alt text and caption saved.", "success");
};

const moveSavedMedia = async (type: AdminItemType, mediaId: string, direction: "up" | "down"): Promise<void> => {
  ensureEditorSavedBeforeImmediateMutation();
  const owner = selectedMediaOwner(type);
  if (!owner) return;
  const ordered = orderedProjectMedia(owner.media);
  const cover = ordered.find((item) => item.kind === "cover");
  if (cover?.id === mediaId) return;
  const gallery = ordered.filter((item) => item.kind !== "cover");
  const index = gallery.findIndex((item) => item.id === mediaId);
  const moved = moveItem(gallery, index, direction);
  await persistMediaOrder(type, cover ? [cover, ...moved] : moved);
  await refreshSelectedMediaOwner(type, owner.id);
  message("Image order updated.", "success");
};

const deleteSavedMedia = async (type: AdminItemType, mediaId: string): Promise<void> => {
  ensureEditorSavedBeforeImmediateMutation();
  const owner = selectedMediaOwner(type);
  if (!owner) return;
  const media = owner.media.find((item) => item.id === mediaId);
  const ownerIsReady = type === "project" ? selectedProject?.status === "published" : selectedTool?.status === "published";
  if (ownerIsReady && media?.kind === "cover") throw new Error(`Return this ${type} to Draft before deleting its required cover image.`);
  if (!media || !(await confirmAdmin({ eyebrow: `${owner.label} media`, title: "Delete this image?", message: "It will be removed from the draft. Stored files are retained automatically when a published release still references them.", confirmLabel: "Delete image", tone: "danger" }))) return;
  const { error: metadataError } = await supabase.from(owner.table).delete().eq("id", mediaId);
  if (metadataError) throw metadataError;
  const cropPaths = type === "project" ? (media.project_image_crops ?? []).map((crop) => crop.storage_path) : [];
  let cleanup = { removed: [] as string[], retained: [] as string[] };
  let cleanupWarning = "";
  try {
    cleanup = await removeUnreferencedStoragePaths([media.storage_path, ...cropPaths]);
  } catch (cleanupError) {
    cleanupWarning = ` Storage cleanup was deferred: ${cleanupError instanceof Error ? cleanupError.message : "unknown error"}`;
  }
  await refreshSelectedMediaOwner(type, owner.id);
  message(`Image deleted from the draft.${cleanup.retained.length ? " Its stored asset was retained because a release still references it." : ""}${cleanupWarning}`, "success");
};

const formText = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const commaList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);
const missingYouTubeColumn = (error: { message: string } | null, table: "projects" | "automation_tools"): boolean =>
  Boolean(error?.message.includes("'youtube_url'") && error.message.includes(`'${table}'`) && error.message.includes("schema cache"));

const bindContentItemActions = (root: ParentNode = app): void => {
  root.querySelectorAll<HTMLElement>("[data-select-item]").forEach((button) => button.addEventListener("click", async () => {
    if (adminFormDirty && !(await confirmAdmin({ eyebrow: "Unsaved changes", title: "Leave this editor?", message: "Your unsaved changes will be discarded if you open another item.", confirmLabel: "Discard changes", cancelLabel: "Keep editing", tone: "danger" }))) return;
    const type = button.dataset.itemType as AdminItemType;
    const id = button.dataset.selectItem;
    if (!id) return;
    const fromCollection = Boolean(button.closest("[data-collection-view]"));
    if (!fromCollection) {
      contentStatusFilter = "all";
      contentSearch = "";
    }
    resetContentDirtyState();
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
    pendingCollectionReveal = {
      view: type === "project" ? "projects" : "tools",
      itemId: id,
      align: fromCollection ? "nearest" : "center",
      focus: "select",
    };
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
  root.querySelectorAll<HTMLButtonElement>("[data-reorder-direction]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.reorderType as AdminItemType;
    const id = button.dataset.reorderItem;
    const direction = button.dataset.reorderDirection;
    if (id && (direction === "up" || direction === "down")) void reorderMasterItem(type, id, direction).catch((error: Error) => message(error.message, "error"));
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-reorder-menu-trigger]").forEach((button) => button.addEventListener("click", () => {
    const menu = app.querySelector<HTMLElement>("[data-reorder-menu]");
    const type = button.dataset.reorderType as AdminItemType | undefined;
    const id = button.dataset.reorderItem;
    if (!menu || !type || !id) return;
    if (menu.matches(":popover-open")) menu.hidePopover();
    app.querySelectorAll<HTMLElement>("[data-reorder-menu-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    const ordered = masterOrder(type);
    const index = ordered.findIndex((item) => item.id === id);
    menu.dataset.reorderType = type;
    menu.dataset.reorderItem = id;
    const first = menu.querySelector<HTMLButtonElement>('[data-reorder-edge="first"]');
    const last = menu.querySelector<HTMLButtonElement>('[data-reorder-edge="last"]');
    if (first) first.disabled = index <= 0;
    if (last) last.disabled = index < 0 || index === ordered.length - 1;
    button.setAttribute("aria-expanded", "true");
    menu.showPopover();
    requestAnimationFrame(() => {
      if (!menu.matches(":popover-open")) return;
      const triggerBounds = button.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      const gap = 6;
      const left = Math.min(window.innerWidth - menuBounds.width - 8, Math.max(8, triggerBounds.right - menuBounds.width));
      const below = triggerBounds.bottom + gap;
      const top = below + menuBounds.height <= window.innerHeight - 8
        ? below
        : Math.max(8, triggerBounds.top - menuBounds.height - gap);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    });
  }));
  let dragged: { type: AdminItemType; id: string } | null = null;
  root.querySelectorAll<HTMLElement>("[data-reorder-drag]").forEach((handle) => {
    handle.addEventListener("dragstart", (event) => {
      const type = handle.dataset.reorderType as AdminItemType;
      const id = handle.dataset.reorderItem;
      if (!id) return;
      dragged = { type, id };
      handle.closest(".admin-content-item")?.classList.add("is-dragging");
      (event as DragEvent).dataTransfer?.setData("text/plain", id);
    });
    handle.addEventListener("dragend", () => {
      dragged = null;
      root.querySelectorAll<HTMLElement>(".admin-content-item.is-dragging, .admin-content-item.is-drag-over").forEach((item) => item.classList.remove("is-dragging", "is-drag-over"));
    });
  });
  root.querySelectorAll<HTMLElement>(".admin-content-item").forEach((row) => {
    row.addEventListener("dragover", (event) => {
      const type = row.querySelector<HTMLElement>("[data-item-type]")?.dataset.itemType as AdminItemType | undefined;
      if (!dragged || !type || dragged.type !== type) return;
      event.preventDefault();
      row.classList.add("is-drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drag-over"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drag-over");
      const target = row.querySelector<HTMLElement>("[data-reorder-item]")?.dataset.reorderItem;
      if (dragged && target && target !== dragged.id) void reorderMasterItem(dragged.type, dragged.id, { targetId: target }).catch((error: Error) => message(error.message, "error"));
      dragged = null;
    });
  });
};

const bindDashboard = (): void => {
  const passwordDialog = app.querySelector<HTMLDialogElement>("[data-password-dialog]");
  const reorderMenu = app.querySelector<HTMLElement>("[data-reorder-menu]");
  reorderMenu?.addEventListener("toggle", () => {
    if (!reorderMenu.matches(":popover-open")) {
      app.querySelectorAll<HTMLElement>("[data-reorder-menu-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    }
  });
  reorderMenu?.querySelectorAll<HTMLButtonElement>("[data-reorder-edge]").forEach((button) => button.addEventListener("click", () => {
    const type = reorderMenu.dataset.reorderType as AdminItemType | undefined;
    const id = reorderMenu.dataset.reorderItem;
    const edge = button.dataset.reorderEdge as "first" | "last" | undefined;
    if (!type || !id || !edge) return;
    reorderMenu.hidePopover();
    void reorderMasterItem(type, id, edge).catch((error: Error) => message(error.message, "error"));
  }));
  const coverCropper = bindProjectCoverCropper(app, {
    notify: message,
    onSaved: async () => {
      const projectId = selectedProject?.id;
      if (projectId) await refreshSelectedMediaOwner("project", projectId);
    },
  });
  app.querySelectorAll<HTMLButtonElement>("[data-admin-view]").forEach((button) => button.addEventListener("click", async () => {
    if (adminFormDirty && !(await confirmAdmin({ eyebrow: "Unsaved changes", title: "Leave this editor?", message: "Your unsaved changes will be discarded if you leave this workspace.", confirmLabel: "Discard changes", cancelLabel: "Keep editing", tone: "danger" }))) return;
    if (activeView === "cover-letters") discardCoverLetterChanges();
    if (activeView === "cv" || activeView === "portfolio") discardProfileDocumentChanges();
    if (activeView === "homepage" || activeView === "profile") discardSiteChanges();
    clearPendingMedia();
    const nextView = button.dataset.adminView as AdminView;
    activeView = nextView;
    resetContentDirtyState();
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

    const navigationId = ++navigationSequence;
    const workspaceReady = nextView === "cover-letters"
      ? ensureCoverLetterWorkspace()
      : nextView === "cv" || nextView === "portfolio"
        ? ensureProfileDocumentWorkspace(nextView)
        : nextView === "homepage" || nextView === "profile"
          ? ensureSiteWorkspace()
          : null;

    // Start loading before the first render so an unopened workspace can
    // never be mistaken for a genuinely empty document library.
    dashboardView();
    if (workspaceReady) {
      await workspaceReady;
      const loadingViewIsVisible = app.querySelector(".admin-workspace-loading, .admin-document-loading, .admin-cl-loading");
      if (navigationId === navigationSequence && activeView === nextView && loadingViewIsVisible) dashboardView();
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
    contentEditorDirty = true;
    syncContentDirtyState();
  };
  app.querySelectorAll<HTMLFormElement>("[data-project-form], [data-tool-form]").forEach((form) => {
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
  });
  app.querySelector<HTMLInputElement>('input[name="images"]')?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files;
    const type = input.closest<HTMLElement>("[data-media-owner]")?.dataset.mediaOwner as AdminItemType | undefined;
    if (!files || !type) return;
    try { choosePendingMedia(files, type); } catch (error) { message(error instanceof Error ? error.message : "Images could not be selected.", "error"); }
  });
  app.querySelectorAll<HTMLElement>("[data-media-id]").forEach((card) => {
    const mediaId = card.dataset.mediaId;
    const type = card.closest<HTMLElement>("[data-media-owner]")?.dataset.mediaOwner as AdminItemType | undefined;
    if (!mediaId || !type) return;
    card.querySelectorAll<HTMLInputElement>("[data-media-alt-en], [data-media-alt-vi], [data-media-caption-en], [data-media-caption-vi]").forEach((input) => input.addEventListener("input", () => {
      dirtyMediaIds.add(mediaId);
      syncContentDirtyState();
    }));
    card.querySelector<HTMLButtonElement>("[data-media-download]")?.addEventListener("click", (event) => {
      void downloadSavedMedia(type, mediaId, event.currentTarget as HTMLButtonElement).catch((error: Error) => message(error.message, "error"));
    });
    card.querySelector<HTMLButtonElement>("[data-media-crops]")?.addEventListener("click", (event) => {
      try {
        ensureEditorSavedBeforeImmediateMutation();
      } catch (error) {
        message(error instanceof Error ? error.message : "Save pending changes first.", "error");
        return;
      }
      const project = selectedProject;
      const media = project?.project_images.find((item) => item.id === mediaId);
      if (!project || !media || media.kind !== "cover") return;
      const button = event.currentTarget as HTMLButtonElement;
      const idleContent = button.innerHTML;
      button.disabled = true;
      button.textContent = "Loading…";
      void coverCropper.open({
          projectId: project.id,
          imageId: media.id,
          storagePath: media.storage_path,
          preferredLayout: project.portfolio_layout,
          crops: media.project_image_crops ?? [],
        })
        .catch((error: Error) => message(error.message, "error"))
        .finally(() => {
          if (!button.isConnected) return;
          button.innerHTML = idleContent;
          button.disabled = false;
        });
    });
    card.querySelector("[data-media-cover]")?.addEventListener("click", () => { void setMediaCover(type, mediaId).catch((error: Error) => message(error.message, "error")); });
    card.querySelector("[data-media-save]")?.addEventListener("click", () => { void saveMediaAlt(type, card).catch((error: Error) => message(error.message, "error")); });
    card.querySelector("[data-media-delete]")?.addEventListener("click", () => { void deleteSavedMedia(type, mediaId).catch((error: Error) => message(error.message, "error")); });
    card.querySelectorAll<HTMLElement>("[data-media-move]").forEach((button) => button.addEventListener("click", () => { void moveSavedMedia(type, mediaId, button.dataset.mediaMove as "up" | "down").catch((error: Error) => message(error.message, "error")); }));
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
    if (adminFormDirty && !(await confirmAdmin({ eyebrow: "Sign out", title: "Leave with unsaved changes?", message: "Your unsaved changes will be discarded when you sign out.", confirmLabel: "Discard and sign out", cancelLabel: "Keep editing", tone: "danger" }))) return;
    await supabase.auth.signOut();
    loginView();
  });
  app.querySelector("[data-new-project]")?.addEventListener("click", async () => {
    if (adminFormDirty && !(await confirmAdmin({ eyebrow: "New project", title: "Discard current changes?", message: "A new project editor will open and the current unsaved changes will be lost.", confirmLabel: "Create new project", cancelLabel: "Keep editing", tone: "danger" }))) return;
    clearPendingMedia(); resetContentDirtyState(); activeEditorTab = "overview"; activeView = "projects"; selectedItemType = "project"; selectedTool = null; selectedProject = blankProject(); dashboardView();
  });
  app.querySelector("[data-new-tool]")?.addEventListener("click", async () => {
    if (adminFormDirty && !(await confirmAdmin({ eyebrow: "New automation tool", title: "Discard current changes?", message: "A new tool editor will open and the current unsaved changes will be lost.", confirmLabel: "Create new tool", cancelLabel: "Keep editing", tone: "danger" }))) return;
    clearPendingMedia(); resetContentDirtyState(); activeEditorTab = "overview"; activeView = "tools"; selectedItemType = "tool"; selectedProject = null; selectedTool = blankTool(); dashboardView();
  });
  app.querySelector("[data-delete-selected]")?.addEventListener("click", () => { void moveSelectedToTrash().catch((error: Error) => message(error.message, "error")); });
  app.querySelectorAll<HTMLButtonElement>("[data-content-filter]").forEach((button) => button.addEventListener("click", () => { contentFilter = button.dataset.contentFilter as ContentFilter; resetCurrentCollectionScroll(); dashboardView(); }));
  app.querySelectorAll<HTMLButtonElement>("[data-status-filter]").forEach((button) => button.addEventListener("click", () => { contentStatusFilter = button.dataset.statusFilter as ContentStatusFilter; resetCurrentCollectionScroll(); dashboardView(); }));
  app.querySelector<HTMLInputElement>("[data-content-search]")?.addEventListener("input", (event) => {
    contentSearch = (event.currentTarget as HTMLInputElement).value;
    const list = app.querySelector<HTMLElement>("[data-content-list]");
    if (list) {
      list.innerHTML = contentList();
      resetCurrentCollectionScroll();
      bindContentItemActions(list);
    }
  });
  app.querySelectorAll<HTMLButtonElement>("[data-selected-status]").forEach((button) => button.addEventListener("click", () => {
    void changeSelectedStatus(button.dataset.itemType as AdminItemType, button.dataset.next as PublicationStatus).catch((error: Error) => message(error.message, "error"));
  }));
  bindContentItemActions();
  app.querySelector<HTMLFormElement>("[data-project-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-tool-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveToolForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-upload-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void uploadImages(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  if (pendingMedia.length) renderUploadQueue();
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
