import { portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import type {
  PortfolioProject,
  PortfolioRepository,
  PortfolioTool,
} from "../types/portfolio";
import { supabasePortfolioRepository } from "./supabasePortfolioRepository";

const byDisplayOrder = <T extends { displayOrder: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.displayOrder - b.displayOrder);

export const localPortfolioRepository: PortfolioRepository = {
  async listPublishedProjects(): Promise<PortfolioProject[]> {
    return byDisplayOrder(
      portfolioProjectSeed.filter((project) => project.status === "published"),
    );
  },

  async getPublishedProject(slug: string): Promise<PortfolioProject | null> {
    return (
      portfolioProjectSeed.find(
        (project) => project.slug === slug && project.status === "published",
      ) ?? null
    );
  },

  async listPublishedTools(): Promise<PortfolioTool[]> {
    return byDisplayOrder(
      portfolioToolSeed.filter((tool) => tool.status === "published"),
    );
  },

  async getPublishedTool(slug: string): Promise<PortfolioTool | null> {
    return (
      portfolioToolSeed.find(
        (tool) => tool.slug === slug && tool.status === "published",
      ) ?? null
    );
  },
};

const withFallback = async <T>(
  remote: () => Promise<T>,
  local: () => Promise<T>,
): Promise<T> => {
  try {
    return await remote();
  } catch (error) {
    console.warn("Supabase is unavailable; using local portfolio data.", error);
    return local();
  }
};

export const portfolioRepository: PortfolioRepository = {
  listPublishedProjects: () =>
    withFallback(
      () => supabasePortfolioRepository.listPublishedProjects(),
      () => localPortfolioRepository.listPublishedProjects(),
    ),
  getPublishedProject: (slug) =>
    withFallback(
      () => supabasePortfolioRepository.getPublishedProject(slug),
      () => localPortfolioRepository.getPublishedProject(slug),
    ),
  listPublishedTools: () =>
    withFallback(
      () => supabasePortfolioRepository.listPublishedTools(),
      () => localPortfolioRepository.listPublishedTools(),
    ),
  getPublishedTool: (slug) =>
    withFallback(
      () => supabasePortfolioRepository.getPublishedTool(slug),
      () => localPortfolioRepository.getPublishedTool(slug),
    ),
};
