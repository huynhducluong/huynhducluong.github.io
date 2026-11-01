import { describe, expect, it } from "vitest";

const styles = import.meta.glob<string>(
  ["../styles/document-typography.css", "../styles/cv-screen.css", "../styles/portfolio-screen.css", "../styles/cover-letter-screen.css"],
  { query: "?raw", import: "default", eager: true },
);
const typography = styles["../styles/document-typography.css"];

/** Document rules only: CV and Portfolio files start with screen chrome (toolbars sized in rem) before the page rules. */
const documentRules = (file: string, marker?: string): Array<{ selector: string; body: string }> => {
  const css = styles[`../styles/${file}`].replace(/\/\*[\s\S]*?\*\//g, "");
  const start = marker ? css.indexOf(marker) : 0;
  expect(start, `${file} marker`).toBeGreaterThanOrEqual(0);
  return [...css.slice(start).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, body]) => ({ selector: selector.trim(), body }))
    .filter((rule) => !/font-size:\s*[\d.]+rem/.test(rule.body));
};
const documents: Array<[string, string?]> = [["cv-screen.css", ".cv-preview {"], ["portfolio-screen.css", ".portfolio-document {"], ["cover-letter-screen.css"]];

describe("Document typography (docs/ui-guidelines.md §8)", () => {
  it("bundles Be Vietnam Pro as woff2 subsets with unicode ranges, never measured in a fallback face", () => {
    const faces = typography.match(/@font-face \{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(10);
    faces.forEach((face) => {
      expect(face).toContain('font-family: "Be Vietnam Pro"');
      expect(face).toContain("font-display: block");
      expect(face).toMatch(/format\("woff2"\); unicode-range: U\+/);
      expect(face).not.toContain(".woff\"");
    });
    expect(new Set(faces.map((face) => face.match(/font-weight: (\d+)/)?.[1]))).toEqual(new Set(["400", "600", "700", "900"]));
    expect(typography).toMatch(/--document-font: "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;/);
  });

  it("defines one scale, four weights, the leadings and trackings as tokens", () => {
    const sizes = [...typography.matchAll(/--document-type-[\w]+: ([\d.]+)pt;/g)].map((match) => Number(match[1]));
    expect(sizes).toEqual([7, 8, 8.5, 9, 10, 10.5, 11, 13, 16, 20, 24, 30, 48, 68]);
    expect([...typography.matchAll(/--document-weight-\w+: (\d+);/g)].map((match) => match[1])).toEqual(["400", "600", "700", "900"]);
    expect(typography).toMatch(/--document-leading-body: 1\.35;/);
    expect(typography).toMatch(/--document-tracking-caps: \.12em;/);
  });

  it.each(documents)("%s prints only token typography: no literal size, weight, leading, tracking or face", (file, marker) => {
    documentRules(file, marker).forEach(({ selector, body }) => {
      const where = `${file} › ${selector.slice(0, 80)}`;
      expect(body, where).not.toMatch(/(?:font-size|--cv-font-[\w-]+|--pf-[\w-]+-size):\s*[\d.]+(?:pt|px|rem|em)/);
      expect(body, where).not.toMatch(/font-weight:\s*\d/);
      expect(body, where).not.toMatch(/line-height:\s*[\d.]+(?![\w%])/);
      expect(body, where).not.toMatch(/letter-spacing:\s*-?[\d.]+em/);
      const family = body.match(/font-family:\s*([^;]+)/)?.[1];
      if (family) expect(family.trim(), where).toBe("var(--document-font)");
    });
  });

  it("is loaded by every document entry and by the Admin (inline Cover Letter preview)", () => {
    const entries = import.meta.glob<string>(["../cv/main.ts", "../cv/dynamicMain.ts", "../portfolio/main.ts", "../cover-letter/main.ts", "../admin/main.ts"], { query: "?raw", import: "default", eager: true });
    Object.entries(entries).forEach(([path, source]) => expect(source, path).toContain('import "../styles/document-typography.css";'));
  });
});
