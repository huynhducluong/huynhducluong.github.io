# Coding conventions

How code in this repository is written. Follow the surrounding file when it is more specific than this page.

## 1. Stack and boundaries

- Vite multi-page app, TypeScript, no UI framework. Each route is an `index.html` registered in `vite.config.ts` `rollupOptions.input`; add a new route there.
- Runtime dependencies are intentionally few (`@supabase/supabase-js`, `cropperjs`, `@fontsource-variable/inter`). Adding one needs a reason and must keep `npm run check:admin-bundle` within budget.
- `tsconfig.json` uses `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`. Therefore: use `import type` for type-only imports; no `enum`, `namespace` or constructor parameter properties; delete unused code instead of prefixing it (the existing `_content` parameter is the exception, kept for signature stability).

## 2. Folder roles

| Folder | Holds | May import |
|---|---|---|
| `src/types/` | Data shapes only | nothing at runtime |
| `src/shared/` | Pure helpers used by more than one surface (format, validation, preview protocol, ordering) | `types` |
| `src/data/` | Seed and fallback content | `types` |
| `src/services/` | Supabase repositories (`*Repository.ts`) and caches | `types`, `shared`, `config` |
| `src/site/`, `src/pages/`, `src/main.ts` | Public website | `shared`, `services`, `themes`, `site`, `admin/auth` |
| `src/cv/`, `src/portfolio/`, `src/cover-letter/` | Document renderers and their entry points | `shared`, `services`, `themes`, `admin/auth` |
| `src/themes/` | Document theme engine | `types` |
| `src/admin/` | Admin CMS | anything above |

Public and document code imports from `src/admin/` only `auth.ts` (`getAdminAccess`, `requireAdminAccess`, for draft previews); never Admin UI modules, which would pull Admin code into public bundles. Move a helper to `src/shared/` when a second surface needs it. `src/shared/`, `src/themes/` and `src/types/` import nothing from `services`, `site` or `admin`.

## 3. Style

- `export const name = (…) => …` arrow functions; classes only for stateful utilities (`MemoryRequestCache`).
- Double quotes, semicolons, two-space indent, trailing commas in multi-line literals.
- File names: `camelCase.ts`; repositories end in `Repository`, workspaces in `Workspace`, tests are `<file>.test.ts` next to the source.
- CSS files: `kebab-case.css` per surface (`home.css`, `cv-screen.css`, `cv-print.css`, `admin-*.css`). Class names are BEM-like: `.block`, `.block__element`, `.block--modifier`; Admin classes start with `admin-`.
- Comments are rare and explain why, not what.
- CSS specificity: page-level resets such as `.portfolio-page ol { padding: 0 }` (0,1,1) outrank a single class. When a layout rule must beat a reset or a later generic rule, prefix it with the page class (`.portfolio-page :is(...)`) instead of adding `!important` or reordering the file.

## 4. Rendering HTML

- Renderers return HTML strings and are inserted with `innerHTML`. Every dynamic value is escaped with `escapeHtml`, or `localize` for `LocalizedText` (which escapes). Never interpolate raw user, database or URL content.
- Escape exactly once, at the point of output. Never wrap `localize(...)` in `escapeHtml` (that renders `&amp;` on the page). The Portfolio renderer's private `localized` returns raw text and its callers escape it.
- Conditional fragments use `${cond ? `…` : ""}`; lists use `.map(...).join("")`.
- Behavior is attached after insertion with `bind…(root)` functions (`bindAdminTablists`, `bindPreviewZoom`, `bindDocumentPrintButton`). Prefer `data-*` attributes over classes as JS hooks.
- User-facing copy for UI chrome lives in a local `copy = { en: {...}, vi: {...} } as const` object.

## 5. Data and Supabase

- Repositories map rows to domain types with `…FromRow` / `toRow` functions; the rest of the app never sees column names.
- Reads that several workspaces share use `MemoryRequestCache` (short TTL, request deduplication); every mutation calls `set` or invalidates the cache.
- Multi-row writes (publish, reorder, draft + evidence) go through a database function so they are transactional.
- Never store signed URLs or private file paths in caches, releases or `localStorage`.
- Migration names: `YYYYMMDDNNNN_snake_case.sql`, never edit an applied migration, add a new one. Follow the `security definer` rules in `CLAUDE.md`.

## 6. Tests

- Vitest runs in the default Node environment (no DOM). Test pure functions and rendered strings: render the markup and assert on the HTML (see `ui.test.ts`), and keep DOM-dependent code thin.
- Contract tests read source with `?raw` imports to lock invariants such as stylesheet order (`adminStyles.test.ts`) or the Portfolio chrome bands (`safeArea.test.ts`). Add one when a rule is easy to break silently. CSS `?raw` imports only work because `vite.config.ts` sets `test: { css: true }`. Without it Vitest returns an empty string and every `not.toContain` assertion passes vacuously, so keep that setting and prefer at least one positive `toContain` per CSS file you test.
- Layout code that needs a browser keeps a pure core that can be tested in Node: `countSafeAreaViolations` takes plain boxes, and `findPortfolioLayoutIssues` only collects DOM rectangles and calls it.
- Code that touches `localStorage` must fall back gracefully; tests assert the fallback (see `headerDensity.test.ts`).
- Each bug fix adds a test that fails without the fix when the logic is testable without a browser.

## 7. Commits

Conventional style used in history: `feat: …`, `feat(portfolio): …`, `fix: …`, `docs: …`, `refactor: …`. Mention bundle budget increases and new migrations in the message body.
