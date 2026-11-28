import { describe, expect, it } from "vitest";
import { extractLogoPalette, LOGO_MIN_HUE_DIFFERENCE, logoAccentVariant } from "./logoPalette";

type Rgba = [number, number, number, number];

const RED: Rgba = [214, 40, 40, 255];
const BLUE: Rgba = [20, 90, 200, 255];
const GREEN: Rgba = [30, 160, 80, 255];
const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];
const GRAY: Rgba = [128, 128, 128, 255];
const CLEAR: Rgba = [214, 40, 40, 0];

const pixels = (...runs: Array<[Rgba, number]>): number[] => runs.flatMap(([color, count]) => Array.from({ length: count }, () => color).flat());
const hue = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta) return 0;
  const sector = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
};
const hueGap = (first: string, second: string): number => {
  const gap = Math.abs(hue(first) - hue(second));
  return Math.min(gap, 360 - gap);
};

describe("extractLogoPalette", () => {
  it("takes the larger color as Primary and a clearly different hue as Accent", () => {
    const [first] = extractLogoPalette(pixels([RED, 600], [BLUE, 300], [WHITE, 1000]));
    expect(first.primary).toBe("#d62828");
    expect(first.accent).toBe("#145ac8");
    expect(hueGap(first.primary, first.accent)).toBeGreaterThanOrEqual(LOGO_MIN_HUE_DIFFERENCE);
  });

  it("offers the second color as Primary too, at most three pairs, best first", () => {
    const pairs = extractLogoPalette(pixels([RED, 600], [BLUE, 300], [GREEN, 100]));
    expect(pairs.length).toBeLessThanOrEqual(3);
    expect(pairs.map((pair) => pair.primary)).toEqual(["#d62828", "#145ac8", "#1ea050"]);
    expect(pairs[1].accent).toBe("#d62828");
  });

  it("makes the Accent a variant of the one color of a mostly white logo", () => {
    const pairs = extractLogoPalette(pixels([GREEN, 200], [WHITE, 1800]));
    expect(pairs).toHaveLength(2);
    expect(pairs.map((pair) => pair.primary)).toEqual(["#1ea050", "#1ea050"]);
    expect(pairs[0].accent).toBe(logoAccentVariant([30, 160, 80]));
    expect(pairs[1].accent).toBe(logoAccentVariant([30, 160, 80], true));
    expect(pairs[0].accent).not.toBe(pairs[1].accent);
  });

  it("gives a lighter variant for dark colors and a darker one for light colors", () => {
    const luminance = (hex: string): number => 0.2126 * Number.parseInt(hex.slice(1, 3), 16) + 0.7152 * Number.parseInt(hex.slice(3, 5), 16) + 0.0722 * Number.parseInt(hex.slice(5, 7), 16);
    expect(luminance(logoAccentVariant([20, 40, 120]))).toBeGreaterThan(luminance("#142878"));
    expect(luminance(logoAccentVariant([20, 40, 120], true))).toBeLessThan(luminance("#142878"));
    expect(luminance(logoAccentVariant([250, 220, 60]))).toBeLessThan(luminance("#fadc3c"));
  });

  it("drops anti-aliased edges: a one-color logo gives only its color and two variants", () => {
    // Core ink, ink blended with white (opaque light edge), ink blended with black, and half-transparent edge pixels.
    const edge = extractLogoPalette(pixels([GREEN, 400], [[142, 207, 167, 255], 90], [[16, 85, 44, 255], 50], [[30, 160, 80, 120], 200], [WHITE, 1500]));
    expect(edge).toHaveLength(2);
    expect(edge.every((pair) => pair.primary === "#1ea050")).toBe(true);
    const all = edge.flatMap((pair) => [pair.primary, pair.accent]);
    expect(all).not.toContain("#8ecfa7");
    expect(all).not.toContain("#10552c");
  });

  it("keeps a second color of the same hue family when it is a real part of the logo", () => {
    const pairs = extractLogoPalette(pixels([[20, 60, 160, 255], 500], [[90, 150, 235, 255], 400], [WHITE, 500]));
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    expect(pairs.map((pair) => pair.primary)).toContain("#5a96eb");
  });

  it("returns nothing for black, white and gray logos", () => {
    expect(extractLogoPalette(pixels([BLACK, 500], [WHITE, 1500]))).toEqual([]);
    expect(extractLogoPalette(pixels([GRAY, 400], [WHITE, 400]))).toEqual([]);
    expect(extractLogoPalette([])).toEqual([]);
  });

  it("ignores transparent pixels", () => {
    expect(extractLogoPalette(pixels([CLEAR, 2000]))).toEqual([]);
    const [pair] = extractLogoPalette(pixels([CLEAR, 5000], [BLUE, 50]));
    expect(pair.primary).toBe("#145ac8");
  });

  it("merges the shades of one color and keeps a stable order", () => {
    const shades: Rgba[] = [[214, 40, 40, 255], [220, 48, 44, 255], [208, 36, 36, 255]];
    const forward = extractLogoPalette(pixels([shades[0], 100], [shades[1], 100], [shades[2], 100], [BLUE, 150]));
    const backward = extractLogoPalette(pixels([BLUE, 150], [shades[2], 100], [shades[1], 100], [shades[0], 100]));
    expect(forward.map((pair) => pair.primary)).toHaveLength(2);
    expect(forward[0].primary).toMatch(/^#d[0-9a-f]2[0-9a-f]2[0-9a-f]$/);
    expect(backward).toEqual(forward);
  });
});
