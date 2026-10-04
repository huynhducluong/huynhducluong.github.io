export interface ExperienceLocationOption {
  code: string;
  label: string;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Intl.DisplayNames also recognises several obsolete or alias region codes.
// Keep only the current canonical code so a country never appears twice.
const excludedRegionCodes = new Set([
  "AN", "BU", "CS", "DD", "DY", "FX", "HV", "NH", "RH", "SU", "TP", "UK", "VD", "YD", "YU", "ZR",
  "XA", "XB", "ZZ",
]);
const seenRegionLabels = new Set<string>();

const regionOptions = [...alphabet].flatMap((first) => [...alphabet].map((second) => `${first}${second}`))
  .filter((code) => !excludedRegionCodes.has(code))
  .map((code) => ({ code, label: regionNames.of(code) ?? code }))
  .filter((option) => option.label !== option.code && option.label !== "Unknown Region")
  .filter((option) => {
    const normalizedLabel = option.label.trim().toLocaleLowerCase("en");
    if (seenRegionLabels.has(normalizedLabel)) return false;
    seenRegionLabels.add(normalizedLabel);
    return true;
  })
  .sort((a, b) => a.label.localeCompare(b.label, "en"));

export const experienceLocationOptions: ExperienceLocationOption[] = [
  { code: "REMOTE", label: "Remote" },
  { code: "MULTIPLE", label: "Multiple locations" },
  ...regionOptions,
];

const locationByCode = new Map(experienceLocationOptions.map((option) => [option.code, option.label]));
const codeByNormalizedLabel = new Map(experienceLocationOptions.map((option) => [option.label.trim().toLowerCase(), option.code]));
codeByNormalizedLabel.set("viet nam", "VN");
codeByNormalizedLabel.set("việt nam", "VN");

export const experienceLocationLabel = (code: string | undefined, fallback = ""): string =>
  code ? locationByCode.get(code) ?? fallback : fallback;

export const inferExperienceLocationCode = (label: string): string | undefined =>
  codeByNormalizedLabel.get(label.trim().toLowerCase());
