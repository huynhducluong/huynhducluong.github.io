import { describe, expect, it } from "vitest";
import { renderAdminPreviewOptions } from "./ui";

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
