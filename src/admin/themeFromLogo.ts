import { escapeHtml } from "../shared/format";
import { extractLogoPalette, type LogoPalettePair } from "../shared/logoPalette";
import { buildDocumentThemeTokens, DOCUMENT_TEXT_CONTRAST, getContrastRatio } from "../themes/documentThemes";
import { showAdminToast } from "./toast";

/** "Pick colors from logo": loaded on demand. The logo is read on a small canvas and dropped; nothing is stored or sent. */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_SIDE = 128;

const readPixels = async (file: File): Promise<Uint8ClampedArray> => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(image.naturalWidth || MAX_LOGO_SIDE, image.naturalHeight || MAX_LOGO_SIDE));
    const width = Math.max(1, Math.round((image.naturalWidth || MAX_LOGO_SIDE) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || MAX_LOGO_SIDE) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is not available.");
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height).data;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Contrast line for a chosen pair: the ratio the document will really print, and whether the primary had to change. */
export const themeContrastNote = (pair: LogoPalettePair): string => {
  const tokens = buildDocumentThemeTokens(pair.primary, pair.accent);
  const ratio = getContrastRatio(tokens.primary, tokens.onPrimary);
  const adjusted = tokens.primary !== pair.primary.toLowerCase();
  return `Text on primary ${ratio.toFixed(1)} : 1, ${ratio >= DOCUMENT_TEXT_CONTRAST ? "passes" : "below 4.5 : 1"}${adjusted ? ". Adjusted for contrast" : ""}.`;
};

const swatch = (color: string): string => `<span class="admin-theme-pair__swatch" style="--swatch: ${escapeHtml(color)}" aria-hidden="true"></span>`;

const applyPair = (block: HTMLElement, pair: LogoPalettePair): void => {
  const root = block.closest<HTMLElement>(".admin-document-theme-field");
  const [primary, accent] = root?.querySelectorAll<HTMLInputElement>('.admin-document-theme input[type="color"]') ?? [];
  const preset = root?.querySelector<HTMLSelectElement>(".admin-document-theme select");
  if (!primary || !accent || !preset) return;
  preset.value = "custom";
  primary.value = pair.primary;
  accent.value = pair.accent;
  for (const input of [primary, accent]) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  block.querySelectorAll<HTMLButtonElement>("[data-pair]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.primary === pair.primary && button.dataset.accent === pair.accent));
  });
  const hint = block.querySelector<HTMLElement>("[data-theme-logo-hint]");
  if (hint) hint.textContent = themeContrastNote(pair);
};

export const handleLogoFile = async (input: HTMLInputElement): Promise<void> => {
  const block = input.closest<HTMLElement>("[data-theme-logo]");
  const file = input.files?.[0];
  input.value = "";
  if (!block || !file) return;
  const hint = block.querySelector<HTMLElement>("[data-theme-logo-hint]");
  const list = block.querySelector<HTMLElement>("[data-theme-logo-pairs]");
  if (!file.type.startsWith("image/")) {
    showAdminToast("Choose an image file (PNG, JPG, SVG or WebP).", "error");
    return;
  }
  if (file.size > MAX_LOGO_BYTES) {
    showAdminToast("That logo is larger than 5 MB. Choose a smaller image.", "error");
    return;
  }
  let pairs: LogoPalettePair[];
  try {
    pairs = extractLogoPalette(await readPixels(file));
  } catch {
    showAdminToast("That image could not be read. Try a PNG, JPG or SVG.", "error");
    return;
  }
  if (list) {
    list.innerHTML = pairs
      .map((pair, index) => `<button type="button" class="button button--secondary admin-theme-pair" data-pair="${index}" data-primary="${escapeHtml(pair.primary)}" data-accent="${escapeHtml(pair.accent)}" aria-pressed="false">${swatch(pair.primary)}${swatch(pair.accent)}<span>${escapeHtml(pair.primary)} + ${escapeHtml(pair.accent)}</span></button>`)
      .join("");
    list.querySelectorAll<HTMLButtonElement>("[data-pair]").forEach((button) => {
      button.addEventListener("click", () => applyPair(block, pairs[Number(button.dataset.pair)]));
    });
  }
  if (hint) hint.textContent = pairs.length ? "Choose a pair to use it as Primary and Accent." : "No prominent color found in this logo.";
};
