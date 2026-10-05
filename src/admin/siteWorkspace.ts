import { websiteContentSeed } from "../data/websiteSeed";
import {
  experienceLocationLabel,
  experienceLocationOptions,
  inferExperienceLocationCode,
} from "../data/experienceLocations";
import {
  listWebsiteReleases,
  loadWebsiteDraftData,
  publishWebsiteRelease,
  saveProfessionalProfile,
  saveWebsiteContent,
} from "../services/websiteRepository";
import { archiveProfilePhoto, listProfilePhotos, renameProfilePhoto } from "../services/profilePhotoRepository";
import { assetUrl, degreeClassificationValue, escapeHtml, type Language } from "../shared/format";
import { bindPreviewSender, type PreviewSender } from "../shared/previewProtocol";
import { documentThemes } from "../themes/documentThemes";
import type { DocumentReleaseSummary } from "../types/portfolio";
import type { ProfilePhotoAsset } from "../types/profilePhoto";
import type { ProfessionalProfileContent, WebsiteContent, WebsiteRuntimeData } from "../types/website";
import type { Education, Experience, LanguageSkill } from "../types/career";
import type { StoredDocumentTheme } from "../types/theme";
import { renderDocumentThemeFields } from "./documentThemeFields";
import { invalidateProfileDocumentWorkspace } from "./profileDocumentWorkspace";
import { updateCoverLetterSharedProfile } from "./coverLetterWorkspace";
import { confirmAdmin } from "./confirmDialog";
import { bindEmbeddedPreview, type EmbeddedPreviewController } from "./embeddedPreview";
import { bindProfilePhotoCropper, renderProfilePhotoCropDialog } from "./profilePhotoCropper";
import {
  bindPreviewZoom,
  createPreviewZoomState,
  renderPreviewZoomControls,
  type PreviewZoomController,
  type PreviewZoomState,
} from "./previewZoom";
import {
  bindAdminYearPickers,
  formatAdminDate,
  formatAdminDateTime,
  renderAdminPreviewLanguageToggle,
  renderAdminPreviewSelect,
  renderAdminPreviewToolbar,
  renderAdminSectionCard,
  renderAdminYearSelect,
  setButtonBusy,
} from "./ui";

export type SiteWorkspaceKind = "homepage" | "profile";
type WebsiteTab = "general" | "sections" | "featured" | "appearance";
type ProfileTab = "identity" | "photos" | "experience" | "education" | "skills" | "languages";
type WebsiteViewport = "desktop" | "laptop" | "tablet" | "mobile";
type WebsitePreviewPage = "homepage" | "projects" | "tools";
type WebsitePreviewData = WebsiteRuntimeData & { previewLanguage?: Language };

interface WorkspaceCallbacks {
  rerender: () => void;
  setDirty: (value: boolean) => void;
  notify: (message: string, kind?: "info" | "error" | "success") => void;
}

const state: {
  runtime: WebsiteRuntimeData | null;
  releases: DocumentReleaseSummary[];
  photos: ProfilePhotoAsset[];
  loading: boolean;
  error: string;
  websiteTab: WebsiteTab;
  profileTab: ProfileTab;
  viewport: WebsiteViewport;
  previewLanguage: Language;
  previewPage: WebsitePreviewPage;
  previewZoom: PreviewZoomState;
  stale: boolean;
} = {
  runtime: null,
  releases: [],
  photos: [],
  loading: false,
  error: "",
  websiteTab: "general",
  profileTab: "identity",
  viewport: "desktop",
  previewLanguage: "en",
  previewPage: "homepage",
  previewZoom: createPreviewZoomState(),
  stale: false,
};

let previewTimer: number | undefined;
let previewController: EmbeddedPreviewController | undefined;
let previewSender: PreviewSender | undefined;
let previewZoomController: PreviewZoomController | undefined;
let profileStructuralSnapshot: ProfessionalProfileContent | null = null;
const websiteViewportWidths: Record<WebsiteViewport, number> = {
  desktop: 1440,
  laptop: 1280,
  tablet: 768,
  mobile: 390,
};
const websitePreviewPath = (page: WebsitePreviewPage): string => {
  const route = page === "homepage" ? "" : page === "projects" ? "projects/" : "tools/";
  return `${import.meta.env.BASE_URL}${route}?preview=1&embedded=1`;
};
const value = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const lines = (text: string): string[] => text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const commaList = (text: string): string[] => text.split(",").map((item) => item.trim()).filter(Boolean);
const field = (label: string, name: string, current: string, type = "text", dataAttribute = ""): string =>
  `<label${type === "month" ? ' class="admin-date-field"' : ""}>${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(current)}"${dataAttribute ? ` ${dataAttribute}` : ""}></label>`;
const area = (label: string, name: string, current: string, rows = 4): string =>
  `<label>${escapeHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(current)}</textarea></label>`;
const bilingual = (label: string, name: string, text: { en: string; vi: string }): string =>
  `<div class="admin-site-bilingual">${field(`${label} (EN)`, `${name}_en`, text.en)}${field(`${label} (VI)`, `${name}_vi`, text.vi)}</div>`;

const profileInitials = (name: string): string => name
  .trim()
  .split(/\s+/)
  .slice(0, 3)
  .map((part) => part[0] ?? "")
  .join("")
  .toUpperCase() || "HDL";

