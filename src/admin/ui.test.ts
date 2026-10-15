import { describe, expect, it } from "vitest";
import { renderAdminFieldLabel, renderAdminPreviewOptions } from "./ui";

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
