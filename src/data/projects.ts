import type { Project } from "../types/career";

export const projects: Project[] = [
  {
    id: "sample-infrastructure-project",

    name: {
      en: "Featured Infrastructure Project",
      vi: "Dự án hạ tầng tiêu biểu"
    },

    location: {
      en: "Vietnam",
      vi: "Việt Nam"
    },

    role: {
      en: "BIM Coordinator",
      vi: "Điều phối viên BIM"
    },

    summary: {
      en: "BIM coordination and model management for a major infrastructure project.",
      vi: "Phối hợp BIM và quản lý mô hình cho một dự án hạ tầng quy mô lớn."
    },

    responsibilities: [
      {
        en: "Coordinated multidisciplinary BIM models.",
        vi: "Phối hợp mô hình BIM đa bộ môn."
      }
    ],

    technologies: [
      "Revit",
      "Civil 3D",
      "Navisworks",
      "ACC"
    ],

    imagePaths: [],
    featured: true,
    displayOrder: 1
  }
];