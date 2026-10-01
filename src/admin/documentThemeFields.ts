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
  compact?: boolean;
  disabled?: boolean;
  customLabel?: string;
}

export const renderDocumentThemeFields = ({
  theme,
  names,
  helpText,
  compact = false,
  disabled = false,
  customLabel = "Custom",
}: DocumentThemeFieldsOptions): string => {
  const resolved = resolveDocumentTheme(theme);
  const disabledAttribute = disabled ? " disabled" : "";
  const className = `admin-document-theme${compact ? " admin-document-theme--compact" : ""}`;
  const options = documentThemes
    .map((item) => `<option value="${escapeHtml(item.id)}"${theme.presetId === item.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");

  return `
    <div class="${className}">
      <label>Theme preset<select name="${escapeHtml(names.preset)}"${disabledAttribute}>
        ${options}
        <option value="custom"${theme.presetId === "custom" ? " selected" : ""}>${escapeHtml(customLabel)}</option>
      </select></label>
      <label>Primary color<input name="${escapeHtml(names.primary)}" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"${disabledAttribute}></label>
      <label>Accent color<input name="${escapeHtml(names.accent)}" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"${disabledAttribute}></label>
    </div>
    <p class="admin-form-help">${escapeHtml(helpText)}</p>`;
};
