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
    <div class="admin-document-theme">
      <label>Theme preset${renderAdminSelectControl({
        name: names.preset,
        attributes: disabled ? "disabled" : "",
        options: `${options}<option value="custom"${theme.presetId === "custom" ? " selected" : ""}>Custom</option>`,
      })}</label>
      <label>Primary color<input name="${escapeHtml(names.primary)}" type="color" value="${escapeHtml(theme.primary ?? resolved.tokens.primary)}"${disabledAttribute}></label>
      <label>Accent color<input name="${escapeHtml(names.accent)}" type="color" value="${escapeHtml(theme.accent ?? resolved.tokens.accent)}"${disabledAttribute}></label>
    </div>`;
};
