import { describe, expect, it } from "vitest";
import { adminDocumentMetaText, renderAdminDocumentHeader, renderAdminFieldLabel, renderAdminPreviewOptions } from "./ui";

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
