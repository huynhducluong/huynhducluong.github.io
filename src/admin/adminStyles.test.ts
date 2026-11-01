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

  it("gives the shell one top-bar height and a height-independent rail footer (§11)", () => {
    const styles = import.meta.glob<string>(["../styles/admin.css", "../styles/admin-ui.css"], { query: "?raw", import: "default", eager: true });
    const admin = styles["../styles/admin.css"];
    const adminUi = styles["../styles/admin-ui.css"];
    expect(adminUi).toMatch(/--admin-topbar-height: 4rem;/);
    expect(admin).toMatch(/\.admin-brand \{[^}]*height: var\(--admin-topbar-height\);/);
    expect(admin).toMatch(/\.admin-header \{[^}]*height: var\(--admin-topbar-height\);/);
    expect(admin).toMatch(/\.admin-main \{[^}]*grid-template-rows: var\(--admin-topbar-height\) minmax\(0, 1fr\);/);
    expect(admin).toMatch(/\.admin-rail__footer \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    // Height media queries may tighten the navigation, never the top bar or the footer.
    const heightRules = [...adminUi.matchAll(/@media[^{]*max-height[^{]*\{([\s\S]*?)\n\}/g)].map((match) => match[1]).join("\n");
    expect(heightRules).not.toMatch(/\.admin-(brand|header|main|rail__footer)\b/);
    expect(`${admin}\n${adminUi}`).not.toMatch(/(?:min-)?height: 4\.5rem|grid-template-rows: 4rem/);
  });

  it("lets every shell column reach the window bottom (§11)", () => {
    const adminUi = Object.values(import.meta.glob<string>("../styles/admin-ui.css", { query: "?raw", import: "default", eager: true }))[0];
    // The last rules of the final layer: framed workspaces drop the bottom gutter, frames lose bottom border and corners.
    const frameRule = adminUi.slice(adminUi.lastIndexOf("html.admin-app .admin-workspace:is("));
    ["admin-editor-shell", "admin-document-library", "admin-cl-shell", "admin-document-workspace", "admin-site-workspace", "admin-profile-workspace"]
      .forEach((frame) => expect(frameRule.slice(0, frameRule.indexOf("{"))).toContain(`:has(> .${frame})`));
    expect(frameRule).toMatch(/^[^{]*\{\s*padding-bottom: 0;/);
    expect(adminUi).toMatch(/\.admin-editor-shell \{\s*border-bottom-width: 0;\s*border-end-start-radius: 0;\s*border-end-end-radius: 0;/);
    expect(adminUi).toMatch(/html\.admin-app \.admin-collection__scroll \{\s*padding-bottom: var\(--admin-workspace-gutter\);/);
    // The internally scrolling Portfolio preview stands on the edge too; its end gap is sized for the current zoom.
    const documents = Object.values(import.meta.glob<string>("../styles/admin-documents.css", { query: "?raw", import: "default", eager: true }))[0];
    const portfolio = Object.values(import.meta.glob<string>("../styles/portfolio-screen.css", { query: "?raw", import: "default", eager: true }))[0];
    expect(documents).toMatch(/\.admin-document-frame\[data-preview-scroll="internal"\] \{[^}]*padding-bottom: 0;/);
    expect(portfolio).toMatch(/\.document-preview-scroll \.portfolio-preview-shell \{[^}]*padding-bottom: calc\(1\.25rem \/ var\(--embedded-preview-scale, 1\)\);/);
  });

  it("names the owner in the rail and never lets a long name widen it (§11)", () => {
    const admin = Object.values(import.meta.glob<string>("../styles/admin.css", { query: "?raw", import: "default", eager: true }))[0];
    const main = Object.values(import.meta.glob<string>("./main.ts", { query: "?raw", import: "default", eager: true }))[0];
    expect(main).toContain("<small data-admin-brand-identity");
    expect(main).toMatch(/profileName\(profile\.name, "en"\)\.trim\(\) : ""\) \|\| adminBrand\.workspace/);
    expect(admin).toMatch(/\.admin-rail \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(admin).toMatch(/\.admin-brand small \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
    // Both brand lines stay on one line: the name is fitted (10 px floor) before it is ever ellipsized.
    expect(admin).toMatch(/\.admin-brand strong \{[^}]*white-space: nowrap;/);
    expect(admin).toMatch(/\.admin-brand > div \{ flex: 1 1 auto; \}/);
    expect(main).toContain("const ADMIN_IDENTITY_MIN_SIZE = 10;");
    // Re-fitted on window resize, font load, every identity update (typing) and every shell render.
    expect(main.match(/fitAdminIdentityLabel\(/g)?.length).toBeGreaterThanOrEqual(4);
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
    ].forEach((source) => expect(source).toMatch(/data-admin-dialog-status|renderAdminDialogHeader\(/));
    expect(mainSource).toContain("data-password-message");
  });

  it("draws every dropdown arrow with the shared chevron", () => {
    const adminSources = import.meta.glob<string>(["./*.ts", "!./*.test.ts", "!./ui.ts"], { query: "?raw", import: "default", eager: true });
    const adminStyles = import.meta.glob<string>("../styles/admin*.css", { query: "?raw", import: "default", eager: true });
    expect(Object.keys(adminSources).length).toBeGreaterThan(10);
    expect(Object.keys(adminStyles).length).toBeGreaterThan(3);
    Object.entries(adminSources).forEach(([path, source]) => {
      expect(source, `${path} renders a bare <select>; use renderAdminSelectControl`).not.toMatch(/<select[\s>]/);
      expect(source, `${path} copies the chevron SVG; use adminChevronIcon`).not.toContain('d="m4 6 4 4 4-4"');
    });
    Object.entries(adminStyles).forEach(([path, source]) => {
      if (path.endsWith("admin-ui.css")) return;
      expect(source, `${path} restyles the chevron glyph; keep it in admin-ui.css`).not.toMatch(/chevron[^{]*\bsvg\s*\{/);
      expect(source, `${path} hard-codes a chevron width; use --admin-chevron-slot`).not.toMatch(/padding-right:\s*3rem/);
    });
  });

  it("builds dialogs and croppers from the shared header, icons and crop geometry", () => {
    const adminSources = import.meta.glob<string>(["./*.ts", "!./*.test.ts"], { query: "?raw", import: "default", eager: true });
    Object.entries(adminSources).forEach(([path, source]) => {
      expect(source, `${path} previews a crop through cropper-viewer; use cropPreviewStyle (§7.1)`).not.toContain("<cropper-viewer");
      expect(source, `${path} exports through the cropper widget; use cropSourceRect (§7.1)`).not.toContain("$toCanvas(");
      expect(source, `${path} types a close glyph; use renderAdminDialogHeader (§8.1)`).not.toMatch(/>(?:&times;|×)<\/button>/);
      expect(source, `${path} types a zoom glyph; use the shared zoom icons`).not.toMatch(/>(?:&minus;|&plus;)<\/button>/);
      expect(source, `${path} types an arrow glyph; use adminArrowUpIcon / adminArrowDownIcon`).not.toMatch(/&#859[35];|&[ud]arr;|>[↑↓]<\/button>/);
    });
    [profilePhotoCropperSource, projectCoverCropperSource, credentialWorkspaceSource].forEach((source) => {
      expect(source).toContain("renderAdminDialogHeader({");
    });
    [profilePhotoCropperSource, projectCoverCropperSource].forEach((source) => {
      expect(source).toContain("bindCropStage(");
      expect(source).toContain("renderAdminCropZoomControls({");
    });
  });

  it("keeps destructive Profile actions in the shared More menu (§6.4)", () => {
    [siteWorkspaceSource, credentialWorkspaceSource].forEach((source) => {
      expect(source, "Profile cards show a loose destructive button; use renderAdminMoreMenu").not.toContain("admin-button--danger");
    });
    expect(siteWorkspaceSource.match(/renderAdminMoreMenu\(\{/g)?.length).toBeGreaterThanOrEqual(4);
    expect(mainSource).toContain("installAdminMoreMenus();");
  });

  it("scrolls only real scroll containers, so the workspace never shifts (§12)", () => {
    const adminSources = import.meta.glob<string>(["./*.ts", "!./*.test.ts"], { query: "?raw", import: "default", eager: true });
    Object.entries(adminSources).forEach(([path, source]) => {
      const calls = source.split("\n").filter((line) => !/^\s*(\*|\/\/)/.test(line) && line.includes(".scrollIntoView("));
      expect(calls, `${path} calls scrollIntoView; use revealAdminElement`).toEqual([]);
    });
    const adminUiSource = Object.values(import.meta.glob<string>("../styles/admin-ui.css", { query: "?raw", import: "default", eager: true }))[0];
    // Layout frames clip instead of hide: an overflow: hidden frame can still be scrolled by script.
    expect(adminUiSource).not.toMatch(/\.admin-profile-workspace \{[^}]*overflow: hidden/);
    expect(adminUiSource).not.toMatch(/\.admin-profile-layout \{[^}]*overflow: hidden/);
    expect(adminUiSource).not.toMatch(/\.admin-workspace:has\(> \.admin-profile-workspace\)[^{]*\{[^}]*overflow: hidden/);
  });

  it("gives every selection list the shared heading count (§6.6)", () => {
    // CV (Projects, Tools), Portfolio (Projects, Tools), CV/Portfolio Background groups (one shared backgroundGroup),
    // Portfolio › Profile page capability cards, Website (Projects, Tools), Cover letter evidence (Projects, Tools).
    expect(profileDocumentWorkspaceSource.match(/renderAdminSelectionHeading\(\{/g)).toHaveLength(6);
    expect(profileDocumentWorkspaceSource).not.toMatch(/backgroundGroup\(\{[^}]*note:/);
    expect(siteWorkspaceSource.match(/renderAdminSelectionHeading\(\{ title: "(?:Projects|Automation tools)", mode: "shown"/g)).toHaveLength(2);
    expect(coverLetterWorkspaceSource.match(/renderAdminSelectionHeading\(\{ title: "(?:Projects|Automation tools)", mode: "selected"/g)).toHaveLength(2);
    // Counts are worded in one place only.
    [profileDocumentWorkspaceSource, siteWorkspaceSource, coverLetterWorkspaceSource].forEach((source) => {
      expect(source).not.toMatch(/\} (?:selected|shown)`|of \$\{[^}]+\} (?:selected|shown)/);
    });
  });

  it("never shows the browser's own file input (§6.5)", () => {
    const adminSources = import.meta.glob<string>(["./*.ts", "!./*.test.ts"], { query: "?raw", import: "default", eager: true });
    Object.entries(adminSources).forEach(([path, source]) => {
      (source.match(/<input[^>]*type="file"[^>]*>/g) ?? []).forEach((input) => {
        expect(input, `${path} shows a native file input; use renderAdminFilePicker or a button with a hidden input`).toMatch(/\shidden[\s>]|class="sr-only"/);
      });
    });
  });

  it("keeps every Admin stylesheet structurally valid", () => {
    const styles = import.meta.glob<string>("../styles/admin*.css", { query: "?raw", import: "default", eager: true });
    Object.entries(styles).forEach(([path, source]) => {
      // A stray "}" silently drops the next rule in the browser, so braces must balance and never go negative.
      let depth = 0;
      let lowest = 0;
      for (const character of source.replace(/\/\*[\s\S]*?\*\//g, "")) {
        if (character === "{") depth += 1;
        if (character === "}") lowest = Math.min(lowest, --depth);
      }
      expect({ path, depth, lowest }).toEqual({ path, depth: 0, lowest: 0 });
    });
  });

  it("keeps components independent of where they are rendered (§6.3)", () => {
    const styles = import.meta.glob<string>("../styles/admin*.css", { query: "?raw", import: "default", eager: true });
    const adminUiSource = Object.entries(styles).find(([path]) => path.endsWith("admin-ui.css"))![1];
    // Broad containers may style field labels and text fields only, never every input/label inside them.
    const broadContainer = /(?:^|[,}]\s*)\.(?:admin-document-editor|admin-form-section|admin-dialog|admin-document-cards|admin-profile-workspace|admin-site-workspace) (?:input|label)(?:\s*[,{]|:(?!where\(:not))/m;
    Object.entries(styles).forEach(([path, source]) => {
      expect(source, `${path}: a container rule styles bare input/label; exclude toggles with :where(:not(...))`).not.toMatch(broadContainer);
    });
    // A modal measures its own width, not the panel behind it.
    expect(adminUiSource).toMatch(/\.admin-dialog \{\s*container: admin-form \/ inline-size;/);
    // Field-row components outrank any container rule.
    ["admin-field-label-row", "admin-inline-check", "admin-field-swap"].forEach((name) => {
      expect(adminUiSource).toContain(`html.admin-app .${name} {`);
    });
  });

  it("makes disabled fields look disabled (§6.3)", () => {
    const adminUiSource = Object.values(import.meta.glob<string>("../styles/admin-ui.css", { query: "?raw", import: "default", eager: true }))[0];
    // Same selector shape as the white base field rule plus :disabled, so it always wins.
    expect(adminUiSource).toContain('.admin-shell input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]):not([type="hidden"]):disabled');
    expect(adminUiSource).not.toContain(".admin-shell :where(input, textarea, select):disabled");
    // Invalid fields use the same selector shape, so the danger border is never lost to the neutral one.
    expect(adminUiSource).toContain('.admin-shell input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]):not([type="hidden"])[aria-invalid="true"]');
    // The hidden attribute always wins over any display a class sets.
    expect(adminUiSource).toContain("html.admin-app [hidden] { display: none !important; }");
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
    // Rows come from portfolioMediaSelection.ts (§6.8, tested there); the workspace never hand-writes them again.
    expect(profileDocumentWorkspaceSource.match(/renderPortfolioMediaRow\(\{ kind: "(?:project|tool)"/g)).toHaveLength(2);
    expect(profileDocumentWorkspaceSource).not.toContain("admin-portfolio-media-item");
    expect(profileDocumentWorkspaceSource).not.toContain("Not used by layout");
    expect(profileDocumentWorkspaceSource).not.toContain("Required by layout");
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
    expect(profileDocumentWorkspaceSource.slice(selectionStart, backgroundStart)).not.toContain("portfolio_credential");
    expect(profileDocumentWorkspaceSource.slice(backgroundStart, formReaderStart)).toContain('inputName: "portfolio_credential"');
  });

  it("composes Portfolio skill groups from Professional Profile", () => {
    const composeStart = profileDocumentWorkspaceSource.indexOf("const composePortfolioDraft");
    const composeEnd = profileDocumentWorkspaceSource.indexOf("const composeCvDocument");
    expect(composeStart).toBeGreaterThanOrEqual(0);
    expect(profileDocumentWorkspaceSource.slice(composeStart, composeEnd)).toContain("skillGroups: structuredClone(professional.skillGroups)");
  });

  it("refreshes CV and Portfolio workspaces after credential changes", () => {
    expect(siteWorkspaceSource).toContain("callbacks.onProfessionalCredentialsChanged();");
    expect(mainSource).toMatch(/onProfessionalCredentialsChanged: \(\) => \{\s*profileDocumentWorkspaceModule\?\.invalidateProfileDocumentWorkspace\(\);/);
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
