import { describe, expect, it } from "vitest";
import { portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { normalizePortfolioRuntimeData } from "../services/documentRepository";
import type { PortfolioCredential, PortfolioRuntimeData } from "../types/portfolio";
import {
  automationLayoutOptions,
  closingLayoutOptions,
  coverLayoutOptions,
  credentialsLayoutOptions,
  indexLayoutOptions,
  portfolioCredentialPages,
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

const credential = (order: number, includeInPortfolio = true): PortfolioCredential => ({
  id: `credential-${order}`,
  kind: "language_exam",
  relatedType: null,
  relatedId: null,
  title: { en: `Credential ${order}`, vi: `Chứng chỉ ${order}` },
  issuer: { en: "ETS", vi: "ETS" },
  description: { en: "", vi: "" },
  issuedOn: "2026-01-01",
  expiresOn: null,
  doesNotExpire: true,
  credentialNumber: "",
  verificationUrl: "",
  status: "published",
  displayOrder: order,
  includeInPortfolio,
  portfolioOrder: order,
});

const credentialPageCount = (markup: string): number => markup.split('class="portfolio-page portfolio-page--credentials').length - 1;

describe("Portfolio credential pages", () => {
  it("adds one page for every two selected credentials", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    const counts = [0, 1, 2, 3, 5].map((selected) => {
      data.credentials = Array.from({ length: selected }, (_, index) => credential(index + 1));
      return portfolioPageCount(data);
    });
    expect(counts).toEqual([7, 7, 7, 8, 9]);
  });

  it("ignores credentials that are not selected for the Portfolio", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.credentials = [credential(1), credential(2), credential(3, false)];
    expect(portfolioCredentialPages(data)).toHaveLength(1);
    expect(renderPortfolio(data)).not.toContain("Credential 3");
  });

  it("splits three credentials over two numbered pages in every credentials layout", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.credentials = [credential(3), credential(1), credential(2)];
    credentialsLayoutOptions.forEach((option) => {
      data.content.layouts.credentials = option.id;
      const markup = renderPortfolio(data);
      expect(credentialPageCount(markup)).toBe(2);
      expect(markup.indexOf("Credential 1")).toBeLessThan(markup.indexOf("Credential 3"));
      expect(markup).toContain("Selected supporting documents · 2 / 2");
      expect(markup).toMatch(/>03(<| \/)/);
      expect(markup).not.toContain("Content to be supplied");
    });
  });

  it("keeps a single placeholder page when nothing is selected", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    const markup = renderPortfolio(data);
    expect(credentialPageCount(markup)).toBe(1);
    expect(markup.split("Content to be supplied").length - 1).toBe(2);
    expect(markup).not.toContain(" · 1 / 1");
  });

  it("localizes credential kinds instead of printing database values", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.content.layouts.credentials = "credentials.bands";
    data.credentials = [credential(1)];
    expect(renderPortfolio(data, "vi")).toContain("01 / Chứng chỉ ngoại ngữ");
    expect(renderPortfolio(data)).not.toContain("language_exam");
  });

  it("escapes localized text exactly once", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.credentials = [{ ...credential(1), title: { en: "Listening & Reading's score", vi: "" } }];
    data.projects[0].name = { en: "R&D <Bridge>", vi: "" };
    const markup = renderPortfolio(data);
    expect(markup).toContain("Listening &amp; Reading&#39;s score");
    expect(markup).toContain("R&amp;D &lt;Bridge&gt;");
    expect(markup).not.toContain("&amp;amp;");
    expect(markup).not.toContain("&amp;#39;");
  });
});

// Renders every page family in every layout so a test can inspect the whole PDF at once.
const everyLayout = (language: "en" | "vi"): string => {
  const data = runtime();
  data.content.layouts.includeCredentials = true;
  data.credentials = [credential(1), credential(2), credential(3)];
  data.projects = data.projects.map((project) => ({ ...project, includeInPortfolio: true }));
  const pages: string[] = [];
  const families = [
    [coverLayoutOptions, "cover"], [profileLayoutOptions, "profile"], [indexLayoutOptions, "index"],
    [credentialsLayoutOptions, "credentials"], [closingLayoutOptions, "closing"],
  ] as const;
  families.forEach(([options, key]) => options.forEach((option) => {
    (data.content.layouts as unknown as Record<string, string>)[key] = option.id;
    pages.push(renderPortfolio(data, language));
  }));
  projectLayoutOptions.forEach((option) => {
    data.content.layouts.projectDefault = option.id;
    pages.push(renderPortfolio(data, language));
  });
  automationLayoutOptions.forEach((option) => {
    data.content.layouts.automationDefault = option.id;
    pages.push(renderPortfolio(data, language));
  });
  return pages.join("");
};

describe("Portfolio page chrome and language", () => {
  it("never prints internal layout ids in the page header", () => {
    const headers = everyLayout("en").match(/<header class="portfolio-page-header">.*?<\/header>/g) ?? [];
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((header) => {
      expect(header).not.toMatch(/>(classic|balanced|editorial|technical|portrait|evidence|workflow|input geometry|dual|bands|white|visual|capability)</i);
    });
  });

  it("prints no English chrome in the Vietnamese PDF", () => {
    const markup = everyLayout("vi");
    [
      "Coordinated model", "Supporting detail", "Supporting evidence", "My contribution", "Engineering inputs", "Input to be defined",
      "Tool workflow", "Tool input", "Generated geometry", "Project information", "Infrastructure BIM", "Model coordination",
      "THANK YOU", ">Phone<", ">Location<", ">Workflow<", "BIM COORDINATOR", "PROJECT<br>INDEX", "Selected infrastructure",
      " projects<", "Content to be supplied", "From engineering inputs",
    ].forEach((english) => expect(markup, english).not.toContain(english));
  });

  it("omits unknown project facts instead of printing a dash", () => {
    const data = runtime();
    data.projects[0] = { ...data.projects[0], year: undefined, technologies: [] };
    data.content.layouts.projectDefault = "project.technical";
    expect(renderPortfolio(data)).not.toContain("<strong>—</strong>");
  });
});