const profilePhotoName = (path: string): string => {
  const cleanPath = path.split(/[?#]/, 1)[0];
  const name = cleanPath.split("/").at(-1) || "No photo selected";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

const profilePhotoControl = (professional: ProfessionalProfileContent, photos: ProfilePhotoAsset[]): string => {
  const path = professional.profile.photoPath;
  const selectedPhoto = photos.find((photo) => photo.publicUrl === path);
  const selectedName = selectedPhoto?.name ?? (path ? profilePhotoName(path) : "No photo");
  const legacyOption = path && !selectedPhoto
    ? `<button class="admin-profile-photo-option" type="button" role="option" aria-selected="true" data-profile-photo-option data-photo-value="${escapeHtml(path)}" data-photo-name="${escapeHtml(selectedName)}">
        <span class="admin-profile-photo-option__thumb"><img src="${escapeHtml(assetUrl(path))}" alt=""></span><strong>${escapeHtml(selectedName)}</strong>
      </button>`
    : "";
  const photoOptions = photos.map((photo) => `<button class="admin-profile-photo-option" type="button" role="option" aria-selected="${photo.publicUrl === path ? "true" : "false"}" data-profile-photo-option data-photo-value="${escapeHtml(photo.publicUrl)}" data-photo-name="${escapeHtml(photo.name)}">
      <span class="admin-profile-photo-option__thumb"><img src="${escapeHtml(photo.publicUrl)}" alt=""></span><strong>${escapeHtml(photo.name)}</strong>
    </button>`).join("");
  return `<div class="admin-profile-photo-field">
    <span class="admin-profile-photo-field__label" id="profile-photo-label">Profile photo</span>
    <input type="hidden" name="profile_photo" value="${escapeHtml(path)}" data-profile-photo-path>
    <div class="admin-profile-photo-picker" data-profile-photo-picker>
      <button class="admin-profile-photo-control" type="button" role="combobox" aria-labelledby="profile-photo-label" aria-expanded="false" aria-controls="profile-photo-options" data-profile-photo-trigger>
        <span class="admin-profile-photo-preview" data-profile-photo-frame aria-hidden="true">
          <span>${escapeHtml(profileInitials(professional.profile.name))}</span>
          ${path ? `<img src="${escapeHtml(assetUrl(path))}" alt="" data-profile-photo-preview>` : ""}
        </span>
        <span class="admin-profile-photo-identity">
          <strong data-profile-photo-name>${escapeHtml(selectedName)}</strong>
        </span>
        <span class="admin-profile-photo-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg></span>
      </button>
      <div class="admin-profile-photo-options" id="profile-photo-options" role="listbox" data-profile-photo-options hidden>
        <button class="admin-profile-photo-option" type="button" role="option" aria-selected="${path ? "false" : "true"}" data-profile-photo-option data-photo-value="" data-photo-name="No photo">
          <span class="admin-profile-photo-option__thumb admin-profile-photo-option__initials">${escapeHtml(profileInitials(professional.profile.name))}</span><strong>No photo</strong>
        </button>
        ${legacyOption}${photoOptions}
      </div>
    </div>
  </div>`;
};

const formatPhotoFileSize = (bytes: number): string => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const profilePhotos = (photos: ProfilePhotoAsset[]): string => {
  const cards = photos.map((photo) => `<article class="admin-photo-library-card" data-photo-library-card="${escapeHtml(photo.id)}">
      <div class="admin-photo-library-card__image"><img src="${escapeHtml(photo.publicUrl)}" alt="${escapeHtml(photo.name)}"></div>
      <div class="admin-photo-library-card__body">
        <div class="admin-photo-library-card__heading"><h4 data-profile-photo-library-name>${escapeHtml(photo.name)}</h4><div class="admin-photo-library-card__actions"><button class="button button--secondary" type="button" data-profile-photo-rename data-photo-id="${escapeHtml(photo.id)}" data-photo-name="${escapeHtml(photo.name)}">Rename</button><button class="button button--secondary admin-button--danger" type="button" data-profile-photo-delete data-photo-id="${escapeHtml(photo.id)}" data-photo-value="${escapeHtml(photo.publicUrl)}" data-photo-name="${escapeHtml(photo.name)}">Delete</button></div></div>
        <p>${photo.width} × ${photo.height}px · ${formatPhotoFileSize(photo.fileSize)}</p>
        <small>Saved ${formatAdminDate(photo.createdAt)}</small>
      </div>
    </article>`).join("");
  return renderAdminSectionCard({
    title: "Profile photo library",
    note: "Store, rename and delete reusable square photos. Choose the active photo in Identity.",
    headerActions: '<button class="button admin-action-new" type="button" data-profile-photo-upload-trigger>+ Add photo</button><input class="admin-photo-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" data-profile-photo-upload>',
    content: cards
      ? `<div class="admin-photo-library">${cards}</div>`
      : '<div class="admin-empty-state"><div><strong>No saved profile photos</strong><small>Add a photo, crop it once and reuse it across the CV and Portfolio.</small></div></div>',
  });
};

const renderProfilePhotoRenameDialog = (): string => `<dialog class="admin-dialog admin-photo-rename-dialog" data-profile-photo-rename-dialog aria-labelledby="profile-photo-rename-title">
  <form data-profile-photo-rename-form>
    <div><p class="section-kicker">Profile photo library</p><h2 id="profile-photo-rename-title">Rename photo</h2><p>Use a short name that makes this photo easy to identify.</p></div>
    <label>Photo name<input type="text" maxlength="120" required data-profile-photo-rename-input></label>
    <div class="admin-actions"><button class="button button--secondary" type="button" data-profile-photo-rename-cancel>Cancel</button><button class="button" type="submit" data-profile-photo-rename-save>Save name</button></div>
  </form>
</dialog>`;

const readLocalized = (form: FormData, name: string): { en: string; vi: string } => ({
  en: value(form, `${name}_en`),
  vi: value(form, `${name}_vi`),
});

const themeFields = (theme: StoredDocumentTheme): string => renderDocumentThemeFields({
  theme,
  names: {
    preset: "website_theme_preset",
    primary: "website_theme_primary",
    accent: "website_theme_accent",
  },
});

const readTheme = (form: FormData): StoredDocumentTheme => {
  const presetId = value(form, "website_theme_preset") || "personal-blue";
  return presetId === "custom"
    ? { presetId, primary: value(form, "website_theme_primary"), accent: value(form, "website_theme_accent") }
    : { presetId };
};

export const ensureSiteWorkspace = async (): Promise<void> => {
  if (state.loading || (state.runtime && !state.stale)) return;
  state.loading = true;
  state.error = "";
  try {
    [state.runtime, state.releases, state.photos] = await Promise.all([
      loadWebsiteDraftData(),
      listWebsiteReleases(),
      listProfilePhotos(),
    ]);
    profileStructuralSnapshot = null;
    state.stale = false;
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Website workspace could not be loaded.";
  } finally {
    state.loading = false;
  }
};

const websiteGeneral = (content: WebsiteContent): string => [
  renderAdminSectionCard({
    title: "Website SEO",
    note: "Edit browser and search-result titles and descriptions.",
    content: `${bilingual("SEO title", "seo_title", content.seoTitle)}
      <div class="admin-site-bilingual">${area("SEO description (EN)", "seo_description_en", content.seoDescription.en, 4)}${area("SEO description (VI)", "seo_description_vi", content.seoDescription.vi, 4)}</div>`,
  }),
  renderAdminSectionCard({
    title: "Website hero",
    note: "Edit the homepage introduction shown above the main content.",
    content: `${bilingual("Hero eyebrow", "hero_eyebrow", content.heroEyebrow)}
      ${bilingual("Professional focus", "focus", content.focus)}
      ${bilingual("Specialization", "specialization", content.specialization)}`,
  }),
  renderAdminSectionCard({
    title: "Website listings",
    note: "Set introductions for the Projects and Automation pages.",
    content: `${bilingual("Projects page kicker", "projects_page_kicker", content.projectsPage.kicker)}
      ${bilingual("Projects page title", "projects_page_title", content.projectsPage.title)}
      <div class="admin-site-bilingual">${area("Projects page description (EN)", "projects_page_description_en", content.projectsPage.description.en, 3)}${area("Projects page description (VI)", "projects_page_description_vi", content.projectsPage.description.vi, 3)}</div>
      ${bilingual("Tools page kicker", "tools_page_kicker", content.toolsPage.kicker)}
      ${bilingual("Tools page title", "tools_page_title", content.toolsPage.title)}
      <div class="admin-site-bilingual">${area("Tools page description (EN)", "tools_page_description_en", content.toolsPage.description.en, 3)}${area("Tools page description (VI)", "tools_page_description_vi", content.toolsPage.description.vi, 3)}</div>`,
  }),
].join("");

const sectionGroup = (
  order: string,
  id: keyof WebsiteContent["sections"],
  title: string,
  enabled: boolean,
  fields: string,
): string => `<article class="admin-site-section-group">
  <header class="admin-site-section-group__header">
    <div class="admin-site-section-group__identity"><span>${order}</span><h4>${escapeHtml(title)}</h4></div>
    <label class="admin-site-section-visibility">
      <span class="admin-site-section-status admin-site-section-status--shown">Shown</span>
      <span class="admin-site-section-status admin-site-section-status--hidden">Hidden</span>
      <input name="section_${id}" type="checkbox" aria-label="Show ${escapeHtml(title)} section"${enabled ? " checked" : ""}>
      <span class="admin-site-section-switch" aria-hidden="true"></span>
    </label>
  </header>
  <div class="admin-site-section-group__body">${fields}</div>
</article>`;

const websiteSections = (content: WebsiteContent): string => renderAdminSectionCard({
  title: "Website sections",
  note: "Choose homepage visibility and edit each section heading.",
  content: `<div class="admin-site-section-list">
    ${sectionGroup("01", "expertise", "Expertise", content.sections.expertise, bilingual("Heading", "expertise_title", content.expertiseTitle))}
    ${sectionGroup("02", "experience", "Experience", content.sections.experience, bilingual("Heading", "experience_title", content.experienceTitle))}
    ${sectionGroup("03", "projects", "Projects", content.sections.projects, bilingual("Heading", "projects_title", content.projectsTitle))}
    ${sectionGroup("04", "automation", "Automation", content.sections.automation, bilingual("Heading", "automation_title", content.automationTitle))}
    ${sectionGroup("05", "contact", "Contact", content.sections.contact, `${bilingual("Kicker", "contact_kicker", content.contactKicker)}
      ${bilingual("Heading", "contact_title", content.contactTitle)}
      ${bilingual("Footer text", "footer_text", content.footerText)}`)}
  </div>`,
});

const websiteFeatured = (runtime: WebsiteRuntimeData): string => renderAdminSectionCard({
  title: "Website content selection",
  note: "Choose Website content and Homepage highlights.",
  content: `<div class="admin-site-content-selection">
    <section><h4>Projects</h4><div class="admin-site-content-selection__list">
      ${runtime.projects.map((item) => {
        const ready = item.status === "published";
        return `<article>
          <span class="admin-site-content-selection__identity"><strong title="${escapeHtml(item.name.en)}">${escapeHtml(item.name.en)}</strong><small title="${escapeHtml(item.slug || "Slug not set")}">${item.slug ? `Slug: ${escapeHtml(item.slug)}` : "Slug not set"}</small></span>
          <div class="admin-site-content-selection__checks">
            <label class="admin-site-content-selection__toggle"><input type="checkbox" name="website_project" value="${escapeHtml(item.id)}"${ready && item.websiteVisible !== false ? " checked" : ""}${ready ? "" : " disabled"}><span>On website</span></label>
            <label class="admin-site-content-selection__toggle"><input type="checkbox" name="featured_project" value="${escapeHtml(item.id)}"${ready && item.featured ? " checked" : ""}${ready ? "" : " disabled"}><span>Homepage</span></label>
          </div>
        </article>`;
      }).join("")}
    </div></section>
    <section><h4>Automation tools</h4><div class="admin-site-content-selection__list">
      ${runtime.tools.map((item) => {
        const ready = item.status === "published";
        return `<article>
          <span class="admin-site-content-selection__identity"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small title="${escapeHtml(item.slug || "Slug not set")}">${item.slug ? `Slug: ${escapeHtml(item.slug)}` : "Slug not set"}</small></span>
          <div class="admin-site-content-selection__checks">
            <label class="admin-site-content-selection__toggle"><input type="checkbox" name="website_tool" value="${escapeHtml(item.id)}"${ready && item.websiteVisible !== false ? " checked" : ""}${ready ? "" : " disabled"}><span>On website</span></label>
            <label class="admin-site-content-selection__toggle"><input type="checkbox" name="featured_tool" value="${escapeHtml(item.id)}"${ready && item.featured ? " checked" : ""}${ready ? "" : " disabled"}><span>Homepage</span></label>
          </div>
        </article>`;
      }).join("")}
    </div></section>
  </div>`,
});

const readWebsiteForm = (formElement: HTMLFormElement): WebsiteRuntimeData => {
  const current = state.runtime!;
  const form = new FormData(formElement);
  const websiteProjectIds = new Set(form.getAll("website_project").map(String));
  const projectIds = new Set(form.getAll("featured_project").map(String));
  const websiteToolIds = new Set(form.getAll("website_tool").map(String));
  const toolIds = new Set(form.getAll("featured_tool").map(String));
  projectIds.forEach((id) => websiteProjectIds.add(id));
  toolIds.forEach((id) => websiteToolIds.add(id));
  const orderedWebsiteProjectIds = current.projects
    .filter((item) => websiteProjectIds.has(item.id))
    .map((item) => item.id);
  const orderedWebsiteToolIds = current.tools
    .filter((item) => websiteToolIds.has(item.id))
    .map((item) => item.id);
  const orderedProjectIds = orderedWebsiteProjectIds.filter((id) => projectIds.has(id));
  const orderedToolIds = orderedWebsiteToolIds.filter((id) => toolIds.has(id));
  const content: WebsiteContent = {
    ...current.content,
    version: current.content.version || websiteContentSeed.version,
    seoTitle: readLocalized(form, "seo_title"),
    seoDescription: readLocalized(form, "seo_description"),
    heroEyebrow: readLocalized(form, "hero_eyebrow"),
    focus: readLocalized(form, "focus"),
    specialization: readLocalized(form, "specialization"),
    expertiseTitle: readLocalized(form, "expertise_title"),
    experienceTitle: readLocalized(form, "experience_title"),
    projectsTitle: readLocalized(form, "projects_title"),
    automationTitle: readLocalized(form, "automation_title"),
    projectsPage: {
      kicker: readLocalized(form, "projects_page_kicker"),
      title: readLocalized(form, "projects_page_title"),
      description: readLocalized(form, "projects_page_description"),
    },
    toolsPage: {
      kicker: readLocalized(form, "tools_page_kicker"),
      title: readLocalized(form, "tools_page_title"),
      description: readLocalized(form, "tools_page_description"),
    },
    contactKicker: readLocalized(form, "contact_kicker"),
    contactTitle: readLocalized(form, "contact_title"),
    footerText: readLocalized(form, "footer_text"),
    contentSelection: {
      projectIds: orderedWebsiteProjectIds,
      featuredProjectIds: orderedProjectIds,
      toolIds: orderedWebsiteToolIds,
      featuredToolIds: orderedToolIds,
    },
    theme: readTheme(form),
    sections: {
      expertise: form.get("section_expertise") === "on",
      experience: form.get("section_experience") === "on",
      projects: form.get("section_projects") === "on",
      automation: form.get("section_automation") === "on",
      contact: form.get("section_contact") === "on",
    },
  };
  return {
    content,
    professional: current.professional,
    projects: current.projects.map((item) => ({
      ...item,
      websiteVisible: websiteProjectIds.has(item.id),
      featured: projectIds.has(item.id),
    })),
    tools: current.tools.map((item) => ({
      ...item,
      websiteVisible: websiteToolIds.has(item.id),
      featured: toolIds.has(item.id),
    })),
  };
};

const profileIdentity = (professional: ProfessionalProfileContent, photos: ProfilePhotoAsset[]): string => renderAdminSectionCard({
  title: "Profile identity",
  note: "Shared contact and profile details used across all outputs.",
  content: `<div class="admin-form-grid">
    ${field("Full name", "profile_name", professional.profile.name)}
    ${field("Email", "profile_email", professional.profile.email, "email")}
    ${field("Phone", "profile_phone", professional.profile.phone, "tel")}
    ${profilePhotoControl(professional, photos)}
    ${field("Professional title (EN)", "profile_title_en", professional.profile.professionalTitle.en)}
    ${field("Professional title (VI)", "profile_title_vi", professional.profile.professionalTitle.vi)}
    ${field("Location (EN)", "profile_location_en", professional.profile.location.en)}
    ${field("Location (VI)", "profile_location_vi", professional.profile.location.vi)}
  </div>
  <div class="admin-site-bilingual">${area("Summary (EN)", "profile_summary_en", professional.profile.summary.en, 6)}${area("Summary (VI)", "profile_summary_vi", professional.profile.summary.vi, 6)}</div>`,
});

const experienceFieldName = (id: string, fieldName: string): string => `profile_experience_${id}_${fieldName}`;

const blankExperience = (): Experience => {
  const locationCode = "VN";
  const location = experienceLocationLabel(locationCode, "Vietnam");
  return {
    id: crypto.randomUUID(),
    company: "",
    position: { en: "", vi: "" },
    locationCode,
    location: { en: location, vi: location },
    startDate: "",
    endDate: null,
    responsibilities: [],
    technologies: [],
  };
};

const experienceLocationCombobox = (item: Experience): string => {
  const storedCode = experienceLocationOptions.some((option) => option.code === item.locationCode)
    ? item.locationCode
    : undefined;
  const selectedCode = storedCode ?? inferExperienceLocationCode(item.location.en);
  const inputId = `experience-location-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const listId = `${inputId}-list`;
  const displayValue = experienceLocationLabel(selectedCode, item.location.en);
  return `<div class="admin-location-field">
    <label for="${escapeHtml(inputId)}">Country / region</label>
    <div class="admin-location-combobox" data-location-combobox>
      <input id="${escapeHtml(inputId)}" name="${escapeHtml(experienceFieldName(item.id, "location_label"))}" value="${escapeHtml(displayValue)}" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${escapeHtml(listId)}" placeholder="Search country or region" data-location-input>
      <input name="${escapeHtml(experienceFieldName(item.id, "location_code"))}" value="${escapeHtml(selectedCode ?? "__legacy__")}" type="hidden" data-location-code>
      <button class="admin-location-combobox__toggle" type="button" aria-label="Show country or region options" aria-expanded="false" tabindex="-1" data-location-toggle><svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
      <div class="admin-location-combobox__list" id="${escapeHtml(listId)}" role="listbox" data-location-list hidden>
        ${experienceLocationOptions.map((option) => `<button class="admin-location-combobox__option" type="button" role="option" aria-selected="${option.code === selectedCode ? "true" : "false"}" data-location-option data-location-code="${escapeHtml(option.code)}" data-location-label="${escapeHtml(option.label)}">${escapeHtml(option.label)}</button>`).join("")}
        <p class="admin-location-combobox__empty" data-location-empty hidden>No matching country or region.</p>
      </div>
    </div>
  </div>`;
};

const experienceCard = (item: Experience, index: number, total: number): string => `
  <article class="admin-experience-card admin-profile-entry-card" data-profile-experience="${escapeHtml(item.id)}">
    <input type="hidden" name="profile_experience_order" value="${escapeHtml(item.id)}">
    <header class="admin-experience-card__heading admin-profile-entry-card__heading">
      <div><small>Experience ${index + 1}</small><h4>${escapeHtml(item.company || "New company")}</h4></div>
      <div class="admin-experience-card__actions admin-profile-entry-card__actions">
        <button class="button button--secondary admin-icon-button" type="button" data-profile-experience-move="up" data-experience-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.company || "new company")} up"${index === 0 ? " disabled" : ""}>&#8593;</button>
        <button class="button button--secondary admin-icon-button" type="button" data-profile-experience-move="down" data-experience-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.company || "new company")} down"${index === total - 1 ? " disabled" : ""}>&#8595;</button>
        <button class="button button--secondary admin-button--danger" type="button" data-profile-experience-delete data-experience-id="${escapeHtml(item.id)}">Delete</button>
      </div>
    </header>
    <div class="admin-experience-card__fields admin-profile-entry-card__fields">
      <div class="admin-form-grid">
        ${field("Company", experienceFieldName(item.id, "company"), item.company, "text", `data-experience-company="${escapeHtml(item.id)}"`)}
        ${experienceLocationCombobox(item)}
      </div>
      <div class="admin-site-bilingual">
        ${field("Position (EN)", experienceFieldName(item.id, "position_en"), item.position.en)}
        ${field("Position (VI)", experienceFieldName(item.id, "position_vi"), item.position.vi)}
      </div>
      <div class="admin-form-grid">
        ${field("Start", experienceFieldName(item.id, "start"), item.startDate, "month")}
        ${field("End (blank = Present)", experienceFieldName(item.id, "end"), item.endDate ?? "", "month")}
      </div>
      <div class="admin-site-bilingual">
        ${area("Responsibilities (one EN item per line)", experienceFieldName(item.id, "responsibilities_en"), item.responsibilities.map((point) => point.text.en).join("\n"), 5)}
        ${area("Responsibilities (one VI item per line)", experienceFieldName(item.id, "responsibilities_vi"), item.responsibilities.map((point) => point.text.vi).join("\n"), 5)}
      </div>
      <p class="admin-experience-card__translation-note admin-profile-entry-card__translation-note">Keep EN and VI responsibility items aligned line by line.</p>
      ${field("Technologies", experienceFieldName(item.id, "technologies"), item.technologies.join(", "))}
    </div>
  </article>`;

const profileExperience = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile experience",
  note: "Shared career history used by the Website and CV.",
  headerActions: '<button class="button admin-action-new" type="button" data-profile-experience-new>+ Add company</button>',
  content: professional.experiences.length
    ? `<div class="admin-document-cards admin-experience-list">${professional.experiences.map((item, index) => experienceCard(item, index, professional.experiences.length)).join("")}</div>`
    : '<div class="admin-empty-state"><div><strong>No experience entries</strong><small>Add a company to begin building the shared Website and CV history.</small></div></div>',
});

const educationFieldName = (id: string, fieldName: string): string => `profile_education_${id}_${fieldName}`;

const blankEducation = (): Education => ({
  id: crypto.randomUUID(),
  field: { en: "", vi: "" },
  institution: { en: "", vi: "" },
  startDate: "",
  endDate: "",
});

const educationCard = (item: Education, index: number, total: number): string => `
  <article class="admin-education-card admin-profile-entry-card" data-profile-education="${escapeHtml(item.id)}">
    <input type="hidden" name="profile_education_order" value="${escapeHtml(item.id)}">
    <header class="admin-profile-entry-card__heading">
      <div><small>Education ${index + 1}</small><h4>${escapeHtml(item.institution.en || "New education")}</h4></div>
      <div class="admin-profile-entry-card__actions">
        <button class="button button--secondary admin-icon-button" type="button" data-profile-education-move="up" data-education-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.institution.en || "new education")} up"${index === 0 ? " disabled" : ""}>&#8593;</button>
        <button class="button button--secondary admin-icon-button" type="button" data-profile-education-move="down" data-education-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.institution.en || "new education")} down"${index === total - 1 ? " disabled" : ""}>&#8595;</button>
        <button class="button button--secondary admin-button--danger" type="button" data-profile-education-delete data-education-id="${escapeHtml(item.id)}">Delete</button>
      </div>
    </header>
    <div class="admin-profile-entry-card__fields">
      <div class="admin-site-bilingual">
        ${field("Institution (EN)", educationFieldName(item.id, "institution_en"), item.institution.en, "text", `data-education-institution="${escapeHtml(item.id)}"`)}
        ${field("Institution (VI)", educationFieldName(item.id, "institution_vi"), item.institution.vi)}
      </div>
      <div class="admin-site-bilingual">
        ${field("Field of study (EN)", educationFieldName(item.id, "field_en"), item.field.en)}
        ${field("Field of study (VI)", educationFieldName(item.id, "field_vi"), item.field.vi)}
      </div>
      <div class="admin-site-bilingual">
        ${field("Degree classification (EN)", educationFieldName(item.id, "classification_en"), degreeClassificationValue(item.classification?.en ?? "", "en"))}
        ${field("Degree classification (VI)", educationFieldName(item.id, "classification_vi"), degreeClassificationValue(item.classification?.vi ?? "", "vi"))}
      </div>
      <div class="admin-form-grid">
        ${renderAdminYearSelect({ label: "Start year", name: educationFieldName(item.id, "start"), value: item.startDate })}
        ${renderAdminYearSelect({ label: "End year", name: educationFieldName(item.id, "end"), value: item.endDate })}
      </div>
    </div>
  </article>`;

const profileEducation = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile education",
  note: "Shared education history used by the Website and CV.",
  headerActions: '<button class="button admin-action-new" type="button" data-profile-education-new>+ Add education</button>',
  content: professional.education.length
    ? `<div class="admin-document-cards admin-education-list">${professional.education.map((item, index) => educationCard(item, index, professional.education.length)).join("")}</div>`
    : '<div class="admin-empty-state"><div><strong>No education entries</strong><small>Add an education entry to reuse it across the Website and CVs.</small></div></div>',
});

const profileSkills = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile skills",
  note: "Skill groups used by Website expertise and CV.",
  content: `<div class="admin-document-cards">
    ${professional.skillGroups.map((group, index) => `<article><h4>${escapeHtml(group.title.en)}</h4><div class="admin-form-grid">${field("Group title (EN)", `profile_skill_title_en_${index}`, group.title.en)}${field("Group title (VI)", `profile_skill_title_vi_${index}`, group.title.vi)}</div>${area("Items (one per line)", `profile_skill_items_${index}`, group.items.map((item) => item.label.en).join("\n"), 5)}</article>`).join("")}
  </div>`,
});

const languageFieldName = (id: string, fieldName: string): string => `profile_language_${id}_${fieldName}`;

const blankLanguage = (): LanguageSkill => ({
  id: crypto.randomUUID(),
  name: { en: "", vi: "" },
});

const languageCard = (item: LanguageSkill, index: number, total: number): string => `
  <article class="admin-language-card admin-profile-entry-card" data-profile-language="${escapeHtml(item.id)}">
    <input type="hidden" name="profile_language_order" value="${escapeHtml(item.id)}">
    <header class="admin-profile-entry-card__heading">
      <div><small>Language ${index + 1}</small><h4>${escapeHtml(item.name.en || "New language")}</h4></div>
      <div class="admin-profile-entry-card__actions">
        <button class="button button--secondary admin-icon-button" type="button" data-profile-language-move="up" data-language-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.name.en || "new language")} up"${index === 0 ? " disabled" : ""}>&#8593;</button>
        <button class="button button--secondary admin-icon-button" type="button" data-profile-language-move="down" data-language-id="${escapeHtml(item.id)}" aria-label="Move ${escapeHtml(item.name.en || "new language")} down"${index === total - 1 ? " disabled" : ""}>&#8595;</button>
        <button class="button button--secondary admin-button--danger" type="button" data-profile-language-delete data-language-id="${escapeHtml(item.id)}">Delete</button>
      </div>
    </header>
    <div class="admin-profile-entry-card__fields">
      <div class="admin-site-bilingual">
        ${field("Name (EN)", languageFieldName(item.id, "name_en"), item.name.en, "text", `data-language-name="${escapeHtml(item.id)}"`)}
        ${field("Name (VI)", languageFieldName(item.id, "name_vi"), item.name.vi)}
      </div>
      <div class="admin-site-bilingual">
        ${field("Proficiency (EN)", languageFieldName(item.id, "proficiency_en"), item.proficiency?.en ?? "")}
        ${field("Proficiency (VI)", languageFieldName(item.id, "proficiency_vi"), item.proficiency?.vi ?? "")}
      </div>
    </div>
  </article>`;

const profileLanguages = (professional: ProfessionalProfileContent): string => renderAdminSectionCard({
  title: "Profile languages",
  note: "Shared language proficiency used by the Website and CV.",
  headerActions: '<button class="button admin-action-new" type="button" data-profile-language-new>+ Add language</button>',
  content: professional.languages.length
    ? `<div class="admin-document-cards admin-language-list">${professional.languages.map((item, index) => languageCard(item, index, professional.languages.length)).join("")}</div>`
    : '<div class="admin-empty-state"><div><strong>No language entries</strong><small>Add a language to reuse it across the Website and CVs.</small></div></div>',
});

const readProfileForm = (formElement: HTMLFormElement): ProfessionalProfileContent => {
  const current = state.runtime!.professional;
  const form = new FormData(formElement);
  const experienceById = new Map(current.experiences.map((item) => [item.id, item]));
  const experienceIds = form.getAll("profile_experience_order").map((item) => String(item));
  const educationById = new Map(current.education.map((item) => [item.id, item]));
  const educationIds = form.getAll("profile_education_order").map((item) => String(item));
  const languageById = new Map(current.languages.map((item) => [item.id, item]));
  const languageIds = form.getAll("profile_language_order").map((item) => String(item));
  return {
    profile: {
      name: value(form, "profile_name"),
      email: value(form, "profile_email"),
      phone: value(form, "profile_phone"),
      photoPath: value(form, "profile_photo"),
      professionalTitle: { en: value(form, "profile_title_en"), vi: value(form, "profile_title_vi") },
      location: { en: value(form, "profile_location_en"), vi: value(form, "profile_location_vi") },
      summary: { en: value(form, "profile_summary_en"), vi: value(form, "profile_summary_vi") },
    },
    experiences: experienceIds.map((id) => {
      const item = experienceById.get(id) ?? blankExperience();
      const responsibilitiesEn = lines(value(form, experienceFieldName(id, "responsibilities_en")));
      const responsibilitiesVi = lines(value(form, experienceFieldName(id, "responsibilities_vi")));
      const locationCodeValue = value(form, experienceFieldName(id, "location_code"));
      const locationLabelValue = value(form, experienceFieldName(id, "location_label"));
      const locationCode = locationCodeValue !== "__legacy__" && experienceLocationLabel(locationCodeValue)
        ? locationCodeValue
        : inferExperienceLocationCode(locationLabelValue);
      const location = locationCode
        ? experienceLocationLabel(locationCode, locationLabelValue || item.location.en)
        : locationLabelValue || item.location.en;
      return {
        ...item,
        id,
        company: value(form, experienceFieldName(id, "company")),
        position: {
          en: value(form, experienceFieldName(id, "position_en")),
          vi: value(form, experienceFieldName(id, "position_vi")),
        },
        locationCode,
        location: { en: location, vi: location },
        startDate: value(form, experienceFieldName(id, "start")),
        endDate: value(form, experienceFieldName(id, "end")) || null,
        responsibilities: Array.from({ length: Math.max(responsibilitiesEn.length, responsibilitiesVi.length) }, (_, pointIndex) => ({
          id: item.responsibilities[pointIndex]?.id ?? `${id}-${pointIndex + 1}`,
          text: { en: responsibilitiesEn[pointIndex] ?? "", vi: responsibilitiesVi[pointIndex] ?? "" },
        })).filter((point) => point.text.en || point.text.vi),
        technologies: commaList(value(form, experienceFieldName(id, "technologies"))),
      };
    }),
    education: educationIds.map((id) => {
      const item = educationById.get(id) ?? blankEducation();
      const classification = {
        en: value(form, educationFieldName(id, "classification_en")),
        vi: value(form, educationFieldName(id, "classification_vi")),
      };
      return {
        ...item,
        id,
        field: {
          en: value(form, educationFieldName(id, "field_en")),
          vi: value(form, educationFieldName(id, "field_vi")),
        },
        institution: {
          en: value(form, educationFieldName(id, "institution_en")),
          vi: value(form, educationFieldName(id, "institution_vi")),
        },
        classification: classification.en || classification.vi ? classification : undefined,
        startDate: value(form, educationFieldName(id, "start")),
        endDate: value(form, educationFieldName(id, "end")),
      };
    }),
    skillGroups: current.skillGroups.map((group, index) => ({
      ...group,
      title: { en: value(form, `profile_skill_title_en_${index}`), vi: value(form, `profile_skill_title_vi_${index}`) },
      items: lines(value(form, `profile_skill_items_${index}`)).map((label, itemIndex) => ({ id: group.items[itemIndex]?.id ?? `${group.id}-${itemIndex + 1}`, label: { en: label, vi: group.items[itemIndex]?.label.vi ?? label } })),
    })),
    languages: languageIds.map((id) => {
      const item = languageById.get(id) ?? blankLanguage();
      const proficiency = {
        en: value(form, languageFieldName(id, "proficiency_en")),
        vi: value(form, languageFieldName(id, "proficiency_vi")),
      };
      return {
        ...item,
        id,
        name: {
          en: value(form, languageFieldName(id, "name_en")),
          vi: value(form, languageFieldName(id, "name_vi")),
        },
        proficiency: proficiency.en || proficiency.vi ? proficiency : undefined,
      };
    }),
  };
};

const validateProfileExperiences = (experiences: Experience[]): string | null => {
  for (const [index, item] of experiences.entries()) {
    const label = item.company || `Experience ${index + 1}`;
    if (!item.company || !item.position.en || !item.location.en || !item.startDate) {
      return `${label}: Company, Position (EN), Country / region and Start are required.`;
    }
    if (item.endDate && item.endDate < item.startDate) {
      return `${label}: End date cannot be earlier than Start date.`;
    }
  }
  return null;
};

const validateProfileEducation = (education: Education[]): string | null => {
  for (const [index, item] of education.entries()) {
    const label = item.institution.en || `Education ${index + 1}`;
    if (!item.institution.en || !item.field.en || !item.startDate || !item.endDate) {
      return `${label}: Institution (EN), Field of study (EN), Start year and End year are required.`;
    }
    if (!/^\d{4}$/.test(item.startDate) || !/^\d{4}$/.test(item.endDate)) {
      return `${label}: Start year and End year must use four digits (YYYY).`;
    }
    if (Number(item.endDate) < Number(item.startDate)) {
      return `${label}: End year cannot be earlier than Start year.`;
    }
  }
  return null;
};

const validateProfileLanguages = (languages: LanguageSkill[]): string | null => {
  for (const [index, item] of languages.entries()) {
    if (!item.name.en) return `Language ${index + 1}: Name (EN) is required.`;
  }
  return null;
};

const websiteView = (): string => {
  const runtime = state.runtime!;
  const content = runtime.content;
  const tab = state.websiteTab;
  const latest = state.releases[0];
  const releaseHistory = state.releases.length
    ? `<ol class="admin-release-history__list">${state.releases.map((item, index) => `<li><div><strong>${index === 0 ? "Latest release" : "Published release"}</strong><span>${formatAdminDateTime(item.publishedAt)}</span></div><code>${escapeHtml(item.version)}</code></li>`).join("")}</ol>`
    : '<p class="admin-empty">No Website release has been published yet.</p>';
  const viewportControls = renderAdminPreviewSelect({
    label: "Website viewport",
    dataAttribute: "data-website-viewport",
    activeValue: state.viewport,
    className: "admin-preview-toolbar__select--viewport",
    options: [
      { label: "Desktop", value: "desktop" },
      { label: "Laptop", value: "laptop" },
      { label: "Tablet", value: "tablet" },
      { label: "Mobile", value: "mobile" },
    ],
  });
  const pageControls = renderAdminPreviewSelect({
    label: "Website preview page",
    dataAttribute: "data-website-preview-page",
    activeValue: state.previewPage,
    className: "admin-preview-toolbar__select--page",
    options: [
      { label: "Homepage", value: "homepage" },
      { label: "Projects", value: "projects" },
      { label: "Automation", value: "tools" },
    ],
  });
  const languageControls = renderAdminPreviewLanguageToggle(state.previewLanguage, "data-website-language-toggle");
  const zoomControls = renderPreviewZoomControls(state.previewZoom);
  const previewToolbar = renderAdminPreviewToolbar({
    title: "Website preview",
    meta: 'Live draft · <span data-preview-status data-kind="warning">Connecting…</span>',
    controls: `${pageControls}${viewportControls}${languageControls}${zoomControls}`,
  });
  return `<section class="admin-site-workspace">
    <header class="admin-document-header"><div class="admin-document-header__identity"><p class="section-kicker">Website</p><h1>Homepage</h1><p><span class="status status--draft">Draft</span><span>${latest ? `Last published ${formatAdminDateTime(latest.publishedAt)}` : "Not published yet"}</span></p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button button--secondary admin-action-utility" type="button" data-website-history-open>History (${state.releases.length})</button><button class="button button--secondary admin-action-save" type="submit" form="website-editor-form">Save draft</button><button class="button admin-action-publish" type="button" data-publish-website>Publish</button></div></header>
    <div class="admin-document-layout">
      <section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Website editor sections">${([["general","General & SEO"],["sections","Sections"],["featured","Content selection"],["appearance","Appearance"]] as Array<[WebsiteTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-website-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav>
        <form id="website-editor-form" data-website-form>
          <section data-website-panel="general"${tab === "general" ? "" : " hidden"}>${websiteGeneral(content)}</section>
          <section data-website-panel="sections"${tab === "sections" ? "" : " hidden"}>${websiteSections(content)}</section>
          <section data-website-panel="featured"${tab === "featured" ? "" : " hidden"}>${websiteFeatured(runtime)}</section>
          <section data-website-panel="appearance"${tab === "appearance" ? "" : " hidden"}>${renderAdminSectionCard({ title: "Homepage appearance", note: "Choose draft colors; published releases keep their saved theme.", content: themeFields(content.theme) })}</section>
        </form>
      </section>
      <aside class="admin-site-preview">${previewToolbar}<div class="admin-site-frame" data-viewport="${state.viewport}" data-zoom="${state.previewZoom.mode}" tabindex="0" aria-label="Scrollable website preview"><div class="admin-embedded-preview-stage" data-embedded-preview-stage><iframe title="${state.previewPage === "homepage" ? "Homepage" : state.previewPage === "projects" ? "Projects" : "Automation"} draft preview" src="${websitePreviewPath(state.previewPage)}" data-website-iframe scrolling="no" tabindex="-1"></iframe></div></div></aside>
    </div>
    <dialog class="admin-dialog admin-release-history" data-website-history-dialog aria-labelledby="website-release-history-title"><form method="dialog"><div><p class="section-kicker">Website</p><h2 id="website-release-history-title">Release history</h2><p>Versions are generated automatically when a release is published.</p></div>${releaseHistory}<div class="admin-actions"><button class="button button--secondary" type="button" data-website-history-close>Close</button></div></form></dialog>
  </section>`;
};

const profileView = (): string => {
  const professional = state.runtime!.professional;
  const tab = state.profileTab;
  return `<section class="admin-profile-workspace">
    <header class="admin-document-header"><div><p class="section-kicker">Shared content</p><h1>Professional Profile</h1><p>Single source for Website, Curriculum Vitae, Portfolio and Cover Letters</p></div><div class="admin-document-actions"><span data-site-save-state>Saved</span><button class="button admin-action-save" type="submit" form="profile-editor-form">Save changes</button></div></header>
    <div class="admin-profile-layout">
      <section class="admin-document-editor"><nav class="admin-document-tabs" role="tablist" aria-label="Professional Profile sections">${([["identity","Identity"],["photos","Photos"],["experience","Experience"],["education","Education"],["skills","Skills"],["languages","Languages"]] as Array<[ProfileTab,string]>).map(([id,label]) => `<button type="button" role="tab" data-profile-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "is-active" : ""}">${label}</button>`).join("")}</nav><form id="profile-editor-form" data-profile-form><section data-profile-panel="identity"${tab === "identity" ? "" : " hidden"}>${profileIdentity(professional, state.photos)}</section><section data-profile-panel="photos"${tab === "photos" ? "" : " hidden"}>${profilePhotos(state.photos)}</section><section data-profile-panel="experience"${tab === "experience" ? "" : " hidden"}>${profileExperience(professional)}</section><section data-profile-panel="education"${tab === "education" ? "" : " hidden"}>${profileEducation(professional)}</section><section data-profile-panel="skills"${tab === "skills" ? "" : " hidden"}>${profileSkills(professional)}</section><section data-profile-panel="languages"${tab === "languages" ? "" : " hidden"}>${profileLanguages(professional)}</section></form></section>
      <aside class="admin-profile-usage"><p class="section-kicker">Used by</p><h2>One profile, four outputs</h2><div><article><strong>Website</strong><span>Applied when the next Website release is published.</span></article><article><strong>Curriculum Vitae</strong><span>Use “Sync from Professional Profile” in the CV draft before publishing.</span></article><article><strong>Portfolio</strong><span>Sync from the Professional Profile or from the active CV draft.</span></article><article><strong>Cover Letters</strong><span>Drafts use the saved profile; finalized letters retain their sender snapshot.</span></article></div><p>Published releases and finalized letters remain unchanged.</p></aside>
    </div>
    ${renderProfilePhotoCropDialog()}
    ${renderProfilePhotoRenameDialog()}
  </section>`;
};

export const siteWorkspaceView = (kind: SiteWorkspaceKind): string => {
  if (state.loading) return '<section class="admin-document-loading"><span></span><h2>Loading website workspace…</h2></section>';
  if (state.error) return `<section class="admin-placeholder"><p class="section-kicker">Website CMS</p><h2>Could not load workspace</h2><p>${escapeHtml(state.error)}</p><p>Apply the latest Supabase migration, then reload Admin.</p></section>`;
  if (!state.runtime) return '<section class="admin-document-loading"><span></span><h2>Preparing workspace…</h2></section>';
  return kind === "homepage" ? websiteView() : profileView();
};

const sendPreview = (): void => previewSender?.send();

const automaticWebsiteVersion = (date = new Date()): string => {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export const discardSiteChanges = (): void => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer);
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = undefined;
  previewZoomController?.disconnect();
  previewZoomController = undefined;
  state.previewZoom = createPreviewZoomState();
  if (profileStructuralSnapshot && state.runtime) {
    state.runtime = { ...state.runtime, professional: profileStructuralSnapshot };
  }
  profileStructuralSnapshot = null;
};

export const markSiteWorkspaceStale = (): void => {
  state.stale = true;
};

export const bindSiteWorkspace = (root: ParentNode, _kind: SiteWorkspaceKind, callbacks: WorkspaceCallbacks): void => {
  const websiteForm = root.querySelector<HTMLFormElement>("[data-website-form]");
  const profileForm = root.querySelector<HTMLFormElement>("[data-profile-form]");
  const previewIframe = root.querySelector<HTMLIFrameElement>("[data-website-iframe]");
  const previewStage = root.querySelector<HTMLElement>("[data-embedded-preview-stage]");
  const previewFrame = root.querySelector<HTMLElement>(".admin-site-frame");
  previewSender?.disconnect();
  previewSender = undefined;
  previewController?.disconnect();
  previewController = previewIframe && previewStage
    ? bindEmbeddedPreview(previewIframe, previewStage, { measurementHeight: 900 })
    : undefined;
  previewZoomController?.disconnect();
  previewZoomController = previewFrame && previewStage
    ? bindPreviewZoom(root, {
        frame: previewFrame,
        stage: previewStage,
        state: state.previewZoom,
        contentWidth: () => websiteViewportWidths[state.viewport],
        onScale: () => previewController?.refresh(),
      })
    : undefined;
  const setPreviewStatus = (label: string, kind: "success" | "warning" | "error"): void => {
    const status = root.querySelector<HTMLElement>("[data-preview-status]");
    if (!status) return;
    status.textContent = label;
    status.dataset.kind = kind;
  };
  previewSender = previewIframe && websiteForm
    ? bindPreviewSender<WebsitePreviewData>(previewIframe, "website", () => ({
        ...readWebsiteForm(websiteForm),
        previewLanguage: state.previewLanguage,
      }), () => {
        previewController?.refresh();
        setPreviewStatus("Synced", "success");
      })
    : undefined;
  previewIframe?.addEventListener("error", () => setPreviewStatus("Disconnected", "error"));
  const markDirty = (): void => {
    callbacks.setDirty(true);
    const status = root.querySelector<HTMLElement>("[data-site-save-state]");
    if (status) status.textContent = "Unsaved changes";
    if (websiteForm && previewSender) {
      setPreviewStatus("Updating…", "warning");
      if (previewTimer !== undefined) window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(sendPreview, 180);
    }
  };
  const commitProfileDraft = (): ProfessionalProfileContent | null => {
    if (!profileForm || !state.runtime) return null;
    if (!profileStructuralSnapshot) profileStructuralSnapshot = structuredClone(state.runtime.professional);
    const professional = readProfileForm(profileForm);
    state.runtime = { ...state.runtime, professional };
    return professional;
  };
  const bindExperienceLocationComboboxes = (): void => {
    root.querySelectorAll<HTMLElement>("[data-location-combobox]").forEach((combobox) => {
      const input = combobox.querySelector<HTMLInputElement>("[data-location-input]");
      const codeInput = combobox.querySelector<HTMLInputElement>("[data-location-code]");
      const toggle = combobox.querySelector<HTMLButtonElement>("[data-location-toggle]");
      const list = combobox.querySelector<HTMLElement>("[data-location-list]");
      const empty = combobox.querySelector<HTMLElement>("[data-location-empty]");
      const options = Array.from(combobox.querySelectorAll<HTMLButtonElement>("[data-location-option]"));
      if (!input || !codeInput || !toggle || !list || !empty) return;

      const normalize = (text: string): string => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
      const filterOptions = (query: string): void => {
        const normalizedQuery = normalize(query.trim());
        let visibleCount = 0;
        options.forEach((option) => {
          const visible = !normalizedQuery || normalize(option.dataset.locationLabel ?? option.textContent ?? "").includes(normalizedQuery);
          option.hidden = !visible;
          if (visible) visibleCount += 1;
        });
        empty.hidden = visibleCount > 0;
      };
      const closeList = (): void => {
        combobox.classList.remove("is-open");
        combobox.classList.remove("opens-upward");
        list.hidden = true;
        list.style.removeProperty("max-height");
        input.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-expanded", "false");
      };
      const positionList = (): void => {
        const bounds = combobox.getBoundingClientRect();
        const spaceBelow = window.innerHeight - bounds.bottom - 12;
        const spaceAbove = bounds.top - 12;
        const opensUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
        const availableSpace = opensUpward ? spaceAbove : spaceBelow;
        combobox.classList.toggle("opens-upward", opensUpward);
        list.style.maxHeight = `${Math.min(216, Math.max(80, availableSpace - 8))}px`;
      };
      const openList = (): void => {
        root.querySelectorAll<HTMLElement>("[data-location-combobox].is-open").forEach((other) => {
          if (other === combobox) return;
          other.classList.remove("is-open");
          other.classList.remove("opens-upward");
          const otherList = other.querySelector<HTMLElement>("[data-location-list]");
          const otherInput = other.querySelector<HTMLInputElement>("[data-location-input]");
          const otherToggle = other.querySelector<HTMLButtonElement>("[data-location-toggle]");
          if (otherList) {
            otherList.hidden = true;
            otherList.style.removeProperty("max-height");
          }
          otherInput?.setAttribute("aria-expanded", "false");
          otherToggle?.setAttribute("aria-expanded", "false");
        });
        combobox.classList.add("is-open");
        list.hidden = false;
        positionList();
        input.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-expanded", "true");
      };
      const visibleOptions = (): HTMLButtonElement[] => options.filter((option) => !option.hidden);
      const selectOption = (option: HTMLButtonElement): void => {
        const code = option.dataset.locationCode ?? "";
        const label = option.dataset.locationLabel ?? option.textContent ?? "";
        input.value = label;
        codeInput.value = code;
        options.forEach((candidate) => candidate.setAttribute("aria-selected", candidate === option ? "true" : "false"));
        input.focus({ preventScroll: true });
        closeList();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };

      input.addEventListener("focus", () => {
        filterOptions(codeInput.value ? "" : input.value);
        openList();
      });
      input.addEventListener("input", () => {
        codeInput.value = "";
        options.forEach((option) => option.setAttribute("aria-selected", "false"));
        filterOptions(input.value);
        openList();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeList();
          return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
        const available = visibleOptions();
        if (!available.length) return;
        event.preventDefault();
        if (event.key === "Enter") selectOption(available[0]);
        else available[event.key === "ArrowDown" ? 0 : available.length - 1].focus();
      });
      toggle.addEventListener("click", () => {
        if (list.hidden) {
          filterOptions("");
          openList();
          input.focus({ preventScroll: true });
        } else {
          closeList();
        }
      });
      options.forEach((option, optionIndex) => {
        option.addEventListener("click", () => selectOption(option));
        option.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            input.focus({ preventScroll: true });
            closeList();
            return;
          }
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const available = visibleOptions();
          const currentIndex = available.indexOf(options[optionIndex]);
          const nextIndex = event.key === "ArrowDown"
            ? Math.min(currentIndex + 1, available.length - 1)
            : Math.max(currentIndex - 1, 0);
          available[nextIndex]?.focus();
        });
      });
      combobox.addEventListener("focusout", () => {
        requestAnimationFrame(() => {
          if (!combobox.contains(document.activeElement)) closeList();
        });
      });
    });
  };
  const renderExperiencePanel = (focusExperienceId?: string): void => {
    const panel = root.querySelector<HTMLElement>('[data-profile-panel="experience"]');
    if (!panel || !state.runtime) return;
    panel.innerHTML = profileExperience(state.runtime.professional);
    bindExperienceActions();
    if (focusExperienceId) {
      requestAnimationFrame(() => panel.querySelector<HTMLInputElement>(`[data-experience-company="${CSS.escape(focusExperienceId)}"]`)?.focus());
    }
  };
  const bindExperienceActions = (): void => {
    if (!profileForm || !state.runtime) return;
    bindExperienceLocationComboboxes();
    root.querySelector<HTMLButtonElement>("[data-profile-experience-new]")?.addEventListener("click", () => {
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const experience = blankExperience();
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, experiences: [experience, ...professional.experiences] },
      };
      markDirty();
      renderExperiencePanel(experience.id);
    });
    root.querySelectorAll<HTMLButtonElement>("[data-profile-experience-move]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.experienceId;
      const direction = button.dataset.profileExperienceMove as "up" | "down" | undefined;
      if (!id || !direction) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const experiences = [...professional.experiences];
      const index = experiences.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= experiences.length) return;
      [experiences[index], experiences[target]] = [experiences[target], experiences[index]];
      state.runtime = { ...state.runtime, professional: { ...professional, experiences } };
      markDirty();
      renderExperiencePanel(id);
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-profile-experience-delete]").forEach((button) => button.addEventListener("click", async () => {
      const id = button.dataset.experienceId;
      if (!id) return;
      const draft = readProfileForm(profileForm);
      const experience = draft.experiences.find((item) => item.id === id);
      if (!experience || !(await confirmAdmin({
        eyebrow: "Profile experience",
        title: `Remove ${experience.company || "this company"}?`,
        message: "It will be removed from the Professional Profile after you save changes. Published Website and CV releases remain unchanged.",
        confirmLabel: "Remove company",
        cancelLabel: "Keep company",
        tone: "danger",
      }))) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, experiences: professional.experiences.filter((item) => item.id !== id) },
      };
      markDirty();
      renderExperiencePanel();
    }));
  };
  const renderEducationPanel = (focusEducationId?: string): void => {
    const panel = root.querySelector<HTMLElement>('[data-profile-panel="education"]');
    if (!panel || !state.runtime) return;
    panel.innerHTML = profileEducation(state.runtime.professional);
    bindEducationActions();
    if (focusEducationId) {
      requestAnimationFrame(() => panel.querySelector<HTMLInputElement>(`[data-education-institution="${CSS.escape(focusEducationId)}"]`)?.focus());
    }
  };
  const bindEducationActions = (): void => {
    if (!profileForm || !state.runtime) return;
    bindAdminYearPickers(root);
    root.querySelector<HTMLButtonElement>("[data-profile-education-new]")?.addEventListener("click", () => {
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const education = blankEducation();
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, education: [education, ...professional.education] },
      };
      markDirty();
      renderEducationPanel(education.id);
    });
    root.querySelectorAll<HTMLButtonElement>("[data-profile-education-move]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.educationId;
      const direction = button.dataset.profileEducationMove as "up" | "down" | undefined;
      if (!id || !direction) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const education = [...professional.education];
      const index = education.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= education.length) return;
      [education[index], education[target]] = [education[target], education[index]];
      state.runtime = { ...state.runtime, professional: { ...professional, education } };
      markDirty();
      renderEducationPanel(id);
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-profile-education-delete]").forEach((button) => button.addEventListener("click", async () => {
      const id = button.dataset.educationId;
      if (!id) return;
      const draft = readProfileForm(profileForm);
      const education = draft.education.find((item) => item.id === id);
      if (!education || !(await confirmAdmin({
        eyebrow: "Profile education",
        title: `Remove ${education.institution.en || "this education entry"}?`,
        message: "It will be removed from the Professional Profile after you save changes. Published Website and CV releases remain unchanged.",
        confirmLabel: "Remove education",
        cancelLabel: "Keep education",
        tone: "danger",
      }))) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, education: professional.education.filter((item) => item.id !== id) },
      };
      markDirty();
      renderEducationPanel();
    }));
  };
  const renderLanguagesPanel = (focusLanguageId?: string): void => {
    const panel = root.querySelector<HTMLElement>('[data-profile-panel="languages"]');
    if (!panel || !state.runtime) return;
    panel.innerHTML = profileLanguages(state.runtime.professional);
    bindLanguageActions();
    if (focusLanguageId) {
      requestAnimationFrame(() => panel.querySelector<HTMLInputElement>(`[data-language-name="${CSS.escape(focusLanguageId)}"]`)?.focus());
    }
  };
  const bindLanguageActions = (): void => {
    if (!profileForm || !state.runtime) return;
    root.querySelector<HTMLButtonElement>("[data-profile-language-new]")?.addEventListener("click", () => {
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const language = blankLanguage();
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, languages: [language, ...professional.languages] },
      };
      markDirty();
      renderLanguagesPanel(language.id);
    });
    root.querySelectorAll<HTMLButtonElement>("[data-profile-language-move]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.languageId;
      const direction = button.dataset.profileLanguageMove as "up" | "down" | undefined;
      if (!id || !direction) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      const languages = [...professional.languages];
      const index = languages.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= languages.length) return;
      [languages[index], languages[target]] = [languages[target], languages[index]];
      state.runtime = { ...state.runtime, professional: { ...professional, languages } };
      markDirty();
      renderLanguagesPanel(id);
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-profile-language-delete]").forEach((button) => button.addEventListener("click", async () => {
      const id = button.dataset.languageId;
      if (!id) return;
      const draft = readProfileForm(profileForm);
      const language = draft.languages.find((item) => item.id === id);
      if (!language || !(await confirmAdmin({
        eyebrow: "Profile languages",
        title: `Remove ${language.name.en || "this language"}?`,
        message: "It will be removed from the Professional Profile after you save changes. Published Website and CV releases remain unchanged.",
        confirmLabel: "Remove language",
        cancelLabel: "Keep language",
        tone: "danger",
      }))) return;
      const professional = commitProfileDraft();
      if (!professional || !state.runtime) return;
      state.runtime = {
        ...state.runtime,
        professional: { ...professional, languages: professional.languages.filter((item) => item.id !== id) },
      };
      markDirty();
      renderLanguagesPanel();
    }));
  };
  bindExperienceActions();
  bindEducationActions();
  bindLanguageActions();
  const photoPath = profileForm?.querySelector<HTMLInputElement>("[data-profile-photo-path]");
  const photoFrame = profileForm?.querySelector<HTMLElement>("[data-profile-photo-frame]");
  const photoName = profileForm?.querySelector<HTMLElement>("[data-profile-photo-name]");
  const photoPicker = profileForm?.querySelector<HTMLElement>("[data-profile-photo-picker]");
  const photoTrigger = profileForm?.querySelector<HTMLButtonElement>("[data-profile-photo-trigger]");
  const photoOptions = profileForm?.querySelector<HTMLElement>("[data-profile-photo-options]");
  const closePhotoPicker = (): void => {
    if (!photoOptions || !photoTrigger) return;
    photoOptions.hidden = true;
    photoTrigger.setAttribute("aria-expanded", "false");
    photoPicker?.classList.remove("is-open");
  };
  const selectProfilePhoto = (path: string, name?: string): void => {
    if (!photoPath) return;
    photoPath.value = path;
    const asset = state.photos.find((photo) => photo.publicUrl === path);
    const resolvedName = name ?? asset?.name ?? (path ? profilePhotoName(path) : "No photo");
    if (photoFrame) {
      let image = photoFrame.querySelector<HTMLImageElement>("img");
      if (path) {
        if (!image) {
          image = document.createElement("img");
          image.alt = "";
          image.dataset.profilePhotoPreview = "";
          photoFrame.append(image);
        }
        photoFrame.classList.remove("has-image");
        image.addEventListener("load", () => photoFrame.classList.add("has-image"), { once: true });
        image.addEventListener("error", () => photoFrame.classList.remove("has-image"), { once: true });
        image.src = asset?.publicUrl ?? assetUrl(path);
        if (image.complete && image.naturalWidth > 0) photoFrame.classList.add("has-image");
      } else {
        image?.remove();
        photoFrame.classList.remove("has-image");
      }
    }
    if (photoName) photoName.textContent = resolvedName;
    profileForm?.querySelectorAll<HTMLButtonElement>("[data-profile-photo-option]").forEach((option) => {
      option.setAttribute("aria-selected", String((option.dataset.photoValue ?? "") === path));
    });
    closePhotoPicker();
    markDirty();
  };
  const photoImage = photoFrame?.querySelector<HTMLImageElement>("img");
  if (photoImage) {
    const syncPhotoPreviewState = (): void => {
      photoFrame?.classList.toggle("has-image", Boolean(photoImage.complete && photoImage.naturalWidth > 0));
    };
    photoImage.addEventListener("load", syncPhotoPreviewState);
    photoImage.addEventListener("error", syncPhotoPreviewState);
    syncPhotoPreviewState();
  }
  photoTrigger?.addEventListener("click", () => {
    if (!photoOptions) return;
    const open = photoOptions.hidden !== false;
    photoOptions.hidden = !open;
    photoTrigger.setAttribute("aria-expanded", String(open));
    photoPicker?.classList.toggle("is-open", open);
    if (open) photoOptions.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
  });
  photoTrigger?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    if (photoOptions?.hidden) photoTrigger.click();
  });
  profileForm?.querySelectorAll<HTMLButtonElement>("[data-profile-photo-option]").forEach((option) => option.addEventListener("click", () => {
    selectProfilePhoto(option.dataset.photoValue ?? "", option.dataset.photoName);
    photoTrigger?.focus({ preventScroll: true });
  }));
  photoPicker?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closePhotoPicker();
    photoTrigger?.focus({ preventScroll: true });
  });
  photoPicker?.addEventListener("focusout", () => requestAnimationFrame(() => {
    if (!photoPicker.contains(document.activeElement)) closePhotoPicker();
  }));
  const renameDialog = root.querySelector<HTMLDialogElement>("[data-profile-photo-rename-dialog]");
  const renameForm = renameDialog?.querySelector<HTMLFormElement>("[data-profile-photo-rename-form]");
  const renameInput = renameDialog?.querySelector<HTMLInputElement>("[data-profile-photo-rename-input]");
  let renamePhotoId = "";
  const closeRenameDialog = (): void => {
    renamePhotoId = "";
    renameDialog?.close();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-profile-photo-rename]").forEach((button) => button.addEventListener("click", () => {
    if (!renameDialog || !renameInput) return;
    renamePhotoId = button.dataset.photoId ?? "";
    renameInput.value = button.dataset.photoName ?? "";
    renameDialog.showModal();
    requestAnimationFrame(() => {
      renameInput.focus({ preventScroll: true });
      renameInput.select();
    });
  }));
  renameDialog?.querySelector<HTMLButtonElement>("[data-profile-photo-rename-cancel]")?.addEventListener("click", closeRenameDialog);
  renameDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeRenameDialog();
  });
  renameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = renameInput?.value.trim() ?? "";
    const photo = state.photos.find((item) => item.id === renamePhotoId);
    if (!photo || !name) {
      callbacks.notify("Enter a name for this profile photo.", "error");
      renameInput?.focus();
      return;
    }
    const saveButton = renameForm.querySelector<HTMLButtonElement>("[data-profile-photo-rename-save]");
    setButtonBusy(saveButton, true, "Saving…");
    void renameProfilePhoto(photo.id, name)
      .then((updated) => {
        state.photos = state.photos.map((item) => item.id === updated.id ? updated : item);
        const card = root.querySelector<HTMLElement>(`[data-photo-library-card="${CSS.escape(updated.id)}"]`);
        const title = card?.querySelector<HTMLElement>("[data-profile-photo-library-name]");
        if (title) title.textContent = updated.name;
        card?.querySelectorAll<HTMLButtonElement>("[data-photo-name]").forEach((button) => { button.dataset.photoName = updated.name; });
        profileForm?.querySelectorAll<HTMLButtonElement>("[data-profile-photo-option]").forEach((option) => {
          if (option.dataset.photoValue !== updated.publicUrl) return;
          option.dataset.photoName = updated.name;
          const optionName = option.querySelector<HTMLElement>("strong");
          if (optionName) optionName.textContent = updated.name;
        });
        if (photoPath?.value === updated.publicUrl && photoName) photoName.textContent = updated.name;
        closeRenameDialog();
        callbacks.notify("Profile photo renamed.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-profile-photo-delete]").forEach((button) => button.addEventListener("click", async () => {
    const id = button.dataset.photoId;
    const path = button.dataset.photoValue ?? "";
    const name = button.dataset.photoName || "this photo";
    if (!id) return;
    const current = photoPath?.value === path;
    const confirmed = await confirmAdmin({
      eyebrow: "Profile photo library",
      title: `Delete ${name}?`,
      message: `${current ? "This photo is selected in Identity and that selection will also be cleared. " : ""}It will be removed from the library, while existing published outputs remain unchanged.`,
      confirmLabel: "Delete photo",
      cancelLabel: "Keep photo",
      tone: "danger",
    });
    if (!confirmed) return;
    setButtonBusy(button, true, "Deleting…");
    try {
      await archiveProfilePhoto(id);
      if (current) selectProfilePhoto("", "No photo");
      state.photos = state.photos.filter((photo) => photo.id !== id);
      profileForm?.querySelector<HTMLButtonElement>(`[data-profile-photo-option][data-photo-value="${CSS.escape(path)}"]`)?.remove();
      const card = button.closest<HTMLElement>(".admin-photo-library-card");
      const library = card?.parentElement;
      card?.remove();
      if (library && !library.querySelector(".admin-photo-library-card")) {
        library.outerHTML = '<div class="admin-empty-state"><div><strong>No saved profile photos</strong><small>Add a photo, crop it once and reuse it across the CV and Portfolio.</small></div></div>';
      }
      callbacks.notify("Profile photo deleted from the library.", "success");
    } catch (error) {
      callbacks.notify(error instanceof Error ? error.message : "The profile photo could not be deleted.", "error");
      if (button.isConnected) setButtonBusy(button, false);
    }
  }));
  const photoUpload = root.querySelector<HTMLInputElement>("[data-profile-photo-upload]");
  root.querySelector<HTMLButtonElement>("[data-profile-photo-upload-trigger]")?.addEventListener("click", () => photoUpload?.click());
  bindProfilePhotoCropper(root, {
    notify: callbacks.notify,
    onSaved: (photo) => {
      commitProfileDraft();
      state.photos = [photo, ...state.photos.filter((item) => item.id !== photo.id)];
      state.profileTab = "photos";
      callbacks.rerender();
      callbacks.notify("Profile photo saved to the library. Select it from Identity when you want to use it.", "success");
    },
  });
  websiteForm?.addEventListener("input", markDirty);
  websiteForm?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.name === "website_theme_preset" && target.value !== "custom") {
      const theme = documentThemes.find((item) => item.id === target.value);
      const primary = websiteForm.elements.namedItem("website_theme_primary");
      const accent = websiteForm.elements.namedItem("website_theme_accent");
      if (theme && primary instanceof HTMLInputElement && accent instanceof HTMLInputElement) {
        primary.value = theme.tokens.primary;
        accent.value = theme.tokens.accent;
      }
    }
    if (target instanceof HTMLInputElement && target.type === "checkbox" && target.name.startsWith("featured_") && target.checked) {
      const websiteName = target.name.replace("featured_", "website_");
      const websiteToggle = websiteForm.querySelector<HTMLInputElement>(`input[name="${websiteName}"][value="${CSS.escape(target.value)}"]`);
      if (websiteToggle) websiteToggle.checked = true;
    }
    if (target instanceof HTMLInputElement && target.type === "checkbox" && target.name.startsWith("website_") && !target.checked) {
      const featuredName = target.name.replace("website_", "featured_");
      const featuredToggle = websiteForm.querySelector<HTMLInputElement>(`input[name="${featuredName}"][value="${CSS.escape(target.value)}"]`);
      if (featuredToggle) featuredToggle.checked = false;
    }
    markDirty();
  });
  profileForm?.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement && event.target.hasAttribute("data-profile-photo-upload"))) markDirty();
  });
  profileForm?.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.hasAttribute("data-profile-photo-upload")) return;
    markDirty();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-website-tab]").forEach((button) => button.addEventListener("click", () => {
    state.websiteTab = button.dataset.websiteTab as WebsiteTab;
    root.querySelectorAll<HTMLButtonElement>("[data-website-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-website-panel]").forEach((panel) => { panel.hidden = panel.dataset.websitePanel !== state.websiteTab; });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => {
    state.profileTab = button.dataset.profileTab as ProfileTab;
    root.querySelectorAll<HTMLButtonElement>("[data-profile-tab]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    root.querySelectorAll<HTMLElement>("[data-profile-panel]").forEach((panel) => { panel.hidden = panel.dataset.profilePanel !== state.profileTab; });
  }));
  root.querySelector<HTMLSelectElement>("[data-website-viewport]")?.addEventListener("change", (event) => {
    state.viewport = (event.currentTarget as HTMLSelectElement).value as WebsiteViewport;
    if (previewFrame) previewFrame.dataset.viewport = state.viewport;
    previewZoomController?.resetFit();
  });
  root.querySelector<HTMLSelectElement>("[data-website-preview-page]")?.addEventListener("change", (event) => {
    const nextPage = (event.currentTarget as HTMLSelectElement).value as WebsitePreviewPage;
    if (!previewIframe || nextPage === state.previewPage) return;
    state.previewPage = nextPage;
    setPreviewStatus("Loading…", "warning");
    previewFrame?.scrollTo({ top: 0, left: 0 });
    previewZoomController?.resetFit();
    previewStage?.setAttribute("aria-busy", "true");
    previewIframe.title = `${nextPage === "homepage" ? "Homepage" : nextPage === "projects" ? "Projects" : "Automation"} draft preview`;
    previewIframe.src = websitePreviewPath(nextPage);
  });
  root.querySelector<HTMLButtonElement>("[data-website-language-toggle]")?.addEventListener("click", (event) => {
    state.previewLanguage = state.previewLanguage === "en" ? "vi" : "en";
    const button = event.currentTarget as HTMLButtonElement;
    const targetLabel = state.previewLanguage === "en" ? "Vietnamese" : "English";
    button.textContent = state.previewLanguage === "en" ? "VI" : "EN";
    button.setAttribute("aria-label", `Preview in ${targetLabel}`);
    button.title = `Preview in ${targetLabel}`;
    setPreviewStatus("Updating…", "warning");
    previewSender?.send();
  });
  const releaseHistoryDialog = root.querySelector<HTMLDialogElement>("[data-website-history-dialog]");
  root.querySelector<HTMLButtonElement>("[data-website-history-open]")?.addEventListener("click", () => releaseHistoryDialog?.showModal());
  root.querySelector<HTMLButtonElement>("[data-website-history-close]")?.addEventListener("click", () => releaseHistoryDialog?.close());
  websiteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>('[form="website-editor-form"].admin-action-save');
    setButtonBusy(saveButton, true, "Saving…");
    void (async () => {
      const runtime = readWebsiteForm(websiteForm);
      await saveWebsiteContent(runtime.content);
      state.runtime = runtime;
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website draft saved. Public pages are unchanged until publish.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const saveButton = root.querySelector<HTMLButtonElement>('[form="profile-editor-form"].admin-action-save');
    setButtonBusy(saveButton, true, "Saving…");
    void (async () => {
      const professional = readProfileForm(profileForm);
      const experienceError = validateProfileExperiences(professional.experiences);
      if (experienceError) throw new Error(experienceError);
      const educationError = validateProfileEducation(professional.education);
      if (educationError) throw new Error(educationError);
      const languageError = validateProfileLanguages(professional.languages);
      if (languageError) throw new Error(languageError);
      await saveProfessionalProfile(professional);
      state.runtime = { ...state.runtime!, professional };
      profileStructuralSnapshot = null;
      invalidateProfileDocumentWorkspace();
      updateCoverLetterSharedProfile(professional);
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Professional Profile saved. Publish the Website and sync each CV background when ready.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });
  root.querySelector<HTMLButtonElement>("[data-publish-website]")?.addEventListener("click", async (event) => {
    if (!websiteForm || !(await confirmAdmin({ eyebrow: "Website release", title: "Publish this Website draft?", message: "A new public release will be created with an automatically generated version.", confirmLabel: "Publish Website" }))) return;
    const publishButton = event.currentTarget as HTMLButtonElement;
    setButtonBusy(publishButton, true, "Publishing…");
    void (async () => {
      const draft = readWebsiteForm(websiteForm);
      const runtime: WebsiteRuntimeData = {
        ...draft,
        content: { ...draft.content, version: automaticWebsiteVersion() },
      };
      await saveWebsiteContent(runtime.content);
      state.runtime = runtime;
      await publishWebsiteRelease();
      state.releases = await listWebsiteReleases();
      callbacks.setDirty(false);
      callbacks.rerender();
      callbacks.notify("Website release published. All public pages now use this snapshot.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (publishButton.isConnected) setButtonBusy(publishButton, false); });
  });
};
