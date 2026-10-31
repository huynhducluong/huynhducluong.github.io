import type { CropperImage, CropperSelection } from "cropperjs";
import {
  constrainMatrix,
  cropFromRects,
  layoutFromRect,
  matrixForCrop,
  rectForMatrix,
  sameMatrix,
  toRect,
  zoomLevel,
  zoomMatrix,
  type CropState,
} from "./cropGeometry";

export interface CropStage {
  /** The crop the selection currently shows. */
  state: () => CropState;
  zoom: () => number;
  setZoom: (level: number) => void;
  /** Shows a stored or automatic crop without reporting it as a user change. */
  setCrop: (state: CropState) => void;
  /** Stops reporting; call before the cropper is destroyed so teardown transforms are ignored. */
  dispose: () => void;
}

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Resolves once cropper-image has sized and centered itself. `$ready()` alone resolves early for a cached
 * source, and the element's own load handler would then re-center the image over a crop we already set.
 */
export const waitForCropImage = async (image: CropperImage): Promise<void> => {
  await image.$ready();
  const element = image as unknown as { $isReady: boolean };
  for (let frame = 0; frame < 120 && !element.$isReady; frame += 1) await nextFrame();
  await nextFrame();
};

/**
 * Binds a fixed cropper selection over a movable image. Every transform (drag, wheel, slider)
 * is constrained so the image covers the selection, then reported as one CropState.
 */
export const bindCropStage = (
  image: CropperImage,
  selection: CropperSelection,
  { maxZoom, onChange }: { maxZoom: number; onChange: (state: CropState, change: { byUser: boolean; zoom: number }) => void },
): CropStage => {
  let programmatic = false;
  let disposed = false;
  const measure = () => {
    const matrix = image.$getTransform();
    return {
      matrix,
      layout: layoutFromRect(toRect(image.getBoundingClientRect()), matrix),
      selection: toRect(selection.getBoundingClientRect()),
    };
  };
  const apply = (matrix: number[], byUser: boolean): void => {
    programmatic = !byUser;
    try {
      image.$setTransform(matrix);
    } finally {
      programmatic = false;
    }
  };

  image.addEventListener("transform", (event) => {
    if (disposed || !image.isConnected) return;
    const { matrix, oldMatrix } = (event as CustomEvent<{ matrix: number[]; oldMatrix: number[] }>).detail;
    // The element still carries oldMatrix while this event runs.
    const layout = layoutFromRect(toRect(image.getBoundingClientRect()), oldMatrix);
    const bounds = toRect(selection.getBoundingClientRect());
    const constrained = constrainMatrix(matrix, layout, bounds, maxZoom);
    if (!sameMatrix(constrained, matrix)) {
      event.preventDefault();
      if (!sameMatrix(constrained, oldMatrix)) apply(constrained, !programmatic);
      return;
    }
    onChange(cropFromRects(rectForMatrix(layout, matrix), bounds), { byUser: !programmatic, zoom: zoomLevel(matrix, layout, bounds) });
  });

  return {
    state: () => {
      const { matrix, layout, selection: bounds } = measure();
      return cropFromRects(rectForMatrix(layout, matrix), bounds);
    },
    zoom: () => {
      const { matrix, layout, selection: bounds } = measure();
      return zoomLevel(matrix, layout, bounds);
    },
    setZoom: (level) => {
      const { matrix, layout, selection: bounds } = measure();
      apply(zoomMatrix(matrix, layout, bounds, level, maxZoom), true);
    },
    setCrop: (state) => {
      const { layout, selection: bounds } = measure();
      apply(matrixForCrop(state, layout, bounds, maxZoom), false);
    },
    dispose: () => {
      disposed = true;
    },
  };
};
