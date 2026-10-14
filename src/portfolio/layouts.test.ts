import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { normalizePortfolioRuntimeData } from "../services/documentRepository";
import type { PortfolioRuntimeData } from "../types/portfolio";
import {
  automationLayoutOptions,
  closingLayoutOptions,
  coverLayoutOptions,
  credentialsLayoutOptions,
  indexLayoutOptions,
  portfolioPageCount,
  profileLayoutOptions,
  projectLayoutOptions,
  resolveProjectLayout,
} from "./layouts";
import { renderPortfolio } from "./renderPortfolioV2";

const runtime = (): PortfolioRuntimeData => ({
  content: structuredClone(portfolioContentSeed),
  projects: structuredClone(portfolioProjectSeed.slice(0, 2)).map((project, index) => ({
    ...project,
    includeInPortfolio: index === 0,
  })),
  tools: structuredClone(portfolioToolSeed.slice(0, 1)).map((tool) => ({ ...tool, includeInPortfolio: true })),
  credentials: [],
});

describe("Portfolio layout system", () => {
  it("uses the document default when no item override exists", () => {
    const data = runtime();
    const project = data.projects[0];
    expect(resolveProjectLayout(data, project.id, project.portfolioLayout)).toBe("project.balanced");
  });

  it("migrates legacy project layouts into document-scoped overrides", () => {
    const data = runtime();
    delete (data.content as Partial<typeof data.content>).layouts;
    data.projects[0].portfolioLayout = "feature";
    const normalized = normalizePortfolioRuntimeData(data);
    expect(normalized.content.layouts.projectOverrides[data.projects[0].id]).toBe("feature");
    expect(resolveProjectLayout(normalized, data.projects[0].id)).toBe("feature");
  });

  it("counts per-tool automation pages and the optional credentials page", () => {
    const data = runtime();
    expect(portfolioPageCount(data)).toBe(6);
    data.content.layouts.includeCredentials = true;
    expect(portfolioPageCount(data)).toBe(7);
  });

  it("renders every new project preset through the shared A4 renderer", () => {
    const data = runtime();
    const project = data.projects[0];
    projectLayoutOptions.forEach((option) => {
      data.content.layouts.projectOverrides[project.id] = option.id;
      expect(renderPortfolio(data)).toContain(`portfolio-page--${option.id.replace(".", "-")}`);
    });
  });

  it("renders every page-family preset without leaving the A4 renderer", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    coverLayoutOptions.forEach((option) => {
      data.content.layouts.cover = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
    profileLayoutOptions.forEach((option) => {
      data.content.layouts.profile = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
    indexLayoutOptions.forEach((option) => {
      data.content.layouts.index = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
    automationLayoutOptions.forEach((option) => {
      data.content.layouts.automationDefault = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
    credentialsLayoutOptions.forEach((option) => {
      data.content.layouts.credentials = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
    closingLayoutOptions.forEach((option) => {
      data.content.layouts.closing = option.id;
      expect(renderPortfolio(data)).toContain(`data-portfolio-layout="${option.id}"`);
    });
  });
});
