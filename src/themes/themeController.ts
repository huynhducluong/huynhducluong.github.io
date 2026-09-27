import {
  applyDocumentTheme,
  createCustomDocumentTheme,
  documentThemes,
  findDocumentTheme,
  getContrastRatio,
  isHexColor,
} from "./documentThemes";
import type { DocumentTheme, StoredDocumentTheme } from "../types/theme";

interface DocumentThemeControllerOptions {
  documentRoot: HTMLElement;
  controlsRoot: HTMLElement;
  defaultThemeId: string;
  storageKey: string;
}

const readStoredTheme = (storageKey: string): StoredDocumentTheme | null => {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const value = JSON.parse(rawValue) as Partial<StoredDocumentTheme>;

    if (typeof value.presetId !== "string") {
      return null;
    }

    return {
      presetId: value.presetId,
      primary: typeof value.primary === "string" ? value.primary : undefined,
      accent: typeof value.accent === "string" ? value.accent : undefined,
    };
  } catch {
    return null;
  }
};

const storeTheme = (
  storageKey: string,
  preference: StoredDocumentTheme,
): void => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preference));
  } catch {
    // Theme persistence is optional when browser storage is unavailable.
  }
};

const clearStoredTheme = (storageKey: string): void => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Reset still applies to the current page when storage is unavailable.
  }
};

const resolveStoredTheme = (
  storedTheme: StoredDocumentTheme | null,
  fallbackTheme: DocumentTheme,
): DocumentTheme => {
  if (!storedTheme) {
    return fallbackTheme;
  }

  if (
    storedTheme.presetId === "custom" &&
    storedTheme.primary &&
    storedTheme.accent &&
    isHexColor(storedTheme.primary) &&
    isHexColor(storedTheme.accent)
  ) {
    return createCustomDocumentTheme(
      storedTheme.primary,
      storedTheme.accent,
    );
  }

  return findDocumentTheme(storedTheme.presetId) ?? fallbackTheme;
};

export const initializeDocumentThemeControls = ({
  documentRoot,
  controlsRoot,
  defaultThemeId,
  storageKey,
}: DocumentThemeControllerOptions): void => {
  const fallbackTheme =
    findDocumentTheme(defaultThemeId) ?? documentThemes[0];
  const presetSelect =
    controlsRoot.querySelector<HTMLSelectElement>("[data-theme-preset]");
  const primaryInput =
    controlsRoot.querySelector<HTMLInputElement>("[data-theme-primary]");
  const accentInput =
    controlsRoot.querySelector<HTMLInputElement>("[data-theme-accent]");
  const resetButton =
    controlsRoot.querySelector<HTMLButtonElement>("[data-theme-reset]");
  const feedback =
    controlsRoot.querySelector<HTMLElement>("[data-theme-feedback]");

  if (!presetSelect || !primaryInput || !accentInput || !resetButton) {
    throw new Error("Document theme controls are incomplete.");
  }

  const updateFeedback = (theme: DocumentTheme): void => {
    if (!feedback) {
      return;
    }

    const primaryContrast = getContrastRatio(
      theme.tokens.primary,
      theme.tokens.onPrimary,
    );
    const accentContrast = getContrastRatio(
      theme.tokens.accent,
      theme.tokens.onAccent,
    );
    const minimumContrast = Math.min(primaryContrast, accentContrast);

    feedback.textContent =
      minimumContrast >= 4.5
        ? "Accessible text colors selected automatically. Saved on this device."
        : "Low contrast detected. Choose a darker or lighter brand color.";
    feedback.classList.toggle(
      "cv-theme-panel__feedback--warning",
      minimumContrast < 4.5,
    );
  };

  const syncControls = (theme: DocumentTheme): void => {
    presetSelect.value =
      theme.id === "custom" || findDocumentTheme(theme.id)
        ? theme.id
        : fallbackTheme.id;
    primaryInput.value = theme.tokens.primary;
    accentInput.value = theme.tokens.accent;
  };

  const applyTheme = (theme: DocumentTheme): void => {
    applyDocumentTheme(documentRoot, theme);
    syncControls(theme);
    updateFeedback(theme);
  };

  const storedTheme = readStoredTheme(storageKey);
  applyTheme(resolveStoredTheme(storedTheme, fallbackTheme));

  const applyCustomTheme = (): void => {
    const customTheme = createCustomDocumentTheme(
      primaryInput.value,
      accentInput.value,
    );

    applyTheme(customTheme);
    storeTheme(storageKey, {
      presetId: "custom",
      primary: customTheme.tokens.primary,
      accent: customTheme.tokens.accent,
    });
  };

  presetSelect.addEventListener("change", () => {
    if (presetSelect.value === "custom") {
      applyCustomTheme();
      return;
    }

    const selectedTheme = findDocumentTheme(presetSelect.value);

    if (!selectedTheme) {
      return;
    }

    applyTheme(selectedTheme);
    storeTheme(storageKey, { presetId: selectedTheme.id });
  });

  primaryInput.addEventListener("input", applyCustomTheme);
  accentInput.addEventListener("input", applyCustomTheme);

  resetButton.addEventListener("click", () => {
    clearStoredTheme(storageKey);
    applyTheme(fallbackTheme);
  });
};
