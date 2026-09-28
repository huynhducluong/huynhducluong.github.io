import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
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
    const editLabel = record.status === "draft" ? "Edit draft" : "View record";
    app.innerHTML = [
      '<header class="cover-letter-toolbar" data-print-toolbar><div><a href="' + base + 'admin/cover-letters/">← All letters</a><span class="status status--' + record.status + '">' + record.status + '</span><strong>' + escapeHtml(record.internalTitle) + "</strong></div><div>",
      '<a class="button button--secondary" href="' + base + "admin/cover-letter/?id=" + encodeURIComponent(record.id) + '">' + editLabel + "</a>",
      '<button class="button" type="button" data-print>Print / Save PDF</button></div></header>',
      '<main class="cover-letter-screen"><div class="cover-letter-screen__canvas"><div data-document-root>',
      renderCoverLetterMarkup(record, record.senderSnapshot ?? coverLetterSenderDefaults),
      '</div></div><aside class="cover-letter-print-status" data-print-status></aside></main>',
    ].join("");

    document.title = (record.companyName || "Cover Letter") + " - " + (record.positionTitle || "Application") + " | Huynh Duc Luong";
    const page = app.querySelector<HTMLElement>("[data-cover-letter-page]");
    if (page) applyDocumentTheme(page, createCustomDocumentTheme(record.theme.primary, record.theme.accent));
    await document.fonts.ready;
    const overflow = page ? coverLetterOverflows(page) : false;
    const printButton = app.querySelector<HTMLButtonElement>("[data-print]");
    const status = app.querySelector<HTMLElement>("[data-print-status]");
    const blockers = [...validation.errors, ...(overflow ? ["Content exceeds the one-page A4 boundary."] : [])];
    if (status) {
      status.innerHTML = blockers.length
        ? "<strong>PDF export blocked</strong>" + blockers.map((item) => "<p>" + escapeHtml(item) + "</p>").join("")
        : "<strong>Ready for one-page A4 PDF</strong><p>" + validation.wordCount + " body words · selectable text · saved theme</p>";
      status.dataset.kind = blockers.length ? "error" : "success";
    }
    if (printButton) {
      printButton.disabled = blockers.length > 0;
      printButton.addEventListener("click", () => {
        if (!page || coverLetterOverflows(page)) {
          if (status) {
            status.innerHTML = "<strong>PDF export blocked</strong><p>Content exceeds the one-page A4 boundary.</p>";
            status.dataset.kind = "error";
          }
          return;
        }
        window.print();
      });
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : "Cover letter could not be loaded.");
  }
};

void initialize();
