import { projects } from "./projects";
import { automationTools } from "./tools";
import type { PortfolioProject, PortfolioTool } from "../types/portfolio";
import { cvProjectSeedSettings, cvToolSeedSettings } from "./cvSeed";
import { profile } from "./profile";
import { skillGroups } from "./skills";
import type { PortfolioContent } from "../types/portfolio";

export const portfolioContentSeed: PortfolioContent = {
  version: "2026-09",
  title: "PORTFOLIO",
  year: String(new Date().getFullYear()),
  kicker: { en: "BIM · Infrastructure · Automation", vi: "BIM · Hạ tầng · Tự động hóa" },
  aboutKicker: { en: "About me", vi: "Về tôi" },
  aboutHeading: {
    en: "Coordination built on clear information and practical automation.",
    vi: "Điều phối được xây dựng trên thông tin rõ ràng và tự động hóa thực tiễn.",
  },
  closingKicker: { en: "Thank you", vi: "Cảm ơn" },
  closingHeading: {
    en: "Let’s build clearer BIM workflows.",
    vi: "Hãy cùng xây dựng các quy trình BIM rõ ràng hơn.",
  },
  closingText: {
    en: "Infrastructure BIM coordination · Model quality · Automation",
    vi: "Điều phối BIM hạ tầng · Chất lượng mô hình · Tự động hóa",
  },
  theme: { presetId: "personal-blue" },
  profile,
  skillGroups,
};

const publishedProjectIds = new Set([
  "la-son-hoa-lien-expressway",
  "cam-lo-la-son-expressway",
  "tham-luong-ben-cat-rach-nuoc-len",
  "cao-lanh-an-huu-expressway",
  "dong-phu-binh-duong-road",
  "ha-tien-coastal-road",
  "long-thanh-airport-phase-1",
  "nguyen-huu-tho-road",
  "phu-yen-coastal-road",
  "ring-road-4-hcmc",
  "ring-road-3-hcmc",
]);

export const portfolioProjectSeed: PortfolioProject[] = projects.map(
  (project, index) => {
    const cv = cvProjectSeedSettings.get(project.id);
    return ({
    ...project,
    slug: project.id,
    images: project.imagePaths.map((storagePath, imageIndex) => ({
      id: `${project.id}-image-${imageIndex + 1}`,
      storagePath,
      alt: project.name,
      kind: imageIndex === 0 ? "cover" : "gallery",
      displayOrder: imageIndex + 1,
    })),
    status: publishedProjectIds.has(project.id) ? "published" : "draft",
    includeInPortfolio: publishedProjectIds.has(project.id),
    portfolioOrder: project.displayOrder ?? index + 1,
    portfolioLayout: index === 0 ? "feature" : "standard",
    isCurrent: project.endDate === null,
    includeInCv: cv?.include_in_cv ?? false,
    cvOrder: cv?.cv_order ?? index + 1,
    cvDisplay: cv?.cv_display ?? "compact",
    cvShowSummary: cv?.cv_show_summary ?? true,
    cvResponsibilityIds: cv?.cv_responsibility_ids ?? [],
  });
  },
);

export const portfolioToolSeed: PortfolioTool[] = automationTools.map(
  (tool, index) => {
    const cv = cvToolSeedSettings.get(tool.id);
    return ({
    ...tool,
    slug: tool.id,
    images: tool.imagePaths.map((storagePath, imageIndex) => ({
      id: `${tool.id}-image-${imageIndex + 1}`,
      storagePath,
      alt: { en: tool.name, vi: tool.name },
      kind: imageIndex === 0 ? "cover" : "gallery",
      displayOrder: imageIndex + 1,
    })),
    status: "published",
    displayOrder: index + 1,
    includeInPortfolio: true,
    portfolioOrder: index + 1,
    includeInCv: cv?.include_in_cv ?? false,
    cvOrder: cv?.cv_order ?? index + 1,
  });
  },
);
