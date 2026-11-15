import type { Language } from "../shared/format";

/**
 * Text blocks on the Portfolio that come from the Portfolio's own Content form (ADR-030, admin-ui-guidelines §7.2).
 * Anything sourced from a Project, Tool, Profile or Credential is deliberately absent: it has its own entry point.
 */
export const PORTFOLIO_EDIT_FIELDS = {
  portfolio_kicker: { label: "cover kicker", localized: true },
  portfolio_title: { label: "document title", localized: false },
  portfolio_cover_statement: { label: "cover tagline", localized: true },
  portfolio_highlight_kicker: { label: "highlight label", localized: true },
  portfolio_highlight_lines: { label: "highlight lines", localized: true },
  about_kicker: { label: "about kicker", localized: true },
  about_heading: { label: "about heading", localized: true },
  portfolio_profile_title: { label: "professional title", localized: true },
  portfolio_summary: { label: "profile summary", localized: true },
  automation_statement: { label: "automation statement", localized: true },
  closing_kicker: { label: "closing kicker", localized: true },
  closing_heading: { label: "closing heading", localized: true },
  closing_text: { label: "closing text", localized: true },
  portfolio_footer_text: { label: "footer text", localized: true },
} as const;

export type PortfolioEditField = keyof typeof PORTFOLIO_EDIT_FIELDS;

export const isPortfolioEditField = (value: unknown): value is PortfolioEditField =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PORTFOLIO_EDIT_FIELDS, value);

/** The form control name for a marker and the language being previewed; unknown fields give null. */
export const portfolioEditFieldName = (field: unknown, language: Language): string | null => {
  if (!isPortfolioEditField(field)) return null;
  return PORTFOLIO_EDIT_FIELDS[field].localized ? `${field}_${language === "vi" ? "vi" : "en"}` : field;
};

export const portfolioEditFieldLabel = (field: PortfolioEditField): string => PORTFOLIO_EDIT_FIELDS[field].label;

/** Admin → preview. `scale` is the preview zoom so the pencil stays about 22 px on screen. */
export interface PortfolioEditModeMessage { type: "hdl:portfolio-edit-mode"; enabled: boolean; scale: number }
/** Preview → Admin. */
export interface PortfolioEditTargetMessage { type: "hdl:portfolio-edit-target"; field: PortfolioEditField }
