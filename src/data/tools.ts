import type { AutomationTool } from "../types/career";

export const automationTools: AutomationTool[] = [
  {
    id: "bridge-deck-generator",
    name: "Bridge Deck Generator",

    problem: {
      en: "Creating complex bridge deck geometry manually is time-consuming and difficult to update.",
      vi: "Việc dựng thủ công hình học bản mặt cầu phức tạp tốn thời gian và khó cập nhật."
    },

    solution: {
      en: "A Civil 3D and Revit workflow that generates bridge deck geometry from alignment, profile, width, and superelevation data.",
      vi: "Quy trình Civil 3D và Revit tạo hình học bản mặt cầu từ tim tuyến, trắc dọc, bề rộng và siêu cao."
    },

    technologies: [
      "C#",
      "Revit API",
      "Civil 3D API",
      "WPF"
    ],

    imagePaths: [],
    featured: true
  }
];