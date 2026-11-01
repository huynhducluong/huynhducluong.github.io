import { describe, expect, it } from "vitest";
import { normalizeTurns, rotatedOriginalType, rotatedSize, rotationLabel, rotationTransform } from "./imageRotation";

describe("quarter-turn image rotation (§7.1)", () => {
  it("normalizes clockwise and counter-clockwise turns", () => {
    expect([0, 1, 2, 3, 4, 5, -1, -2, -5].map(normalizeTurns)).toEqual([0, 1, 2, 3, 0, 1, 3, 2, 3]);
  });

  it("swaps the size on odd turns only", () => {
    expect(rotatedSize(1804, 1016, 1)).toEqual({ width: 1016, height: 1804 });
    expect(rotatedSize(1804, 1016, 2)).toEqual({ width: 1804, height: 1016 });
    expect(rotatedSize(1804, 1016, 3)).toEqual({ width: 1016, height: 1804 });
  });

  it("translates so the rotated image lands exactly inside the rotated canvas", () => {
    // A corner of the source (x, y) maps to (tx + x·cos − y·sin, ty + x·sin + y·cos); every corner must stay in bounds.
    [1, 2, 3].forEach((turns) => {
      const t = rotationTransform(400, 300, turns as 1 | 2 | 3);
      const cos = Math.round(Math.cos(t.angle));
      const sin = Math.round(Math.sin(t.angle));
      [[0, 0], [400, 0], [0, 300], [400, 300]].forEach(([x, y]) => {
        const px = t.translateX + x * cos - y * sin;
        const py = t.translateY + x * sin + y * cos;
        expect(px, `turns ${turns}`).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThanOrEqual(t.width);
        expect(py).toBeGreaterThanOrEqual(0);
        expect(py).toBeLessThanOrEqual(t.height);
      });
    });
  });

  it("names the turn for the crop meta line and keeps the original file type", () => {
    expect(rotationLabel(0)).toBe("");
    expect(rotationLabel(1)).toBe("Rotated 90° clockwise");
    expect(rotationLabel(3)).toBe("Rotated 90° counter-clockwise");
    expect(rotatedOriginalType("image/png")).toBe("image/png");
    expect(rotatedOriginalType("image/jpeg")).toBe("image/jpeg");
    expect(rotatedOriginalType("image/avif")).toBe("image/webp");
  });
});
