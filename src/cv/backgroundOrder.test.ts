import { describe, expect, it } from "vitest";
import { cvContentSeed, cvRuntimeSeed } from "../data/cvSeed";
import type { CredentialSnapshot } from "../types/credential";
import { orderedCvBackground, resolveCvBackgroundOrder, resolveCvBackgroundSelection } from "./backgroundOrder";
import { renderDynamicCv } from "./renderDynamicCv";

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

describe("CV background selection", () => {
  it("keeps selected items in Professional Profile source order", () => {
    const content = structuredClone(cvContentSeed);
    const [first, second] = content.experiences;
    content.backgroundSelection = {
      ...resolveCvBackgroundSelection(content),
      experienceIds: [second.id, first.id],
    };

    expect(orderedCvBackground(content).experiences.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it("supports hiding an entire background section", () => {
    const content = structuredClone(cvContentSeed);
    content.backgroundSelection = { ...resolveCvBackgroundSelection(content), languageIds: [] };
    expect(orderedCvBackground(content).languages).toEqual([]);
  });

  it("removes empty background section headings from the rendered CV", () => {
    const runtime = structuredClone(cvRuntimeSeed);
    runtime.content.backgroundSelection = {
      experienceIds: [],
      educationIds: [],
      credentialIds: [],
      skillGroupIds: [],
      languageIds: [],
    };
    const html = renderDynamicCv(runtime);

    expect(html).not.toContain('<h2 class="cv-section-heading">Education</h2>');
    expect(html).not.toContain('<h2 class="cv-section-heading">Language</h2>');
    expect(html).not.toContain('<h2 class="cv-section-heading">Experience</h2>');
    runtime.content.skillGroups.forEach((group) => {
      expect(html).not.toContain(`<h2 class="cv-section-heading">${group.title.en}</h2>`);
    });
  });

  it("keeps newly synced items unselected in an existing tailored draft", () => {
    const content = structuredClone(cvContentSeed);
    content.credentials = [credential];
    expect(resolveCvBackgroundSelection(content).credentialIds).toEqual([]);
    expect(orderedCvBackground(content).credentials).toEqual([]);
  });

  it("preserves custom order for legacy published releases", () => {
    const content = structuredClone(cvContentSeed);
    const reversedIds = content.experiences.map((item) => item.id).reverse();
    delete content.backgroundSelection;
    content.backgroundOrder = {
      ...resolveCvBackgroundOrder(content),
      experienceIds: reversedIds,
    };

    expect(orderedCvBackground(content).experiences.map((item) => item.id)).toEqual(reversedIds);
  });
});
