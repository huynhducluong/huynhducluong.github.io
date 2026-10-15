import { describe, expect, it } from "vitest";
import type { WebsiteRuntimeData } from "../types/website";
import { normalizeWebsitePreviewPage, websitePreviewPageOptions } from "./websitePreviewPages";

const runtime = {
  projects: [
    { id: "visible-project", slug: "visible-project", name: { en: "Visible project" }, status: "published", websiteVisible: true },
    { id: "hidden-project", slug: "hidden-project", name: { en: "Hidden project" }, status: "published", websiteVisible: false },
    { id: "draft-project", slug: "draft-project", name: { en: "Draft project" }, status: "draft", websiteVisible: true },
  ],
  tools: [
    { id: "visible-tool", slug: "visible-tool", name: "Visible tool", status: "published", websiteVisible: true },
    { id: "hidden-tool", slug: "hidden-tool", name: "Hidden tool", status: "published", websiteVisible: false },
  ],
} as WebsiteRuntimeData;

describe("Website preview page selection", () => {
  it("lists only published content selected for the website", () => {
    const options = websitePreviewPageOptions(runtime);

    expect(options.map((option) => option.value)).toEqual([
      "homepage",
      "projects",
      "tools",
      "project:visible-project",
      "tool:visible-tool",
    ]);
    expect(options.at(3)?.group).toBe("Projects on website");
    expect(options.at(4)?.group).toBe("Automation tools on website");
  });

  it("keeps available detail pages and falls back from excluded ones", () => {
    expect(normalizeWebsitePreviewPage("project:visible-project", runtime)).toBe("project:visible-project");
    expect(normalizeWebsitePreviewPage("project:hidden-project", runtime)).toBe("projects");
    expect(normalizeWebsitePreviewPage("tool:hidden-tool", runtime)).toBe("tools");
  });
});
