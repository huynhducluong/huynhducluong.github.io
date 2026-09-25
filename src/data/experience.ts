import type { Experience } from "../types/career";

export const experiences: Experience[] = [
  {
    id: "current-company",

    company: "CURRENT COMPANY",

    position: {
      en: "BIM Coordinator - Infrastructure",
      vi: "Điều phối viên BIM - Hạ tầng"
    },

    location: {
      en: "Vietnam",
      vi: "Việt Nam"
    },

    startDate: "2026-02",
    endDate: null,

    responsibilities: [
      {
        en: "Coordinate BIM models for infrastructure projects.",
        vi: "Phối hợp mô hình BIM cho các dự án hạ tầng."
      },
      {
        en: "Develop automation tools for Revit and Civil 3D workflows.",
        vi: "Phát triển công cụ tự động hóa quy trình Revit và Civil 3D."
      }
    ],

    technologies: [
      "Revit",
      "Civil 3D",
      "Navisworks",
      "ACC",
      "C#",
      "Dynamo"
    ]
  }
];