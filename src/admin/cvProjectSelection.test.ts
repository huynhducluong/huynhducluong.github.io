import { describe, expect, it } from "vitest";
import { projects } from "../data/projects";
import type { CvRuntimeProject } from "../types/cvContent";
import { cvProjectStateText, renderCvProjectRow } from "./cvProjectSelection";

const project = (overrides: Partial<CvRuntimeProject> = {}): CvRuntimeProject => ({
  ...projects[0],
  status: "published",
  cvOrder: 1,
  cvDisplay: "detailed",
  cvShowSummary: true,
  cvResponsibilityIds: projects[0].responsibilities.map((item) => item.id),
  ...overrides,
});

describe("CV project rows (§6.7)", () => {
  it("chooses the display with one Off | Compact | Detailed segmented control that the heading counts", () => {
    const item = project();
    const html = renderCvProjectRow(item, item);

    expect(html).not.toContain("<select");
    expect(html).toMatch(/<div class="admin-segmented" role="radiogroup"[^>]*data-selection-count-item data-selection-off="excluded"/);
    expect(html).toContain('class="admin-segmented__label sr-only"');
    expect(html.match(/name="cv_project_display_/g)).toHaveLength(3);
    expect(html).toMatch(/value="detailed" checked/);
  });

  it("hides the Ready chip and shows a chip only for projects that cannot be chosen", () => {
    const item = project();
    expect(renderCvProjectRow(item, item)).not.toContain("status--");

    const draft = renderCvProjectRow(project({ status: "draft" }), undefined);
    expect(draft).toContain("status--draft");
    expect(draft).toContain("is-unavailable");
    expect(draft).not.toContain("data-selection-count-item");
    expect(draft).toMatch(/value="excluded" checked data-cv-project-display disabled/);
  });

  it("keeps Detailed options behind a disclosure that only Detailed rows offer", () => {
    const item = project();
    const detailed = renderCvProjectRow(item, item);
    expect(detailed).toMatch(/aria-expanded="false" aria-controls="cv-project-options-[^"]+"[^>]*data-cv-project-toggle>/);
    expect(detailed).toMatch(/data-cv-project-options hidden>/);
    expect(detailed).toContain("Summary · 4 of 4 responsibilities");

    const compact = renderCvProjectRow(item, { ...item, cvDisplay: "compact" });
    expect(compact).toMatch(/data-cv-project-toggle hidden>/);
    expect(compact).toContain("Name and year only");
  });

  it("opens a Detailed row with no responsibility and marks the count as a warning", () => {
    const item = project({ cvResponsibilityIds: [] });
    const html = renderCvProjectRow(item, item);

    expect(html).toMatch(/aria-expanded="true"/);
    expect(html).toMatch(/data-cv-project-options>/);
    expect(html).toContain('class="admin-cv-project__count is-warning" data-cv-responsibility-count aria-live="polite">0 of 4<');
    expect(html).toContain('class="is-warning" data-cv-project-state>Choose at least one responsibility<');
  });

  it("keeps the saved field names so the CV payload is unchanged", () => {
    const item = project();
    const html = renderCvProjectRow(item, item);

    expect(html).toContain(`name="cv_project_summary_${item.id}"`);
    expect(html.match(new RegExp(`name="cv_project_responsibility_${item.id}"`, "g"))).toHaveLength(item.responsibilities.length);
  });

  it("describes what the CV prints in the state line", () => {
    expect(cvProjectStateText("excluded", true, 3, 3).text).toBe("Not in this CV");
    expect(cvProjectStateText("detailed", false, 1, 1).text).toBe("No summary · 1 of 1 responsibility");
    expect(cvProjectStateText("detailed", true, 0, 0)).toEqual({ text: "No responsibilities saved in Projects", warning: true });
  });
});
