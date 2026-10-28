# UI kit for the next project

This folder packages the reusable parts of this repository's UI system: design tokens, framework-free TypeScript components, and the rules that keep them consistent. Use it to start a new Vite + TypeScript project (another portfolio, a small CMS, a document generator) with the same look and UX.

Contents:

- `tokens.css`: all three token families (website, admin, document) plus focus and reduced-motion baselines, with the exact values used here.
- `CLAUDE.template.md`: a starter `CLAUDE.md` for the new project. Copy it, fill the blanks, and copy the guideline docs it points to.
- This README: what to copy, what each module needs, and how to adapt it.

## 1. Design principles carried over

1. **Tokens first.** Every color, size, radius, shadow and duration is a CSS custom property. Each surface type (website, admin, document) has its own family, and the families are never mixed.
2. **One primary action per view.** Secondary actions come before it, and destructive or rare actions go behind a More menu with a danger confirmation.
3. **Shared renderers over copied markup.** A pattern used twice becomes a function in a shared module before it is used a third time.
4. **Strings in, strings out.** Components are pure functions that return escaped HTML strings, plus `bind…(root)` functions that attach behavior. That makes them testable in Node without a DOM.
5. **Bilingual by shape.** Content is `{ en, vi }`; UI chrome reads from a `copy` object; English is the fallback.
6. **Accessible by default.** Visible focus, accessible names on icon buttons, keyboard-complete tabs and dialogs, ≤150–180 ms motion that turns off under reduced motion.
7. **Print is a contract.** Fixed-size `mm` pages, `@page { margin: 0 }`, overflow detection, and export through the browser print engine.
8. **Light theme only.** All surfaces set `color-scheme: light`.

## 2. Component inventory

All paths are relative to this repository. "Deps" lists what the file imports; the files marked standalone can be copied alone.

### Foundations

| File | Provides | Deps |
|---|---|---|
| `src/styles/reset.css`, `global.css`, `tokens.css` | Reset, base typography, `.container`, `.section`, `.section-heading`, `.button`, `.tag`, skip link, reduced motion | none |
| `src/shared/format.ts` | `escapeHtml`, `localize`, `formatDate`, `vietnameseToAscii`, `assetUrl` | `types/career` (`LocalizedText`, `Profile`); for a new project keep `escapeHtml` / `localize` and drop the profile helpers |

### Admin / back-office components

| File | Provides | Deps |
|---|---|---|
| `src/admin/ui.ts` | Document/editor headers, section cards, field labels with required marker, preview toolbar, select controls, year picker, workspace states, accessible tablists, `setButtonBusy` | `shared/format` (`escapeHtml`) |
| `src/admin/toast.ts` | `showAdminToast(text, "info" \| "success" \| "error")` with pause-on-hover and dialog scoping | standalone |
| `src/admin/confirmDialog.ts` | `confirmAdmin({ title, message, tone: "warning" \| "danger" \| "primary" })` → `Promise<boolean>`, focus return | standalone |
| `src/admin/textInputDialog.ts` | `requestAdminText(...)` → `Promise<string \| null>` | standalone |
| `src/admin/dirtyState.ts` | Per-scope unsaved-changes tracking, `beforeunload` guard | standalone (edit the `AdminDirtyScope` union) |
| `src/admin/headerDensity.ts` | Comfortable/compact header toggle persisted in `localStorage` with safe fallback | standalone |
| `src/admin/adminIcons.ts` | Inline SVG navigation icons (24×24, stroke, round joins) | standalone |
| `src/admin/previewZoom.ts` | Fit / − / + zoom for a fixed-size preview frame | standalone |
| `src/admin/embeddedPreview.ts` | iframe preview binding | standalone |
| `src/shared/previewProtocol.ts` | Same-origin ready/rendered handshake to push unsaved form data into a preview iframe | standalone (edit `PreviewKind`) |
| `src/styles/admin.css`, `admin-typography.css`, `admin-ui.css` (load in that order, `admin-ui.css` last) | Admin shell, tokens and shared chrome: buttons, status chips, dialogs, toasts, tabs, headers, focus | `tokens.css` (`--color-primary` for toasts) |

### Document components

| File | Provides | Deps |
|---|---|---|
| `src/themes/documentThemes.ts` (+ `documentThemes.test.ts`) | Two-color theme engine: derived tokens, primary auto-darkened to 4.5:1 contrast, `getContrastRatio`, presets, `applyDocumentTheme` | `types/theme` (copy it too) |
| `src/portfolio/safeArea.ts` (+ test) | Detects content running into a fixed header/footer band, not only past the page edge; reusable for any paged document with chrome | standalone |
| `src/themes/themeController.ts` | Theme picker controls | `documentThemes` |
| `src/shared/documentPrintPreview.ts` + `src/styles/document-print-preview.css` | Print toolbar, readiness status ("checking" / "success" / "error"), print button | `shared/format` |
| `src/styles/cv-print.css`, `portfolio-print.css`, `cover-letter-print.css` | A4 portrait / landscape print contracts | none |

## 3. Starting a new project

1. `npm create vite@latest <name> -- --template vanilla-ts`, then add `vitest`.
2. Copy `docs/ui-kit/tokens.css` to `src/styles/tokens.css`, plus `reset.css` and `global.css`. Change token **values** for the new brand; keep the names so the components keep working.
3. Copy the components you need from the inventory, together with their deps. Rename the `admin` prefix only if you rename it everywhere, including CSS classes and the contract tests.
4. Copy `docs/ui-kit/CLAUDE.template.md` to the new repo as `CLAUDE.md`. Copy `docs/admin-ui-guidelines.md`, `docs/ui-guidelines.md` and `docs/coding-conventions.md` into the new `docs/` and delete sections that do not apply.
5. Copy the matching tests (`ui.test.ts`, `headerDensity.test.ts`, `dirtyState.test.ts`, `adminStyles.test.ts`) and adapt them. They are what keeps the rules enforced.
6. Add a `verify` script (`tsc --noEmit && vitest run && vite build`) and run it in CI before deploy. If there is a back-office bundle, copy `scripts/check-admin-bundle.mjs` and set budgets.

## 4. Adapting the brand

- **Website:** change `--color-primary`, `-dark`, `-light`, `--color-accent`, `--color-dark` and the two font stacks. Keep contrast of white text on `--color-primary` ≥ 4.5:1.
- **Admin:** change `--admin-color-focus` / `-focus-ring` to the new primary; leave the semantic success, warning and danger colors alone unless they fail contrast.
- **Documents:** add presets with `createPreset(id, name, primary, accent)`; every other document color is derived. Check `onPrimary` stays readable with a quick `getContrastRatio` test.

## 5. Known gaps to fix when reusing

- There is no dark theme. Adding one means a `prefers-color-scheme` block per token family, not per component.
- Admin toasts read `--color-primary` from the website tokens, so load `tokens.css` in the admin entry as well.
- `ui.ts` header helpers assume the Admin CSS class names; copy `admin-ui.css` with them.
