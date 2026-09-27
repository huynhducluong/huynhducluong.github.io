import { projects } from "./projects";
import { automationTools } from "./tools";
import type { PortfolioProject, PortfolioTool } from "../types/portfolio";

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
  (project, index) => ({
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
    portfolioOrder: index + 1,
    portfolioLayout: index === 0 ? "feature" : "standard",
  }),
);

export const portfolioToolSeed: PortfolioTool[] = automationTools.map(
  (tool, index) => ({
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
  }),
);
