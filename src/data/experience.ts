import type { Experience } from "../types/career";

export const experiences: Experience[] = [
  {
    id: "onecad-vietnam",
    company: "ONECAD Vietnam CO., LTD",
    position: { en: "BIM Coordinator", vi: "Điều phối viên BIM" },
    location: { en: "Viet Nam", vi: "Việt Nam" },
    startDate: "2026-02",
    endDate: null,
    responsibilities: [
      {
        id: "onecad-coordinate",
        text: {
          en: "Lead project-wide BIM modeling teams and coordinate multidisciplinary models.",
          vi: "Dẫn dắt đội ngũ mô hình BIM toàn dự án và phối hợp mô hình đa bộ môn.",
        },
      },
      {
        id: "onecad-automation",
        text: {
          en: "Develop Revit and Civil 3D tools using C#, WPF, Dynamo, and Python.",
          vi: "Phát triển công cụ Revit và Civil 3D bằng C#, WPF, Dynamo và Python.",
        },
      },
    ],
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "C#", "Dynamo"],
  },
  {
    id: "hoang-long",
    company: "HOANG LONG CO., LTD",
    position: {
      en: "BIM role - details to be updated",
      vi: "Vai trò BIM - sẽ cập nhật chi tiết",
    },
    location: { en: "Viet Nam", vi: "Việt Nam" },
    startDate: "2025-09",
    endDate: "2026-02",
    responsibilities: [],
    technologies: [],
  },
  {
    id: "hung-nghiep",
    company: "HUNG NGHIEP CO., LTD",
    position: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    location: { en: "Viet Nam", vi: "Việt Nam" },
    startDate: "2022-03",
    endDate: "2025-09",
    responsibilities: [
      {
        id: "hung-nghiep-models",
        text: {
          en: "Led BIM modelers and coordinated multidisciplinary project models.",
          vi: "Dẫn dắt nhóm dựng mô hình BIM và phối hợp mô hình đa bộ môn.",
        },
      },
      {
        id: "hung-nghiep-cde",
        text: {
          en: "Managed BIM models, deliverables, and reports in a Common Data Environment.",
          vi: "Quản lý mô hình, hồ sơ bàn giao và báo cáo BIM trên môi trường dữ liệu chung.",
        },
      },
    ],
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "Dynamo", "Python"],
  },
  {
    id: "thanh-tin",
    company: "THANH TIN CO., LTD",
    position: {
      en: "BIM role - details to be updated",
      vi: "Vai trò BIM - sẽ cập nhật chi tiết",
    },
    location: { en: "Viet Nam", vi: "Việt Nam" },
    startDate: "2021-08",
    endDate: "2022-03",
    responsibilities: [],
    technologies: [],
  },
];
