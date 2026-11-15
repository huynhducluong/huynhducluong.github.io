import { describe, expect, it } from "vitest";
import { educationSummary, experienceSummary } from "./profileEntrySummary";

const experience = (overrides: Partial<Parameters<typeof experienceSummary>[0]> = {}) => ({
  position: { en: "BIM Engineer", vi: "" },
  location: { en: "Vietnam", vi: "" },
  startDate: "2021-03",
  endDate: "2023-11" as string | null,
  ...overrides,
});

describe("experienceSummary", () => {
  it("joins position, country and period", () => {
    expect(experienceSummary(experience())).toBe("BIM Engineer · Vietnam · 03/2021 – 11/2023");
  });
  it("shows Present when endDate is empty", () => {
    expect(experienceSummary(experience({ endDate: null }))).toBe("BIM Engineer · Vietnam · 03/2021 – Present");
    expect(experienceSummary(experience({ endDate: "" }))).toBe("BIM Engineer · Vietnam · 03/2021 – Present");
  });
  it("omits a missing position or country without stray separators", () => {
    expect(experienceSummary(experience({ position: { en: "", vi: "" } }))).toBe("Vietnam · 03/2021 – 11/2023");
    expect(experienceSummary(experience({ location: { en: "", vi: "" } }))).toBe("BIM Engineer · 03/2021 – 11/2023");
  });
  it("survives malformed months", () => {
    expect(experienceSummary(experience({ startDate: "March" }))).toBe("BIM Engineer · Vietnam");
    expect(experienceSummary(experience({ endDate: "soon" }))).toBe("BIM Engineer · Vietnam · 03/2021 – Present");
  });
  it("is empty for a blank entry", () => {
    expect(experienceSummary(experience({ position: { en: "", vi: "" }, location: { en: "", vi: "" }, startDate: "" }))).toBe("");
  });
});

describe("educationSummary", () => {
  const education = { field: { en: "Civil Engineering", vi: "" }, startDate: "2015", endDate: "2020" };
  it("omits the credential count when zero", () => {
    expect(educationSummary(education, 0)).toBe("Civil Engineering · 2015–2020");
  });
  it("pluralises the credential count", () => {
    expect(educationSummary(education, 1)).toBe("Civil Engineering · 2015–2020 · 1 credential");
    expect(educationSummary(education, 2)).toBe("Civil Engineering · 2015–2020 · 2 credentials");
  });
  it("drops missing parts", () => {
    expect(educationSummary({ ...education, field: { en: "", vi: "" } }, 1)).toBe("2015–2020 · 1 credential");
    expect(educationSummary({ ...education, endDate: "" }, 0)).toBe("Civil Engineering · 2015");
    expect(educationSummary({ ...education, startDate: "x", endDate: "y" }, 0)).toBe("Civil Engineering");
  });
});
