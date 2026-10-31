import {
  archiveProfessionalCredential,
  createProfessionalCredential,
  deleteCredentialAsset,
  openCredentialAsset,
  reorderProfessionalCredentials,
  updateProfessionalCredential,
  uploadCredentialAsset,
} from "../services/credentialRepository";
import { escapeHtml } from "../shared/format";
import { validateCredentialInput } from "../shared/credentialValidation";
import type { ProfessionalProfileContent } from "../types/website";
import type {
  CredentialDocumentKind,
  CredentialKind,
  CredentialRelationType,
  ProfessionalCredential,
  ProfessionalCredentialInput,
} from "../types/credential";
import { confirmAdmin } from "./confirmDialog";
import { clearAdminDialogStatus } from "./toast";
import {
  adminArrowDownIcon,
  adminArrowUpIcon,
  adminChevronRightIcon,
  formatAdminDate,
  renderAdminDialogHeader,
  renderAdminFieldLabel,
  renderAdminMoreMenu,
  renderAdminSectionCard,
  renderAdminSelectControl,
  renderAdminTruncatedText,
  revealAdminElement,
  setButtonBusy,
} from "./ui";

const credentialKindLabels: Record<CredentialKind, string> = {
  professional_certification: "Professional certification",
  academic_degree: "Academic degree",
  language_exam: "Language exam",
  license: "License",
  course: "Course",
  award: "Award",
  membership: "Membership",
  other: "Other",
};

/** Badge text for compact rows; the full label stays in the editor and the credential card. */
const credentialKindShortLabels: Record<CredentialKind, string> = {
  professional_certification: "Certification",
  academic_degree: "Degree",
  language_exam: "Exam",
  license: "License",
  course: "Course",
  award: "Award",
  membership: "Membership",
  other: "Other",
};

const documentKindLabels: Record<CredentialDocumentKind, string> = {
  certificate: "Certificate",
  diploma: "Diploma",
  transcript: "Transcript",
  score_report: "Score report",
  supporting_document: "Supporting document",
  other: "Other",
};

const formatFileSize = (bytes: number): string => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The Profile entry a credential is linked to, or why it cannot be shown. */
const relatedEntry = (credential: ProfessionalCredential, professional: ProfessionalProfileContent): { label: string; name: string } | { missing: string } | null => {
  if (credential.relatedType === "education") {
    const item = professional.education.find((education) => education.id === credential.relatedId);
    return item ? { label: "Education", name: item.institution.en || item.field.en || "Untitled education" } : { missing: "Education link unavailable" };
  }
  if (credential.relatedType === "language") {
    const item = professional.languages.find((language) => language.id === credential.relatedId);
    return item ? { label: "Language", name: item.name.en || "Untitled language" } : { missing: "Language link unavailable" };
  }
  return null;
};

const statusLabel = (status: ProfessionalCredential["status"]): string => status === "published" ? "Ready" : status === "draft" ? "Draft" : "Archived";

