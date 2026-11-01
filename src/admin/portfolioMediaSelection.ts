import { automationLayoutOptions, projectLayoutOptions } from "../portfolio/layouts";
import {
  automationMediaRequirement,
  mediaRequirementLabel,
  projectMediaRequirement,
  resolvePortfolioMedia,
  type PortfolioMediaRequirement,
} from "../portfolio/mediaSlots";
import { assetUrl, escapeHtml } from "../shared/format";
import type { AutomationLayout, PortfolioMedia, PortfolioMediaAssignment, ProjectLayout } from "../types/portfolio";
import { renderAdminSelectControl, renderAdminTruncatedText } from "./ui";

export type PortfolioMediaKind = "project" | "tool";

const legacyLayoutLabels: Record<string, string> = { feature: "Legacy Feature", standard: "Legacy Standard", compact: "Legacy Compact" };

export const portfolioLayoutLabel = (kind: PortfolioMediaKind, layout: string): string =>
  (kind === "project" ? projectLayoutOptions : automationLayoutOptions).find((option) => option.id === layout)?.label
  ?? legacyLayoutLabels[layout]
  ?? layout;

export const portfolioMediaRequirement = (kind: PortfolioMediaKind, layout: string): PortfolioMediaRequirement => kind === "project"
  ? projectMediaRequirement(layout as ProjectLayout) ?? {}
  : automationMediaRequirement(layout as AutomationLayout) ?? {};

/**
 * The muted line under the item name (§6.8): layout, what it needs, and a warning when Media has fewer images
 * than the layout requires. Derived in one place for the first render and for every later change.
 */
export const portfolioMediaRowState = (
  kind: PortfolioMediaKind,
  layout: string,
  imageCount: number,
): { layout: string; requirement: string; shortage: string } => {
  const requirement = portfolioMediaRequirement(kind, layout);
  const needed = (requirement.primary ? 1 : 0) + (requirement.supportingRequired ? 1 : 0);
  return {
    layout: portfolioLayoutLabel(kind, layout),
    requirement: mediaRequirementLabel(requirement),
    shortage: imageCount < needed ? `Only ${imageCount} image${imageCount === 1 ? "" : "s"} in Media` : "",
  };
};

