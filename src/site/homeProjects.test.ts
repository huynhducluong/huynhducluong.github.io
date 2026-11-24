import { beforeAll, describe, expect, it, vi } from "vitest";
import homeCss from "../styles/home.css?raw";
import type { PortfolioProject } from "../types/portfolio";
import { bindProjectFilter, projectChips, renderProjectFilter, renderProjectSheet } from "./homeProjects";

beforeAll(() => {
  vi.stubGlobal("window", { location: { origin: "http://localhost", href: "http://localhost/" } });
});

const project = (overrides: Partial<PortfolioProject> = {}): PortfolioProject =>
  ({
    slug: "p-1",
    name: { en: "Tunnel & <Station>", vi: "Hầm & <Ga>" },
    role: { en: "BIM Lead", vi: "Trưởng BIM" },
    location: { en: "Hanoi", vi: "Hà Nội" },
    summary: { en: "Summary", vi: "Tóm tắt" },
    technologies: ["Revit", "Dynamo"],
    images: [],
    ...overrides,
  }) as unknown as PortfolioProject;

const image = {
  storagePath: "https://x.test/a.jpg",
  alt: { en: "Alt", vi: "Alt vi" },
} as unknown as PortfolioProject["images"][number];

describe("projectChips", () => {
  it("orders by count then name, case-insensitive, max 7", () => {
    const chips = projectChips([
      ["Revit", "Dynamo", "Python"],
      ["revit", "Navisworks", "Python"],
      ["Revit", "A1", "B1", "C1", "D1", "E1"],
      ["Z9"],
    ]);
    expect(chips.slice(0, 3).map((c) => c.label)).toEqual(["Revit", "Python", "A1"]);
    expect(chips[0].count).toBe(3);
    expect(chips).toHaveLength(7);
  });
  it("counts a repeated tag once per project and drops blanks", () => {
    expect(projectChips([["Revit", "revit", " "], []])).toEqual([{ label: "Revit", count: 1 }]);
  });
  it("is empty for no data", () => {
    expect(projectChips([])).toEqual([]);
  });
  it("has no chips when every project shares the same technologies", () => {
    expect(projectChips([["Revit", "Dynamo"], ["Dynamo", "Revit"], ["revit", "dynamo"]])).toEqual([]);
  });
  it("has no chips for a single project", () => {
    expect(projectChips([["Revit", "Dynamo"]])).toEqual([]);
  });
  it("keeps only the technology that tells projects apart", () => {
    expect(projectChips([["Revit", "Dynamo"], ["Revit"]])).toEqual([{ label: "Dynamo", count: 1 }]);
  });
  it("still caps at 7 chips after dropping shared ones", () => {
    const own = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    expect(projectChips([["Shared", ...own], ["Shared"]])).toHaveLength(7);
  });
});

describe("renderProjectSheet", () => {
  it("uses a text-free decorative tile without an image", () => {
    const html = renderProjectSheet(project(), 0, "en");
    expect(html).toContain("project-card__image--empty");
    expect(html).toContain("SHEET 01");
    expect(html).not.toContain("Image will be added");
    expect(html).not.toContain("<img");
  });
  it("renders an image once with a non-focusable media link", () => {
    const html = renderProjectSheet(project({ images: [image] }), 1, "en");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('tabindex="-1" aria-hidden="true"');
    expect(html).toContain("SHEET 02");
  });
  it("drops missing summary, role, location and tags without stray separators", () => {
    const html = renderProjectSheet(
      project({ summary: undefined, role: undefined, location: { en: "", vi: "" }, technologies: [] } as never),
      0,
      "en",
    );
    expect(html).not.toContain("project-card__summary");
    expect(html).not.toContain("project-card__meta");
    expect(html).not.toContain("tag-list");
    expect(html).not.toContain("·");
    expect(html).not.toContain("—");
  });
  it("limits tags to five and escapes values once", () => {
    const html = renderProjectSheet(project({ technologies: ["A&B", "2", "3", "4", "5", "6"] }), 0, "en");
    expect(html.match(/class="tag"/g)).toHaveLength(5);
    expect(html).toContain("A&amp;B");
    expect(html).not.toContain("&amp;amp;");
    expect(html).toContain("Tunnel &amp; &lt;Station&gt;");
    expect(html).not.toContain("<Station>");
  });
  it("escapes the location in the kicker exactly once", () => {
    const html = renderProjectSheet(project({ location: { en: "Ho Chi Minh & Binh Duong <x>", vi: "" } }), 0, "en");
    expect(html).toContain("SHEET 01 · Ho Chi Minh &amp; Binh Duong &lt;x&gt;");
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain("&amp;lt;");
  });
  it("localizes labels", () => {
    expect(renderProjectSheet(project(), 0, "vi")).toContain("Xem dự án →");
    expect(renderProjectSheet(project(), 0, "en")).toContain("View project →");
  });
});

