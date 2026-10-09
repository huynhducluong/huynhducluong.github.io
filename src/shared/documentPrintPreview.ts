import { escapeHtml } from "./format";

export type DocumentPrintStatusKind = "checking" | "success" | "error";

export interface DocumentPrintToolbarOptions {
  backHref: string;
  backLabel: string;
  state: string;
  title: string;
  meta: string;
}

export interface DocumentPrintStatus {
  kind: DocumentPrintStatusKind;
  title: string;
  detail: string;
}

const backIcon = '<svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="m11.75 4.5-5.5 5.5 5.5 5.5M6.5 10h8"/></svg>';

export const renderDocumentPrintToolbar = (options: DocumentPrintToolbarOptions): string => `
  <header class="document-print-toolbar" data-print-toolbar>
    <div class="document-print-toolbar__inner">
      <a class="document-print-toolbar__back" href="${escapeHtml(options.backHref)}">${backIcon}<span>${escapeHtml(options.backLabel)}</span></a>
      <div class="document-print-toolbar__identity">
        <div><span class="document-print-toolbar__state" data-state="${escapeHtml(options.state.toLowerCase())}">${escapeHtml(options.state)}</span><strong title="${escapeHtml(options.title)}">${escapeHtml(options.title)}</strong></div>
        <small>${escapeHtml(options.meta)}</small>
      </div>
      <button class="document-print-toolbar__action" type="button" data-document-print disabled>Print / Save PDF</button>
    </div>
  </header>`;

export const renderDocumentPrintStatus = (status: DocumentPrintStatus): string => `
  <div class="document-print-status-wrap" data-print-status>
    <section class="document-print-status" data-kind="${status.kind}" role="status" aria-live="polite">
      <span class="document-print-status__icon" aria-hidden="true"></span>
      <div><strong data-print-status-title>${escapeHtml(status.title)}</strong><p data-print-status-detail>${escapeHtml(status.detail)}</p></div>
    </section>
  </div>`;

export const updateDocumentPrintStatus = (root: ParentNode, status: DocumentPrintStatus): void => {
  const panel = root.querySelector<HTMLElement>(".document-print-status");
  const title = root.querySelector<HTMLElement>("[data-print-status-title]");
  const detail = root.querySelector<HTMLElement>("[data-print-status-detail]");
  const printButton = root.querySelector<HTMLButtonElement>("[data-document-print]");
  if (panel) panel.dataset.kind = status.kind;
  if (title) title.textContent = status.title;
  if (detail) detail.textContent = status.detail;
  if (printButton) printButton.disabled = status.kind !== "success";
};

export const bindDocumentPrintButton = (root: ParentNode, beforePrint?: () => boolean | void): void => {
  root.querySelector<HTMLButtonElement>("[data-document-print]")?.addEventListener("click", () => {
    if (beforePrint?.() === false) return;
    window.print();
  });
};
