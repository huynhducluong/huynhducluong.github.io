import css from "../styles/portfolio-screen.css?raw";
import printCss from "../styles/portfolio-print.css?raw";
import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { automationLayoutOptions, projectLayoutOptions } from "./layouts";
import { renderPortfolio } from "./renderPortfolioV2";

const build = (layouts: Record<string, string>, patch?: (data: PortfolioRuntimeData) => void): PortfolioRuntimeData => {
  const content = structuredClone(portfolioContentSeed);
  Object.assign(content.layouts as unknown as Record<string, string>, layouts);
  const data: PortfolioRuntimeData = {
    content,
    projects: structuredClone(portfolioProjectSeed.slice(0, 2)).map((project) => ({ ...project, includeInPortfolio: true })),
    tools: structuredClone(portfolioToolSeed.slice(0, 2)).map((tool) => ({ ...tool, includeInPortfolio: true })),
    credentials: [],
  };
  patch?.(data);
  return data;
};

const pagesOf = (html: string, prefix: string): string[] => html.split("<section ").slice(1).map((page) => `<section ${page}`).filter((page) => page.includes(`data-portfolio-layout="${prefix}`));

// Pages whose markup must not change in GD3-10: every project layout, every Automation layout, and the list indexes.
describe("GD3-10: markup outside the grid index is unchanged", () => {
  it.each(projectLayoutOptions.map((option) => option.id))("project page %s", (id) => {
    for (const language of ["en", "vi"] as const) expect(pagesOf(renderPortfolio(build({ projectDefault: id }), language), "project.")).toMatchSnapshot();
  });
  it.each(automationLayoutOptions.map((option) => option.id))("automation page %s", (id) => {
    for (const language of ["en", "vi"] as const) expect(pagesOf(renderPortfolio(build({ automationDefault: id }), language), "automation.")).toMatchSnapshot();
  });
  it.each(["index.classic", "index.editorial"])("list index %s", (id) => {
    for (const language of ["en", "vi"] as const) expect(pagesOf(renderPortfolio(build({ index: id }), language), "index.")).toMatchSnapshot();
  });
});

const gridIndex = (patch?: (project: PortfolioRuntimeData["projects"][number]) => void, language: "en" | "vi" = "en"): string => {
  const html = renderPortfolio(build({ index: "index.visual" }, (data) => { if (patch) data.projects.forEach(patch); }), language);
  return pagesOf(html, "index.")[0];
};
const spans = (html: string, name: string): string[] => [...html.matchAll(new RegExp(`<span class="portfolio-index__${name}">([^<]*)</span>`, "g"))].map((match) => match[1]);

describe("GD3-10: grid index meta", () => {
  it("prints location and role as two blocks", () => {
    const html = gridIndex((project) => { project.location = { en: "Hanoi", vi: "Hà Nội" }; project.role = { en: "BIM Lead", vi: "Trưởng nhóm BIM" }; });
    expect(spans(html, "location")).toEqual(["Hanoi", "Hanoi"]);
    expect(spans(html, "role")).toEqual(["BIM Lead", "BIM Lead"]);
    expect(html.match(/<article>[\s\S]*?<\/article>/g)?.some((card) => card.includes(" · "))).toBe(false);
    const vi = gridIndex((project) => { project.location = { en: "Hanoi", vi: "Hà Nội" }; project.role = { en: "BIM Lead", vi: "Trưởng nhóm BIM" }; }, "vi");
    expect(spans(vi, "role")[0]).toBe("Trưởng nhóm BIM");
  });
  it("prints only the location when there is no role", () => {
    const html = gridIndex((project) => { project.location = { en: "Hanoi", vi: "Hà Nội" }; project.role = undefined; });
    expect(spans(html, "location").length).toBe(2);
    expect(html).not.toContain("portfolio-index__role");
  });
  it("prints only the role when there is no location", () => {
    const html = gridIndex((project) => { project.location = { en: "", vi: "" }; project.role = { en: "BIM Lead", vi: "BIM Lead" }; });
    expect(spans(html, "role").length).toBe(2);
    expect(html).not.toContain("portfolio-index__location");
  });
  it("escapes & and < exactly once", () => {
    const html = gridIndex((project) => { project.location = { en: "A & B", vi: "A & B" }; project.role = { en: "<Lead>", vi: "<Lead>" }; });
    expect(spans(html, "location")[0]).toBe("A &amp; B");
    expect(spans(html, "role")[0]).toBe("&lt;Lead&gt;");
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain("<Lead>");
  });
});

describe("GD3-10: presentation CSS", () => {
  const added = css.slice(css.indexOf("*/", css.indexOf("Presentation details (ADR-031, GD3-10")) + 2);
  const addedCode = added.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...added.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((match) => ({ selector: match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(), body: match[2] }));
  it("every new rule is scoped under .portfolio-page", () => {
    expect(rules.length).toBeGreaterThanOrEqual(8);
    for (const rule of rules) for (const selector of rule.selector.split(",")) expect(selector.trim(), selector).toMatch(/^\.portfolio-page\b/);
  });
  it("frames Automation images in a white hairline border with 4 mm padding", () => {
    expect(added).toMatch(/\.portfolio-page \.portfolio-automation figure\s*\{[^}]*padding: 4mm[^}]*border: \.25mm solid var\(--document-border\)[^}]*background: var\(--document-surface\)/);
  });
  it("centres contribution numbers using --document-leading-relaxed", () => {
    expect(added).toMatch(/\.portfolio-contributions article > span\s*\{[^}]*--document-leading-relaxed[^}]*line-height: 1/);
    expect(added).toMatch(/\.portfolio-contributions article\s*\{[^}]*align-items: start/);
  });
  it("aligns the Video pill to the role baseline only beside a role", () => {
    expect(added).toMatch(/\.portfolio-project-heading > strong \+ \.portfolio-video-link\s*\{[^}]*vertical-align: baseline/);
    expect(added).not.toMatch(/vertical-align: middle/);
  });
  it("keeps Balanced tags right under the contribution list", () => {
    expect(added).toMatch(/\.portfolio-project--balanced \.portfolio-tags\s*\{[^}]*margin-top: 7mm !important[^}]*padding-top: 0 !important/);
  });
  it("styles the role bold in the text colour and the location muted", () => {
    expect(added).toMatch(/__role\s*\{[^}]*color: var\(--document-text\)[^}]*font-weight: var\(--document-weight-bold\)/);
    expect(added).toMatch(/__location\s*\{[^}]*color: var\(--document-text-muted\)/);
  });
  it("adds no !important beyond the Balanced tags pair, and print CSS does not override the new classes", () => {
    expect([...addedCode.matchAll(/!important/g)].length).toBe(2);
    expect(printCss).not.toMatch(/portfolio-index__(location|role)|portfolio-automation figure|portfolio-contributions article|portfolio-project--balanced \.portfolio-tags|strong \+ \.portfolio-video-link/);
  });
});
