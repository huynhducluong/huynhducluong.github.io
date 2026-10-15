import { describe, expect, it } from "vitest";
import { professionalProfileSeed } from "../data/websiteSeed";
import type { ProfessionalCredential } from "../types/credential";
import { renderProfessionalCredentials } from "./credentialWorkspace";

const credential = (id: string, title: string, displayOrder: number): ProfessionalCredential => ({
  id,
  kind: "professional_certification",
  relatedType: null,
  relatedId: null,
  title: { en: title, vi: "" },
  issuer: { en: "Issuer", vi: "" },
  description: { en: "", vi: "" },
  issuedOn: "2026-01-01",
  expiresOn: null,
  doesNotExpire: true,
  credentialNumber: "",
  verificationUrl: "",
  status: "published",
  displayOrder,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  assets: [],
});

describe("Professional Credentials card actions", () => {
  it("renders Education-style order controls with correct boundary states", () => {
    const html = renderProfessionalCredentials(professionalProfileSeed, [
      credential("credential-one", "First credential", 1),
      credential("credential-two", "Second credential", 2),
    ]);

    expect(html).toMatch(/data-credential-move="up" data-credential-id="credential-one"[^>]* disabled/);
    expect(html).toMatch(/data-credential-move="down" data-credential-id="credential-two"[^>]* disabled/);
    expect(html).toContain('class="admin-credential-card__actions admin-profile-entry-card__actions"');
  });

  it("keeps edit and archive actions in the card header", () => {
    const html = renderProfessionalCredentials(professionalProfileSeed, [credential("credential-one", "First credential", 1)]);
    const cardStart = html.indexOf('data-credential-card="credential-one"');
    const headerEnd = html.indexOf("</header>", cardStart);

    expect(html.indexOf("data-credential-edit", cardStart)).toBeLessThan(headerEnd);
    expect(html.indexOf("data-credential-archive", cardStart)).toBeLessThan(headerEnd);
  });
});