const documentKindOptions = (): string => Object.entries(documentKindLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

/**
 * Credential card (§6.4): identity and status on the left, actions on the right with Archive in More,
 * facts as one meta line, then Evidence. Each fact appears once; at most two levels of boxes.
 */
const credentialCard = (
  credential: ProfessionalCredential,
  professional: ProfessionalProfileContent,
  index: number,
  total: number,
): string => {
  const id = escapeHtml(credential.id);
  const title = credential.title.en || "Untitled credential";
  const issuer = credential.issuer.en || "Issuer not set";
  const archived = credential.status === "archived";
  const related = relatedEntry(credential, professional);
  const relatedMeta = !related
    ? "<span>Standalone</span>"
    : "missing" in related
      ? `<span class="admin-credential-card__warning">${escapeHtml(related.missing)}</span>`
      : `<button class="admin-credential-card__link" type="button" data-credential-show-related data-related-type="${credential.relatedType}" data-related-id="${escapeHtml(credential.relatedId ?? "")}" title="Open ${escapeHtml(related.label)}: ${escapeHtml(related.name)}"><span>${related.label}:</span>${renderAdminTruncatedText(related.name)}</button>`;
  const meta = [
    `<span>${credential.issuedOn ? `Issued ${formatAdminDate(credential.issuedOn)}` : "Issue date not set"}</span>`,
    `<span>${credential.doesNotExpire ? "No expiry" : credential.expiresOn ? `Expires ${formatAdminDate(credential.expiresOn)}` : "Expiry not set"}</span>`,
    relatedMeta,
  ].join("");
  const fileCount = `${credential.assets.length} private file${credential.assets.length === 1 ? "" : "s"}`;
  const assets = credential.assets.map((asset) => `<li>
    <span class="admin-credential-file__icon" aria-hidden="true">${asset.mimeType === "application/pdf" ? "PDF" : "IMG"}</span>
    <span class="admin-credential-file__identity">${renderAdminTruncatedText(asset.name, "admin-credential-file__name")}<small>${escapeHtml(documentKindLabels[asset.documentKind])} · ${formatFileSize(asset.fileSize)}</small></span>
    <button class="button button--secondary" type="button" data-credential-asset-open="${escapeHtml(asset.id)}" data-credential-id="${id}">Open</button>
    ${renderAdminMoreMenu({ label: `More actions for ${asset.name}`, items: [{ label: "Delete file", attributes: `data-credential-asset-delete="${escapeHtml(asset.id)}" data-credential-id="${id}"`, tone: "danger" }] })}
  </li>`).join("");
  return `<article class="admin-credential-card${archived ? " is-archived" : ""}" data-credential-card="${id}">
    <header class="admin-credential-card__heading admin-profile-entry-card__heading">
      <div>
        <p class="admin-credential-card__eyebrow"><span>${escapeHtml(credentialKindLabels[credential.kind])}</span><span class="status status--${credential.status}">${statusLabel(credential.status)}</span></p>
        <h4 title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
        <small title="${escapeHtml(issuer)}">${escapeHtml(issuer)}</small>
      </div>
      <div class="admin-credential-card__actions admin-profile-entry-card__actions">
        <button class="button button--secondary admin-icon-button" type="button" data-credential-move="up" data-credential-id="${id}" aria-label="Move ${escapeHtml(title)} up" title="Move up"${index === 0 ? " disabled" : ""}>${adminArrowUpIcon}</button>
        <button class="button button--secondary admin-icon-button" type="button" data-credential-move="down" data-credential-id="${id}" aria-label="Move ${escapeHtml(title)} down" title="Move down"${index === total - 1 ? " disabled" : ""}>${adminArrowDownIcon}</button>
        ${archived
          ? `<button class="button button--secondary" type="button" data-credential-restore="${id}">Restore as draft</button>`
          : `<button class="button button--secondary" type="button" data-credential-edit="${id}">Edit</button>${renderAdminMoreMenu({ label: `More actions for ${title}`, items: [{ label: "Archive credential", attributes: `data-credential-archive="${id}"`, tone: "danger" }] })}`}
      </div>
    </header>
    <p class="admin-credential-card__meta">${meta}</p>
    ${credential.description.en ? `<p class="admin-credential-card__description" title="${escapeHtml(credential.description.en)}">${escapeHtml(credential.description.en)}</p>` : ""}
    ${archived ? "" : `<section class="admin-credential-files" aria-labelledby="credential-files-${id}">
      <div class="admin-credential-files__header">
        <h5 id="credential-files-${id}">Evidence${credential.assets.length ? ` <small>· ${fileCount}</small>` : ""}</h5>
        <button class="button button--secondary" type="button" data-credential-upload-trigger="${id}">+ Add file</button>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-credential-upload="${id}" hidden>
      </div>
      ${assets ? `<ul>${assets}</ul>` : '<p class="admin-credential-files__empty">No evidence file yet. Add a certificate image, diploma, transcript or score report.</p>'}
      <div class="admin-credential-pending" data-credential-pending hidden>
        <span class="admin-credential-file__icon" aria-hidden="true" data-credential-pending-icon>IMG</span>
        <span class="admin-credential-file__identity"><span class="admin-truncate admin-credential-file__name" data-credential-pending-name></span><small data-credential-pending-meta></small></span>
        <label class="admin-credential-pending__kind"><span>Type</span>${renderAdminSelectControl({ attributes: "data-credential-upload-kind", options: documentKindOptions() })}</label>
        <button class="button" type="button" data-credential-pending-upload>Upload</button>
        <button class="button button--secondary" type="button" data-credential-pending-cancel>Cancel</button>
      </div>
    </section>`}
  </article>`;
};

const relationOptions = (professional: ProfessionalProfileContent): string => [
  '<option value="">Standalone credential</option>',
  ...professional.education.map((item) => `<option value="education:${escapeHtml(item.id)}">Education · ${escapeHtml(item.institution.en || item.field.en || "Untitled")}</option>`),
  ...professional.languages.map((item) => `<option value="language:${escapeHtml(item.id)}">Language · ${escapeHtml(item.name.en || "Untitled")}</option>`),
].join("");

const credentialDialog = (professional: ProfessionalProfileContent): string => `<dialog class="admin-dialog admin-credential-dialog" data-credential-dialog aria-labelledby="credential-dialog-title">
  <form data-credential-form novalidate>
    ${renderAdminDialogHeader({ eyebrow: "Professional Profile", title: "Add credential", titleId: "credential-dialog-title", titleAttributes: "data-credential-dialog-title", note: "Store verification once; link it to Education or Languages.", statusLabel: "Credential status", statusId: "credential-dialog-status", close: { label: "Close credential editor", attribute: "data-credential-cancel" } })}
    <div class="admin-credential-dialog__body">
      <input type="hidden" name="credential_id">
      <div class="admin-form-grid">
        <label>Credential type${renderAdminSelectControl({ name: "credential_kind", options: Object.entries(credentialKindLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("") })}</label>
        <label>Linked profile entry${renderAdminSelectControl({ name: "credential_relation", options: relationOptions(professional) })}</label>
      </div>
      <div class="admin-site-bilingual"><label>${renderAdminFieldLabel("Title (EN)", true)}<input name="credential_title_en" maxlength="180" required></label><label>${renderAdminFieldLabel("Title (VI)")}<input name="credential_title_vi" maxlength="180"></label></div>
      <div class="admin-site-bilingual"><label>${renderAdminFieldLabel("Issuer (EN)", true)}<input name="credential_issuer_en" maxlength="180" required></label><label>${renderAdminFieldLabel("Issuer (VI)")}<input name="credential_issuer_vi" maxlength="180"></label></div>
      <div class="admin-form-grid admin-credential-date-grid">
        <label>${renderAdminFieldLabel("Issue date", true)}<input name="credential_issued_on" type="date" required data-credential-date><small class="admin-field-hint" data-credential-date-hint aria-live="polite"></small></label>
        <div class="admin-credential-expiry">
          <div class="admin-field-label-row">
            <label for="credential-expires-on"><span>Expiry date<span data-credential-expiry-required hidden><span class="admin-required-mark" aria-hidden="true">*</span><span class="sr-only"> (required)</span></span></span></label>
            <label class="admin-inline-check"><input name="credential_no_expiry" type="checkbox" checked data-credential-no-expiry><span>Does not expire</span></label>
          </div>
          <span class="admin-field-swap" data-credential-expiry-swap>
            <input id="credential-expires-on" name="credential_expires_on" type="date" data-credential-expiry data-credential-date>
            <span class="admin-field-static" data-credential-expiry-static aria-hidden="true">No expiry</span>
          </span>
          <small class="admin-field-hint" data-credential-date-hint aria-live="polite"></small>
        </div>
      </div>
      <div class="admin-form-grid"><label>Credential number<input name="credential_number" maxlength="180"></label><label>Verification URL<input name="credential_url" type="url" placeholder="https://"></label></div>
      <div class="admin-site-bilingual"><label>Description (EN)<textarea name="credential_description_en" rows="2"></textarea></label><label>Description (VI)<textarea name="credential_description_vi" rows="2"></textarea></label></div>
    </div>
    <footer class="admin-credential-dialog__footer"><label>Status${renderAdminSelectControl({ name: "credential_status", options: '<option value="draft">Draft</option><option value="published">Ready</option>' })}</label><div class="admin-actions"><button class="button button--secondary" type="button" data-credential-cancel>Cancel</button><button class="button" type="submit" data-credential-save>Save credential</button></div></footer>
  </form>
</dialog>`;

export const renderProfessionalCredentials = (
  professional: ProfessionalProfileContent,
  credentials: ProfessionalCredential[],
): string => renderAdminSectionCard({
  title: "Credentials",
  note: "Certificates, degrees and licenses. Evidence stays private.",
  headerActions: '<button class="button admin-action-new" type="button" data-credential-new>+ Add credential</button>',
  content: `<div data-credential-workspace>${credentials.length ? `<div class="admin-credential-list" data-credential-list>${credentials.map((item, index) => credentialCard(item, professional, index, credentials.length)).join("")}</div>` : '<div class="admin-empty-state"><div><strong>No credentials yet</strong><small>Add a professional certification, academic degree or language exam.</small></div></div>'}${credentialDialog(professional)}</div>`,
});

export const renderLinkedCredentials = (
  credentials: ProfessionalCredential[],
  relatedType: CredentialRelationType,
  relatedId: string,
): string => {
  const linked = credentials.filter((credential) => credential.relatedType === relatedType && credential.relatedId === relatedId && credential.status !== "archived");
  // Fixed labels never shrink; only the credential title truncates, one row per credential (§6.2).
  const rows = linked.map((item) => {
    const title = item.title.en || "Untitled credential";
    const files = `${item.assets.length} file${item.assets.length === 1 ? "" : "s"}`;
    return `<li><button class="admin-linked-credential" type="button" data-credential-open-linked="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(title)}, ${credentialKindShortLabels[item.kind]}, ${files}${item.status === "draft" ? ", draft" : ""}">
      <span class="admin-linked-credential__kind">${credentialKindShortLabels[item.kind]}</span>
      ${renderAdminTruncatedText(title, "admin-linked-credential__title")}
      ${item.status === "draft" ? '<span class="status status--draft">Draft</span>' : ""}
      <span class="admin-linked-credential__meta">${files}</span>
      <span class="admin-linked-credential__chevron" aria-hidden="true">${adminChevronRightIcon}</span>
    </button></li>`;
  }).join("");
  return `<section class="admin-linked-credentials" aria-label="Credentials and evidence">
    <header class="admin-linked-credentials__header">
      <div><strong>Credentials &amp; evidence</strong><small>${linked.length ? `${linked.length} linked` : "None linked"}</small></div>
      <button class="button button--secondary" type="button" data-credential-add-related data-related-type="${relatedType}" data-related-id="${escapeHtml(relatedId)}">+ Add credential</button>
    </header>
    ${rows ? `<ul class="admin-linked-credentials__list">${rows}</ul>` : '<p class="admin-linked-credentials__empty">No credential or evidence file is linked yet.</p>'}
  </section>`;
};

interface CredentialWorkspaceCallbacks {
  getCredentials: () => ProfessionalCredential[];
  getProfessional: () => ProfessionalProfileContent;
  setCredentials: (credentials: ProfessionalCredential[]) => void;
  beforeMutation: () => void;
  activateCredentialsTab: () => void;
  /** Opens the Education or Languages tab at the entry a credential is linked to. */
  showRelatedEntry: (type: CredentialRelationType, id: string) => void;
  rerender: () => void;
  notify: (message: string, kind?: "info" | "error" | "success") => void;
}

const inputFromCredential = (credential: ProfessionalCredential, status = credential.status): ProfessionalCredentialInput => ({
  kind: credential.kind,
  relatedType: credential.relatedType,
  relatedId: credential.relatedId,
  title: credential.title,
  issuer: credential.issuer,
  description: credential.description,
  issuedOn: credential.issuedOn,
  expiresOn: credential.expiresOn,
  doesNotExpire: credential.doesNotExpire,
  credentialNumber: credential.credentialNumber,
  verificationUrl: credential.verificationUrl,
  status,
  displayOrder: credential.displayOrder,
});

const credentialValidationFields = (message: string): string[] => {
  if (message.startsWith("Title (EN)")) return ["credential_title_en", "credential_issuer_en", "credential_issued_on"];
  if (message.startsWith("Enter an expiry date")) return ["credential_expires_on"];
  if (message.startsWith("Expiry date")) return ["credential_expires_on", "credential_issued_on"];
  if (message.startsWith("Verification URL")) return ["credential_url"];
  return [];
};

export const bindProfessionalCredentials = (root: ParentNode, callbacks: CredentialWorkspaceCallbacks): void => {
  const dialog = root.querySelector<HTMLDialogElement>("[data-credential-dialog]");
  const form = dialog?.querySelector<HTMLFormElement>("[data-credential-form]");
  const title = dialog?.querySelector<HTMLElement>("[data-credential-dialog-title]");
  const noExpiry = dialog?.querySelector<HTMLInputElement>("[data-credential-no-expiry]");
  const expiry = dialog?.querySelector<HTMLInputElement>("[data-credential-expiry]");
  const expiryRequired = dialog?.querySelector<HTMLElement>("[data-credential-expiry-required]");
  const expiryStatic = dialog?.querySelector<HTMLElement>("[data-credential-expiry-static]");
  // Native date inputs follow the browser locale (mm/dd/yyyy); the hint repeats the date in the Admin format.
  const syncDateHints = (): void => {
    dialog?.querySelectorAll<HTMLInputElement>("[data-credential-date]").forEach((input) => {
      const hint = input.closest("label, .admin-credential-expiry")?.querySelector<HTMLElement>("[data-credential-date-hint]");
      if (hint) hint.textContent = input.value && !input.disabled ? formatAdminDate(input.value) : "";
    });
  };
  const expirySwap = dialog?.querySelector<HTMLElement>("[data-credential-expiry-swap]");
  const setExpiryState = (): void => {
    if (!expiry || !noExpiry) return;
    expiry.disabled = noExpiry.checked;
    // The static box overlays the (invisible) input, so both states have exactly the input's size.
    expirySwap?.toggleAttribute("data-static", noExpiry.checked);
    if (expiryStatic) expiryStatic.hidden = !noExpiry.checked;
    expiry.required = !noExpiry.checked;
    expiry.setAttribute("aria-required", String(!noExpiry.checked));
    if (expiryRequired) expiryRequired.hidden = noExpiry.checked;
    if (noExpiry.checked) expiry.value = "";
    syncDateHints();
  };
  noExpiry?.addEventListener("change", () => {
    setExpiryState();
    // Unticking means "it expires": go straight to the date that is now required.
    if (!noExpiry.checked) expiry?.focus({ preventScroll: true });
  });
  dialog?.querySelectorAll<HTMLInputElement>("[data-credential-date]").forEach((input) => input.addEventListener("input", syncDateHints));
  let reorderBusy = false;

  const openEditor = (credential?: ProfessionalCredential, preset?: { type: CredentialRelationType; id: string }): void => {
    if (!dialog || !form) return;
    form.reset();
    clearAdminDialogStatus(dialog);
    form.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((control) => {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
    });
    const set = (name: string, value: string): void => {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) control.value = value;
    };
    set("credential_id", credential?.id ?? "");
    set("credential_kind", credential?.kind ?? (preset?.type === "education" ? "academic_degree" : preset?.type === "language" ? "language_exam" : "professional_certification"));
    set("credential_relation", credential?.relatedType && credential.relatedId ? `${credential.relatedType}:${credential.relatedId}` : preset ? `${preset.type}:${preset.id}` : "");
    set("credential_title_en", credential?.title.en ?? "");
    set("credential_title_vi", credential?.title.vi ?? "");
    set("credential_issuer_en", credential?.issuer.en ?? "");
    set("credential_issuer_vi", credential?.issuer.vi ?? "");
    set("credential_issued_on", credential?.issuedOn ?? "");
    set("credential_expires_on", credential?.expiresOn ?? "");
    set("credential_number", credential?.credentialNumber ?? "");
    set("credential_url", credential?.verificationUrl ?? "");
    set("credential_description_en", credential?.description.en ?? "");
    set("credential_description_vi", credential?.description.vi ?? "");
    set("credential_status", credential?.status === "published" ? "published" : "draft");
    if (noExpiry) noExpiry.checked = credential?.doesNotExpire ?? true;
    setExpiryState();
    if (title) title.textContent = credential ? "Edit credential" : "Add credential";
    dialog.showModal();
    requestAnimationFrame(() => form.querySelector<HTMLInputElement>('[name="credential_title_en"]')?.focus({ preventScroll: true }));
  };

  const closeEditor = (): void => dialog?.close();
  dialog?.querySelectorAll<HTMLButtonElement>("[data-credential-cancel]").forEach((button) => button.addEventListener("click", closeEditor));
  dialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });
  root.querySelector<HTMLButtonElement>("[data-credential-new]")?.addEventListener("click", () => openEditor());
  root.querySelectorAll<HTMLButtonElement>("[data-credential-move]").forEach((button) => button.addEventListener("click", () => {
    if (reorderBusy) return;
    const id = button.dataset.credentialId;
    const direction = button.dataset.credentialMove as "up" | "down" | undefined;
    if (!id || !direction) return;
    const current = callbacks.getCredentials();
    const index = current.findIndex((item) => item.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= current.length) return;
    const reordered = [...current];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const list = root.querySelector<HTMLElement>("[data-credential-list]");
    const controls = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-credential-move]"));
    const disabledStates = controls.map((control) => control.disabled);
    reorderBusy = true;
    list?.setAttribute("aria-busy", "true");
    controls.forEach((control) => { control.disabled = true; });
    callbacks.beforeMutation();
    void reorderProfessionalCredentials(reordered.map((item) => item.id))
      .then((credentials) => {
        callbacks.setCredentials(credentials);
        callbacks.rerender();
        requestAnimationFrame(() => {
          const card = root.querySelector<HTMLElement>(`[data-credential-card="${CSS.escape(id)}"]`);
          const preferred = card?.querySelector<HTMLButtonElement>(`[data-credential-move="${direction}"]`);
          const fallback = card?.querySelector<HTMLButtonElement>("[data-credential-move]:not(:disabled), [data-credential-edit], [data-credential-restore]");
          if (card) revealAdminElement(card);
          (preferred && !preferred.disabled ? preferred : fallback)?.focus({ preventScroll: true });
        });
        callbacks.notify(`Credential moved ${direction}.`, "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => {
        reorderBusy = false;
        if (list?.isConnected) list.removeAttribute("aria-busy");
        controls.forEach((control, controlIndex) => {
          if (control.isConnected) control.disabled = disabledStates[controlIndex];
        });
      });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-edit]").forEach((button) => button.addEventListener("click", () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialEdit);
    if (credential) openEditor(credential);
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-add-related]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.relatedType as CredentialRelationType | undefined;
    const id = button.dataset.relatedId;
    if (!type || !id) return;
    callbacks.activateCredentialsTab();
    openEditor(undefined, { type, id });
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-open-linked]").forEach((button) => button.addEventListener("click", () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialOpenLinked);
    if (!credential) return;
    callbacks.activateCredentialsTab();
    openEditor(credential);
  }));

  form?.addEventListener("input", (event) => {
    if (event.target instanceof HTMLElement) {
      event.target.removeAttribute("aria-invalid");
      event.target.removeAttribute("aria-describedby");
    }
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const id = String(values.get("credential_id") ?? "");
    const existing = callbacks.getCredentials().find((item) => item.id === id);
    const relation = String(values.get("credential_relation") ?? "");
    const [relationType, ...relationIdParts] = relation.split(":");
    const doesNotExpire = values.get("credential_no_expiry") === "on";
    const input: ProfessionalCredentialInput = {
      kind: String(values.get("credential_kind")) as CredentialKind,
      relatedType: relation ? relationType as CredentialRelationType : null,
      relatedId: relation ? relationIdParts.join(":") : null,
      title: { en: String(values.get("credential_title_en") ?? "").trim(), vi: String(values.get("credential_title_vi") ?? "").trim() },
      issuer: { en: String(values.get("credential_issuer_en") ?? "").trim(), vi: String(values.get("credential_issuer_vi") ?? "").trim() },
      description: { en: String(values.get("credential_description_en") ?? "").trim(), vi: String(values.get("credential_description_vi") ?? "").trim() },
      issuedOn: String(values.get("credential_issued_on") ?? "") || null,
      expiresOn: doesNotExpire ? null : String(values.get("credential_expires_on") ?? "") || null,
      doesNotExpire,
      credentialNumber: String(values.get("credential_number") ?? "").trim(),
      verificationUrl: String(values.get("credential_url") ?? "").trim(),
      status: String(values.get("credential_status")) as ProfessionalCredential["status"],
      displayOrder: existing?.displayOrder ?? callbacks.getCredentials().length + 1,
    };
    const validationError = validateCredentialInput(input);
    if (validationError) {
      const validationControls = credentialValidationFields(validationError)
        .map((name) => form.elements.namedItem(name))
        .filter((control): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement);
      const invalidControls = validationError.startsWith("Title (EN)")
        ? validationControls.filter((control) => !control.value.trim())
        : validationControls;
      invalidControls.forEach((control) => {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", "credential-dialog-status");
      });
      callbacks.notify(validationError, "error");
      invalidControls[0]?.focus({ preventScroll: true });
      return;
    }
    const saveButton = form.querySelector<HTMLButtonElement>("[data-credential-save]");
    setButtonBusy(saveButton, true, "Saving…");
    callbacks.beforeMutation();
    void (existing ? updateProfessionalCredential(existing.id, input) : createProfessionalCredential(input))
      .then((saved) => {
        const credentials = existing
          ? callbacks.getCredentials().map((item) => item.id === saved.id ? saved : item)
          : [...callbacks.getCredentials(), saved];
        callbacks.setCredentials(credentials);
        closeEditor();
        callbacks.rerender();
        callbacks.notify(existing ? "Credential updated." : "Credential created. Verification details can be added later.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-credential-upload-trigger]").forEach((button) => button.addEventListener("click", () => {
    root.querySelector<HTMLInputElement>(`[data-credential-upload="${CSS.escape(button.dataset.credentialUploadTrigger ?? "")}"]`)?.click();
  }));
  // Choosing a file shows a pending row; the type is picked there and nothing uploads until "Upload" (like pending media).
  root.querySelectorAll<HTMLInputElement>("[data-credential-upload]").forEach((input) => {
    const card = input.closest<HTMLElement>("[data-credential-card]");
    const pending = card?.querySelector<HTMLElement>("[data-credential-pending]");
    const trigger = card?.querySelector<HTMLButtonElement>("[data-credential-upload-trigger]");
    const uploadButton = pending?.querySelector<HTMLButtonElement>("[data-credential-pending-upload]");
    const resetPending = (): void => {
      input.value = "";
      if (pending) pending.hidden = true;
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file || !pending) return;
      pending.querySelector<HTMLElement>("[data-credential-pending-icon]")!.textContent = file.type === "application/pdf" ? "PDF" : "IMG";
      const name = pending.querySelector<HTMLElement>("[data-credential-pending-name]")!;
      name.textContent = file.name;
      name.title = file.name;
      pending.querySelector<HTMLElement>("[data-credential-pending-meta]")!.textContent = `${formatFileSize(file.size)} · not uploaded yet`;
      pending.hidden = false;
      pending.querySelector<HTMLSelectElement>("[data-credential-upload-kind]")?.focus({ preventScroll: true });
    });
    pending?.querySelector<HTMLButtonElement>("[data-credential-pending-cancel]")?.addEventListener("click", () => {
      resetPending();
      trigger?.focus({ preventScroll: true });
    });
    uploadButton?.addEventListener("click", () => {
      const file = input.files?.[0];
      const credentialId = input.dataset.credentialUpload;
      const kind = pending?.querySelector<HTMLSelectElement>("[data-credential-upload-kind]")?.value as CredentialDocumentKind | undefined;
      if (!file || !credentialId || !kind) return;
      callbacks.beforeMutation();
      setButtonBusy(uploadButton, true, "Uploading…");
      void uploadCredentialAsset(credentialId, file, kind)
        .then((asset) => {
          callbacks.setCredentials(callbacks.getCredentials().map((credential) => credential.id === credentialId ? { ...credential, assets: [...credential.assets, asset] } : credential));
          callbacks.rerender();
          callbacks.notify("Private credential document uploaded.", "success");
        })
        .catch((error: Error) => callbacks.notify(error.message, "error"))
        .finally(() => { if (uploadButton.isConnected) setButtonBusy(uploadButton, false); });
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-credential-show-related]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.relatedType as CredentialRelationType | undefined;
    const id = button.dataset.relatedId;
    if (type && id) callbacks.showRelatedEntry(type, id);
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-asset-open]").forEach((button) => button.addEventListener("click", () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialId);
    const asset = credential?.assets.find((item) => item.id === button.dataset.credentialAssetOpen);
    if (!asset) return;
    void openCredentialAsset(asset)
      .then((url) => {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.click();
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-asset-delete]").forEach((button) => button.addEventListener("click", async () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialId);
    const asset = credential?.assets.find((item) => item.id === button.dataset.credentialAssetDelete);
    if (!credential || !asset) return;
    if (credential.status === "published" && credential.assets.length === 1 && !credential.verificationUrl) {
      callbacks.notify("Add a verification URL or return this credential to Draft before deleting its last evidence file.", "error");
      return;
    }
    if (!(await confirmAdmin({ eyebrow: "Private credential file", title: `Delete ${asset.name}?`, message: "This permanently removes the private file. Published outputs are unaffected because private evidence is never included in a release.", confirmLabel: "Delete file", tone: "danger" }))) return;
    callbacks.beforeMutation();
    try {
      await deleteCredentialAsset(asset);
      callbacks.setCredentials(callbacks.getCredentials().map((item) => item.id === credential.id ? { ...item, assets: item.assets.filter((candidate) => candidate.id !== asset.id) } : item));
      callbacks.rerender();
      callbacks.notify("Private credential document deleted.", "success");
    } catch (error) {
      callbacks.notify(error instanceof Error ? error.message : "The document could not be deleted.", "error");
    }
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-archive]").forEach((button) => button.addEventListener("click", async () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialArchive);
    if (!credential || !(await confirmAdmin({ eyebrow: "Professional credential", title: `Archive ${credential.title.en}?`, message: "Its private evidence files are retained and the credential can be restored later.", confirmLabel: "Archive credential", tone: "danger" }))) return;
    callbacks.beforeMutation();
    try {
      await archiveProfessionalCredential(credential.id);
      callbacks.setCredentials(callbacks.getCredentials().map((item) => item.id === credential.id ? { ...item, status: "archived" } : item));
      callbacks.rerender();
      callbacks.notify("Credential archived.", "success");
    } catch (error) {
      callbacks.notify(error instanceof Error ? error.message : "The credential could not be archived.", "error");
    }
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-credential-restore]").forEach((button) => button.addEventListener("click", () => {
    const credential = callbacks.getCredentials().find((item) => item.id === button.dataset.credentialRestore);
    if (!credential) return;
    callbacks.beforeMutation();
    void updateProfessionalCredential(credential.id, inputFromCredential(credential, "draft"))
      .then((restored) => {
        callbacks.setCredentials(callbacks.getCredentials().map((item) => item.id === restored.id ? restored : item));
        callbacks.rerender();
        callbacks.notify("Credential restored as draft.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
  }));
};
