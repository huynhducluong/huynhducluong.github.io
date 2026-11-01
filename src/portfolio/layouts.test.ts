import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_OVERLAY_OPACITY, portfolioContentSeed, portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { normalizePortfolioRuntimeData } from "../services/documentRepository";
import type { PortfolioCredential, PortfolioMedia, PortfolioRuntimeData } from "../types/portfolio";
import {
  automationLayoutOptions,
  closingLayoutOptions,
  coverLayoutOptions,
  credentialsLayoutOptions,
  indexLayoutOptions,
  modernPortfolioLayouts,
  normalizePortfolioLayouts,
  portfolioCredentialPages,
  portfolioPageCount,
  profileLayoutOptions,
  projectLayoutOptions,
  resolveProjectLayout,
} from "./layouts";
import { automationMediaRequirement, projectMediaRequirement } from "./mediaSlots";
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

describe("Portfolio image overlay (docs/ui-guidelines.md §8.4)", () => {
  const screenCss = Object.values(import.meta.glob<string>("../styles/portfolio-screen.css", { query: "?raw", import: "default", eager: true }))[0];
  const unframedImages = (markup: string): string[] => (markup.match(/(?:<[^<]*)?<img [^>]*>/g) ?? [])
    .filter((tag) => !tag.includes("data-portfolio-profile-photo") && !tag.includes("data-portfolio-credential-preview") && !/<span class="portfolio-media [^"]*"[^>]*><img /.test(tag));

  // Layouts designed without an image slot; every other layout must render its images through the frame.
  const textOnlyLayouts = ["cover.classic", "index.classic", "index.editorial", "automation.classic", "closing.classic", "closing.blue"];
  const media = (id: string, kind: PortfolioMedia["kind"], displayOrder: number): PortfolioMedia => ({
    id, kind, displayOrder, storagePath: `https://example.com/${id}.jpg`, alt: { en: id, vi: id },
  });

  it("frames every project, tool, cover and closing image, in every layout, but never the profile photo", () => {
    const data = runtime();
    const project = data.projects[0];
    project.images = [media("project-cover", "cover", 1), media("project-gallery", "gallery", 2)];
    data.tools[0].images = [media("tool-cover", "cover", 1), media("tool-gallery", "gallery", 2)];
    const families: Array<[readonly { id: string }[], (id: string) => void]> = [
      [coverLayoutOptions, (id) => { data.content.layouts.cover = id as typeof data.content.layouts.cover; }],
      [indexLayoutOptions, (id) => { data.content.layouts.index = id as typeof data.content.layouts.index; }],
      [projectLayoutOptions, (id) => { data.content.layouts.projectOverrides[project.id] = id as typeof data.content.layouts.projectOverrides[string]; }],
      [automationLayoutOptions, (id) => { data.content.layouts.automationDefault = id as typeof data.content.layouts.automationDefault; }],
      [closingLayoutOptions, (id) => { data.content.layouts.closing = id as typeof data.content.layouts.closing; }],
    ];
    families.forEach(([options, apply]) => options.forEach((option) => {
      apply(option.id);
      const markup = renderPortfolio(data);
      const page = markup.slice(markup.indexOf(`data-portfolio-layout="${option.id}"`)).split('<section class="portfolio-page ')[0];
      if (!textOnlyLayouts.includes(option.id)) expect(page, option.id).toContain('<span class="portfolio-media ');
      expect(unframedImages(markup), option.id).toEqual([]);
      expect(markup).not.toMatch(/<span class="portfolio-media[^"]*"[^>]*>(?!<img )/);
    }));
    expect(renderPortfolio(data)).toContain("data-portfolio-profile-photo");
  });

  it("tints the frame only, with the theme Primary at the document opacity", () => {
    expect(screenCss).toMatch(/\.portfolio-document\[data-image-overlay="on"\] \.portfolio-media::after \{[^}]*background: var\(--document-primary\);[^}]*opacity: var\(--portfolio-image-overlay-opacity\);/);
    expect(screenCss).not.toMatch(/figure::after|figcaption::after|portfolio-image-placeholder::after|portfolio-about__photo::after/);
    expect(screenCss).toContain(`--portfolio-image-overlay-opacity: ${String(DEFAULT_IMAGE_OVERLAY_OPACITY).replace(/^0/, "")};`);
  });
});

