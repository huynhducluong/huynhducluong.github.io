import type { LocalizedText } from "../types/career";

export type Language = keyof LocalizedText;

export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

export const localize = (
  value: LocalizedText,
  language: Language,
): string => escapeHtml(value[language]);

export const formatDate = (date: string, language: Language): string => {
  const [year, month] = date.split("-").map(Number);

  if (!year || !month) {
    return escapeHtml(date);
  }

  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1)));
};

export const formatNumericDate = (date: string): string => {
  const [year, month] = date.split("-");
  return month ? month + "/" + year : year;
};

export const assetUrl = (path: string): string =>
  import.meta.env.BASE_URL + path.replace(/^\/+/, "");
