import { describe, expect, it } from "vitest";
import type { ProfessionalCredentialInput } from "../types/credential";
import { credentialFileLimit, validateCredentialFile, validateCredentialInput } from "./credentialValidation";

const input = (): ProfessionalCredentialInput => ({
  kind: "professional_certification",
  relatedType: null,
  relatedId: null,
  title: { en: "BIM Coordinator", vi: "Điều phối viên BIM" },
  issuer: { en: "Issuer", vi: "Đơn vị cấp" },
  description: { en: "", vi: "" },
  issuedOn: "2026-01-01",
  expiresOn: null,
  doesNotExpire: true,
  credentialNumber: "",
  verificationUrl: "",
  status: "draft",
  displayOrder: 1,
});

describe("credential validation", () => {
  it("allows a complete draft without evidence", () => {
    expect(validateCredentialInput(input())).toBeNull();
  });

  it("allows Ready credentials to be saved before verification details are added", () => {
    expect(validateCredentialInput({ ...input(), status: "published" })).toBeNull();
    expect(validateCredentialInput({ ...input(), status: "published", verificationUrl: "https://verify.example.test/1" })).toBeNull();
  });

  it("rejects invalid date and URL combinations", () => {
    expect(validateCredentialInput({ ...input(), doesNotExpire: false, expiresOn: "2025-01-01" })).toContain("earlier");
    expect(validateCredentialInput({ ...input(), verificationUrl: "http://example.test" })).toContain("https://");
  });

  it("accepts supported private documents within 10 MB", () => {
    expect(validateCredentialFile({ type: "application/pdf", size: credentialFileLimit })).toBeNull();
    expect(validateCredentialFile({ type: "text/html", size: 100 })).toContain("PDF");
    expect(validateCredentialFile({ type: "image/png", size: credentialFileLimit + 1 })).toContain("10 MB");
  });
});
