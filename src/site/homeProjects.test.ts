import { beforeAll, describe, expect, it, vi } from "vitest";
import homeCss from "../styles/home.css?raw";
import type { PortfolioProject } from "../types/portfolio";
import { projectChips, renderProjectFilter, renderProjectSheet } from "./homeProjects";

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
  it("renders nothing without chips", () => {
    expect(renderProjectFilter([], "en", 0)).toBe("");
  });
});

describe("home project CSS", () => {
  it("keeps a fixed image ratio, 44 px chips and an auto-fill grid", () => {
    expect(homeCss).toMatch(/\.project-card__media \{[^}]*aspect-ratio: 16 \/ 10/);
    expect(homeCss).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(homeCss).toMatch(/\.project-grid \{[^}]*repeat\(auto-fill, minmax\(min\(100%, 20rem\), 1fr\)\)/);
    expect(homeCss).toMatch(/\.hero__titleblock \{[^}]*margin: 0/);
  });
  it("has no !important in the project block", () => {
    const block = homeCss.slice(homeCss.indexOf(".chip-row"), homeCss.indexOf(".project-card__link:hover"));
    expect(block).not.toContain("!important");
  });
});
