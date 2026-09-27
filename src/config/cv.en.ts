import type { CvDocumentConfig } from "../types/documents";

export const englishCvConfig = {
  language: "en",
  version: "2026-09",
  themeId: "personal-blue",
  pages: [
    {
      id: "page-1",
      layout: "sidebar-main",
      employmentIds: [
        "onecad-vietnam",
        "hoang-long",
        "hung-nghiep",
        "thanh-tin",
      ],
      educationIds: ["transportation-engineering-muce"],
      skillGroupIds: ["software", "automation"],
      languageIds: ["vietnamese", "english"],
      projectExperience: [
        {
          projectId: "hon-khoai-road",
          responsibilityIds: [
            "hon-khoai-lead",
            "hon-khoai-quality",
            "hon-khoai-acc",
            "hon-khoai-automation",
          ],
          showSummary: true,
        },
        {
          projectId: "ca-mau-cai-nuoc-expressway",
          responsibilityIds: [
            "ca-mau-cai-nuoc-lead",
            "ca-mau-cai-nuoc-quality",
            "ca-mau-cai-nuoc-automation",
          ],
          showSummary: true,
        },
        {
          projectId: "la-son-hoa-lien-expressway",
          responsibilityIds: [
            "la-son-hoa-lien-lead",
            "la-son-hoa-lien-quality",
            "la-son-hoa-lien-automation",
          ],
          showSummary: true,
        },
      ],
    },
    {
      id: "page-2",
      layout: "main",
      projectExperience: [
        {
          projectId: "cam-lo-la-son-expressway",
          responsibilityIds: [
            "cam-lo-la-son-lead",
            "cam-lo-la-son-quality",
            "cam-lo-la-son-acc",
            "cam-lo-la-son-automation",
          ],
          showSummary: true,
        },
        {
          projectId: "tham-luong-ben-cat-rach-nuoc-len",
          responsibilityIds: [
            "tham-luong-lead",
            "tham-luong-quality",
            "tham-luong-acc",
            "tham-luong-automation",
          ],
          showSummary: true,
        },
        {
          projectId: "cao-lanh-an-huu-expressway",
          responsibilityIds: [
            "cao-lanh-an-huu-lead",
            "cao-lanh-an-huu-modeling",
            "cao-lanh-an-huu-cde",
            "cao-lanh-an-huu-reports",
          ],
          showSummary: true,
        },
        {
          projectId: "dong-phu-binh-duong-road",
          responsibilityIds: [
            "dong-phu-binh-duong-lead",
            "dong-phu-binh-duong-modeling",
            "dong-phu-binh-duong-cde",
            "dong-phu-binh-duong-reports",
          ],
          showSummary: true,
        },
      ],
      selectedProjectIds: [
        "cai-nuoc-dat-mui-expressway",
        "ring-road-4-hcmc",
        "hcmc-thu-dau-mot-chon-thanh-expressway",
        "nguyen-huu-tho-road",
        "ha-tien-coastal-road",
        "phu-yen-coastal-road",
        "long-thanh-airport-phase-1",
        "ring-road-3-hcmc",
      ],
      automationToolIds: ["bridge-deck-generator"],
    },
  ],
} as const satisfies CvDocumentConfig;