const mediaPreviewUrl = (media: PortfolioMedia | undefined): string =>
  media ? media.publicUrl ?? (/^https?:\/\//i.test(media.storagePath) ? media.storagePath : assetUrl(media.storagePath)) : "";

const mediaOptions = (images: PortfolioMedia[], selectedId: string | undefined, emptyLabel?: string): string =>
  `${emptyLabel ? `<option value=""${selectedId ? "" : " selected"}>${escapeHtml(emptyLabel)}</option>` : ""}${images.map((image, index) => {
    const label = `${image.kind === "cover" ? "Cover" : "Gallery"} · Image ${String(index + 1).padStart(2, "0")}`;
    return `<option value="${escapeHtml(image.id)}" data-preview-url="${escapeHtml(mediaPreviewUrl(image))}"${selectedId === image.id ? " selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("")}`;

const requiredMark = (attribute: string, required: boolean): string =>
  `<span ${attribute}${required ? "" : " hidden"}><span class="admin-required-mark" aria-hidden="true">*</span><span class="sr-only"> (required)</span></span>`;

/**
 * One visual field (§6.8): the shared label with its required mark right after the text, and a select that is
 * swapped for "Not used by this layout" without changing size, so both columns always line up.
 */
const mediaField = ({ slot, label, name, used, required, options }: {
  slot: "primary" | "supporting";
  label: string;
  name: string;
  used: boolean;
  required: boolean;
  options: string;
}): string => `<label data-portfolio-media-field="${slot}">
    <span class="admin-field-label">${escapeHtml(label)}${requiredMark(`data-portfolio-${slot}-required`, used && required)}</span>
    <span class="admin-field-swap"${used ? "" : " data-static"}>
      ${renderAdminSelectControl({ name, attributes: `data-portfolio-${slot}-select${used ? required ? ' aria-required="true"' : "" : " disabled"}`, options })}
      <span class="admin-field-static" data-portfolio-${slot}-static${used ? " hidden" : ""}>Not used by this layout</span>
    </span>
  </label>`;

/** A Portfolio media row: the media-row anatomy of §6.5 (4:3 preview, identity, form grid) for one project or tool. */
export const renderPortfolioMediaRow = ({ kind, id, name, images, assignment, layout, selected }: {
  kind: PortfolioMediaKind;
  id: string;
  name: string;
  images: PortfolioMedia[];
  assignment: PortfolioMediaAssignment | undefined;
  layout: string;
  selected: boolean;
}): string => {
  const resolved = resolvePortfolioMedia(images, assignment);
  const requirement = portfolioMediaRequirement(kind, layout);
  const state = portfolioMediaRowState(kind, layout, images.length);
  const preview = mediaPreviewUrl(resolved.primary);
  return `<article class="admin-media-row admin-portfolio-media-row" data-portfolio-media-item data-portfolio-media-kind="${kind}" data-portfolio-media-id="${escapeHtml(id)}" data-portfolio-media-count="${images.length}"${selected ? "" : " hidden"}>
    <div class="admin-media-row__preview" data-portfolio-media-preview>${preview ? `<img src="${escapeHtml(preview)}" alt="" loading="lazy" decoding="async">` : ""}<span class="admin-portfolio-media-row__empty"${preview ? " hidden" : ""}>No image</span></div>
    <div class="admin-media-row__head">
      <div class="admin-media-row__identity">
        ${renderAdminTruncatedText(name, "admin-media-row__title")}
        <small class="admin-portfolio-media-row__meta"><span data-portfolio-media-layout>${escapeHtml(state.layout)}</span><span data-portfolio-media-requirement>${escapeHtml(state.requirement)}</span><span class="is-warning" data-portfolio-media-shortage${state.shortage ? "" : " hidden"}>${escapeHtml(state.shortage)}</span></small>
      </div>
    </div>
    <div class="admin-form-grid admin-media-row__fields">
      ${mediaField({ slot: "primary", label: "Primary visual", name: `${kind}_primary_media_${id}`, used: Boolean(requirement.primary), required: true, options: mediaOptions(images, resolved.primary?.id) })}
      ${mediaField({ slot: "supporting", label: "Supporting visual", name: `${kind}_supporting_media_${id}`, used: Boolean(requirement.supporting), required: Boolean(requirement.supportingRequired), options: mediaOptions(images, resolved.supporting?.id, "No supporting image") })}
    </div>
  </article>`;
};

const syncField = (row: HTMLElement, slot: "primary" | "supporting", used: boolean, required: boolean): void => {
  const select = row.querySelector<HTMLSelectElement>(`[data-portfolio-${slot}-select]`);
  const swap = select?.closest<HTMLElement>(".admin-field-swap");
  const stand = row.querySelector<HTMLElement>(`[data-portfolio-${slot}-static]`);
  const mark = row.querySelector<HTMLElement>(`[data-portfolio-${slot}-required]`);
  if (select) {
    select.disabled = !used;
    if (used && required) select.setAttribute("aria-required", "true");
    else select.removeAttribute("aria-required");
  }
  swap?.toggleAttribute("data-static", !used);
  if (stand) stand.hidden = used;
  if (mark) mark.hidden = !(used && required);
};

/** Re-derives a row after its layout or primary visual changed: fields, required marks, meta line and preview. */
export const syncPortfolioMediaRow = (row: HTMLElement, layout: string): void => {
  const kind = row.dataset.portfolioMediaKind as PortfolioMediaKind;
  const requirement = portfolioMediaRequirement(kind, layout);
  const state = portfolioMediaRowState(kind, layout, Number(row.dataset.portfolioMediaCount) || 0);
  syncField(row, "primary", Boolean(requirement.primary), true);
  syncField(row, "supporting", Boolean(requirement.supporting), Boolean(requirement.supportingRequired));
  const setText = (selector: string, text: string): void => {
    const element = row.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.textContent = text;
    element.hidden = !text;
  };
  setText("[data-portfolio-media-layout]", state.layout);
  setText("[data-portfolio-media-requirement]", state.requirement);
  setText("[data-portfolio-media-shortage]", state.shortage);
  syncPortfolioMediaPreview(row);
};

/** The 4:3 preview always shows the chosen primary visual. */
export const syncPortfolioMediaPreview = (row: HTMLElement): void => {
  const preview = row.querySelector<HTMLElement>("[data-portfolio-media-preview]");
  const url = row.querySelector<HTMLSelectElement>("[data-portfolio-primary-select]")?.selectedOptions[0]?.dataset.previewUrl ?? "";
  if (!preview) return;
  let image = preview.querySelector("img");
  if (url && !image) {
    image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    preview.prepend(image);
  }
  if (image) {
    if (url) image.src = url;
    image.hidden = !url;
  }
  const empty = preview.querySelector<HTMLElement>(".admin-portfolio-media-row__empty");
  if (empty) empty.hidden = Boolean(url);
};

/**
 * Cover & closing image (§6.8): the one image of the Split/Horizontal cover and the White closing. The project select
 * offers the selected projects; each project has its own image select, and only the visible one is enabled, so the
 * form submits exactly one choice. The image field is a labelled group, not a <label>, because it holds one select per project. Empty values mean "first selected project" and "its primary visual".
 */
export const renderPortfolioFeatureRow = ({ projects, assignments, choice }: {
  projects: Array<{ id: string; name: string; images: PortfolioMedia[]; selected: boolean }>;
  assignments: Record<string, PortfolioMediaAssignment | undefined>;
  choice: { projectId?: string; mediaId?: string } | undefined;
}): string => {
  const chosen = projects.find((item) => item.id === choice?.projectId && item.selected);
  const active = chosen ?? projects.find((item) => item.selected);
  const primaryOf = (project: typeof projects[number]): PortfolioMedia | undefined => resolvePortfolioMedia(project.images, assignments[project.id]).primary;
  const activeMedia = active ? (chosen && active.images.find((image) => image.id === choice?.mediaId)) || primaryOf(active) : undefined;
  const preview = mediaPreviewUrl(activeMedia);
  const projectOptions = `<option value=""${chosen ? "" : " selected"}>First selected project</option>${projects.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === chosen?.id ? " selected" : ""}${item.selected ? "" : " hidden disabled"}>${escapeHtml(item.name)}</option>`).join("")}`;
  const imageSelects = projects.map((item) => {
    const visible = item.id === active?.id;
    const chosenMediaId = chosen?.id === item.id ? item.images.find((image) => image.id === choice?.mediaId)?.id : undefined;
    const options = `<option value="" data-preview-url="${escapeHtml(mediaPreviewUrl(primaryOf(item)))}"${chosenMediaId ? "" : " selected"}>Its primary visual</option>${mediaOptions(item.images, chosenMediaId)}`;
    return `<span data-portfolio-feature-slot="${escapeHtml(item.id)}"${visible ? "" : " hidden"}>${renderAdminSelectControl({ name: "portfolio_feature_media", attributes: `data-portfolio-feature-media="${escapeHtml(item.id)}" aria-label="Image from ${escapeHtml(item.name)}"${visible ? "" : " disabled"}`, options })}</span>`;
  }).join("");
  return `<article class="admin-media-row admin-portfolio-media-row" data-portfolio-feature-row>
    <div class="admin-media-row__preview" data-portfolio-media-preview>${preview ? `<img src="${escapeHtml(preview)}" alt="" loading="lazy" decoding="async">` : ""}<span class="admin-portfolio-media-row__empty"${preview ? " hidden" : ""}>No image</span></div>
    <div class="admin-media-row__head">
      <div class="admin-media-row__identity">
        ${renderAdminTruncatedText("Cover & closing image", "admin-media-row__title")}
        <small class="admin-portfolio-media-row__meta"><span>Split and Horizontal covers</span><span>White closing</span></small>
      </div>
    </div>
    <div class="admin-form-grid admin-media-row__fields">
      <label><span class="admin-field-label">Project</span>${renderAdminSelectControl({ name: "portfolio_feature_project", attributes: "data-portfolio-feature-project", options: projectOptions })}</label>
      <div class="admin-portfolio-feature-image" role="group" aria-labelledby="portfolio-feature-image-label"><span class="admin-field-label" id="portfolio-feature-image-label">Image</span><span class="admin-portfolio-feature-media">${imageSelects}</span></div>
    </div>
  </article>`;
};

/** Keeps the feature row on a selected project, shows that project's image select, and refreshes the preview. */
export const syncPortfolioFeatureRow = (row: HTMLElement, selectedProjectIds: Set<string>): void => {
  const project = row.querySelector<HTMLSelectElement>("[data-portfolio-feature-project]");
  if (!project) return;
  [...project.options].forEach((option) => {
    if (!option.value) return;
    const available = selectedProjectIds.has(option.value);
    option.hidden = !available;
    option.disabled = !available;
  });
  if (project.value && !selectedProjectIds.has(project.value)) project.value = "";
  const firstSelected = [...project.options].find((option) => option.value && !option.disabled)?.value ?? "";
  const activeId = project.value || firstSelected;
  row.querySelectorAll<HTMLSelectElement>("[data-portfolio-feature-media]").forEach((select) => {
    const visible = select.dataset.portfolioFeatureMedia === activeId;
    select.disabled = !visible;
    const slot = select.closest<HTMLElement>("[data-portfolio-feature-slot]");
    if (slot) slot.hidden = !visible;
    if (!visible) select.value = "";
  });
  const media = row.querySelector<HTMLSelectElement>("[data-portfolio-feature-media]:not([disabled])");
  const url = media?.selectedOptions[0]?.dataset.previewUrl ?? "";
  const preview = row.querySelector<HTMLElement>("[data-portfolio-media-preview]");
  if (!preview) return;
  let image = preview.querySelector("img");
  if (url && !image) {
    image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    preview.prepend(image);
  }
  if (image) {
    if (url) image.src = url;
    image.hidden = !url;
  }
  const empty = preview.querySelector<HTMLElement>(".admin-portfolio-media-row__empty");
  if (empty) empty.hidden = Boolean(url);
};
