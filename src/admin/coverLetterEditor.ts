import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/admin.css";
import "../styles/admin-cover-letter.css";
import "../styles/cover-letter-screen.css";
import { coverLetterSenderDefaults, createCoverLetterDraft } from "../cover-letter/defaults";
import { renderCoverLetterMarkup } from "../cover-letter/renderCoverLetter";
import { coverLetterOverflows, validateCoverLetter } from "../cover-letter/validation";
import { escapeHtml } from "../shared/format";
import { createCustomDocumentTheme, documentThemes, findDocumentTheme } from "../themes/documentThemes";
import { applyDocumentTheme } from "../themes/documentThemes";
import { createCoverLetter, duplicateCoverLetter, finalizeCoverLetter, getCoverLetter, listCoverLetterEvidence, updateCoverLetterDraft } from "../services/coverLetterRepository";
import type { CoverLetterEvidenceOption, CoverLetterInput, CoverLetterRecord } from "../types/coverLetter";
import { requireAdminAccess } from "./auth";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");
const base = import.meta.env.BASE_URL;
let letter: CoverLetterInput = createCoverLetterDraft();
let record: CoverLetterRecord | null = null;
let projects: CoverLetterEvidenceOption[] = [];
let tools: CoverLetterEvidenceOption[] = [];
let dirty = false;

const value = (name: keyof CoverLetterInput): string => escapeHtml(String(letter[name]));
const disabled = (): string => record && record.status !== "draft" ? " disabled" : "";
const input = (label: string, name: keyof CoverLetterInput, type = "text", required = false): string =>
  "<label>" + label + "<input name=\"" + name + "\" type=\"" + type + "\" value=\"" + value(name) + "\"" + (required ? " required" : "") + disabled() + "></label>";
const textarea = (label: string, name: keyof CoverLetterInput, rows: number, required = false): string =>
  "<label>" + label + "<textarea name=\"" + name + "\" rows=\"" + rows + "\"" + (required ? " required" : "") + disabled() + ">" + value(name) + "</textarea></label>";
