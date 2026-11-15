import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { projectLayoutOptions } from "./layouts";
import { renderPortfolio } from "./renderPortfolioV2";

type Fact = { value: { en: string; vi: string }; label: { en: string; vi: string } };
const fact = (value: string, label = "Label", vi = value): Fact => ({ value: { en: value, vi }, label: { en: label, vi: label } });
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
