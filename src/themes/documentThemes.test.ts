import { describe, expect, it } from "vitest";
import { buildDocumentThemeTokens, DOCUMENT_TEXT_CONTRAST, documentThemes, getContrastRatio } from "./documentThemes";
import type { DocumentThemeTokens } from "../types/theme";

// Every text/background pair the CV, Portfolio and Cover Letter print.
const textPairs = (tokens: DocumentThemeTokens): Array<[string, string, string]> => [
  ["on-primary on primary", tokens.onPrimary, tokens.primary],
  ["primary on surface", tokens.primary, tokens.surface],
  ["on-accent on accent", tokens.onAccent, tokens.accent],
  ["text on surface", tokens.text, tokens.surface],
  ["muted text on surface", tokens.textMuted, tokens.surface],
  ["muted text on muted surface", tokens.textMuted, tokens.surfaceMuted],
  ["primary-strong on muted surface", tokens.primaryStrong, tokens.surfaceMuted],
  ["primary on muted surface", tokens.primary, tokens.surfaceMuted],
];

describe("Document theme contrast", () => {
  it.each(documentThemes.map((theme) => [theme.id, theme.tokens] as const))("keeps every text pair of %s at WCAG AA", (_id, tokens) => {
    textPairs(tokens).forEach(([pair, foreground, background]) => {
      expect(getContrastRatio(foreground, background), pair).toBeGreaterThanOrEqual(DOCUMENT_TEXT_CONTRAST);
    });
  });

  it("darkens a custom primary that would be unreadable", () => {
    const tokens = buildDocumentThemeTokens("#ffd400", "#14a8d6");
    expect(tokens.primary).not.toBe("#ffd400");
    expect(getContrastRatio(tokens.primary, "#ffffff")).toBeGreaterThanOrEqual(DOCUMENT_TEXT_CONTRAST);
    expect(getContrastRatio(tokens.onPrimary, tokens.primary)).toBeGreaterThanOrEqual(DOCUMENT_TEXT_CONTRAST);
  });

  it("leaves an already readable primary unchanged", () => {
    expect(buildDocumentThemeTokens("#173b57", "#d69e2e").primary).toBe("#173b57");
  });
});
