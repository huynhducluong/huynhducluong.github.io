import { describe, expect, it } from "vitest";
import siteWorkspaceSource from "./siteWorkspace.ts?raw";
import adminSiteSource from "../styles/admin-site.css?raw";
import {
  profileEntryFieldsId,
  renderProfileEntryFieldsAttributes,
  renderProfileEntrySummary,
  renderProfileEntryToggle,
} from "./profileEntryCard";

describe("collapsible Profile entry card", () => {
  it("renders a collapsed toggle that controls the fields", () => {
    const html = renderProfileEntryToggle("abc-1", "Acme", false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(`aria-controls="${profileEntryFieldsId("abc-1")}"`);
    expect(html).toContain('aria-label="Expand Acme"');
    expect(html).toContain('title="Expand Acme"');
    expect(renderProfileEntryToggle("abc-1", "Acme", true)).toContain('aria-label="Collapse Acme"');
  });

  it("hides the form while collapsed and shows it when expanded", () => {
    expect(renderProfileEntryFieldsAttributes("abc-1", false)).toMatch(/ hidden$/);
    expect(renderProfileEntryFieldsAttributes("abc-1", true)).not.toContain("hidden");
    expect(renderProfileEntryFieldsAttributes("abc-1", true)).toContain(`id="${profileEntryFieldsId("abc-1")}"`);
  });

  it("shows the summary only when collapsed, with a full tooltip", () => {
    const collapsed = renderProfileEntrySummary("Engineer · Vietnam", false);
    expect(collapsed).not.toContain("hidden");
    expect(collapsed).toContain('title="Engineer · Vietnam"');
    expect(collapsed).toContain("data-stress-text");
    expect(renderProfileEntrySummary("Engineer · Vietnam", true)).toContain("hidden");
  });

  it("places the toggle after the move buttons and before the More menu on both cards", () => {
    for (const kind of ["company", "education"]) {
      const down = siteWorkspaceSource.indexOf(`aria-label="Move \${escapeHtml(item.${kind === "company" ? "company" : "institution.en"} || "new ${kind === "company" ? "company" : "education"}")} down"`);
      const toggle = siteWorkspaceSource.indexOf(`renderProfileEntryToggle(item.id, item.${kind === "company" ? "company" : "institution.en"}`);
      const more = siteWorkspaceSource.indexOf(`renderAdminMoreMenu({ label: \`More actions for \${item.${kind === "company" ? "company" : "institution.en"}`);
      expect(down).toBeGreaterThan(-1);
      expect(toggle).toBeGreaterThan(down);
      expect(more).toBeGreaterThan(toggle);
    }
  });

  it("keeps open cards in workspace state and opens them for related-entry links", () => {
    expect(siteWorkspaceSource).toContain("expandedProfileEntries: new Set<string>()");
    expect(siteWorkspaceSource).toMatch(/state\.expandedProfileEntries\.add\(id\);\s+setProfileEntryExpanded\(card, true\)/);
  });

  it("rotates the chevron briefly and respects reduced motion", () => {
    expect(adminSiteSource).toMatch(/\.admin-profile-entry-card__toggle > svg \{ transition: transform 120ms/);
    expect(adminSiteSource).toMatch(/prefers-reduced-motion: reduce\) \{\s+\.admin-profile-entry-card__toggle > svg \{ transition: none; \}/);
    expect(adminSiteSource).toMatch(/\.is-collapsed \.admin-profile-entry-card__heading \{\s+padding-bottom: 0;\s+border-bottom: 0;/);
  });
});
