import type { DocumentTheme, DocumentThemeTokens, StoredDocumentTheme } from "../types/theme";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const parseHexColor = (color: string): [number, number, number] => [
  Number.parseInt(color.slice(1, 3), 16),
  Number.parseInt(color.slice(3, 5), 16),
  Number.parseInt(color.slice(5, 7), 16),
];

const toHexColor = (channels: readonly number[]): string =>
  "#" +
  channels
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

const mixColors = (
  color: string,
  target: string,
  targetWeight: number,
): string => {
  const sourceChannels = parseHexColor(color);
  const targetChannels = parseHexColor(target);

  return toHexColor(
    sourceChannels.map(
      (channel, index) =>
        channel * (1 - targetWeight) + targetChannels[index] * targetWeight,
    ),
  );
};

const relativeLuminance = (color: string): number => {
  const channels = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const getContrastRatio = (
  firstColor: string,
  secondColor: string,
): number => {
  const lighter = Math.max(
    relativeLuminance(firstColor),
    relativeLuminance(secondColor),
  );
  const darker = Math.min(
    relativeLuminance(firstColor),
    relativeLuminance(secondColor),
  );

  return (lighter + 0.05) / (darker + 0.05);
};

const readableTextColor = (background: string): string => {
  const dark = "#111820";
  const light = "#ffffff";

  return getContrastRatio(background, dark) >=
    getContrastRatio(background, light)
    ? dark
    : light;
};

export const isHexColor = (color: string): boolean =>
  HEX_COLOR_PATTERN.test(color);

export const buildDocumentThemeTokens = (
  primary: string,
  accent: string,
): DocumentThemeTokens => {
  if (!isHexColor(primary) || !isHexColor(accent)) {
    throw new Error("Document theme colors must use six-digit HEX values.");
  }

  const normalizedPrimary = primary.toLowerCase();
  const normalizedAccent = accent.toLowerCase();

  return {
    primary: normalizedPrimary,
    primaryStrong: mixColors(normalizedPrimary, "#000000", 0.28),
    accent: normalizedAccent,
    onPrimary: readableTextColor(normalizedPrimary),
    onAccent: readableTextColor(normalizedAccent),
    text: "#111820",
    textMuted: "#4c5d67",
    surface: "#ffffff",
    surfaceMuted: mixColors(normalizedPrimary, "#ffffff", 0.9),
    border: mixColors(normalizedPrimary, "#ffffff", 0.68),
  };
};

const createPreset = (
  id: string,
  name: string,
  primary: string,
  accent: string,
): DocumentTheme => ({
  id,
  name,
  tokens: buildDocumentThemeTokens(primary, accent),
});

export const documentThemes: readonly DocumentTheme[] = [
  createPreset("personal-blue", "Personal Blue", "#087fb6", "#14a8d6"),
  createPreset("professional-navy", "Professional Navy", "#173b57", "#d69e2e"),
  createPreset("engineering-green", "Engineering Green", "#176b5b", "#55b892"),
  createPreset("architectural-burgundy", "Architectural Burgundy", "#7c2432", "#c99a4a"),
  createPreset("neutral-graphite", "Neutral Graphite", "#343a40", "#87949e"),
];

export const findDocumentTheme = (id: string): DocumentTheme | undefined =>
  documentThemes.find((theme) => theme.id === id);

export const createCustomDocumentTheme = (
  primary: string,
  accent: string,
): DocumentTheme => ({
  id: "custom",
  name: "Custom",
  tokens: buildDocumentThemeTokens(primary, accent),
});

export const resolveDocumentTheme = (
  preference: StoredDocumentTheme | undefined,
  fallbackId = "personal-blue",
): DocumentTheme => {
  if (
    preference?.presetId === "custom" &&
    preference.primary &&
    preference.accent &&
    isHexColor(preference.primary) &&
    isHexColor(preference.accent)
  ) {
    return createCustomDocumentTheme(preference.primary, preference.accent);
  }
  return findDocumentTheme(preference?.presetId ?? fallbackId)
    ?? findDocumentTheme(fallbackId)
    ?? documentThemes[0];
};

const CSS_VARIABLES: Readonly<Record<keyof DocumentThemeTokens, string>> = {
  primary: "--document-primary",
  primaryStrong: "--document-primary-strong",
  accent: "--document-accent",
  onPrimary: "--document-on-primary",
  onAccent: "--document-on-accent",
  text: "--document-text",
  textMuted: "--document-text-muted",
  surface: "--document-surface",
  surfaceMuted: "--document-surface-muted",
  border: "--document-border",
};

export const applyDocumentTheme = (
  element: HTMLElement,
  theme: DocumentTheme,
): void => {
  for (const key of Object.keys(CSS_VARIABLES) as (keyof DocumentThemeTokens)[]) {
    element.style.setProperty(CSS_VARIABLES[key], theme.tokens[key]);
  }

  element.dataset.documentTheme = theme.id;
};
