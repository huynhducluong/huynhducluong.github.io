import { describe, expect, it } from "vitest";
import { professionalProfileSeed } from "../data/websiteSeed";
import type { ProfessionalCredential } from "../types/credential";
import { renderLinkedCredentials, renderProfessionalCredentials } from "./credentialWorkspace";

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

describe("Linked credentials on Education and Languages", () => {
  const longTitle = "Engineer Degree in Transportation Engineering with Honours from the Mientrung University of Civil Engineering";
  const linked = (id: string, title: string, status: ProfessionalCredential["status"] = "published"): ProfessionalCredential => ({
    ...credential(id, title, 1),
    kind: "academic_degree",
    relatedType: "education",
    relatedId: "education-one",
    status,
  });

  it("truncates only the credential title and keeps meta separate (§6.2)", () => {
    const html = renderLinkedCredentials([linked("credential-long", longTitle)], "education", "education-one");

    expect(html).toContain(`class="admin-truncate admin-linked-credential__title" title="${longTitle}"`);
    expect(html).toContain('<span class="admin-linked-credential__meta">0 files</span>');
    expect(html).not.toContain(`${longTitle} · `);
    expect(html).toContain('<span class="admin-linked-credential__kind">Degree</span>');
    expect(html.indexOf("data-credential-add-related")).toBeLessThan(html.indexOf("admin-linked-credentials__list"));
  });

  it("renders one row per credential, flags drafts and skips archived ones", () => {
    const html = renderLinkedCredentials([
      linked("credential-one", "TOEIC Listening & Reading – 570"),
      linked("credential-two", "IELTS Academic 7.0", "draft"),
      linked("credential-three", "Old certificate", "archived"),
    ], "education", "education-one");

    expect(html.match(/<li><button class="admin-linked-credential"/g)).toHaveLength(2);
    expect(html).toContain("<small>2 linked</small>");
    expect(html).toContain('<span class="status status--draft">Draft</span>');
    expect(html).toContain("TOEIC Listening &amp; Reading – 570");
    expect(html).not.toContain("Old certificate");
  });

  it("shows a quiet empty state with the add action", () => {
    const html = renderLinkedCredentials([], "language", "language-one");

    expect(html).toContain("admin-linked-credentials__empty");
    expect(html).toContain('data-related-type="language" data-related-id="language-one"');
    expect(html).not.toContain("admin-linked-credentials__list");
  });
});

describe("Credential card layout (§6.4)", () => {
  const withEvidence = (): ProfessionalCredential => ({
    ...credential("credential-degree", "Engineer Degree in Transportation Engineering", 1),
    kind: "academic_degree",
    relatedType: "education",
    relatedId: "transportation-engineering-muce",
    description: { en: "Degree classification: Excellent.", vi: "" },
    assets: [{
      id: "asset-one",
      credentialId: "credential-degree",
      documentKind: "certificate",
      name: "Bằng TNDH-2",
      storagePath: "private/asset-one.jpg",
      originalFilename: "bang.jpg",
      mimeType: "image/jpeg",
      fileSize: 266 * 1024,
      displayOrder: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    }],
  });
  const cardHtml = (item: ProfessionalCredential): string => {
    const html = renderProfessionalCredentials(professionalProfileSeed, [item]);
    return html.slice(html.indexOf("<article"), html.indexOf("</article>") + 10);
  };

  it("keeps status with the identity and puts Archive in the More menu", () => {
    const html = cardHtml(withEvidence());
    const header = html.slice(0, html.indexOf("</header>"));

    expect(header.indexOf("status--published")).toBeLessThan(header.indexOf("admin-profile-entry-card__actions"));
    expect(header).toMatch(/<details class="admin-document-more admin-more-menu">[\s\S]*data-credential-archive="credential-degree"[\s\S]*<\/details>/);
    expect(header).not.toMatch(/<button class="button[^"]*admin-button--danger/);
  });

  it("shows each fact once as a meta line, with a link to the related entry", () => {
    const html = cardHtml(withEvidence());

    expect(html).not.toContain("<dl>");
    expect(html).toContain("Issued ");
    expect(html).toContain("No expiry");
    expect(html).toMatch(/data-credential-show-related data-related-type="education" data-related-id="transportation-engineering-muce" title="Open Education: /);
    expect(html.match(/1 private file/g)).toHaveLength(1);
    expect(html).not.toContain("Original files remain private");
  });

  it("lists evidence one row per file with Delete in More, and stages uploads in a hidden pending row", () => {
    const html = cardHtml(withEvidence());
    const row = html.slice(html.indexOf("<li>"), html.indexOf("</li>"));

    expect(row).toContain('class="admin-truncate admin-credential-file__name" title="Bằng TNDH-2"');
    expect(row).toMatch(/<details class="admin-document-more admin-more-menu">[\s\S]*data-credential-asset-delete="asset-one"/);
    expect(html).toMatch(/<div class="admin-credential-pending" data-credential-pending hidden>[\s\S]*data-credential-upload-kind/);
    expect(html.indexOf("data-credential-upload-kind")).toBeGreaterThan(html.indexOf("data-credential-pending"));
  });

  it("offers Restore instead of Edit and More on an archived credential", () => {
    const html = cardHtml({ ...withEvidence(), status: "archived" });

    expect(html).toContain("data-credential-restore");
    expect(html).not.toContain("admin-more-menu__trigger\" aria-label=\"More actions for Engineer");
    expect(html).not.toContain("admin-credential-files");
  });
});

describe("Credential dialog dates (§6.3)", () => {
  it("uses the form's two-column grid and keeps 'Does not expire' in the expiry label row", () => {
    const html = renderProfessionalCredentials(professionalProfileSeed, []);
    const dates = html.slice(html.indexOf("admin-credential-date-grid"), html.indexOf('name="credential_number"'));

    expect(html).toContain('class="admin-form-grid admin-credential-date-grid"');
    expect(dates).toMatch(/<div class="admin-field-label-row">[\s\S]*Expiry date[\s\S]*data-credential-no-expiry[\s\S]*<\/div>\s*<span class="admin-field-swap" data-credential-expiry-swap>\s*<input id="credential-expires-on"/);
    expect(dates).toContain("data-credential-expiry-static");
    expect(dates).not.toContain("admin-switch");
  });
});