const evidenceChecks = (items: CoverLetterEvidenceOption[], name: "projectIds" | "toolIds"): string => items.length
  ? items.map((item) => '<label class="evidence-option"><input type="checkbox" name="' + name + '" value="' + escapeHtml(item.id) + '" ' + (letter[name].includes(item.id) ? "checked" : "") + disabled() + '><span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.status) + "</small></span></label>").join("")
  : '<p class="admin-empty">No records available.</p>';

const renderPage = (): void => {
  const isLocked = Boolean(record && record.status !== "draft");
  const themeOptions = documentThemes.map((theme) => '<option value="' + theme.id + '" ' + (letter.theme.presetId === theme.id ? "selected" : "") + ">" + escapeHtml(theme.name) + "</option>").join("") + '<option value="custom" ' + (letter.theme.presetId === "custom" ? "selected" : "") + ">Custom company colors</option>";
  app.innerHTML = [
    '<header class="admin-header"><div><p>HDL Portfolio CMS</p><small>Cover Letter editor</small></div><div><a href="' + base + 'admin/cover-letters/">All letters</a><a href="' + base + 'admin/">Projects</a></div></header>',
    '<main class="cover-letter-editor"><section class="cover-letter-editor__form"><div class="cover-letter-editor__title"><div><p class="section-kicker">' + (record ? escapeHtml(record.status) : "New draft") + "</p><h1>" + escapeHtml(letter.internalTitle) + '</h1></div><span class="status status--' + (record?.status ?? "draft") + '">' + (record?.status ?? "draft") + "</span></div>",
    isLocked ? '<div class="cover-letter-lock"><strong>Final content is locked.</strong><span>Duplicate this letter to create an editable draft.</span></div>' : "",
    '<form data-cover-letter-form><fieldset><legend>Application</legend><div class="admin-form-grid">',
    input("Internal title *", "internalTitle", "text", true), input("Application date *", "applicationDate", "date", true),
    input("Company name *", "companyName", "text", true), input("Position title *", "positionTitle", "text", true),
    input("Recipient name", "recipientName"), input("Recipient title", "recipientTitle"),
    "</div>", textarea("Company address", "companyAddress", 3), input("Salutation *", "salutation", "text", true), "</fieldset>",
    '<fieldset><legend>Letter body</legend><p class="field-help">English only. Keep company claims factual; placeholders block finalization.</p>',
    textarea("Opening paragraph *", "openingParagraph", 5, true), textarea("Experience and fit *", "fitParagraph", 7, true),
    textarea("Why this company *", "companyParagraph", 6, true), textarea("Closing paragraph *", "closingParagraph", 5, true),
    input("Sign-off *", "signOff", "text", true),
    isLocked ? "" : '<button class="button button--secondary" type="button" data-starter>Generate safe starter text</button>',
    "</fieldset>",
    '<fieldset><legend>Supporting evidence</legend><p class="field-help">Private editing references only; these labels are not printed.</p><h2>Projects</h2><div class="evidence-grid">', evidenceChecks(projects, "projectIds"), '</div><h2>Automation tools</h2><div class="evidence-grid">', evidenceChecks(tools, "toolIds"), "</div></fieldset>",
    '<fieldset><legend>Company color theme</legend><div class="admin-form-grid"><label>Preset<select name="themePreset"' + disabled() + ">" + themeOptions + "</select></label>",
    '<label>Primary color<input name="themePrimary" type="color" value="' + escapeHtml(letter.theme.primary) + '"' + disabled() + '></label><label>Accent color<input name="themeAccent" type="color" value="' + escapeHtml(letter.theme.accent) + '"' + disabled() + "></label></div></fieldset>",
    '<fieldset><legend>Private notes</legend>', textarea("Notes (never printed)", "privateNotes", 4), "</fieldset>",
    '<p class="admin-message" data-editor-message role="status"></p><div class="admin-actions">',
    isLocked ? '<button class="button" type="button" data-duplicate>Duplicate as draft</button>' : '<button class="button" type="submit" data-save>Save draft</button><button class="button button--secondary" type="button" data-finalize>Mark as final</button>',
    record ? '<a class="button button--secondary" href="' + base + "cover-letter/?id=" + encodeURIComponent(record.id) + '" target="_blank" rel="noreferrer">Open print view</a>' : "",
    "</div></form></section>",
    '<aside class="cover-letter-editor__preview"><div class="cover-letter-preview__heading"><div><strong>Live A4 preview</strong><small data-word-count></small></div><span data-overflow-state></span></div><div class="cover-letter-preview-scroll"><div data-preview></div></div><div class="cover-letter-validation" data-validation></div></aside></main>',
  ].join("");
  bind();
  updatePreview();
};

const selected = (form: HTMLFormElement, name: string): string[] =>
  [...form.querySelectorAll<HTMLInputElement>('input[name="' + name + '"]:checked')].map((item) => item.value);

const readForm = (): CoverLetterInput => {
  const formElement = app.querySelector<HTMLFormElement>("[data-cover-letter-form]");
  if (!formElement) return letter;
  const data = new FormData(formElement);
  const text = (name: string): string => String(data.get(name) ?? "");
  return {
    internalTitle: text("internalTitle"), companyName: text("companyName"), positionTitle: text("positionTitle"),
    recipientName: text("recipientName"), recipientTitle: text("recipientTitle"), companyAddress: text("companyAddress"),
    applicationDate: text("applicationDate"), salutation: text("salutation"), openingParagraph: text("openingParagraph"),
    fitParagraph: text("fitParagraph"), companyParagraph: text("companyParagraph"), closingParagraph: text("closingParagraph"),
    signOff: text("signOff"), privateNotes: text("privateNotes"),
    theme: { presetId: text("themePreset"), primary: text("themePrimary"), accent: text("themeAccent") },
    projectIds: selected(formElement, "projectIds"), toolIds: selected(formElement, "toolIds"),
  };
};

const updatePreview = (): void => {
  letter = readForm();
  const preview = app.querySelector<HTMLElement>("[data-preview]");
  if (!preview) return;
  preview.innerHTML = renderCoverLetterMarkup(letter, record?.senderSnapshot ?? coverLetterSenderDefaults);
  const page = preview.querySelector<HTMLElement>("[data-cover-letter-page]");
  if (page) applyDocumentTheme(page, createCustomDocumentTheme(letter.theme.primary, letter.theme.accent));
  const validation = validateCoverLetter(letter);
  const wordCount = app.querySelector<HTMLElement>("[data-word-count]");
  if (wordCount) wordCount.textContent = validation.wordCount + " body words";
  requestAnimationFrame(() => {
    const overflow = page ? coverLetterOverflows(page) : false;
    const state = app.querySelector<HTMLElement>("[data-overflow-state]");
    if (state) { state.textContent = overflow ? "Page overflow" : "Fits one page"; state.dataset.kind = overflow ? "error" : "success"; }
    const target = app.querySelector<HTMLElement>("[data-validation]");
    if (target) target.innerHTML = validation.errors.map((item) => "<p class=\"is-error\">" + escapeHtml(item) + "</p>").concat(validation.warnings.map((item) => "<p>" + escapeHtml(item) + "</p>")).join("");
  });
};

const setMessage = (text: string, kind: "info" | "error" | "success" = "info"): void => {
  const target = app.querySelector<HTMLElement>("[data-editor-message]");
  if (target) { target.textContent = text; target.dataset.kind = kind; }
};

const save = async (): Promise<CoverLetterRecord> => {
  letter = readForm();
  setMessage("Saving draft…");
  record = record ? await updateCoverLetterDraft(record.id, letter) : await createCoverLetter(letter);
  letter = record;
  dirty = false;
  window.history.replaceState({}, "", base + "admin/cover-letter/?id=" + encodeURIComponent(record.id));
  setMessage("Draft saved.", "success");
  return record;
};

const bind = (): void => {
  const form = app.querySelector<HTMLFormElement>("[data-cover-letter-form]");
  form?.addEventListener("input", () => { dirty = true; updatePreview(); });
  form?.addEventListener("change", (event) => {
    const select = event.target as HTMLSelectElement;
    if (select.name === "themePreset" && select.value !== "custom") {
      const theme = findDocumentTheme(select.value);
      const primary = form.querySelector<HTMLInputElement>('input[name="themePrimary"]');
      const accent = form.querySelector<HTMLInputElement>('input[name="themeAccent"]');
      if (theme && primary && accent) { primary.value = theme.tokens.primary; accent.value = theme.tokens.accent; }
    } else if (select.name === "themePrimary" || select.name === "themeAccent") {
      const preset = form.querySelector<HTMLSelectElement>('select[name="themePreset"]');
      if (preset) preset.value = "custom";
    }
    dirty = true; updatePreview();
  });
  form?.addEventListener("submit", (event) => { event.preventDefault(); void save().catch((error: Error) => setMessage(error.message, "error")); });
  app.querySelector("[data-starter]")?.addEventListener("click", () => {
    const company = (form?.querySelector<HTMLInputElement>('input[name="companyName"]')?.value || "[Company]");
    const position = (form?.querySelector<HTMLInputElement>('input[name="positionTitle"]')?.value || "[Position]");
    const fill = (name: string, text: string): void => { const field = form?.querySelector<HTMLTextAreaElement>('textarea[name="' + name + '"]'); if (field && !field.value.trim()) field.value = text; };
    fill("openingParagraph", "I am writing to apply for the " + position + " position at " + company + ". With more than five years of BIM experience, including multidisciplinary coordination for infrastructure, bridge, structural, and architectural projects, I can contribute practical coordination and model-quality expertise to your team.");
    fill("fitParagraph", "In my current BIM coordination work, I manage model quality control, clash detection, and coordination workflows across disciplines. I use Revit, Civil 3D, Navisworks, Dynamo, Python, and C# to improve consistency, reduce repetitive work, and support clear technical communication among project stakeholders.");
    fill("companyParagraph", "[Add one specific, verified reason why " + company + " and this role fit your goals.]");
    fill("closingParagraph", "I would welcome the opportunity to discuss how my BIM coordination and automation experience can support your project delivery. Thank you for your time and consideration.");
    dirty = true; updatePreview();
  });
  app.querySelector("[data-finalize]")?.addEventListener("click", () => void (async () => {
    letter = readForm(); updatePreview();
    const validation = validateCoverLetter(letter);
    const page = app.querySelector<HTMLElement>("[data-cover-letter-page]");
    if (validation.errors.length || (page && coverLetterOverflows(page))) { setMessage("Resolve validation errors and page overflow before finalizing.", "error"); return; }
    if (!window.confirm("Lock this cover letter as final? Future edits will require a duplicate draft.")) return;
    try { const saved = record ?? await save(); record = await finalizeCoverLetter(saved.id, letter, coverLetterSenderDefaults); letter = record; dirty = false; renderPage(); setMessage("Cover letter finalized and locked.", "success"); } catch (error) { setMessage(error instanceof Error ? error.message : "Finalization failed.", "error"); }
  })());
  app.querySelector("[data-duplicate]")?.addEventListener("click", () => void (async () => {
    if (!record) return;
    try { const copy = await duplicateCoverLetter(record); window.location.href = base + "admin/cover-letter/?id=" + encodeURIComponent(copy.id); } catch (error) { setMessage(error instanceof Error ? error.message : "Duplication failed.", "error"); }
  })());
};

window.addEventListener("beforeunload", (event) => { if (dirty) event.preventDefault(); });

const initialize = async (): Promise<void> => {
  if (!await requireAdminAccess()) return;
  try {
    const id = new URLSearchParams(window.location.search).get("id");
    const evidence = await listCoverLetterEvidence();
    projects = evidence.projects; tools = evidence.tools;
    if (id) { record = await getCoverLetter(id); if (!record) throw new Error("Cover letter not found."); letter = record; }
    renderPage();
  } catch (error) {
    app.innerHTML = '<main class="cover-letter-admin"><h1>Cover Letter editor unavailable</h1><p>' + escapeHtml(error instanceof Error ? error.message : "Could not load the editor.") + '</p><a href="' + base + 'admin/cover-letters/">Return to Cover Letters</a></main>';
  }
};

void initialize();
