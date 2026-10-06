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
});
