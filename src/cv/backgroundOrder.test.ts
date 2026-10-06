import { describe, expect, it } from "vitest";
import { cvContentSeed } from "../data/cvSeed";
import type { CredentialSnapshot } from "../types/credential";
import { orderedCvBackground, resolveCvBackgroundOrder } from "./backgroundOrder";

const credential: CredentialSnapshot = {
  id: "credential-1",
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
  verificationUrl: "https://verify.example.test/1",
  status: "published",
  displayOrder: 1,
};

describe("CV credential background", () => {
  it("adds newly synced credentials to an older CV draft", () => {
    const content = structuredClone(cvContentSeed);
    content.credentials = [credential];
    delete (content.backgroundOrder as Partial<typeof content.backgroundOrder>)?.credentialIds;
    expect(resolveCvBackgroundOrder(content).credentialIds).toEqual([credential.id]);
    expect(orderedCvBackground(content).credentials).toEqual([credential]);
  });
});
