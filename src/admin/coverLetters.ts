import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/admin.css";
import "../styles/admin-cover-letter.css";
import { escapeHtml } from "../shared/format";
import { archiveCoverLetter, deleteCoverLetterDraft, duplicateCoverLetter, listCoverLetters } from "../services/coverLetterRepository";
import type { CoverLetterRecord, CoverLetterStatus } from "../types/coverLetter";
import { requireAdminAccess } from "./auth";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");
let records: CoverLetterRecord[] = [];
let filter: CoverLetterStatus | "all" = "all";

const base = import.meta.env.BASE_URL;
const editorUrl = (id?: string): string => base + "admin/cover-letter/" + (id ? "?id=" + encodeURIComponent(id) : "");
const previewUrl = (id: string): string => base + "cover-letter/?id=" + encodeURIComponent(id);
const friendlyError = (error: unknown): string => {
  const text = error instanceof Error ? error.message : "Cover letters could not be loaded.";
  return /cover_letters|schema cache/i.test(text)
    ? "Cover Letter database tables are not available yet. Apply supabase/migrations/202609280001_cover_letters.sql in Supabase, then reload."
    : text;
};

const date = (value: string): string => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));

const row = (record: CoverLetterRecord): string => [
  "<tr><td><strong>" + escapeHtml(record.internalTitle) + "</strong><small>" + escapeHtml(record.positionTitle || "Position not set") + " · " + escapeHtml(record.companyName || "Company not set") + "</small></td>",
  '<td><span class="status status--' + record.status + '">' + record.status + "</span></td>",
  "<td>" + date(record.updatedAt) + "</td>",
  '<td class="cover-letter-list__actions">',
  '<a href="' + editorUrl(record.id) + '">' + (record.status === "draft" ? "Edit" : "View") + "</a>",
  '<a href="' + previewUrl(record.id) + '" target="_blank" rel="noreferrer">Preview</a>',
  '<button type="button" data-duplicate="' + record.id + '">Duplicate</button>',
  record.status === "final" ? '<button type="button" data-archive="' + record.id + '">Archive</button>' : "",
  record.status === "draft" ? '<button class="danger-link" type="button" data-delete="' + record.id + '">Delete</button>' : "",
  "</td></tr>",
].join("");

const render = (): void => {
  const visible = filter === "all" ? records : records.filter((item) => item.status === filter);
  app.innerHTML = [
    '<header class="admin-header"><div><p>HDL Portfolio CMS</p><small>Private Cover Letter workspace</small></div><div><a href="' + base + 'admin/">Projects</a><a href="' + base + '" target="_blank" rel="noreferrer">View website</a></div></header>',
    '<main class="cover-letter-admin"><div class="cover-letter-admin__heading"><div><p class="section-kicker">Applications</p><h1>Cover letters</h1><p>Create a private, company-specific one-page letter and export it as searchable PDF.</p></div><a class="button" href="' + editorUrl() + '">New cover letter</a></div>',
    '<div class="cover-letter-admin__filters" role="group" aria-label="Filter by status">',
    ["all", "draft", "final", "archived"].map((status) => '<button type="button" data-filter="' + status + '" class="' + (filter === status ? "is-active" : "") + '">' + status + "</button>").join(""),
    "</div>",
    '<p class="admin-message" data-list-message role="status"></p>',
    '<div class="cover-letter-list"><table><thead><tr><th>Letter</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>',
    visible.length ? visible.map(row).join("") : '<tr><td colspan="4" class="admin-empty">No cover letters in this view.</td></tr>',
    "</tbody></table></div></main>",
  ].join("");

  app.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    filter = button.dataset.filter as typeof filter;
    render();
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-duplicate]").forEach((button) => button.addEventListener("click", async () => {
    const source = records.find((item) => item.id === button.dataset.duplicate);
    if (!source) return;
    try { window.location.href = editorUrl((await duplicateCoverLetter(source)).id); } catch (error) { showError(error); }
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-archive]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Archive this final cover letter?")) return;
    try { await archiveCoverLetter(String(button.dataset.archive)); await load(); } catch (error) { showError(error); }
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Permanently delete this draft? This cannot be undone.")) return;
    try { await deleteCoverLetterDraft(String(button.dataset.delete)); await load(); } catch (error) { showError(error); }
  }));
};

const showError = (error: unknown): void => {
  const target = app.querySelector<HTMLElement>("[data-list-message]");
  if (target) { target.textContent = friendlyError(error); target.dataset.kind = "error"; }
};

const load = async (): Promise<void> => {
  try { records = await listCoverLetters(); render(); } catch (error) { render(); showError(error); }
};

const initialize = async (): Promise<void> => {
  if (!await requireAdminAccess()) return;
  await load();
};

void initialize();
