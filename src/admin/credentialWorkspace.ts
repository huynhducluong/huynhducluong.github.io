import {
  archiveProfessionalCredential,
  createProfessionalCredential,
  deleteCredentialAsset,
  openCredentialAsset,
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
import { formatAdminDate, renderAdminSectionCard, setButtonBusy } from "./ui";

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

const relationLabel = (credential: ProfessionalCredential, professional: ProfessionalProfileContent): string => {
  if (credential.relatedType === "education") {
    const item = professional.education.find((education) => education.id === credential.relatedId);
    return item ? `Education · ${item.institution.en}` : "Education link unavailable";
  }
  if (credential.relatedType === "language") {
    const item = professional.languages.find((language) => language.id === credential.relatedId);
    return item ? `Language · ${item.name.en}` : "Language link unavailable";
  }
  return "Standalone credential";
};

const statusLabel = (status: ProfessionalCredential["status"]): string => status === "published" ? "Ready" : status === "draft" ? "Draft" : "Archived";

const credentialCard = (credential: ProfessionalCredential, professional: ProfessionalProfileContent): string => {
  const assets = credential.assets.map((asset) => `<li>
    <span class="admin-credential-file__icon" aria-hidden="true">${asset.mimeType === "application/pdf" ? "PDF" : "IMG"}</span>
    <span><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(documentKindLabels[asset.documentKind])} · ${formatFileSize(asset.fileSize)} · Private</small></span>
    <button class="button button--secondary" type="button" data-credential-asset-open="${escapeHtml(asset.id)}" data-credential-id="${escapeHtml(credential.id)}">Open</button>
    ${credential.status === "archived" ? "" : `<button class="button button--secondary admin-button--danger" type="button" data-credential-asset-delete="${escapeHtml(asset.id)}" data-credential-id="${escapeHtml(credential.id)}">Delete</button>`}
  </li>`).join("");
  return `<article class="admin-credential-card${credential.status === "archived" ? " is-archived" : ""}" data-credential-card="${escapeHtml(credential.id)}">
    <header>
      <div><p>${escapeHtml(credentialKindLabels[credential.kind])}</p><h4>${escapeHtml(credential.title.en || "Untitled credential")}</h4><small>${escapeHtml(credential.issuer.en || "Issuer not set")}</small></div>
      <span class="status status--${credential.status}">${statusLabel(credential.status)}</span>
    </header>
    <dl>
      <div><dt>Linked to</dt><dd>${escapeHtml(relationLabel(credential, professional))}</dd></div>
      <div><dt>Issued</dt><dd>${credential.issuedOn ? formatAdminDate(credential.issuedOn) : "Not set"}</dd></div>
      <div><dt>Expiry</dt><dd>${credential.doesNotExpire ? "No expiry" : credential.expiresOn ? formatAdminDate(credential.expiresOn) : "Not set"}</dd></div>
      <div><dt>Evidence</dt><dd>${credential.assets.length} private file${credential.assets.length === 1 ? "" : "s"}</dd></div>
    </dl>
    ${credential.description.en ? `<p class="admin-credential-card__description">${escapeHtml(credential.description.en)}</p>` : ""}
    <div class="admin-credential-card__actions">
      ${credential.status === "archived"
        ? `<button class="button button--secondary" type="button" data-credential-restore="${escapeHtml(credential.id)}">Restore as draft</button>`
        : `<button class="button button--secondary" type="button" data-credential-edit="${escapeHtml(credential.id)}">Edit details</button><button class="button button--secondary admin-button--danger" type="button" data-credential-archive="${escapeHtml(credential.id)}">Archive</button>`}
    </div>
    ${credential.status === "archived" ? "" : `<section class="admin-credential-files"><div><h5>Evidence documents</h5><p>Original files remain private and are never added automatically to public releases.</p></div>${assets ? `<ul>${assets}</ul>` : '<div class="admin-empty-state"><div><strong>No evidence files</strong><small>Add a certificate image, diploma, transcript or score report.</small></div></div>'}<div class="admin-credential-upload"><label>Document type<select data-credential-upload-kind>${Object.entries(documentKindLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><button class="button button--secondary" type="button" data-credential-upload-trigger="${escapeHtml(credential.id)}">+ Add private file</button><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-credential-upload="${escapeHtml(credential.id)}" hidden></div></section>`}
  </article>`;
};

const relationOptions = (professional: ProfessionalProfileContent): string => [
  '<option value="">Standalone credential</option>',
  ...professional.education.map((item) => `<option value="education:${escapeHtml(item.id)}">Education · ${escapeHtml(item.institution.en || item.field.en || "Untitled")}</option>`),
  ...professional.languages.map((item) => `<option value="language:${escapeHtml(item.id)}">Language · ${escapeHtml(item.name.en || "Untitled")}</option>`),
].join("");

const credentialDialog = (professional: ProfessionalProfileContent): string => `<dialog class="admin-dialog admin-credential-dialog" data-credential-dialog aria-labelledby="credential-dialog-title">
  <form data-credential-form>
    <header><div><p class="section-kicker">Professional Profile</p><h2 id="credential-dialog-title" data-credential-dialog-title>Add credential</h2><p>Store verification details once and link the credential to Education or Languages when relevant.</p></div><button class="admin-icon-button" type="button" data-credential-cancel aria-label="Close credential editor">×</button></header>
    <input type="hidden" name="credential_id">
    <div class="admin-form-grid">
      <label>Credential type<select name="credential_kind">${Object.entries(credentialKindLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
      <label>Linked profile entry<select name="credential_relation">${relationOptions(professional)}</select></label>
    </div>
    <div class="admin-site-bilingual"><label>Title (EN)<input name="credential_title_en" maxlength="180" required></label><label>Title (VI)<input name="credential_title_vi" maxlength="180"></label></div>
    <div class="admin-site-bilingual"><label>Issuer (EN)<input name="credential_issuer_en" maxlength="180" required></label><label>Issuer (VI)<input name="credential_issuer_vi" maxlength="180"></label></div>
    <div class="admin-form-grid"><label>Issue date<input name="credential_issued_on" type="date" required></label><label>Expiry date<input name="credential_expires_on" type="date" data-credential-expiry></label></div>
    <label class="admin-switch"><input name="credential_no_expiry" type="checkbox" checked data-credential-no-expiry> This credential does not expire</label>
    <div class="admin-form-grid"><label>Credential number<input name="credential_number" maxlength="180"></label><label>Verification URL<input name="credential_url" type="url" placeholder="https://"></label></div>
    <div class="admin-site-bilingual"><label>Description (EN)<textarea name="credential_description_en" rows="3"></textarea></label><label>Description (VI)<textarea name="credential_description_vi" rows="3"></textarea></label></div>
    <label>Status<select name="credential_status"><option value="draft">Draft</option><option value="published">Ready</option></select></label>
    <div class="admin-actions"><button class="button button--secondary" type="button" data-credential-cancel>Cancel</button><button class="button" type="submit" data-credential-save>Save credential</button></div>
  </form>
</dialog>`;

export const renderProfessionalCredentials = (
  professional: ProfessionalProfileContent,
  credentials: ProfessionalCredential[],
): string => renderAdminSectionCard({
  title: "Credentials",
  note: "Qualifications, certificates and licenses shared across your professional profile. Evidence files are private by default.",
  headerActions: '<button class="button admin-action-new" type="button" data-credential-new>+ Add credential</button>',
  content: `<div data-credential-workspace>${credentials.length ? `<div class="admin-credential-list">${credentials.map((item) => credentialCard(item, professional)).join("")}</div>` : '<div class="admin-empty-state"><div><strong>No credentials yet</strong><small>Add a professional certification, academic degree or language exam.</small></div></div>'}${credentialDialog(professional)}</div>`,
});

export const renderLinkedCredentials = (
  credentials: ProfessionalCredential[],
  relatedType: CredentialRelationType,
  relatedId: string,
): string => {
  const linked = credentials.filter((credential) => credential.relatedType === relatedType && credential.relatedId === relatedId && credential.status !== "archived");
  return `<section class="admin-linked-credentials"><div><strong>Credentials & evidence</strong><small>${linked.length ? `${linked.length} linked credential${linked.length === 1 ? "" : "s"}` : "No linked credential or evidence file"}</small></div><div>${linked.map((item) => `<button class="button button--secondary" type="button" data-credential-open-linked="${escapeHtml(item.id)}">${escapeHtml(item.title.en || "Untitled credential")} · ${item.assets.length} file${item.assets.length === 1 ? "" : "s"}</button>`).join("")}<button class="button button--secondary" type="button" data-credential-add-related data-related-type="${relatedType}" data-related-id="${escapeHtml(relatedId)}">+ Add credential</button></div></section>`;
};

interface CredentialWorkspaceCallbacks {
  getCredentials: () => ProfessionalCredential[];
  getProfessional: () => ProfessionalProfileContent;
  setCredentials: (credentials: ProfessionalCredential[]) => void;
  beforeMutation: () => void;
  activateCredentialsTab: () => void;
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

export const bindProfessionalCredentials = (root: ParentNode, callbacks: CredentialWorkspaceCallbacks): void => {
  const dialog = root.querySelector<HTMLDialogElement>("[data-credential-dialog]");
  const form = dialog?.querySelector<HTMLFormElement>("[data-credential-form]");
  const title = dialog?.querySelector<HTMLElement>("[data-credential-dialog-title]");
  const noExpiry = dialog?.querySelector<HTMLInputElement>("[data-credential-no-expiry]");
  const expiry = dialog?.querySelector<HTMLInputElement>("[data-credential-expiry]");
  const setExpiryState = (): void => {
    if (!expiry || !noExpiry) return;
    expiry.disabled = noExpiry.checked;
    if (noExpiry.checked) expiry.value = "";
  };
  noExpiry?.addEventListener("change", setExpiryState);

  const openEditor = (credential?: ProfessionalCredential, preset?: { type: CredentialRelationType; id: string }): void => {
    if (!dialog || !form) return;
    form.reset();
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
    const validationError = validateCredentialInput(input, existing?.assets.length ?? 0);
    if (validationError) {
      callbacks.notify(validationError, "error");
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
        callbacks.notify(existing ? "Credential updated." : "Credential created. You can now add private evidence files.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (saveButton?.isConnected) setButtonBusy(saveButton, false); });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-credential-upload-trigger]").forEach((button) => button.addEventListener("click", () => {
    root.querySelector<HTMLInputElement>(`[data-credential-upload="${CSS.escape(button.dataset.credentialUploadTrigger ?? "")}"]`)?.click();
  }));
  root.querySelectorAll<HTMLInputElement>("[data-credential-upload]").forEach((input) => input.addEventListener("change", () => {
    const file = input.files?.[0];
    const credentialId = input.dataset.credentialUpload;
    const card = input.closest<HTMLElement>("[data-credential-card]");
    const kind = card?.querySelector<HTMLSelectElement>("[data-credential-upload-kind]")?.value as CredentialDocumentKind | undefined;
    if (!file || !credentialId || !kind) return;
    callbacks.beforeMutation();
    void uploadCredentialAsset(credentialId, file, kind)
      .then((asset) => {
        callbacks.setCredentials(callbacks.getCredentials().map((credential) => credential.id === credentialId ? { ...credential, assets: [...credential.assets, asset] } : credential));
        callbacks.rerender();
        callbacks.notify("Private credential document uploaded.", "success");
      })
      .catch((error: Error) => callbacks.notify(error.message, "error"));
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
