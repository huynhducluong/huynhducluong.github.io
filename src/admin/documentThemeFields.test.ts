import { describe, expect, it } from "vitest";
import { renderDocumentThemeFields } from "./documentThemeFields";
import { themeContrastNote } from "./themeFromLogo";

const names = { preset: "theme_preset", primary: "theme_primary", accent: "theme_accent" };

describe("Pick colors from logo (ADR-040)", () => {
  it("adds a named button, a hidden file input and a polite status line", () => {
    const html = renderDocumentThemeFields({ theme: { presetId: "personal-blue" }, names });
    expect(html).toMatch(/<button class="button button--secondary" type="button" data-theme-logo-trigger>Pick colors from logo<\/button>/);
    expect(html).toMatch(/<input type="file" accept="image\/\*" hidden tabindex="-1" aria-hidden="true" data-theme-logo-input>/);
    expect(html).toMatch(/<p class="admin-field-hint" data-theme-logo-hint aria-live="polite"><\/p>/);
    expect(html).toContain('data-theme-logo-pairs');
  });

  it("disables the button and the file input when the document is locked", () => {
    const html = renderDocumentThemeFields({ theme: { presetId: "personal-blue" }, names, disabled: true });
    expect(html).toMatch(/data-theme-logo-trigger disabled>/);
    expect(html).toMatch(/data-theme-logo-input disabled>/);
  });

  it("escapes field names exactly once", () => {
    const html = renderDocumentThemeFields({ theme: { presetId: "custom", primary: "#112233", accent: "#445566" }, names: { preset: "a&b", primary: "p<q", accent: "c\"d" } });
    expect(html).toContain('name="p&lt;q"');
    expect(html).toContain('name="c&quot;d"');
    expect(html).not.toContain("&amp;amp;");
  });
});

describe("theme contrast note", () => {
  it("reports the ratio the document prints and says when it passes", () => {
    expect(themeContrastNote({ primary: "#145ac8", accent: "#d62828" })).toMatch(/^Text on primary \d+\.\d : 1, passes\.$/);
  });

  it("says when the primary was adjusted to reach 4.5 : 1", () => {
    const note = themeContrastNote({ primary: "#fadc3c", accent: "#145ac8" });
    expect(note).toContain("Adjusted for contrast");
    expect(note).toContain("passes");
  });
});
