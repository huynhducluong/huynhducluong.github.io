import type { LocalizedText, Profile } from "../types/career";

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

const normalizeNameSpacing = (value: string): string =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");

export const vietnameseToAscii = (value: string): string => normalizeNameSpacing(value)
  .replace(/[Đđ]/g, (character) => character === "Đ" ? "D" : "d")
  .normalize("NFD")
  .replace(/\p{M}+/gu, "")
  .normalize("NFC");

export const normalizeProfileName = (value: LocalizedText | string | null | undefined): LocalizedText => {
  const vi = normalizeNameSpacing(typeof value === "string" ? value : String(value?.vi ?? value?.en ?? ""));
  return { vi, en: vietnameseToAscii(vi) };
};

export const profileName = (
  value: LocalizedText | string | null | undefined,
  language: Language,
): string => normalizeProfileName(value)[language];

export const normalizeProfile = (value: Profile): Profile => ({
  ...value,
  name: normalizeProfileName(value.name as LocalizedText | string),
});

const degreeClassificationPrefixes: Record<Language, RegExp> = {
  en: /^degree\s+classification\s*:\s*/i,
  vi: /^xếp\s+loại\s+tốt\s+nghiệp\s*:\s*/i,
};

export const degreeClassificationValue = (value: string, language: Language): string =>
  value.trim().replace(degreeClassificationPrefixes[language], "").trim();

export const formatDegreeClassification = (
  classification: LocalizedText | undefined,
  language: Language,
): string => {
  const value = degreeClassificationValue(classification?.[language] ?? "", language);
  if (!value) return "";
  const label = language === "vi" ? "Xếp loại tốt nghiệp" : "Degree classification";
  return escapeHtml(`${label}: ${value}`);
};

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

export const assetUrl = (path: string): string => {
  const normalized = path.trim();
  if (!normalized) return "";
  if (/^(?:https?:\/\/|data:image\/|blob:)/i.test(normalized)) return normalized;
  return import.meta.env.BASE_URL + normalized.replace(/^\/+/, "");
};
