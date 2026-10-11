import { describe, expect, it } from "vitest";
import { cvRuntimeSeed } from "../data/cvSeed";
import { validateProfileDocument } from "./profileDocumentValidation";

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
});
