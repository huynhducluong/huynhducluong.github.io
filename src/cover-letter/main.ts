import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/document-print-preview.css";
import "../styles/cover-letter-screen.css";
import "../styles/cover-letter-view.css";
import "../styles/cover-letter-print.css";
import { requireAdminAccess } from "../admin/auth";
import { getCoverLetter } from "../services/coverLetterRepository";
import { applyDocumentTheme, createCustomDocumentTheme } from "../themes/documentThemes";
import { escapeHtml } from "../shared/format";
import { coverLetterSenderDefaults } from "./defaults";
import { renderCoverLetterMarkup } from "./renderCoverLetter";
import { coverLetterOverflows, validateCoverLetter } from "./validation";
import {
  bindDocumentPrintButton,
  renderDocumentPrintStatus,
  renderDocumentPrintToolbar,
  updateDocumentPrintStatus,
} from "../shared/documentPrintPreview";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");
const base = import.meta.env.BASE_URL;

const showError = (message: string): void => {
  app.innerHTML = '<main class="cover-letter-error"><h1>Cover Letter unavailable</h1><p>' + escapeHtml(message) + '</p><a href="' + base + 'admin/cover-letters/">Return to Cover Letters</a></main>';
};

const initialize = async (): Promise<void> => {
  if (!await requireAdminAccess()) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return showError("A cover letter ID is required.");

  try {
    const record = await getCoverLetter(id);
    if (!record) return showError("Cover letter not found.");
    const validation = validateCoverLetter(record);
    document.body.classList.add("document-print-preview", "document-print-preview--portrait");
    const backHref = `${base}admin/?view=cover-letters&item=${encodeURIComponent(record.id)}`;
    app.innerHTML = [
      renderDocumentPrintToolbar({
        backHref,
        backLabel: "Cover Letters",
        state: record.status,
        title: record.internalTitle,
        meta: "A4 portrait · 1 page · saved record",
      }),
      renderDocumentPrintStatus({ kind: "checking", title: "Checking PDF readiness…", detail: "Verifying content and the one-page A4 boundary." }),
      '<main class="cover-letter-screen"><div class="cover-letter-screen__canvas"><div data-document-root>',
      renderCoverLetterMarkup(record, record.senderSnapshot ?? coverLetterSenderDefaults),
      '</div></div></main>',
    ].join("");

    document.title = (record.companyName || "Cover Letter") + " - " + (record.positionTitle || "Application") + " | Huynh Duc Luong";
    const page = app.querySelector<HTMLElement>("[data-cover-letter-page]");
    if (page) applyDocumentTheme(page, createCustomDocumentTheme(record.theme.primary, record.theme.accent));
    await document.fonts.ready;
    const overflow = page ? coverLetterOverflows(page) : false;
    const blockers = [...validation.errors, ...(overflow ? ["Content exceeds the one-page A4 boundary."] : [])];
    updateDocumentPrintStatus(app, blockers.length
      ? { kind: "error", title: "PDF export needs attention", detail: blockers.join(" ") }
      : { kind: "success", title: "Ready for one-page A4 PDF", detail: `${validation.wordCount} body words · selectable text · saved theme` });
    bindDocumentPrintButton(app, () => {
      if (!page || coverLetterOverflows(page)) {
        updateDocumentPrintStatus(app, { kind: "error", title: "PDF export needs attention", detail: "Content exceeds the one-page A4 boundary." });
        return false;
      }
      return true;
    });
  } catch (error) {
    showError(error instanceof Error ? error.message : "Cover letter could not be loaded.");
  }
};

void initialize();
