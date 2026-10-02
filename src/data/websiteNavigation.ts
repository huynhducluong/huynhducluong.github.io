import type { LocalizedText } from "../types/career";

export type WebsiteNavigationSection = "expertise" | "experience" | "projects" | "automation";
export type WebsiteNavigationLabels = Record<WebsiteNavigationSection, LocalizedText>;

export const websiteNavigationLabels: WebsiteNavigationLabels = {
  expertise: { en: "Expertise", vi: "Chuyên môn" },
  experience: { en: "Experience", vi: "Kinh nghiệm" },
  projects: { en: "Projects", vi: "Dự án" },
  automation: { en: "Automation", vi: "Tự động hóa" },
};

export const websiteNavigationItems = ([
  "expertise",
  "experience",
  "projects",
  "automation",
] as const).map((section) => ({
  section,
  href: `#${section}`,
  label: websiteNavigationLabels[section],
}));
