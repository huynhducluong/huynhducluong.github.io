import { describe, expect, it } from "vitest";
import mainSource from "./main.ts?raw";
import confirmDialogSource from "./confirmDialog.ts?raw";
import coverLetterWorkspaceSource from "./coverLetterWorkspace.ts?raw";
import credentialWorkspaceSource from "./credentialWorkspace.ts?raw";
import profilePhotoCropperSource from "./profilePhotoCropper.ts?raw";
import projectCoverCropperSource from "./projectCoverCropper.ts?raw";
import profileDocumentWorkspaceSource from "./profileDocumentWorkspace.ts?raw";
import siteWorkspaceSource from "./siteWorkspace.ts?raw";
import textInputDialogSource from "./textInputDialog.ts?raw";
import toastSource from "./toast.ts?raw";
import adminSource from "../styles/admin.css?raw";
import adminSiteSource from "../styles/admin-site.css?raw";

const importPosition = (source: string, stylesheet: string): number =>
  source.indexOf(`import "../styles/${stylesheet}";`);

describe("Admin stylesheet contract", () => {
  it("loads workspace styles before the final UI normalization layer", () => {
    const orderedStylesheets = [
      "admin-cover-letter.css",
      "admin-documents.css",
      "admin-site.css",
      "admin-typography.css",
      "admin-ui.css",
      "cover-letter-screen.css",
    ];
    const positions = orderedStylesheets.map((stylesheet) => importPosition(mainSource, stylesheet));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it("does not re-inject workspace CSS after the UI normalization layer", () => {
    expect(coverLetterWorkspaceSource).not.toContain("../styles/");
    expect(profileDocumentWorkspaceSource).not.toContain("../styles/");
    expect(siteWorkspaceSource).not.toContain("../styles/");
  });

  it("does not use guessed intrinsic heights for interactive Admin content", () => {
    expect(adminSource).not.toContain("content-visibility");
    expect(adminSource).not.toContain("contain-intrinsic-size");
    expect(adminSiteSource).not.toContain("content-visibility");
    expect(adminSiteSource).not.toContain("contain-intrinsic-size");
  });

  it("keeps notifications inside the active dialog top layer", () => {
    expect(toastSource).toContain("activeAdminDialog");
    expect(toastSource).toContain("ensureDialogStatusRegion");
    expect(toastSource).toContain("toastByKey");
  });

  it("provides a shared status slot in every reusable Admin dialog", () => {
    [
      confirmDialogSource,
      credentialWorkspaceSource,
      profilePhotoCropperSource,
      projectCoverCropperSource,
      profileDocumentWorkspaceSource,
      siteWorkspaceSource,
      textInputDialogSource,
      coverLetterWorkspaceSource,
    ].forEach((source) => expect(source).toContain("data-admin-dialog-status"));
    expect(mainSource).toContain("data-password-message");
  });

  it("uses semantic SVG icons instead of numeric navigation markers", () => {
    expect(mainSource).toContain("renderAdminNavIcon(view)");
    expect(mainSource).toContain('class="admin-nav__icon-shell"');
    expect(mainSource).not.toMatch(/navButton\([^\n]+,\s*"0[1-9]"\)/);
  });

  it("keeps Portfolio media compact and aligned with shared Admin controls", () => {
    const overridesPosition = profileDocumentWorkspaceSource.indexOf('title: "Item layout overrides"');
    const mediaPosition = profileDocumentWorkspaceSource.indexOf('title: "Portfolio media"');
    expect(overridesPosition).toBeGreaterThanOrEqual(0);
    expect(mediaPosition).toBeGreaterThan(overridesPosition);
    expect(profileDocumentWorkspaceSource).toContain("data-portfolio-media-group");
    expect(profileDocumentWorkspaceSource).toContain("renderAdminSelectControl({ name: `project_primary_media_");
    expect(profileDocumentWorkspaceSource).not.toContain("image.alt.en ?");
    expect(profileDocumentWorkspaceSource).not.toContain("Required by layout");
    expect(profileDocumentWorkspaceSource).toContain('aria-required="true"');
    expect(profileDocumentWorkspaceSource).toContain("data-portfolio-primary-required");
    expect(profileDocumentWorkspaceSource).toContain("data-portfolio-supporting-required");
  });

  it("uses one styled required marker and keeps generated slugs optional to enter", () => {
    expect(mainSource).toContain('field("Slug", "slug", project.slug, "text", "Auto-generated from project name")');
    expect(mainSource).toContain('field("Slug", "slug", tool.slug, "text", "Auto-generated from tool name")');
    expect(mainSource).not.toContain('"Slug *"');
    expect(siteWorkspaceSource).toContain('field("Institution (EN)"');
    expect(siteWorkspaceSource).not.toContain('"Institution (VI) *"');
    expect(credentialWorkspaceSource).toContain("data-credential-expiry-required");
  });

  it("separates Portfolio credentials into the ordered Background tab", () => {
    expect(profileDocumentWorkspaceSource).toContain(
      '[["content", "Content"], ["selection", "Projects & tools"], ["background", "Background"], ["appearance", "Appearance"]]',
    );
    const selectionStart = profileDocumentWorkspaceSource.indexOf("const portfolioSelectionPanel");
    const backgroundStart = profileDocumentWorkspaceSource.indexOf("const portfolioBackgroundPanel");
    const formReaderStart = profileDocumentWorkspaceSource.indexOf("const readPortfolioForm");
    expect(selectionStart).toBeGreaterThanOrEqual(0);
    expect(backgroundStart).toBeGreaterThan(selectionStart);
    expect(formReaderStart).toBeGreaterThan(backgroundStart);
    expect(profileDocumentWorkspaceSource.slice(selectionStart, backgroundStart)).not.toContain('name="portfolio_credential"');
    expect(profileDocumentWorkspaceSource.slice(backgroundStart, formReaderStart)).toContain('name="portfolio_credential"');
  });

  it("rebases editable document lists on their source-library order", () => {
    expect(profileDocumentWorkspaceSource).not.toContain("portfolioOrder: selection.portfolioOrder");
    expect(profileDocumentWorkspaceSource).toContain("portfolioOrder: item.portfolioOrder");
    expect(profileDocumentWorkspaceSource).toContain("experiences: structuredClone(professional.experiences)");
    expect(profileDocumentWorkspaceSource).toContain("education: structuredClone(professional.education)");
    expect(profileDocumentWorkspaceSource).toContain("skillGroups: structuredClone(professional.skillGroups)");
    expect(profileDocumentWorkspaceSource).toContain("languages: structuredClone(professional.languages)");
    expect(profileDocumentWorkspaceSource).toContain("previousBackgroundSelection");
  });
});
