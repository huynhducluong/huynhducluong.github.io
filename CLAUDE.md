# Project notes

Vite + TypeScript (no framework) portfolio site with a Supabase-backed Admin CMS, deployed to GitHub Pages. Owner: BIM Coordinator portfolio — public Website, A4 CV, A4-landscape Portfolio, private Cover Letters, and the Admin that edits all of them.

## Read before you change

| You are changing | Read first |
|---|---|
| `src/admin/**`, `src/styles/admin*.css` | `docs/admin-ui-guidelines.md` |
| Public site (`src/main.ts`, `src/pages/`, `src/site/`, `home.css`, `content.css`, `global.css`) | `docs/ui-guidelines.md` §1–§5 |
| CV, Portfolio, Cover Letter rendering or print CSS | `docs/ui-guidelines.md` §6–§8, `docs/cover-letter.md` |
| Portfolio layouts (`src/portfolio/`, `portfolio-screen.css`) | `docs/ui-guidelines.md` §8.1–§8.4 (page grid, chrome, safe area, content rules) |
| Document colors or `src/themes/` | `docs/ui-guidelines.md` §7 |
| Any TypeScript, data shape, test or migration | `docs/coding-conventions.md` |
| Data ownership, publishing, previews, media | `docs/architecture.md` |
| Migrations, health checks, bundle budget | `docs/admin-operations.md` |
| Reusing this UI in another project | `docs/ui-kit/README.md` |

If a change must break a documented rule, update that document in the same change and say why.

## Commands

- `npm run dev` — Vite dev server.
- `npm run test:watch` — Vitest while developing.
- `npm run verify:admin` — typecheck, tests, build, Admin bundle budget. Run before finishing any change; CI runs the same gate before deploying.

## Non-negotiable UI/UX rules (summary)

These are the rules most often broken. The detailed versions live in the guideline docs.

1. **Tokens, not literals.** Public site uses `--color-*`, `--space-*`, `--font-*`, `--radius-*` (`src/styles/tokens.css`). Admin uses `--admin-*` (`admin-ui.css`, `admin-typography.css`). Documents use `--document-*` from `src/themes/documentThemes.ts`. Never hard-code a value a token covers, and never mix the three families.
2. **Reuse shared renderers.** Admin: `src/admin/ui.ts`, `confirmAdmin`, `requestAdminText`, `showAdminToast`, `setAdminDirty`. Public: `src/site/shell.ts` (`siteHeader`, `siteFooter`) and `src/site/renderers.ts` (cards, tags, media). Documents: `src/shared/documentPrintPreview.ts`. Extract to a shared module before a pattern gets its third copy.
3. **Escape everything.** HTML is built with template strings; every dynamic value goes through `escapeHtml` or `localize` (`src/shared/format.ts`).
4. **Bilingual EN/VI.** Content uses `LocalizedText { en, vi }`; forms show EN first, then VI. Public pages read `?lang=vi` and set `document.documentElement.lang`. English is required, Vietnamese falls back to English.
5. **One primary action** per Admin header (`admin-action-publish`); destructive actions live in More and confirm with `tone: "danger"`.
6. **Accessibility is part of done.** Visible `:focus-visible`, accessible names on icon buttons, `aria-pressed` / `aria-expanded` on toggles, keyboard support, `alt` text on images, motion ≤150 ms (Admin) / 180 ms (site) and off under `prefers-reduced-motion`.
7. **Reuse existing breakpoints.** Do not invent new widths (lists in each guideline doc).
8. **Print documents are fixed-size.** A4 (210×297 mm) for CV and Cover Letter, A4 landscape (297×210 mm) for Portfolio, with `@page { margin: 0 }`, `overflow: hidden` and overflow detection. Never let content silently spill past a page, or into a header or footer band (`findPortfolioLayoutIssues`).
   - Portfolio layouts align to the `--pf-*` page-grid tokens. Header and footer never sit on a colored rail (rails declare `--pf-rail-left/right`), and never show a layout id.
   - Every printed string is localized through `copy` (no English in the VI PDF). Unknown values are omitted, not printed as "—". The same information is never printed twice on a page.
   - Document colors come from `buildDocumentThemeTokens`, which guarantees 4.5:1. Never use accent as a text color, and never fade text with `opacity`.
9. **Outputs select, Profile owns.** Website/CV/Portfolio never store their own copy or order of shared Profile, Project or Tool content (see `docs/architecture.md`).
10. **Light theme only.** All surfaces declare `color-scheme: light`; do not add dark-mode rules piecemeal.

## Supabase

Never add a secret or service-role key to frontend code. New `security definer` functions must check `public.is_portfolio_admin()` (or be service-role only) and explicitly revoke EXECUTE from `anon` (and from `authenticated` when internal), because Supabase grants EXECUTE to those roles by default. New migrations are `supabase/migrations/YYYYMMDDNNNN_snake_case.sql` and are listed in `docs/admin-operations.md` when they need a manual step.

## Definition of done

1. `npm run verify:admin` passes.
2. The relevant guideline checklist is satisfied (Admin §14, `docs/ui-guidelines.md` §9).
3. Docs updated in the same change when behavior, a rule, a migration or a budget changes.