describe("renderProjectFilter", () => {
  it("renders All pressed, labelled group and a polite live region", () => {
    const html = renderProjectFilter([{ label: "Revit", count: 2 }], "vi", 3);
    expect(html).toContain('role="group" aria-label="Lọc dự án theo công nghệ"');
    expect(html).toContain('data-filter="" aria-pressed="true"');
    expect(html).toContain('data-filter="revit" aria-pressed="false"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Hiển thị tất cả 3 dự án");
  });
  it("renders nothing without chips: no All, no live region", () => {
    const html = renderProjectFilter([], "en", 3);
    expect(html).toBe("");
    expect(html).not.toContain("aria-live");
  });
});

describe("bindProjectFilter", () => {
  const makeEl = (dataset: Record<string, string>) => {
    const attrs: Record<string, string> = {};
    const listeners: Array<() => void> = [];
    return {
      dataset,
      hidden: false,
      textContent: "",
      attrs,
      setAttribute: (name: string, value: string) => void (attrs[name] = value),
      addEventListener: (_: string, fn: () => void) => void listeners.push(fn),
      click: () => listeners.forEach((fn) => fn()),
    };
  };
  const setup = () => {
    const chips = [makeEl({ filter: "" }), makeEl({ filter: "revit" }), makeEl({ filter: "dynamo" })];
    const cards = [makeEl({ tech: "revit|dynamo" }), makeEl({ tech: "revit" }), makeEl({ tech: "python" })];
    const status = makeEl({});
    const root = {
      querySelectorAll: (selector: string) => (selector.startsWith(".chip") ? chips : cards),
      querySelector: () => status,
    };
    bindProjectFilter(root as never, "en");
    return { chips, cards, status };
  };
  it("hides non-matching cards, sets aria-pressed and announces the count", () => {
    const { chips, cards, status } = setup();
    chips[1].click();
    expect(cards.map((c) => c.hidden)).toEqual([false, false, true]);
    expect(chips.map((c) => c.attrs["aria-pressed"])).toEqual(["false", "true", "false"]);
    expect(status.textContent).toBe("Showing 2 of 3 projects");
    chips[2].click();
    expect(cards.map((c) => c.hidden)).toEqual([false, true, true]);
    chips[0].click();
    expect(cards.map((c) => c.hidden)).toEqual([false, false, false]);
    expect(status.textContent).toBe("Showing all 3 projects");
  });
  it("is safe without chips", () => {
    const root = { querySelectorAll: () => [], querySelector: () => null };
    expect(() => bindProjectFilter(root as never, "en")).not.toThrow();
  });
});

describe("home project CSS", () => {
  it("keeps a fixed image ratio, 44 px chips and an auto-fill grid", () => {
    expect(homeCss).toMatch(/\.project-card__media \{[^}]*aspect-ratio: 16 \/ 10/);
    expect(homeCss).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(homeCss).toMatch(/\.project-grid \{[^}]*repeat\(auto-fill, minmax\(min\(100%, 20rem\), 1fr\)\)/);
    expect(homeCss).toMatch(/\.hero__titleblock \{[^}]*margin: 0/);
  });
  it("aligns card rows with subgrid, 2 x 2 phone buttons, 8 % phone grid", () => {
    expect(homeCss).toMatch(/\.project-card \{[^}]*grid-template-rows: subgrid/);
    expect(homeCss).toMatch(/\.project-card \{[^}]*grid-row: span 7/);
    expect(homeCss).toMatch(/\.project-card__body \{\s*display: contents/);
    const phone = homeCss.slice(homeCss.indexOf("@media (max-width: 650px)"));
    expect(phone).toMatch(/--grid-alpha: 8%/);
    expect(phone).toMatch(/\.hero__actions \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(homeCss).not.toMatch(/scroll-snap/);
  });
  it("has no !important in the project block", () => {
    const block = homeCss.slice(homeCss.indexOf(".chip-row"), homeCss.indexOf(".project-card__link:hover"));
    expect(block).not.toContain("!important");
  });
});