describe("Portfolio crop ratio contract (docs/ui-guidelines.md §8.4)", () => {
  const screenCss = Object.values(import.meta.glob<string>("../styles/portfolio-screen.css", { query: "?raw", import: "default", eager: true }))[0];
  const media = (id: string, kind: PortfolioMedia["kind"], displayOrder: number): PortfolioMedia => ({
    id, kind, displayOrder, storagePath: `https://example.com/${id}.jpg`, alt: { en: id, vi: id },
  });
  const pageOf = (markup: string, layout: string): string => markup.slice(markup.indexOf(`data-portfolio-layout="${layout}"`)).split('<section class="portfolio-page ')[0];
  const profiles = (page: string): string[] => [...page.matchAll(/data-crop-profile="([a-z]+)"/g)].map((match) => match[1]);

  it("prints every project and tool layout in the crop profiles the Admin asks the editor to adjust (mediaSlots)", () => {
    const data = runtime();
    data.projects[0].images = [media("cover", "cover", 1), media("gallery", "gallery", 2)];
    data.tools[0].images = [media("tool-cover", "cover", 1), media("tool-gallery", "gallery", 2)];
    projectLayoutOptions.forEach((option) => {
      data.content.layouts.projectOverrides[data.projects[0].id] = option.id;
      const requirement = projectMediaRequirement(option.id);
      expect(profiles(pageOf(renderPortfolio(data), option.id)), option.id).toEqual([requirement.primary, requirement.supporting].filter(Boolean));
    });
    automationLayoutOptions.forEach((option) => {
      data.content.layouts.automationDefault = option.id;
      const requirement = automationMediaRequirement(option.id);
      const page = pageOf(renderPortfolio(data), option.id);
      expect(profiles(page), option.id).toEqual(page ? [requirement.primary, requirement.supporting].filter(Boolean) : []);
    });
  });

  it("gives placeholders the same profile, so an empty slot has the printed shape", () => {
    const data = runtime();
    data.projects[0].images = [];
    data.content.layouts.projectOverrides[data.projects[0].id] = "project.evidence";
    expect(pageOf(renderPortfolio(data), "project.evidence")).toMatch(/<div class="portfolio-image-placeholder [^"]*" data-crop-profile="wide">/);
  });

  it("sizes frames by ratio only: one rule per profile, and no layout fixes a frame height", () => {
    expect(screenCss).toContain('.portfolio-page [data-crop-profile="wide"] { --pf-crop-ratio: 21 / 9;');
    expect(screenCss).toContain('.portfolio-page [data-crop-profile="landscape"] { --pf-crop-ratio: 4 / 3;');
    expect(screenCss).toContain('.portfolio-page [data-crop-profile="portrait"] { --pf-crop-ratio: 3 / 4;');
    expect(screenCss).toMatch(/\.portfolio-page \[data-crop-profile\] \{ height: auto; aspect-ratio: var\(--pf-crop-ratio\); \}/);
    const frameRules = screenCss.split("}").filter((rule) => /portfolio-media|portfolio-image-placeholder|__image\b|portfolio-document-preview/.test(rule.split("{")[0] ?? ""));
    // A frame may fill its slot (100%), never take a fixed length that ignores its crop ratio.
    expect(frameRules.filter((rule) => /[^-]height:\s*[\d.]+(mm|px|cm|rem|em)/.test(rule)).map((rule) => rule.split("{")[0].trim())).toEqual([]);
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

  it("prints a shown evidence crop at its own ratio inside the document slot, untinted, and keeps the placeholder otherwise", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.credentials = [
      { ...credential(1), preview: { profile: "portrait", storagePath: "portfolio-media-crops/credentials/c1/a1/portrait/x.webp", publicUrl: "https://example.com/c1.webp", width: 1350, height: 1800 } },
      credential(2),
    ];
    credentialsLayoutOptions.forEach((option) => {
      data.content.layouts.credentials = option.id;
      const markup = renderPortfolio(data);
      expect(markup, option.id).toContain('<div class="portfolio-document-frame portfolio-document-slot"><span class="portfolio-document-preview" data-crop-profile="portrait" data-portfolio-credential-preview><img src="https://example.com/c1.webp" alt="Credential 1"></span></div>');
      expect(markup.match(/portfolio-document-placeholder/g), option.id).toHaveLength(1);
      expect(markup, option.id).not.toMatch(/portfolio-media[^"]*"[^>]*><img src="https:\/\/example\.com\/c1/);
    });
  });

  it("gives an overridden credential its own layout; same-layout neighbours keep sharing a page", () => {
    const data = runtime();
    data.content.layouts.includeCredentials = true;
    data.content.layouts.credentials = "credentials.dual";
    data.credentials = [credential(1), credential(2), credential(3), credential(4)];
    data.content.layouts.credentialOverrides = { "credential-3": "credentials.bands" };

    expect(portfolioCredentialPages(data).map((page) => [page.layout, page.credentials.map((item) => item.id), page.firstIndex])).toEqual([
      ["credentials.dual", ["credential-1", "credential-2"], 0],
      ["credentials.bands", ["credential-3"], 2],
      ["credentials.dual", ["credential-4"], 3],
    ]);
    const markup = renderPortfolio(data);
    expect(credentialPageCount(markup)).toBe(3);
    expect(portfolioPageCount(data)).toBe(markup.split('class="portfolio-page ').length - 1);
    expect(markup.match(/data-portfolio-layout="credentials\.[a-z]+"/g)).toEqual([
      'data-portfolio-layout="credentials.dual"', 'data-portfolio-layout="credentials.bands"', 'data-portfolio-layout="credentials.dual"',
    ]);
    // Numbering continues across pages of different layouts, in Profile order.
    expect(markup).toMatch(/portfolio-credentials--bands[\s\S]*>03 \/ /);
    expect(markup).toContain("Selected supporting documents · 3 / 3");
  });

  it("drops overrides that name an unknown credentials layout", () => {
    const layouts = normalizePortfolioLayouts({ ...modernPortfolioLayouts, credentialOverrides: { a: "credentials.bands", b: "credentials.unknown" as never } });
    expect(layouts.credentialOverrides).toEqual({ a: "credentials.bands" });
    expect(normalizePortfolioLayouts({}).credentialOverrides).toEqual({});
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

  it("never prints invented content: empty summary, location, responsibilities and benefit are omitted", () => {
    const data = runtime();
    data.projects[0] = { ...data.projects[0], summary: undefined, location: { en: "", vi: "" }, responsibilities: [] };
    data.tools[0] = { ...data.tools[0], benefit: undefined };
    const pages = [...projectLayoutOptions.map((option) => {
      data.content.layouts.projectDefault = option.id;
      return renderPortfolio(data);
    }), ...automationLayoutOptions.map((option) => {
      data.content.layouts.automationDefault = option.id;
      return renderPortfolio(data);
    })].join("");
    [
      "Project details will be updated", "Selected infrastructure", "Project information", "Automated model generation",
      "Parameters to be defined", "My contribution", "Selected contribution", ">Outcome<",
    ].forEach((invented) => expect(pages, invented).not.toContain(invented));
    expect(pages).not.toMatch(/<p( class="portfolio-project__summary")?><\/p>/);
    expect(pages).toMatch(/<p class="portfolio-kicker">01<\/p>/);
  });

  it("labels a project's contributions once per page, never on every card", () => {
    projectLayoutOptions.filter((option) => option.id !== "project.editorial" && option.id !== "project.classic").forEach((option) => {
      const data = runtime();
      data.content.layouts.projectDefault = option.id;
      const page = renderPortfolio(data).split('<section class="portfolio-page ').find((part) => part.includes(`data-portfolio-layout="${option.id}"`)) ?? "";
      expect(page.split("My contribution").length - 1, option.id).toBe(1);
      expect(page, option.id).not.toMatch(/<article><span>\d\d<\/span><div><strong>/);
    });
  });

  it("uses the closing image's own caption and the editable About kicker on every Profile layout", () => {
    const data = runtime();
    data.projects[0].images = [{ id: "hero", kind: "cover", displayOrder: 1, storagePath: "https://example.com/hero.jpg", alt: { en: "Hero", vi: "Hero" }, caption: { en: "Bridge deck model", vi: "Mô hình mặt cầu" } }];
    data.content.layouts.closing = "closing.white";
    expect(renderPortfolio(data)).toContain("<figcaption>Bridge deck model</figcaption>");
    data.content.aboutKicker = { en: "About Luong", vi: "Về Lương" };
    profileLayoutOptions.forEach((option) => {
      data.content.layouts.profile = option.id;
      const page = renderPortfolio(data).split('<section class="portfolio-page ').find((part) => part.includes(`data-portfolio-layout="${option.id}"`)) ?? "";
      expect(page, option.id).toContain('<p class="portfolio-kicker">About Luong</p>');
      expect(page.replace(/<header class="portfolio-page-header">.*?<\/header>/, ""), option.id).not.toContain("Professional profile");
    });
  });

  it("omits unknown project facts instead of printing a dash", () => {
    const data = runtime();
    data.projects[0] = { ...data.projects[0], year: undefined, technologies: [] };
    data.content.layouts.projectDefault = "project.technical";
    expect(renderPortfolio(data)).not.toContain("<strong>—</strong>");
  });
});

describe("Portfolio content controls (phase 2)", () => {
  const pageOf = (markup: string, layoutId: string): string => markup.split('<section class="portfolio-page ').find((part) => part.includes(`data-portfolio-layout="${layoutId}"`)) ?? "";

  it("keeps what an old draft printed: statement = About heading, footer = cover kicker, seed highlight", () => {
    const legacy = structuredClone(portfolioContentSeed) as Partial<typeof portfolioContentSeed>;
    delete legacy.coverStatement; delete legacy.footerText; delete legacy.coverHighlight; delete legacy.automationStatement; delete legacy.profilePage;
    legacy.aboutHeading = { en: "My own heading", vi: "Tiêu đề của tôi" };
    legacy.kicker = { en: "My kicker", vi: "Kicker của tôi" };
    const data = normalizePortfolioRuntimeData({ ...runtime(), content: legacy as typeof portfolioContentSeed });
    expect(data.content.coverStatement).toEqual(legacy.aboutHeading);
    expect(data.content.footerText).toEqual(legacy.kicker);
    expect(data.content.coverHighlight).toEqual(portfolioContentSeed.coverHighlight);
    expect(data.content.profilePage).toEqual({ skillGroupIds: null, stats: ["projects", "capabilities"] });
  });

  it("prints the cover statement, highlight and footer from their own fields; an empty highlight prints no aside", () => {
    const data = runtime();
    data.content.layouts.cover = "cover.horizontal";
    data.content.coverStatement = { en: "Cover statement", vi: "" };
    data.content.footerText = { en: "Footer text", vi: "" };
    data.content.coverHighlight = { kicker: { en: "Highlight", vi: "" }, lines: [{ en: "Line one", vi: "" }, { en: "Line two", vi: "" }] };
    let markup = renderPortfolio(data);
    expect(pageOf(markup, "cover.horizontal")).toContain('<p class="portfolio-cover__statement">Cover statement</p>');
    expect(markup).toContain("<aside><span>Highlight</span><strong>Line one<br>Line two</strong></aside>");
    expect(markup).toContain('<footer class="portfolio-page-footer"><span>Footer text</span>');
    data.content.coverHighlight = { kicker: { en: "", vi: "" }, lines: [] };
    markup = renderPortfolio(data);
    expect(pageOf(markup, "cover.horizontal")).not.toContain("<aside>");
  });

  it("uses one Automation statement in every automation layout", () => {
    const data = runtime();
    data.content.automationStatement = { en: "One automation line.", vi: "" };
    automationLayoutOptions.forEach((option) => {
      data.content.layouts.automationDefault = option.id;
      expect(pageOf(renderPortfolio(data), option.id), option.id).toContain("One automation line.");
    });
  });

  it("puts the chosen Cover & closing image on the covers and the White closing", () => {
    const data = runtime();
    const [first, second] = [data.projects[0], data.projects[1]];
    second.includeInPortfolio = true;
    first.images = [{ id: "f1", kind: "cover", displayOrder: 1, storagePath: "https://example.com/first.jpg", alt: { en: "", vi: "" } }];
    second.images = [{ id: "s1", kind: "cover", displayOrder: 1, storagePath: "https://example.com/second-cover.jpg", alt: { en: "", vi: "" } }, { id: "s2", kind: "gallery", displayOrder: 2, storagePath: "https://example.com/second-gallery.jpg", alt: { en: "", vi: "" } }];
    data.content.layouts.closing = "closing.white";
    data.content.layouts.cover = "cover.split-image";
    expect(pageOf(renderPortfolio(data), "cover.split-image")).toContain("first.jpg");
    data.content.mediaAssignments.feature = { projectId: second.id, mediaId: "s2" };
    const markup = renderPortfolio(data);
    expect(pageOf(markup, "cover.split-image")).toContain("second-gallery.jpg");
    expect(pageOf(markup, "closing.white")).toContain("second-gallery.jpg");
    second.includeInPortfolio = false;
    expect(pageOf(renderPortfolio(data), "cover.split-image"), "an unselected project falls back to the first").toContain("first.jpg");
  });

  it("prints the chosen capability groups in Profile order and the chosen figures, leaving out zeros", () => {
    const data = runtime();
    data.content.layouts.profile = "profile.portrait";
    const [a, b] = data.content.skillGroups;
    data.content.profilePage = { skillGroupIds: [b.id, a.id], stats: ["tools", "credentials"] };
    const page = pageOf(renderPortfolio(data), "profile.portrait");
    const cards = page.slice(page.indexOf("portfolio-profile__cards"));
    expect(cards.indexOf(`<strong>${a.title.en}</strong>`)).toBeGreaterThan(0);
    expect(cards.indexOf(`<strong>${a.title.en}</strong>`)).toBeLessThan(cards.indexOf(`<strong>${b.title.en}</strong>`));
    expect(page).toContain("<strong>1</strong><span>Automation tools</span>");
    expect(page).not.toContain("Credentials</span>");
  });
});

describe("Portfolio structured content (phase 3)", () => {
  const pageOf = (markup: string, layoutId: string): string => markup.split('<section class="portfolio-page ').find((part) => part.includes(`data-portfolio-layout="${layoutId}"`)) ?? "";
  const fact = (id: string, value: string, label: string) => ({ id, value: { en: value, vi: "" }, label: { en: label, vi: "" } });

  it("prints a project's key facts instead of the derived year and tool count", () => {
    const data = runtime();
    data.content.layouts.projectDefault = "project.balanced";
    data.projects[0].keyFacts = [fact("a", "18 km", "Bridge length"), fact("b", "37", "Bridges")];
    const page = pageOf(renderPortfolio(data), "project.balanced");
    expect(page).toContain("<div><strong>18 km</strong><span>Bridge length</span></div><div><strong>37</strong><span>Bridges</span></div>");
    expect(page).not.toContain("<span>Tools</span>");
    data.projects[0].keyFacts = [];
    expect(pageOf(renderPortfolio(data), "project.balanced")).toContain("<span>Tools</span>");
  });

  it("tells Challenge, Approach, Outcome on Technical and Editorial in place of the summary, once the Portfolio opts in", () => {
    const data = runtime();
    const project = data.projects[0];
    expect(data.content.projectText, "opt-in: old drafts keep their summaries").toBe("summary");
    project.challenge = { en: "Challenge text", vi: "" };
    data.content.layouts.projectDefault = "project.technical";
    expect(renderPortfolio(data)).not.toContain("portfolio-project-story");
    data.content.projectText = "story";
    project.summary = { en: "Summary text", vi: "" };
    project.challenge = { en: "Challenge text", vi: "" };
    project.approach = { en: "", vi: "" };
    project.outcome = { en: "Outcome text", vi: "" };
    (["project.technical", "project.editorial"] as const).forEach((id) => {
      data.content.layouts.projectDefault = id;
      const page = pageOf(renderPortfolio(data), id);
      expect(page, id).toContain('<dl class="portfolio-project-story"><div><dt>The challenge</dt><dd>Challenge text</dd></div><div><dt>Outcome</dt><dd>Outcome text</dd></div></dl>');
      expect(page, id).not.toContain("Summary text");
    });
    project.challenge = undefined;
    project.outcome = undefined;
    data.content.layouts.projectDefault = "project.technical";
    expect(pageOf(renderPortfolio(data), "project.technical"), "no story: the summary returns").toContain("Summary text");
    project.challenge = { en: "Challenge text", vi: "" };
    data.content.layouts.projectDefault = "project.balanced";
    expect(pageOf(renderPortfolio(data), "project.balanced"), "other layouts keep the summary").not.toContain("portfolio-project-story");
  });

  it("prints the responsibilities chosen for the Portfolio, in the project order, within the layout limit", () => {
    const data = runtime();
    const project = data.projects[0];
    project.responsibilities = ["one", "two", "three", "four"].map((id) => ({ id, text: { en: `Responsibility ${id}`, vi: "" } }));
    data.content.layouts.projectDefault = "project.balanced";
    data.content.projectResponsibilities = { [project.id]: ["four", "two"] };
    const page = pageOf(renderPortfolio(data), "project.balanced");
    expect(page.indexOf("Responsibility two")).toBeGreaterThan(0);
    expect(page.indexOf("Responsibility two")).toBeLessThan(page.indexOf("Responsibility four"));
    expect(page).not.toContain("Responsibility one");
    data.content.projectResponsibilities = { [project.id]: [] };
    expect(pageOf(renderPortfolio(data), "project.balanced")).not.toContain("My contribution");
  });

  it("prints a tool's own workflow steps, then its benefit as the highlighted Outcome", () => {
    const data = runtime();
    data.content.layouts.automationDefault = "automation.workflow";
    data.tools[0].workflowSteps = [{ id: "s1", label: { en: "Input", vi: "" }, text: { en: "Alignment from Civil 3D", vi: "" } }];
    data.tools[0].benefit = { en: "Hours saved per deck", vi: "" };
    const page = pageOf(renderPortfolio(data), "automation.workflow");
    expect(page).toContain('<p class="portfolio-kicker">Workflow</p>');
    expect(page).toContain("<li><span>01 / Input</span><strong>Alignment from Civil 3D</strong></li>");
    expect(page).toContain('<li class="is-outcome"><span>02 / Outcome</span><strong>Hours saved per deck</strong></li>');
  });
});
