import { escapeHtml } from "../shared/format";
import { documentThemes, resolveDocumentTheme } from "../themes/documentThemes";
import type { StoredDocumentTheme } from "../types/theme";
import { renderAdminSelectControl } from "./ui";

interface DocumentThemeFieldNames {
  preset: string;
  primary: string;
  accent: string;
}

interface DocumentThemeFieldsOptions {
  theme: StoredDocumentTheme;
  names: DocumentThemeFieldNames;
  disabled?: boolean;
}

export const renderDocumentThemeFields = ({
  theme,
  names,
  disabled = false,
}: DocumentThemeFieldsOptions): string => {
  const resolved = resolveDocumentTheme(theme);
  const disabledAttribute = disabled ? " disabled" : "";
  const options = documentThemes
    .map((item) => `<option value="${escapeHtml(item.id)}"${theme.presetId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");

  return `
    <div class="admin-document-theme-field">
    <div class="admin-document-theme">
      <label>Theme preset${renderAdminSelectControl({
        name: names.preset,
        attributes: disabled ? "disabled" : "",
        options: `${options}<option value="custom"${theme.presetId === "custom" ? " selected" : ""}>Custom</option>`,
      })}</label>
      <label>Primary color<input name="${escapeHtml(names.primary)}" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"${disabledAttribute}></label>
      <label>Accent color<input name="${escapeHtml(names.accent)}" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"${disabledAttribute}></label>
    </div>
    <div class="admin-document-theme__logo" data-theme-logo>
      <button class="button button--secondary" type="button" data-theme-logo-trigger${disabledAttribute}>Pick colors from logo</button>
      <input type="file" accept="image/*" hidden tabindex="-1" aria-hidden="true" data-theme-logo-input${disabledAttribute}>
      <span class="admin-document-theme__pairs" data-theme-logo-pairs></span>
      <p class="admin-field-hint" data-theme-logo-hint aria-live="polite"></p>
    </div>
    </div>`;
};

// One delegated pair of listeners for every theme block (CV, Portfolio, Cover Letter, Homepage). The file input's own
// events stop here so they never mark the form dirty; only choosing a pair does. The color code loads on first use.
if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const trigger = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-theme-logo-trigger]");
    if (trigger && !trigger.disabled) trigger.parentElement?.querySelector<HTMLInputElement>("[data-theme-logo-input]")?.click();
  });
  for (const type of ["input", "change"]) {
    document.addEventListener(type, (event) => {
      const input = event.target instanceof HTMLInputElement && event.target.matches("[data-theme-logo-input]") ? event.target : null;
      if (!input) return;
      event.stopPropagation();
      if (type === "change" && !input.disabled) void import("./themeFromLogo").then((module) => module.handleLogoFile(input));
    }, true);
  }
}
