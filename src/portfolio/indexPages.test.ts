import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData, ProjectIndexLayout } from "../types/portfolio";
import { PORTFOLIO_INDEX_CAPACITY, indexLayoutOptions, portfolioIndexPages, portfolioPageCount } from "./layouts";
import { renderPortfolio } from "./renderPortfolioV2";

const layoutIds = indexLayoutOptions.map((option) => option.id);

const build = (layout: ProjectIndexLayout, count: number): PortfolioRuntimeData => {
  const content = structuredClone(portfolioContentSeed);
  content.layouts.index = layout;
  return {
    content,
    projects: Array.from({ length: count }, (_, index) => ({
      ...structuredClone(portfolioProjectSeed[index % portfolioProjectSeed.length]),
      id: `p${index + 1}`,
      name: { en: `Project #${index + 1}#`, vi: `Dự án #${index + 1}#` },
      includeInPortfolio: true,
      // Reversed storage order: the index must follow portfolioOrder.
      portfolioOrder: index,
    })).reverse(),
    tools: [],
    credentials: [],
  };
};

const allPages = (html: string): string[] => html.split('<section class="portfolio-page ').slice(1);
const indexPages = (html: string): string[] => allPages(html).filter((page) => page.includes('data-portfolio-layout="index.'));
const names = (page: string): number[] => [...page.matchAll(/<(?:strong|h3)>(?:Project|Dự án) #(\d+)#<\/(?:strong|h3)>/g)].map((match) => Number(match[1]));
const numbers = (page: string): string[] => [...page.matchAll(/(?:<li(?: class="has-video")?><span>|<\/span><\/span><span>|<\/figure><span>|portfolio-index__image[\s\S]*?<span>)(\d{2})<\/span>/g)].map((match) => match[1]);
const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index + 1);

describe("portfolioIndexPages", () => {
  it.each(layoutIds)("splits %s by its capacity, in order", (layout) => {
    const size = PORTFOLIO_INDEX_CAPACITY[layout];
    expect(portfolioIndexPages([], layout)).toEqual([[]]);
    expect(portfolioIndexPages(range(1), layout)).toEqual([[1]]);
    expect(portfolioIndexPages(range(size), layout)).toEqual([range(size)]);
    expect(portfolioIndexPages(range(size + 1), layout)).toEqual([range(size), [size + 1]]);
    const forty = portfolioIndexPages(range(40), layout);
    expect(forty).toHaveLength(Math.ceil(40 / size));
    expect(forty.flat()).toEqual(range(40));
    expect(forty.every((page) => page.length >= 1 && page.length <= size)).toBe(true);
  });
  it("holds ten, twelve and eight projects", () => {
    expect(PORTFOLIO_INDEX_CAPACITY).toEqual({ "index.classic": 10, "index.visual": 12, "index.editorial": 8 });
  });
});

describe.each(layoutIds)("rendered %s", (layout) => {
  const size = PORTFOLIO_INDEX_CAPACITY[layout];

  it.each([0, 1, size, size + 1, 40])("keeps every one of %i projects once, with running numbers and page totals", (count) => {
    for (const language of ["en", "vi"] as const) {
      const data = build(layout, count);
      const html = renderPortfolio(data, language);
      const pages = indexPages(html);
      const total = Math.max(1, Math.ceil(count / size));
      expect(pages).toHaveLength(total);
      expect(pages.flatMap(names)).toEqual(range(count));
      expect(pages.flatMap(numbers)).toEqual(range(count).map((value) => String(value).padStart(2, "0")));
      const sections = allPages(html);
      expect(sections).toHaveLength(portfolioPageCount(data));
      sections.slice(1, -1).forEach((section, index) => {
        expect(section).toContain(`${String(index + 2).padStart(2, "0")} / ${String(sections.length).padStart(2, "0")}`);
      });
    }
  });

  it("numbers the titles only when there is more than one page, in the document language", () => {
    for (const [language, title] of [["en", "Project index"], ["vi", "Danh mục dự án"]] as const) {
      // The numbered Vietnamese title keeps "dự án" on one line (the editorial rail is narrow).
      const numbered = language === "vi" ? "Danh mục dự\u00a0án" : title;
      expect(indexPages(renderPortfolio(build(layout, size), language))[0]).toContain(`>${title}</h2>`);
      const pages = indexPages(renderPortfolio(build(layout, size + 1), language));
      expect(pages[0]).toContain(`>${numbered} (1/2)</h2>`);
      expect(pages[1]).toContain(`>${numbered} (2/2)</h2>`);
      // The kicker (or the editorial rail) keeps the size of the whole selection on every page.
      for (const page of pages) expect(page).toContain(layout === "index.editorial" ? `<strong>${String(size + 1).padStart(2, "0")}</strong>` : ` / ${String(size + 1).padStart(2, "0")} `);
    }
  });

  it("prints no escape code as text", () => {
    for (const language of ["en", "vi"] as const) expect(renderPortfolio(build(layout, size + 1), language)).not.toContain("00a0");
  });

  it("escapes a name on a later page exactly once", () => {
    const data = build(layout, size + 1);
    data.projects.find((project) => project.id === `p${size + 1}`)!.name = { en: "A & <B>", vi: "A & <B>" };
    const last = indexPages(renderPortfolio(data))[1];
    expect(last).toContain("A &amp; &lt;B&gt;");
    expect(last).not.toContain("&amp;amp;");
  });

  it("renders two pages as recorded", () => {
    expect(indexPages(renderPortfolio(build(layout, size + 1), "en"))).toMatchSnapshot();
  });
});

describe("grid index density", () => {
  it("follows the number of cards on each page", () => {
    const pages = indexPages(renderPortfolio(build("index.visual", 19)));
    expect(pages.map((page) => page.includes("portfolio-index-visual is-dense"))).toEqual([true, false]);
  });
});
