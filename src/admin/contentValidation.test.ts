import { describe, expect, it } from "vitest";
import type { PortfolioProject } from "../types/portfolio";
import { portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { validateProjectReadiness, validateToolReadiness } from "./contentValidation";

const readyProject = (): PortfolioProject => ({
  id: "project-1",
  slug: "project-1",
  name: { en: "Project one", vi: "Dự án một" },
  location: { en: "Ho Chi Minh City", vi: "Thành phố Hồ Chí Minh" },
  role: { en: "BIM Coordinator", vi: "Điều phối viên BIM" },
  summary: { en: "Summary", vi: "Tóm tắt" },
  challenge: { en: "Challenge", vi: "Thách thức" },
  approach: { en: "Approach", vi: "Giải pháp" },
  outcome: { en: "Outcome", vi: "Kết quả" },
  isCurrent: false,
  responsibilities: [{ id: "responsibility-1", text: { en: "Coordinate models", vi: "Điều phối mô hình" } }],
  technologies: ["Revit"],
  images: [{
    id: "cover-1",
    storagePath: "projects/project-1/cover.webp",
    alt: { en: "Project overview", vi: "Tổng quan dự án" },
    kind: "cover",
    displayOrder: 0,
  }],
  featured: true,
  status: "published",
  displayOrder: 1,
  includeInPortfolio: true,
  portfolioOrder: 1,
  portfolioLayout: "feature",
  includeInCv: true,
  cvOrder: 1,
  cvDisplay: "detailed",
  cvShowSummary: true,
  cvResponsibilityIds: ["responsibility-1"],
});

describe("Admin publish readiness", () => {
  it("accepts a project with all required content", () => {
    expect(validateProjectReadiness(readyProject()).errors).toEqual([]);
  });

  it("blocks publishing when required content and cover media are missing", () => {
    const project = readyProject();
    project.summary = { en: "", vi: "" };
    project.images = [];
    const result = validateProjectReadiness(project);
    expect(result.errors).toContain("Project summary (EN) is required.");
    expect(result.errors).toContain("Project needs a cover image.");
  });
});

describe("Key facts and workflow steps readiness", () => {
  it("blocks Ready on a half-filled fact or step and only recommends the Vietnamese copy", () => {
    const project = { ...structuredClone(portfolioProjectSeed[0]), keyFacts: [{ id: "a", value: { en: "18 km", vi: "" }, label: { en: "", vi: "" } }, { id: "b", value: { en: "37", vi: "" }, label: { en: "Bridges", vi: "" } }] };
    const projectResult = validateProjectReadiness(project);
    expect(projectResult.errors).toContain("Key fact 1 needs an English value and label.");
    expect(projectResult.warnings).toContain("Key fact 2 is missing Vietnamese content.");
    const tool = { ...structuredClone(portfolioToolSeed[0]), workflowSteps: [{ id: "s", label: { en: "Input", vi: "" }, text: { en: "", vi: "" } }] };
    expect(validateToolReadiness(tool).errors).toContain("Workflow step 1 needs an English label and text.");
  });
});
