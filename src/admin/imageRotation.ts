/**
 * Quarter-turn rotation of a crop source (docs/admin-ui-guidelines.md §7.1). Rotating replaces the source the cropper
 * shows: crop geometry keeps working on an upright image and never needs rotation math of its own.
 */
export type QuarterTurns = 0 | 1 | 2 | 3;

/** 1 = 90° clockwise; negative turns go counter-clockwise. */
export const normalizeTurns = (turns: number): QuarterTurns => (((Math.round(turns) % 4) + 4) % 4) as QuarterTurns;

export const rotatedSize = (width: number, height: number, turns: QuarterTurns): { width: number; height: number } =>
  turns % 2 ? { width: height, height: width } : { width, height };

/** Canvas transform that draws a `width` × `height` image rotated by `turns` into the rotated canvas size. */
export const rotationTransform = (width: number, height: number, turns: QuarterTurns): { width: number; height: number; translateX: number; translateY: number; angle: number } => {
  const size = rotatedSize(width, height, turns);
  const translate: Record<QuarterTurns, [number, number]> = { 0: [0, 0], 1: [size.width, 0], 2: [size.width, size.height], 3: [0, size.height] };
  return { ...size, translateX: translate[turns][0], translateY: translate[turns][1], angle: (turns * Math.PI) / 2 };
};

export const rotationLabel = (turns: QuarterTurns): string =>
  turns === 0 ? "" : turns === 2 ? "Rotated 180°" : turns === 1 ? "Rotated 90° clockwise" : "Rotated 90° counter-clockwise";

type Drawable = CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number };

/** Draws the untouched original rotated, so repeated turns never re-encode the image. */
export const drawRotated = (image: Drawable, turns: QuarterTurns): HTMLCanvasElement => {
  const width = image.naturalWidth ?? image.width;
  const height = image.naturalHeight ?? image.height;
  const transform = rotationTransform(width, height, turns);
  const canvas = document.createElement("canvas");
  canvas.width = transform.width;
  canvas.height = transform.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not prepare the rotation canvas.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.translate(transform.translateX, transform.translateY);
  context.rotate(transform.angle);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality = 0.92): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("This browser could not export the rotated image."));
  }, type, quality);
});

/** Original formats keep their type; anything else (AVIF, GIF) is saved as WebP, which every Portfolio page reads. */
export const rotatedOriginalType = (mimeType: string): "image/jpeg" | "image/png" | "image/webp" =>
  mimeType === "image/png" ? "image/png" : mimeType === "image/jpeg" ? "image/jpeg" : "image/webp";
