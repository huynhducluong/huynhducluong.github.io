import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>(["./*.ts", "!./*.test.ts", "!./ui.ts"], { query: "?raw", import: "default", eager: true });

const dialogCount = (source: string): number =>
  (source.match(/<dialog\b[^>]*class="admin-dialog[ "]/g) ?? []).length + (source.match(/className = "admin-dialog[ "]/g) ?? []).length;
const bindCount = (source: string): number => (source.match(/bindAdminDialogBackdropClose\(/g) ?? []).length;

describe("Admin dialog backdrop contract", () => {
  it("finds the known dialog files (positive check)", () => {
    const withDialogs = Object.entries(sources).filter(([, source]) => dialogCount(source) > 0).map(([path]) => path);
    expect(withDialogs.length).toBeGreaterThanOrEqual(8);
    expect(withDialogs).toContain("./credentialWorkspace.ts");
  });

  it("binds the shared backdrop close once per dialog in every file", () => {
    const missing = Object.entries(sources)
      .filter(([, source]) => dialogCount(source) > bindCount(source))
      .map(([path, source]) => `${path}: ${dialogCount(source)} dialog(s), ${bindCount(source)} bind(s)`);
    expect(missing).toEqual([]);
  });
});
