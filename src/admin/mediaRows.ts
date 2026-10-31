import { escapeHtml } from "../shared/format";
import {
  adminArrowDownIcon,
  adminArrowUpIcon,
  renderAdminFieldLabel,
  renderAdminMoreMenu,
  renderAdminSegmented,
  renderAdminTruncatedText,
} from "./ui";

export type MediaKind = "cover" | "gallery";

interface MediaRowParts {
  attributes: string;
  pending: boolean;
  previewUrl: string;
  previewAlt: string;
  title: string;
  meta: string;
  role: string;
  fieldPrefix: "pending" | "media";
  values: { altEn: string; altVi: string; captionEn: string; captionVi: string };
  altRequired: boolean;
  actions: string;
}

/**
 * One row anatomy for pending and saved media (docs/admin-ui-guidelines.md §6.4, §6.5): preview, identity with
 * its role, actions on the right, then the bilingual fields as EN | VI pairs on the form grid. Only the status
 * line and the actions differ between a pending upload and a saved image.
 */
const renderMediaRow = (row: MediaRowParts): string => {
  const field = (label: string, key: "alt-en" | "alt-vi" | "caption-en" | "caption-vi", value: string, required = false): string =>
    `<label>${renderAdminFieldLabel(label, required)}<input value="${escapeHtml(value)}"${required ? ' aria-required="true"' : ""} data-${row.fieldPrefix}-${key}></label>`;
  return `<article class="admin-media-row${row.pending ? " admin-media-row--pending" : ""}" ${row.attributes}>
    <div class="admin-media-row__preview"><img src="${escapeHtml(row.previewUrl)}" alt="${escapeHtml(row.previewAlt)}" loading="lazy" decoding="async"></div>
    <div class="admin-media-row__head">
      <div class="admin-media-row__identity">
        ${renderAdminTruncatedText(row.title, "admin-media-row__title")}
        <small>${row.meta}</small>
        ${row.role}
      </div>
      <div class="admin-media-row__actions">${row.actions}</div>
    </div>
    <div class="admin-form-grid admin-media-row__fields">
      ${field("Alt text (EN)", "alt-en", row.values.altEn, row.altRequired)}
      ${field("Alt text (VI)", "alt-vi", row.values.altVi)}
      ${field("Caption (EN)", "caption-en", row.values.captionEn)}
      ${field("Caption (VI)", "caption-vi", row.values.captionVi)}
    </div>
  </article>`;
};

const renderMediaMoveButtons = (attribute: "data-media-move" | "data-pending-move", upDisabled: boolean, downDisabled: boolean): string =>
  `<button class="button button--secondary admin-icon-button" type="button" ${attribute}="up"${upDisabled ? " disabled" : ""} aria-label="Move image earlier" title="Move earlier">${adminArrowUpIcon}</button><button class="button button--secondary admin-icon-button" type="button" ${attribute}="down"${downDisabled ? " disabled" : ""} aria-label="Move image later" title="Move later">${adminArrowDownIcon}</button>`;

export interface SavedMediaRowInput {
  id: string;
  previewUrl: string;
  kind: MediaKind;
  alt: { en: string; vi: string };
  caption: { en: string; vi: string } | null;
  typeLabel: string;
  sizeLabel: string;
  /** Position in the ordered list (cover first). */
  index: number;
  firstGalleryIndex: number;
  total: number;
  customCropCount: number;
  /** True while the row has unsaved alt or caption edits; only then are Unsaved and Save shown. */
  dirty: boolean;
}

/** A saved image: Adjust crops stays visible; Set as cover, Download and Delete live in More. */
export const renderSavedMediaRow = (item: SavedMediaRowInput): string => {
  const title = `Image ${String(item.index + 1).padStart(2, "0")}`;
  return renderMediaRow({
    attributes: `data-media-id="${escapeHtml(item.id)}"`,
    pending: false,
    previewUrl: item.previewUrl,
    previewAlt: item.alt.en,
    title,
    meta: `${escapeHtml(item.typeLabel)} · ${escapeHtml(item.sizeLabel)}`,
    role: `<span class="admin-media-role admin-media-role--${item.kind}">${item.kind === "cover" ? "Cover" : "Gallery"}</span>`,
    fieldPrefix: "media",
    values: { altEn: item.alt.en, altVi: item.alt.vi, captionEn: item.caption?.en ?? "", captionVi: item.caption?.vi ?? "" },
    altRequired: item.kind === "cover",
    actions: `<span class="status status--draft" data-media-unsaved${item.dirty ? "" : " hidden"}>Unsaved</span>
      <button class="button button--secondary" type="button" data-media-save${item.dirty ? "" : " hidden"}>Save</button>
      ${item.kind === "cover" ? "" : renderMediaMoveButtons("data-media-move", item.index === item.firstGalleryIndex, item.index === item.total - 1)}
      <button class="button button--secondary admin-media-crops" type="button" data-media-crops>Adjust crops <small>${item.customCropCount ? `${item.customCropCount} custom` : "Auto"}</small></button>
      ${renderAdminMoreMenu({ label: `More actions for ${title}`, items: [
        ...(item.kind === "cover" ? [] : [{ label: "Set as cover", attributes: "data-media-cover" }]),
        { label: "Download original", attributes: "data-media-download" },
        { label: "Delete image", attributes: "data-media-delete", tone: "danger" as const },
      ] })}`,
  });
};

export interface PendingMediaRowInput {
  id: string;
  previewUrl: string;
  fileName: string;
  typeLabel: string;
  sizeLabel: string;
  kind: MediaKind;
  values: { altEn: string; altVi: string; captionEn: string; captionVi: string };
  index: number;
  total: number;
}

/** A pending upload: Use as Cover | Gallery, move, and Remove in More; nothing is stored until Upload. */
export const renderPendingMediaRow = (item: PendingMediaRowInput): string => renderMediaRow({
  attributes: `data-pending-id="${escapeHtml(item.id)}"`,
  pending: true,
  previewUrl: item.previewUrl,
  previewAlt: "",
  title: item.fileName,
  meta: `${escapeHtml(item.typeLabel)} · ${escapeHtml(item.sizeLabel)} · Not uploaded yet`,
  role: renderAdminSegmented({
    legend: "Use as",
    name: `pending-kind-${item.id}`,
    value: item.kind,
    attributes: "data-pending-kind",
    options: [{ value: "cover", label: "Cover" }, { value: "gallery", label: "Gallery" }],
  }),
  fieldPrefix: "pending",
  values: item.values,
  altRequired: item.kind === "cover",
  actions: `${renderMediaMoveButtons("data-pending-move", item.index === 0, item.index === item.total - 1)}
    ${renderAdminMoreMenu({ label: `More actions for ${item.fileName}`, items: [{ label: "Remove from upload", attributes: "data-pending-remove" }] })}`,
});
