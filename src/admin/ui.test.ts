import { describe, expect, it } from "vitest";
import { adminDocumentMetaText, adminSelectionCountText, renderAdminDocumentHeader, renderAdminFieldLabel, renderAdminPreviewOptions, renderAdminSelectionHeading } from "./ui";

describe("Admin field labels", () => {
  it("renders a styled visual marker with accessible required text", () => {
    const markup = renderAdminFieldLabel("Institution (EN)", true);

    expect(markup).toContain("Institution (EN)");
    expect(markup).toContain('class="admin-required-mark"');
    expect(markup).toContain('aria-hidden="true">*</span>');
    expect(markup).toContain('<span class="sr-only"> (required)</span>');
  });

  it("keeps optional labels visually clean", () => {
    expect(renderAdminFieldLabel("Institution (VI)")).toBe('<span class="admin-field-label">Institution (VI)</span>');
  });
});

describe("Admin preview select", () => {
  it("renders grouped options and preserves the active item", () => {
    const markup = renderAdminPreviewOptions([
      { label: "Homepage", value: "homepage" },
      { label: "Project · Example", value: "project:example", group: "Projects on website" },
    ], "project:example");

    expect(markup).toContain('<option value="homepage">Homepage</option>');
    expect(markup).toContain('<optgroup label="Projects on website">');
    expect(markup).toContain('<option value="project:example" selected>Project · Example</option>');
    expect(markup).toContain("</optgroup>");
  });
});

describe("Admin document header meta", () => {
  it("joins meta spans into a plain tooltip that keeps escaped text", () => {
    const meta = '<span class="status status--published">published</span><span class="admin-document-meta__active">Active public version</span><span class="admin-document-meta__detail">Version 2026-09 &amp; final</span>';

    expect(adminDocumentMetaText(meta)).toBe("published · Active public version · Version 2026-09 &amp; final");
  });

  it("renders the meta tooltip on the shared document header", () => {
    const markup = renderAdminDocumentHeader({
      eyebrow: "CV document",
      title: "General CV",
      meta: '<span class="status status--draft">draft</span><span class="admin-document-meta__detail">Not published yet</span>',
    });

    expect(markup).toContain('<p class="admin-document-meta" title="draft · Not published yet">');
  });
});

describe("Selection counts (§6.6)", () => {
  it("says shown for visibility toggles and selected for library picks", () => {
    expect(adminSelectionCountText("shown", 4, 4)).toBe("4 of 4 shown");
    expect(adminSelectionCountText("selected", 3, 7)).toBe("3 of 7 selected");
    expect(adminSelectionCountText("shown", 5, 6, "2 on Homepage")).toBe("5 of 6 shown · 2 on Homepage");
  });

  it("names the empty states instead of printing a bare zero", () => {
    expect(adminSelectionCountText("shown", 0, 4)).toBe("Hidden");
    expect(adminSelectionCountText("selected", 0, 4)).toBe("None selected");
    expect(adminSelectionCountText("selected", 0, 0)).toBe("None available");
  });

  it("renders the heading with a live, non-wrapping count chip", () => {
    const markup = renderAdminSelectionHeading({ title: "Projects", required: true, mode: "selected", selected: 4, total: 7 });

    expect(markup).toContain('<header class="admin-selection-heading"><h4>');
    expect(markup).toContain("admin-required-mark");
    expect(markup).toContain('<span class="admin-selection-count" data-selection-count data-empty="false" aria-live="polite">4 of 7 selected</span>');
  });
});
