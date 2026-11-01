import type { LocalizedText } from "../types/career";
import type { PortfolioKeyFact, PortfolioWorkflowStep } from "../types/portfolio";

/** Mirrors the database checks in 202611010001_project_key_facts_tool_workflow_steps.sql. */
export const MAX_PROJECT_KEY_FACTS = 3;
export const MAX_TOOL_WORKFLOW_STEPS = 3;

const text = (value: unknown): LocalizedText => {
  const record = (value && typeof value === "object" ? value : {}) as Partial<LocalizedText>;
  return { en: String(record.en ?? "").trim(), vi: String(record.vi ?? "").trim() };
};
const hasAny = (value: LocalizedText): boolean => Boolean(value.en || value.vi);
const items = (value: unknown, max: number): Array<Record<string, unknown>> =>
  (Array.isArray(value) ? value : []).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").slice(0, max);

/** Stored or typed key facts, trimmed, without empty rows, at most MAX_PROJECT_KEY_FACTS. */
export const normalizeKeyFacts = (value: unknown): PortfolioKeyFact[] => items(value, MAX_PROJECT_KEY_FACTS)
  .map((item, index) => ({ id: String(item.id ?? `fact-${index + 1}`), value: text(item.value), label: text(item.label) }))
  .filter((fact) => hasAny(fact.value) || hasAny(fact.label));

/** Stored or typed workflow steps, trimmed, without empty rows, at most MAX_TOOL_WORKFLOW_STEPS. */
export const normalizeWorkflowSteps = (value: unknown): PortfolioWorkflowStep[] => items(value, MAX_TOOL_WORKFLOW_STEPS)
  .map((item, index) => ({ id: String(item.id ?? `step-${index + 1}`), label: text(item.label), text: text(item.text) }))
  .filter((step) => hasAny(step.label) || hasAny(step.text));
