import { describe, expect, it } from "vitest";
import { cvRuntimeSeed } from "../data/cvSeed";
import { portfolioContentSeed, portfolioProjectSeed } from "../data/portfolioSeed";
import type { PortfolioRuntimeData } from "../types/portfolio";
import { profileDocumentRecommendations, validateProfileDocument } from "./profileDocumentValidation";

const portfolioRuntime = (): PortfolioRuntimeData => ({
  content: structuredClone(portfolioContentSeed),
  projects: structuredClone(portfolioProjectSeed.slice(0, 1)).map((project) => ({ ...project, includeInPortfolio: true })),
  tools: [],
  credentials: [],
});

describe("validateProfileDocument", () => {
  it("reports a missing CV runtime", () => {
    expect(validateProfileDocument("cv", null)).toEqual(["CV draft is not loaded."]);
  });

  it("reports a missing Portfolio runtime", () => {
    expect(validateProfileDocument("portfolio", null)).toEqual(["Portfolio draft is not loaded."]);
  });

  it("accepts the current fixed two-page CV composition", () => {
    expect(validateProfileDocument("cv", structuredClone(cvRuntimeSeed))).toEqual([]);
  });

  it("blocks selections that exceed the fixed CV layout capacity", () => {
    const runtime = structuredClone(cvRuntimeSeed);
    runtime.detailedProjects.push({ ...structuredClone(runtime.detailedProjects[0]), id: "extra-detailed" });
    runtime.compactProjects.push({ ...structuredClone(runtime.compactProjects[0]), id: "extra-compact" });
    runtime.tools.push(
      { ...structuredClone(runtime.tools[0]), id: "extra-tool-1" },
      { ...structuredClone(runtime.tools[0]), id: "extra-tool-2" },
    );

    expect(validateProfileDocument("cv", runtime)).toEqual(expect.arrayContaining([
      "Use no more than 7 detailed CV projects for the fixed two-page layout.",
      "Use no more than 8 selected projects for the fixed two-page layout.",
      "Use no more than 2 BIM automation tools for the fixed two-card layout.",
    ]));
  });

  it("reports incomplete detailed project content before publishing", () => {
    const runtime = structuredClone(cvRuntimeSeed);
    const project = runtime.detailedProjects[0];
    project.role = { en: "", vi: "" };
    project.startDate = "";
    project.summary = { en: "", vi: "" };
    project.cvShowSummary = true;
    project.cvResponsibilityIds = ["missing-responsibility"];

    expect(validateProfileDocument("cv", runtime)).toEqual(expect.arrayContaining([
      `Add an English role for "${project.name.en}".`,
      `Add a start date for "${project.name.en}".`,
      `Add an English summary for "${project.name.en}" or hide its summary.`,
      `Select at least one available responsibility for "${project.name.en}".`,
    ]));
  });

  it("requires a different supporting image only for two-image Portfolio layouts", () => {
    const runtime = portfolioRuntime();
    const project = runtime.projects[0];
    project.images = [{
      id: "primary-image",
      storagePath: "projects/primary.jpg",
      alt: structuredClone(project.name),
      kind: "cover",
      displayOrder: 1,
    }];
    runtime.content.layouts.projectOverrides[project.id] = "project.editorial";

    expect(validateProfileDocument("portfolio", runtime)).toContain(
      `Add a different Supporting visual for "${project.name.en}" because its layout uses two images.`,
    );

    project.images.push({
      id: "supporting-image",
      storagePath: "projects/supporting.jpg",
      alt: structuredClone(project.name),
      kind: "gallery",
      displayOrder: 2,
    });
    expect(validateProfileDocument("portfolio", runtime)).not.toContain(
      `Add a different Supporting visual for "${project.name.en}" because its layout uses two images.`,
    );
  });
});

describe("profileDocumentRecommendations (Portfolio)", () => {
  it("names every slice and every omitted block, without blocking publish", () => {
    const data = portfolioRuntime();
    const project = data.projects[0];
    project.summary = undefined;
    project.location = { en: "", vi: "" };
    project.responsibilities = Array.from({ length: 5 }, (_, index) => ({ id: `r${index}`, text: { en: `Responsibility ${index + 1}`, vi: "" } }));
    data.content.layouts.projectDefault = "project.balanced";
    data.content.layouts.profile = "profile.capability";
    data.content.skillGroups = Array.from({ length: 4 }, (_, index) => ({ id: `g${index}`, title: { en: `Group ${index + 1}`, vi: "" }, items: Array.from({ length: 6 }, (_, item) => ({ id: `i${item}`, label: { en: `Item ${item}`, vi: "" } })) })) as typeof data.content.skillGroups;
    const notes = profileDocumentRecommendations("portfolio", data);

    expect(notes).toContain("Profile (Capability Profile) prints the first 3 of 4 skill groups; choose them in Background › Profile page.");
    expect(notes).toContain('Profile (Capability Profile) prints the first 4 of 6 items in "Group 1".');
    expect(notes).toContain(`"${project.name.en}" is missing its summary and location, so they are left out.`);
    expect(notes).toContain(`"${project.name.en}" (Balanced) prints the first 3 of 5 responsibilities.`);
    expect(validateProfileDocument("portfolio", data).some((issue) => /summary|location|responsibilit/i.test(issue))).toBe(false);
    expect(profileDocumentRecommendations("cv", null)).toEqual([]);
  });

  it("names selected credentials that would print a placeholder, only when the credentials page is on", () => {
    const data = portfolioRuntime();
    const credential = (id: string, title: string) => ({
      id, kind: "professional_certification" as const, relatedType: null, relatedId: null, title: { en: title, vi: "" }, issuer: { en: "Issuer", vi: "" },
      description: { en: "", vi: "" }, issuedOn: null, expiresOn: null, doesNotExpire: true, credentialNumber: "", verificationUrl: "",
      status: "published" as const, displayOrder: 1, includeInPortfolio: true, portfolioOrder: 1,
    });
    data.credentials = [
      credential("c1", "No preview"),
      { ...credential("c2", "Shown"), preview: { profile: "landscape", storagePath: "p.webp", publicUrl: "https://example.com/p.webp", width: 1600, height: 1200 } },
    ];
    const placeholder = (notes: string[]) => notes.filter((note) => note.includes("prints a placeholder"));

    expect(placeholder(profileDocumentRecommendations("portfolio", data))).toEqual([]);
    data.content.layouts.includeCredentials = true;
    expect(placeholder(profileDocumentRecommendations("portfolio", data))).toEqual([
      '"No preview" has no evidence shown in the Portfolio, so its page prints a placeholder; use Adjust crops on an evidence image in Profile › Credentials.',
    ]);
  });
});
