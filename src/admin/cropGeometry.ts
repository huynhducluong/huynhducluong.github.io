/**
 * Pure crop math shared by every Admin cropper (docs/admin-ui-guidelines.md §7.1).
 * The preview, the saved crop row and the exported file are all derived from one CropState,
 * so what the editor shows is exactly what gets saved.
 */

/** Crop area as fractions (0–1) of the original image. */
export interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** CSS 2D matrix [a, b, c, d, e, f]. Croppers only scale uniformly and translate. */
export type CropMatrix = [number, number, number, number, number, number];

/** The image box before its transform, with the default `transform-origin: center`. */
export interface ImageLayout {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const epsilon = 0.01;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const rounded = (value: number): number => Math.round(value * 100_000_000) / 100_000_000;

export const toRect = ({ left, top, width, height }: Rect): Rect => ({ left, top, width, height });

/** The largest centered crop of `targetRatio` (width / height) inside the source. */
export const automaticCrop = (sourceWidth: number, sourceHeight: number, targetRatio: number): CropState => {
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > targetRatio) {
    const width = targetRatio / sourceRatio;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = sourceRatio / targetRatio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
};

/** Keeps a crop inside the source; used for stored rows, never to hide an editor mismatch. */
export const clampCrop = (state: CropState): CropState => {
  const width = clamp(state.width, 0.000001, 1);
  const height = clamp(state.height, 0.000001, 1);
  return {
    x: rounded(clamp(state.x, 0, 1 - width)),
    y: rounded(clamp(state.y, 0, 1 - height)),
    width: rounded(width),
    height: rounded(height),
  };
};

/** Source pixels to draw for a crop: the exact arguments for `drawImage(source, sx, sy, sw, sh, …)`. */
export const cropSourceRect = (state: CropState, sourceWidth: number, sourceHeight: number): { sx: number; sy: number; sw: number; sh: number } => ({
  sx: state.x * sourceWidth,
  sy: state.y * sourceHeight,
  sw: state.width * sourceWidth,
  sh: state.height * sourceHeight,
});

/** Inline style that places the full source inside an `overflow: hidden` frame so only the crop shows. */
export const cropPreviewStyle = (state: CropState): string => {
  const percent = (value: number): string => `${rounded(value * 100)}%`;
  return `width:${percent(1 / state.width)};height:${percent(1 / state.height)};left:${percent(-state.x / state.width)};top:${percent(-state.y / state.height)}`;
};

/** The crop a selection box covers on a transformed image, both measured in the same coordinates. */
export const cropFromRects = (image: Rect, selection: Rect): CropState => clampCrop({
  x: (selection.left - image.left) / image.width,
  y: (selection.top - image.top) / image.height,
  width: selection.width / image.width,
  height: selection.height / image.height,
});

export const layoutFromRect = (rect: Rect, matrix: readonly number[]): ImageLayout => {
  const [a, , , d, e, f] = matrix;
  return {
    centerX: rect.left + rect.width / 2 - e,
    centerY: rect.top + rect.height / 2 - f,
    width: rect.width / a,
    height: rect.height / d,
  };
};

export const rectForMatrix = (layout: ImageLayout, matrix: readonly number[]): Rect => {
  const [a, , , d, e, f] = matrix;
  const width = layout.width * a;
  const height = layout.height * d;
  return { left: layout.centerX + e - width / 2, top: layout.centerY + f - height / 2, width, height };
};

/** Smallest scale at which the image still covers the selection; zoom level 1. */
export const coverScale = (layout: ImageLayout, selection: Rect): number =>
  Math.max(selection.width / layout.width, selection.height / layout.height);

export const zoomLevel = (matrix: readonly number[], layout: ImageLayout, selection: Rect): number =>
  matrix[0] / coverScale(layout, selection);

const matrixForRect = (layout: ImageLayout, scale: number, left: number, top: number): CropMatrix => {
  const width = layout.width * scale;
  const height = layout.height * scale;
  return [scale, 0, 0, scale, left + width / 2 - layout.centerX, top + height / 2 - layout.centerY];
};

/** Clamps zoom to [1, maxZoom] and pans so the image always covers the selection (no empty pixels). */
export const constrainMatrix = (matrix: readonly number[], layout: ImageLayout, selection: Rect, maxZoom: number): CropMatrix => {
  const minScale = coverScale(layout, selection);
  const scale = clamp(matrix[0], minScale, minScale * maxZoom);
  const proposed = rectForMatrix(layout, [scale, 0, 0, scale, matrix[4], matrix[5]]);
  const left = clamp(proposed.left, selection.left + selection.width - proposed.width, selection.left);
  const top = clamp(proposed.top, selection.top + selection.height - proposed.height, selection.top);
  return matrixForRect(layout, scale, left, top);
};

export const sameMatrix = (left: readonly number[], right: readonly number[]): boolean =>
  left.every((value, index) => Math.abs(value - right[index]) < (index < 4 ? 0.000001 : epsilon));

/** The matrix that shows `state` inside the selection. */
export const matrixForCrop = (state: CropState, layout: ImageLayout, selection: Rect, maxZoom: number): CropMatrix => {
  const scale = selection.width / (state.width * layout.width);
  const width = layout.width * scale;
  const height = layout.height * scale;
  return constrainMatrix(
    matrixForRect(layout, scale, selection.left - state.x * width, selection.top - state.y * height),
    layout,
    selection,
    maxZoom,
  );
};

/** Zooms to `level` (1 = cover) while keeping the image point under the selection center in place. */
export const zoomMatrix = (matrix: readonly number[], layout: ImageLayout, selection: Rect, level: number, maxZoom: number): CropMatrix => {
  const current = rectForMatrix(layout, matrix);
  const scale = coverScale(layout, selection) * clamp(level, 1, maxZoom);
  const anchorX = selection.left + selection.width / 2;
  const anchorY = selection.top + selection.height / 2;
  const u = (anchorX - current.left) / current.width;
  const v = (anchorY - current.top) / current.height;
  const width = layout.width * scale;
  const height = layout.height * scale;
  return constrainMatrix(matrixForRect(layout, scale, anchorX - u * width, anchorY - v * height), layout, selection, maxZoom);
};
