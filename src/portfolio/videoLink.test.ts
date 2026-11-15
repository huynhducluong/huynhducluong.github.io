import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { automationLayoutOptions, indexLayoutOptions, projectLayoutOptions } from "./layouts";
import { renderPortfolio } from "./renderPortfolioV2";

const URL_OK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const build = (youtubeUrl: string | undefined, name?: string): PortfolioRuntimeData => ({
  content: structuredClone(portfolioContentSeed),
  projects: structuredClone(portfolioProjectSeed.slice(0, 1)).map((project) => ({
    ...project, includeInPortfolio: true, youtubeUrl,
    name: name ? { en: name, vi: name } : project.name,
  })),
  tools: structuredClone(portfolioToolSeed.slice(0, 1)).map((tool) => ({ ...tool, includeInPortfolio: true, youtubeUrl })),
  credentials: [],
});
const count = (html: string): number => html.split('class="portfolio-video-link"').length - 1;
const withLayouts = (data: PortfolioRuntimeData, index: string, project: string, automation: string): PortfolioRuntimeData => {
  const next = structuredClone(data);
  (next.content.layouts as unknown as Record<string, string>).index = index;
  (next.content.layouts as unknown as Record<string, string>).projectDefault = project;
  (next.content.layouts as unknown as Record<string, string>).automationDefault = automation;
  return next;
};

describe("Portfolio video link", () => {
  it("prints nothing without a (valid) youtubeUrl, and markup is identical to the invalid case", () => {
    const none = renderPortfolio(build(undefined), "en");
    expect(none).not.toContain("portfolio-video-link");
    expect(none).not.toContain("has-video");
    expect(renderPortfolio(build("javascript:alert(1)"), "en")).toBe(none);
  });

  it("appears in all three page families, for every layout", () => {
    for (const index of indexLayoutOptions) for (const project of projectLayoutOptions) for (const automation of automationLayoutOptions) {
      const html = renderPortfolio(withLayouts(build(URL_OK), index.id, project.id, automation.id), "en");
      // index + project heading + automation (heading or classic card)
      expect(count(html), `${index.id} / ${project.id} / ${automation.id}`).toBe(3);
    }
  });

  it("has correct href, rel and localized labels", () => {
    const en = renderPortfolio(build(URL_OK, "A & <B>"), "en");
    expect(en).toContain(`href="${URL_OK}"`);
    expect(en).toContain('target="_blank" rel="noopener noreferrer"');
    expect(en).toContain('aria-label="Watch video: A &amp; &lt;B&gt;"');
    expect(en).not.toContain("<B>");
    expect(en).not.toContain("&amp;amp;");
    const vi = renderPortfolio(build(URL_OK, "Cầu"), "vi");
    expect(vi).toContain('aria-label="Xem video: Cầu"');
    expect(vi).toContain("<span>Video</span>");
    expect(vi).not.toContain("Watch video");
  });
});

describe("Portfolio video link CSS", () => {
  const css = readFileSync("src/styles/portfolio-screen.css", "utf8");
  const lines = css.split("\n").filter((line) => line.includes("portfolio-video-link"));
  it("scopes every rule under .portfolio-page and avoids !important", () => {
    expect(lines.length).toBeGreaterThan(0);
    expect(css).toContain(".portfolio-page .portfolio-video-link");
    lines.forEach((line) => {
      expect(line).toMatch(/\.portfolio-page/);
      expect(line).not.toContain("!important");
    });
  });
  it("inverts colors on the three blue backgrounds", () => {
    for (const host of [".portfolio-index-editorial > aside", ".portfolio-project--editorial > section", ".portfolio-project--technical > aside"]) {
      expect(lines.some((line) => line.includes(host))).toBe(true);
    }
  });
});
