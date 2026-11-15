import { describe, expect, it } from "vitest";
import { availableContentStatusFilters } from "./contentStatusFilters";

describe("Content status filters", () => {
  it("omits Archived when the current view has no archived item", () => {
    expect(availableContentStatusFilters([
      { status: "draft" },
      { status: "published" },
    ])).toEqual(["all", "draft", "published"]);
  });

  it("adds Archived when the current view has an archived item", () => {
    expect(availableContentStatusFilters([
      { status: "published" },
      { status: "archived" },
    ])).toEqual(["all", "draft", "published", "archived"]);
  });
});
