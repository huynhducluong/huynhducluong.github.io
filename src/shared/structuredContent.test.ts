import { describe, expect, it } from "vitest";
import { MAX_PROJECT_KEY_FACTS, MAX_TOOL_WORKFLOW_STEPS, normalizeKeyFacts, normalizeWorkflowSteps } from "./structuredContent";

describe("structured Project and Tool content", () => {
  it("trims, drops empty rows and caps key facts at the database limit", () => {
    const facts = normalizeKeyFacts([
      { id: "a", value: { en: " 18 km ", vi: "" }, label: { en: "Bridge length", vi: "Chiều dài cầu" } },
      { id: "b", value: { en: "", vi: "" }, label: { en: "", vi: "" } },
      { value: { en: "37" }, label: { en: "Bridges" } },
      { value: { en: "4" }, label: { en: "Beyond the cap" } },
    ]);
    expect(MAX_PROJECT_KEY_FACTS).toBe(3);
    expect(facts).toEqual([
      { id: "a", value: { en: "18 km", vi: "" }, label: { en: "Bridge length", vi: "Chiều dài cầu" } },
      { id: "fact-3", value: { en: "37", vi: "" }, label: { en: "Bridges", vi: "" } },
    ]);
    expect(normalizeKeyFacts(null)).toEqual([]);
    expect(normalizeKeyFacts("not an array")).toEqual([]);
  });

  it("normalizes workflow steps the same way", () => {
    expect(MAX_TOOL_WORKFLOW_STEPS).toBe(3);
    expect(normalizeWorkflowSteps([{ label: { en: "Input" }, text: { en: "Alignment" } }, {}, { label: { en: "" }, text: { en: "" } }]))
      .toEqual([{ id: "step-1", label: { en: "Input", vi: "" }, text: { en: "Alignment", vi: "" } }]);
  });
});
