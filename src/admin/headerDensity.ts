export type AdminHeaderDensity = "comfortable" | "compact";

const storageKey = "admin-header-density";
const compactIcon = '<path d="M2.5 8h11M5 2.5 8 5l3-2.5M5 13.5 8 11l3 2.5"/>';
const expandIcon = '<path d="M2.5 8h11M5 4 8 1.5 11 4M5 12l3 2.5 3-2.5"/>';

export const readAdminHeaderDensity = (): AdminHeaderDensity => {
  try {
    return window.localStorage.getItem(storageKey) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
};

const storeAdminHeaderDensity = (density: AdminHeaderDensity): void => {
  try {
    if (density === "compact") window.localStorage.setItem(storageKey, density);
    else window.localStorage.removeItem(storageKey);
  } catch {
    // The preference is a convenience; the header still works for this page view.
  }
};

export const applyAdminHeaderDensity = (density: AdminHeaderDensity): void => {
  if (density === "compact") document.documentElement.dataset.headerDensity = "compact";
  else delete document.documentElement.dataset.headerDensity;
};

// The button keeps the same accessible name; aria-pressed carries the state.
const toggleLabel = "Compact document header";
const toggleTitle = (density: AdminHeaderDensity): string =>
  density === "compact" ? "Expand document header" : "Compact document header";
const toggleIcon = (density: AdminHeaderDensity): string =>
  density === "compact" ? expandIcon : compactIcon;

export const renderAdminHeaderDensityToggle = (density: AdminHeaderDensity = readAdminHeaderDensity()): string =>
  `<button class="button button--secondary admin-header__density-toggle" type="button" data-header-density-toggle aria-pressed="${density === "compact"}" aria-label="${toggleLabel}" title="${toggleTitle(density)}"><svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">${toggleIcon(density)}</svg></button>`;

export const bindAdminHeaderDensityToggle = (root: ParentNode): void => {
  const button = root.querySelector<HTMLButtonElement>("[data-header-density-toggle]");
  button?.addEventListener("click", () => {
    const density: AdminHeaderDensity = button.getAttribute("aria-pressed") === "true" ? "comfortable" : "compact";
    applyAdminHeaderDensity(density);
    storeAdminHeaderDensity(density);
    button.setAttribute("aria-pressed", String(density === "compact"));
    button.title = toggleTitle(density);
    button.querySelector("svg")!.innerHTML = toggleIcon(density);
  });
};
