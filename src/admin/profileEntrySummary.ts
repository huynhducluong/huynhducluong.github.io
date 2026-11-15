import type { Education, Experience } from "../types/career";

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** "2021-03" → "03/2021"; anything not shaped like a month is dropped rather than shown broken. */
const formatMonth = (value: string | null | undefined): string => {
  const match = MONTH_PATTERN.exec((value ?? "").trim());
  return match ? `${match[2]}/${match[1]}` : "";
};

const joinParts = (parts: string[]): string => parts.map((part) => part.trim()).filter(Boolean).join(" · ");

export const experiencePeriodSummary = (startDate: string, endDate: string | null): string => {
  const start = formatMonth(startDate);
  const end = formatMonth(endDate) || "Present";
  return start ? `${start} – ${end}` : "";
};

/** One-line summary of a collapsed Experience card: `Position · Country · MM/YYYY – MM/YYYY` (empty parts are omitted). */
export const experienceSummary = (item: Pick<Experience, "position" | "location" | "startDate" | "endDate">): string =>
  joinParts([item.position.en, item.location.en, experiencePeriodSummary(item.startDate, item.endDate)]);

const formatYear = (value: string): string => (/^\d{4}$/.test(value.trim()) ? value.trim() : "");

export const educationPeriodSummary = (startDate: string, endDate: string): string => {
  const start = formatYear(startDate);
  const end = formatYear(endDate);
  if (start && end) return `${start}–${end}`;
  return start || end;
};

/** One-line summary of a collapsed Education card: `Field · yyyy–yyyy · N credential(s)` (credential count only when > 0). */
export const educationSummary = (
  item: Pick<Education, "field" | "startDate" | "endDate">,
  linkedCredentialCount: number,
): string => joinParts([
  item.field.en,
  educationPeriodSummary(item.startDate, item.endDate),
  linkedCredentialCount > 0 ? `${linkedCredentialCount} ${linkedCredentialCount === 1 ? "credential" : "credentials"}` : "",
]);
