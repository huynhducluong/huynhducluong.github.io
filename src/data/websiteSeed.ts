import { education } from "./education";
import { experiences } from "./experience";
import { languageSkills } from "./languages";
import { profile } from "./profile";
import { skillGroups } from "./skills";
import type { ProfessionalProfileContent, WebsiteContent } from "../types/website";

export const professionalProfileSeed: ProfessionalProfileContent = {
  profile,
  experiences,
  education,
  skillGroups,
  languages: languageSkills,
};

export const websiteContentSeed: WebsiteContent = {
  version: "2026-09",
  seoTitle: {
    en: "Huynh Duc Luong | BIM Coordinator",
    vi: "Huỳnh Đức Lương | Điều phối viên BIM",
  },
  seoDescription: {
    en: "Infrastructure BIM coordination, model quality and practical automation.",
    vi: "Điều phối BIM hạ tầng, kiểm soát chất lượng mô hình và tự động hóa thực tiễn.",
  },
  navigation: {
    expertise: { en: "Expertise", vi: "Chuyên môn" },
    experience: { en: "Experience", vi: "Kinh nghiệm" },
    projects: { en: "Projects", vi: "Dự án" },
    automation: { en: "Automation", vi: "Tự động hóa" },
  },
  heroEyebrow: {
    en: "BIM · Infrastructure · Automation",
    vi: "BIM · Hạ tầng · Tự động hóa",
  },
  focus: {
    en: "BIM · Revit · Civil 3D",
    vi: "BIM · Revit · Civil 3D",
  },
  specialization: {
    en: "Infrastructure BIM",
    vi: "BIM hạ tầng",
  },
  expertiseTitle: {
    en: "A practical combination of BIM coordination and automation.",
    vi: "Kết hợp thực tiễn giữa điều phối BIM và tự động hóa.",
  },
  experienceTitle: {
    en: "Coordinating models, information and delivery workflows.",
    vi: "Điều phối mô hình, thông tin và quy trình bàn giao.",
  },
  projectsTitle: {
    en: "Infrastructure projects developed around clear BIM outcomes.",
    vi: "Các dự án hạ tầng hướng đến kết quả BIM rõ ràng.",
  },
  automationTitle: {
    en: "Tools built to remove repetitive work from project delivery.",
    vi: "Công cụ giúp loại bỏ công việc lặp lại trong quá trình triển khai dự án.",
  },
  projectsPage: {
    kicker: { en: "Selected work", vi: "Dự án tiêu biểu" },
    title: {
      en: "Infrastructure projects shaped by BIM coordination.",
      vi: "Các dự án hạ tầng được triển khai bằng quy trình điều phối BIM.",
    },
    description: {
      en: "A curated view of verified work from the latest website release.",
      vi: "Tuyển chọn các dự án đã được xác thực trong bản phát hành website mới nhất.",
    },
  },
  toolsPage: {
    kicker: { en: "BIM automation", vi: "Tự động hóa BIM" },
    title: {
      en: "Tools that remove repetitive work.",
      vi: "Công cụ giúp loại bỏ các thao tác lặp lại.",
    },
    description: {
      en: "Practical automation from the latest website release.",
      vi: "Các giải pháp tự động hóa thực tiễn trong bản phát hành website mới nhất.",
    },
  },
  contactKicker: {
    en: "Let’s work together",
    vi: "Cùng hợp tác",
  },
  contactTitle: {
    en: "Have an infrastructure or BIM automation challenge?",
    vi: "Bạn có bài toán về hạ tầng hoặc tự động hóa BIM?",
  },
  footerText: {
    en: "BIM coordination · Infrastructure · Automation",
    vi: "Điều phối BIM · Hạ tầng · Tự động hóa",
  },
  theme: { presetId: "personal-blue" },
  sections: {
    expertise: true,
    experience: true,
    projects: true,
    automation: true,
    contact: true,
  },
};
