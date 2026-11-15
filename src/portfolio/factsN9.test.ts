import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type { PortfolioKeyFact, PortfolioRuntimeData } from "../types/portfolio";
import css from "../styles/portfolio-screen.css?raw";
import printCss from "../styles/portfolio-print.css?raw";
import { projectLayoutOptions } from "./layouts";
import { factValueParts, renderPortfolio } from "./renderPortfolioV2";

type Fact = PortfolioKeyFact;
let factId = 0;
const fact = (value: string, label = "Label", vi = value): Fact => ({ id: `f${factId += 1}`, value: { en: value, vi }, label: { en: label, vi: label } });
const build = (layout: string, keyFacts?: Fact[]): PortfolioRuntimeData => {
  const content = structuredClone(portfolioContentSeed);
  Object.assign(content.layouts as unknown as Record<string, string>, { projectDefault: layout, index: "index.classic" });
  return {
    content,
    projects: structuredClone(portfolioProjectSeed.slice(0, 1)).map((project) => ({ ...project, includeInPortfolio: true, keyFacts })),
    tools: structuredClone(portfolioToolSeed.slice(0, 1)).map((tool) => ({ ...tool, includeInPortfolio: true })),
    credentials: [],
  };
};
const projectPages = (html: string): string[] => html.split("<section ").slice(1).filter((page) => page.includes('data-portfolio-layout="project.'));
const layouts = projectLayoutOptions.map((option) => option.id);

// Markup that must stay byte-identical in GD3-11: a project without key facts, and single-token values.
describe("GD3-11: plain facts are unchanged", () => {
  it.each(layouts)("no keyFacts, %s", (id) => {
    for (const language of ["en", "vi"] as const) expect(projectPages(renderPortfolio(build(id, undefined), language))).toMatchSnapshot();
  });
  it.each(layouts)("single-token and wordless values, %s", (id) => {
    const facts = [fact("2026", "Year"), fact("Hanoi", "City"), fact("", "Empty"), fact("4", "Lanes")];
    for (const language of ["en", "vi"] as const) expect(projectPages(renderPortfolio(build(id, facts.filter((item) => item.value.en)), language))).toMatchSnapshot();
  });
});

const parts = (value: string): string | null => {
  const result = factValueParts(value);
  return result ? result.map((part) => `${part.kind}:${part.text}`).join("|") : null;
};

describe("factValueParts", () => {
  it("splits a number from its unit and keeps the original characters", () => {
    expect(parts("≈17.95 km")).toBe("num:≈17.95|unit:km");
    expect(parts("VND 25.773 trillion")).toBe("unit:VND|num:25.773|unit:trillion");
    expect(parts("4 lanes")).toBe("num:4|unit:lanes");
    expect(parts("25.773 tỷ đồng")).toBe("num:25.773|unit:tỷ|unit:đồng");
    expect(parts("≈17,95 km")).toBe("num:≈17,95|unit:km");
    expect(parts("18 km + 3 km")).toBe("num:18|unit:km|unit:+|num:3|unit:km");
    expect(parts("Phase 1")).toBe("unit:Phase|num:1");
  });
  it("leaves one-token, digit-less and empty values plain", () => {
    expect(parts("2026")).toBeNull();
    expect(parts("")).toBeNull();
    expect(parts("   ")).toBeNull();
    expect(parts("Hanoi")).toBeNull();
    expect(parts("Bridge deck")).toBeNull();
  });
  it("tolerates extra whitespace", () => {
    expect(parts("  4   lanes ")).toBe("num:4|unit:lanes");
  });
});

describe("GD3-11: fact markup", () => {
  const html = (value: string, label = "Label", layout = "project.technical"): string => projectPages(renderPortfolio(build(layout, [fact(value, label)]), "en"))[0];
  it("wraps number and unit in their own elements, in the original order", () => {
    const page = html("VND 25.773 trillion");
    expect(page).toContain('<strong class="portfolio-fact__value"><b class="portfolio-fact__unit">VND</b> <b class="portfolio-fact__num">25.773</b> <b class="portfolio-fact__unit">trillion</b></strong>');
    expect(html("≈17.95 km")).toContain('<b class="portfolio-fact__num">≈17.95</b> <b class="portfolio-fact__unit">km</b>');
  });
  it("marks long values wide and short ones not", () => {
    expect(html("VND 25.773 trillion")).toContain('<div class="is-wide"><strong class="portfolio-fact__value">');
    expect(html("18 km + 3 km")).toContain('<div class="is-wide">');
    expect(html("4 lanes")).toContain('<div><strong class="portfolio-fact__value">');
    expect(html("2026")).not.toContain("portfolio-fact__");
  });
  it("uses a span-free value so fact label rules never touch it", () => {
    const page = html("4 lanes");
    const start = page.indexOf('<strong class="portfolio-fact__value">');
    expect(start).toBeGreaterThan(-1);
    expect(page.slice(start, page.indexOf("</strong>", start))).not.toContain("<span");
  });
  it("escapes & and < exactly once in values and labels", () => {
    const page = html("5 R&D <x>", "A & <B>");
    expect(page).toContain("R&amp;D");
    expect(page).toContain("&lt;x&gt;");
    expect(page).toContain("A &amp; &lt;B&gt;");
    expect(page).not.toContain("&amp;amp;");
    expect(page).not.toContain("<x>");
  });
  it("vi uses the Vietnamese value", () => {
    const page = projectPages(renderPortfolio(build("project.balanced", [fact("17.95 km", "Dài", "17,95 km")]), "vi"))[0];
    expect(page).toContain('<b class="portfolio-fact__num">17,95</b>');
  });
});

describe("GD3-11: fact CSS", () => {
  const added = css.slice(css.indexOf("*/", css.indexOf("Key facts (ADR-031, GD3-11")) + 2);
  const code = added.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...code.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((match) => ({ selector: match[1].trim(), body: match[2] }));
  it("every new rule is scoped under .portfolio-page", () => {
    expect(rules.length).toBeGreaterThanOrEqual(4);
    for (const rule of rules) for (const selector of rule.selector.split(",")) expect(selector.trim(), selector).toMatch(/^\.portfolio-page(\s|$)/);
  });
  it("keeps a fact value on one line, baseline aligned", () => {
    expect(code).toMatch(/\.portfolio-fact__value\s*\{[^}]*display: flex[^}]*align-items: baseline[^}]*white-space: nowrap/);
  });
  it("prints the unit small and bold, the number at the fact's own size", () => {
    expect(code).toMatch(/\.portfolio-fact__unit\s*\{[^}]*font-size: var\(--document-type-xl\)[^}]*font-weight: var\(--document-weight-bold\)/);
    expect(code).toMatch(/\.portfolio-fact__num\s*\{[^}]*font-size: inherit/);
  });
  it("lets a wide fact take the whole row", () => {
    expect(code).toMatch(/> div\.is-wide\s*\{[^}]*grid-column: 1 \/ -1/);
  });
  it("uses inherited colours (no opacity) and no !important or raw values", () => {
    expect(code).toMatch(/__num\s*\{[^}]*color: inherit/);
    expect(code).not.toMatch(/opacity|!important|#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/);
  });
  it("print CSS does not override the new classes", () => {
    expect(printCss).not.toMatch(/portfolio-fact__|\.is-wide/);
  });
});
