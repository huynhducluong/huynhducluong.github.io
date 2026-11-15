import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { isPortfolioEditField, portfolioEditFieldName } from "./editMarkers";
import { renderPortfolio } from "./renderPortfolioV2";

const build = (layouts: Record<string, string>, tools = 2): PortfolioRuntimeData => {
  const content = structuredClone(portfolioContentSeed);
  Object.assign(content.layouts as unknown as Record<string, string>, layouts);
  content.coverHighlight = { kicker: { en: "Focus", vi: "Trọng tâm" }, lines: [{ en: "Line one", vi: "Dòng một" }, { en: "Line two", vi: "Dòng hai" }] };
  return {
    content,
    projects: structuredClone(portfolioProjectSeed.slice(0, 1)).map((project) => ({ ...project, includeInPortfolio: true })),
    tools: structuredClone(portfolioToolSeed.slice(0, tools)).map((tool) => ({ ...tool, includeInPortfolio: true })),
    credentials: [],
  };
};

const variants: Array<[string, Record<string, string>, number?]> = [
  ["cover classic", { cover: "cover.classic" }],
  ["cover split", { cover: "cover.split-image" }],
  ["cover horizontal", { cover: "cover.horizontal" }],
  ["profile classic", { profile: "profile.classic" }],
  ["profile portrait", { profile: "profile.portrait" }],
  ["profile capability", { profile: "profile.capability" }],
  ["automation classic", { automationDefault: "automation.classic" }],
  ["automation workflow", { automationDefault: "automation.workflow" }],
  ["automation geometry", { automationDefault: "automation.input-geometry" }],
  ["closing classic", { closing: "closing.classic" }],
  ["closing blue", { closing: "closing.blue" }],
  ["closing white", { closing: "closing.white" }],
];

describe("Portfolio edit markers: off", () => {
  it.each(variants)("markup is unchanged and has no markers (%s)", (_name, layouts) => {
    for (const language of ["en", "vi"] as const) {
      const html = renderPortfolio(build(layouts), language);
      expect(html).not.toContain("data-edit-field");
      expect(html).toMatchSnapshot();
      expect(renderPortfolio(build(layouts), language, { editMarkers: false })).toBe(html);
    }
  });
});

const fieldsIn = (html: string): string[] => [...html.matchAll(/data-edit-field="([a-z_]+)"/g)].map((match) => match[1]);
const unique = (list: string[]): string[] => [...new Set(list)];
const count = (html: string, field: string): number => fieldsIn(html).filter((item) => item === field).length;

describe("Portfolio edit markers: on", () => {
  it("never changes the content, only adds attributes (stripping them restores the original markup)", () => {
    for (const [, layouts] of variants) {
      for (const language of ["en", "vi"] as const) {
        const off = renderPortfolio(build(layouts), language);
        const on = renderPortfolio(build(layouts), language, { editMarkers: true });
        expect(on.replace(/ data-edit-field="[a-z_]+"/g, "")).toBe(off);
      }
    }
  });

  it("tags the cover blocks for every cover layout", () => {
    expect(unique(fieldsIn(renderPortfolio(build({ cover: "cover.classic" }), "en", { editMarkers: true })))).toEqual(
      expect.arrayContaining(["portfolio_kicker", "portfolio_title", "portfolio_profile_title"]));
    for (const cover of ["cover.split-image", "cover.horizontal"]) {
      expect(unique(fieldsIn(renderPortfolio(build({ cover }), "en", { editMarkers: true })))).toEqual(
        expect.arrayContaining(["portfolio_kicker", "portfolio_title", "portfolio_cover_statement"]));
    }
    expect(unique(fieldsIn(renderPortfolio(build({ cover: "cover.horizontal" }), "en", { editMarkers: true })))).toEqual(
      expect.arrayContaining(["portfolio_highlight_kicker", "portfolio_highlight_lines"]));
  });

  it("tags the about blocks for every profile layout", () => {
    for (const profile of ["profile.classic", "profile.portrait", "profile.capability"]) {
      const html = renderPortfolio(build({ profile }), "en", { editMarkers: true });
      for (const field of ["about_kicker", "about_heading", "portfolio_summary"]) expect(count(html, field), `${profile} ${field}`).toBe(1);
      // Cover identity + about page: the professional title appears on both.
      expect(count(html, "portfolio_profile_title"), profile).toBe(2);
    }
  });

  it("tags the closing blocks for every closing layout", () => {
    for (const closing of ["closing.classic", "closing.blue", "closing.white"]) {
      const html = renderPortfolio(build({ closing }), "en", { editMarkers: true });
      expect(count(html, "closing_kicker"), closing).toBe(1);
      expect(count(html, "closing_heading"), closing).toBe(1);
      expect(count(html, "closing_text"), closing).toBe(closing === "closing.white" ? 0 : 1);
    }
  });

  it("marks the repeated footer and Automation statement only the first time", () => {
    const workflow = renderPortfolio(build({ automationDefault: "automation.workflow" }, 2), "en", { editMarkers: true });
    expect(workflow.split('class="portfolio-page-footer"').length - 1).toBeGreaterThan(2);
    expect(count(workflow, "portfolio_footer_text")).toBe(1);
    expect(count(workflow, "automation_statement")).toBe(1);
    const classic = renderPortfolio(build({ automationDefault: "automation.classic" }), "en", { editMarkers: true });
    expect(count(classic, "automation_statement")).toBe(1);
    // A later render starts fresh: the first-only memory does not leak between calls.
    expect(count(renderPortfolio(build({}), "en", { editMarkers: true }), "portfolio_footer_text")).toBe(1);
  });

  it("only uses fields that exist in the table, and none for project / tool / credential text", () => {
    const html = renderPortfolio(build({ cover: "cover.horizontal", automationDefault: "automation.workflow", closing: "closing.blue" }), "en", { editMarkers: true });
    for (const field of unique(fieldsIn(html))) expect(isPortfolioEditField(field), field).toBe(true);
    expect(html).not.toMatch(/data-edit-field="(project|tool|credential)/);
  });
});

describe("portfolioEditFieldName", () => {
  it("maps a field and the previewed language to the form control", () => {
    expect(portfolioEditFieldName("portfolio_cover_statement", "en")).toBe("portfolio_cover_statement_en");
    expect(portfolioEditFieldName("portfolio_cover_statement", "vi")).toBe("portfolio_cover_statement_vi");
    expect(portfolioEditFieldName("closing_text", "vi")).toBe("closing_text_vi");
  });
  it("uses the bare name for the one field without a language", () => {
    expect(portfolioEditFieldName("portfolio_title", "vi")).toBe("portfolio_title");
    expect(portfolioEditFieldName("portfolio_title", "en")).toBe("portfolio_title");
  });
  it("ignores unknown or malformed fields", () => {
    for (const bad of ["email", "project_name", "", "constructor", "__proto__", 5, null, undefined, {}]) expect(portfolioEditFieldName(bad, "en")).toBeNull();
  });
});
