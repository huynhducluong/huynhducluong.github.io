import { describe, expect, it } from "vitest";
import { validateProfileDocument } from "./profileDocumentValidation";

describe("validateProfileDocument", () => {
  it("reports a missing CV runtime", () => {
    expect(validateProfileDocument("cv", null)).toEqual(["CV draft is not loaded."]);
  });

  it("reports a missing Portfolio runtime", () => {
    expect(validateProfileDocument("portfolio", null)).toEqual(["Portfolio draft is not loaded."]);
  });
});
