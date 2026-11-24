/**
 * Picks Primary / Accent suggestions from a downscaled logo (RGBA, row after row). Pure and dependency free:
 * the Admin draws the logo on a small canvas, passes the pixels here and drops the image (nothing is stored).
 */

export interface LogoPalettePair {
  primary: string;
  accent: string;
}

/** Pixels with alpha below this are background or a half-transparent anti-aliased edge, not logo ink. */
export const LOGO_MIN_ALPHA = 250;
/** HSV saturation below this is white / gray / black ink, not a brand color. */
export const LOGO_MIN_SATURATION = 0.2;
/** HSV value below this is near black. */
export const LOGO_MIN_VALUE = 0.2;
/** Two buckets closer than this (RGB distance) are one color of the logo. */
export const LOGO_MERGE_DISTANCE = 64;
/** An accent must differ from its primary by at least this many degrees of hue. */
export const LOGO_MIN_HUE_DIFFERENCE = 30;
/**
 * A color of the same hue family as a bigger one, with less than this share of its area, is an anti-aliased edge
 * (ink blended with the background), not a color of the logo.
 */
export const LOGO_EDGE_SHARE = 0.5;
/** Most suggested pairs. */
export const LOGO_MAX_PAIRS = 3;

interface Cluster {
  rgb: [number, number, number];
  count: number;
  score: number;
  hue: number;
}

const toHex = (rgb: readonly number[]): string =>
  `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;

const hsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? delta / max : 0, v: max / 255 };
};

const hueDistance = (first: number, second: number): number => {
  const gap = Math.abs(first - second) % 360;
  return Math.min(gap, 360 - gap);
};

const rgbDistance = (first: readonly number[], second: readonly number[]): number =>
  Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);

/** A lighter variant of dark colors, a darker one of light colors: the Accent of a one-color logo. */
export const logoAccentVariant = (rgb: readonly number[], opposite = false): string => {
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const lighter = (luminance < 0.5) !== opposite;
  const weight = lighter ? 0.35 : 0.3;
  return toHex(rgb.map((channel) => channel * (1 - weight) + (lighter ? 255 : 0) * weight));
};

/** Distinct colors of the logo, most prominent first (area × saturation). */
const clusterColors = (pixels: ArrayLike<number>): Cluster[] => {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < LOGO_MIN_ALPHA) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const { s, v } = hsv(r, g, b);
    if (s < LOGO_MIN_SATURATION || v < LOGO_MIN_VALUE) continue;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else buckets.set(key, { r, g, b, count: 1 });
  }
  const colors = [...buckets.entries()]
    .map(([key, bucket]) => {
      const rgb: [number, number, number] = [bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count];
      return { key, rgb, count: bucket.count, score: bucket.count * (0.5 + hsv(...rgb).s) };
    })
    // The key breaks ties so the order never depends on pixel order.
    .sort((first, second) => second.score - first.score || first.key - second.key);
  const clusters: Cluster[] = [];
  for (const color of colors) {
    const home = clusters.find((cluster) => rgbDistance(cluster.rgb, color.rgb) < LOGO_MERGE_DISTANCE);
    if (home) {
      home.count += color.count;
      home.score += color.score;
    } else clusters.push({ rgb: color.rgb, count: color.count, score: color.score, hue: hsv(...color.rgb).h });
  }
  clusters.sort((first, second) => second.score - first.score);
  const kept: Cluster[] = [];
  for (const cluster of clusters) {
    const leader = kept.find((other) => hueDistance(other.hue, cluster.hue) < LOGO_MIN_HUE_DIFFERENCE);
    if (!leader || cluster.score >= leader.score * LOGO_EDGE_SHARE) kept.push(cluster);
  }
  return kept;
};

/**
 * Up to three Primary / Accent pairs, best first. Primary is the most prominent color; Accent the most prominent
 * other color at least 30° of hue away (or a lighter / darker variant of the Primary when there is none). Logos
 * that are only black, white or gray give an empty list. A logo of one hue gives two pairs at most: its color with a
 * lighter and with a darker variant (never a muddy edge shade).
 */
export const extractLogoPalette = (pixels: ArrayLike<number>): LogoPalettePair[] => {
  const clusters = clusterColors(pixels);
  const pairs: LogoPalettePair[] = [];
  if (clusters.length === 1) {
    const [only] = clusters;
    return [{ primary: toHex(only.rgb), accent: logoAccentVariant(only.rgb) }, { primary: toHex(only.rgb), accent: logoAccentVariant(only.rgb, true) }];
  }
  for (const [index, primary] of clusters.slice(0, LOGO_MAX_PAIRS).entries()) {
    const partner = clusters.find((other, otherIndex) => otherIndex !== index && hueDistance(other.hue, primary.hue) >= LOGO_MIN_HUE_DIFFERENCE);
    const pair = { primary: toHex(primary.rgb), accent: partner ? toHex(partner.rgb) : logoAccentVariant(primary.rgb) };
    if (!pairs.some((item) => item.primary === pair.primary && item.accent === pair.accent)) pairs.push(pair);
  }
  return pairs;
};
