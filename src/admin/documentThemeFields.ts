import { escapeHtml } from "../shared/format";
import { documentThemes, resolveDocumentTheme } from "../themes/documentThemes";
import type { StoredDocumentTheme } from "../types/theme";

interface DocumentThemeFieldNames {
  preset: string;
  primary: string;
  accent: string;
}

interface DocumentThemeFieldsOptions {
  theme: StoredDocumentTheme;
  names: DocumentThemeFieldNames;
  helpText: string;
  disabled?: boolean;
}

export const renderDocumentThemeFields = ({
  theme,
  names,
  helpText,
  disabled = false,
}: DocumentThemeFieldsOptions): string => {
  const resolved = resolveDocumentTheme(theme);
  const disabledAttribute = disabled ? " disabled" : "";
  const options = documentThemes
    .map((item) => `<option value="${escapeHtml(item.id)}"${theme.presetId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");

  return `
    <div class="admin-document-theme">
      <label>Theme preset<span class="admin-select-control"><select name="${escapeHtml(names.preset)}"${disabledAttribute}>
        ${options}
        <option value="custom"${theme.presetId === "custom" ? " selected" : ""}>Custom</option>
      </select><span class="admin-select-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg></span></span></label>
      <label>Primary color<input name="${escapeHtml(names.primary)}" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"${disabledAttribute}></label>
      <label>Accent color<input name="${escapeHtml(names.accent)}" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"${disabledAttribute}></label>
    </div>
    <p class="admin-form-help">${escapeHtml(helpText)}</p>`;
};
