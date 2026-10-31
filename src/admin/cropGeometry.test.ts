import { describe, expect, it } from "vitest";
import {
  automaticCrop,
  constrainMatrix,
  coverScale,
  cropFromRects,
  cropPreviewStyle,
  cropSourceRect,
  layoutFromRect,
  matrixForCrop,
  rectForMatrix,
  zoomLevel,
  zoomMatrix,
  type CropState,
  type ImageLayout,
  type Rect,
} from "./cropGeometry";

// A 2283 × 1275 source (the Portfolio screenshot that exposed the drift), drawn at half size.
const source = { width: 2283, height: 1275 };
const layout: ImageLayout = { centerX: 500, centerY: 300, width: source.width / 2, height: source.height / 2 };
const formats = [
  { id: "wide", ratio: 21 / 9 },
  { id: "landscape", ratio: 4 / 3 },
  { id: "portrait", ratio: 3 / 4 },
];
const selectionFor = (ratio: number): Rect => {
  const height = 400;
  const width = height * ratio;
  return { left: 500 - width / 2, top: 100, width, height };
};
const covers = (image: Rect, selection: Rect): boolean =>
  image.left <= selection.left + 0.001
  && image.top <= selection.top + 0.001
  && image.left + image.width >= selection.left + selection.width - 0.001
  && image.top + image.height >= selection.top + selection.height - 0.001;

describe("crop geometry", () => {
  it.each(formats)("round-trips a crop through the editor matrix for $id", ({ ratio }) => {
    const selection = selectionFor(ratio);
    const automatic = automaticCrop(source.width, source.height, ratio);
    const state: CropState = { ...automatic, width: automatic.width * 0.6, height: automatic.height * 0.6, x: automatic.x + 0.05, y: automatic.y + 0.04 };
    const matrix = matrixForCrop(state, layout, selection, 4);
    const shown = cropFromRects(rectForMatrix(layout, matrix), selection);

    expect(shown.x).toBeCloseTo(state.x, 6);
    expect(shown.y).toBeCloseTo(state.y, 6);
    expect(shown.width).toBeCloseTo(state.width, 6);
    expect(shown.height).toBeCloseTo(state.height, 6);
  });

  it.each(formats)("exports and previews the same pixels the editor shows for $id", ({ ratio }) => {
    const selection = selectionFor(ratio);
    const state = automaticCrop(source.width, source.height, ratio);
    const shown = cropFromRects(rectForMatrix(layout, matrixForCrop(state, layout, selection, 4)), selection);
    const rect = cropSourceRect(shown, source.width, source.height);

    expect(rect.sw / rect.sh).toBeCloseTo(ratio, 4);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(source.width + 0.001);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(source.height + 0.001);
    expect(cropPreviewStyle({ x: 0.25, y: 0.1, width: 0.5, height: 0.8 })).toBe("width:200%;height:125%;left:-50%;top:-12.5%");
  });

  it.each(formats)("never leaves empty pixels inside the $id selection", ({ ratio }) => {
    const selection = selectionFor(ratio);
    const minScale = coverScale(layout, selection);
    const attempts = [
      [minScale * 0.5, 0, 0, minScale * 0.5, 0, 0],
      [minScale, 0, 0, minScale, 900, 0],
      [minScale * 2, 0, 0, minScale * 2, -900, 600],
      [minScale * 9, 0, 0, minScale * 9, 0, 0],
    ];
    attempts.forEach((attempt) => {
      const constrained = constrainMatrix(attempt, layout, selection, 4);
      expect(covers(rectForMatrix(layout, constrained), selection)).toBe(true);
      expect(zoomLevel(constrained, layout, selection)).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(zoomLevel(constrained, layout, selection)).toBeLessThanOrEqual(4 + 1e-9);
    });
  });

  it("zooms around the selection center", () => {
    const selection = selectionFor(4 / 3);
    const start = matrixForCrop(automaticCrop(source.width, source.height, 4 / 3), layout, selection, 4);
    const before = cropFromRects(rectForMatrix(layout, start), selection);
    const after = cropFromRects(rectForMatrix(layout, zoomMatrix(start, layout, selection, 2, 4)), selection);

    expect(after.width).toBeCloseTo(before.width / 2, 6);
    expect(after.x + after.width / 2).toBeCloseTo(before.x + before.width / 2, 6);
    expect(after.y + after.height / 2).toBeCloseTo(before.y + before.height / 2, 6);
  });

  it("recovers the untransformed layout from a measured rectangle", () => {
    const matrix = [1.5, 0, 0, 1.5, 40, -20];
    const measured = rectForMatrix(layout, matrix);
    const recovered = layoutFromRect(measured, matrix);

    expect(recovered.centerX).toBeCloseTo(layout.centerX, 6);
    expect(recovered.centerY).toBeCloseTo(layout.centerY, 6);
    expect(recovered.width).toBeCloseTo(layout.width, 6);
  });
});
