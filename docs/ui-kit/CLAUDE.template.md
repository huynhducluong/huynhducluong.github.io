# Project notes

<!-- Template from huynhducluong.github.io docs/ui-kit. Replace every <…>, delete rows that do not apply. -->

<One sentence: stack, what the product is, where it deploys.> Built on the UI kit from huynhducluong.github.io: framework-free TypeScript renderers, CSS token families, print-ready documents.

## Read before you change

| You are changing | Read first |
|---|---|
| Back-office UI (`src/admin/**`, `src/styles/admin*.css`) | `docs/admin-ui-guidelines.md` |
| Public pages | `docs/ui-guidelines.md` §1–§5 |
| Printable documents | `docs/ui-guidelines.md` §6–§8 |
| Any code, data shape, test or migration | `docs/coding-conventions.md` |
| Architecture and data ownership | `docs/architecture.md` |

If a change must break a documented rule, update that document in the same change and say why.

## Commands

- `npm run dev`: dev server.
- `npm run test:watch`: Vitest while developing.
- `npm run verify`: typecheck, tests, build<, bundle budget>. Run before finishing any change; CI runs the same gate.

## Non-negotiable UI/UX rules

1. **Tokens, not literals.** Website `--color-*` / `--space-*` / `--font-*`; back office `--admin-*`; documents `--document-*`. Never hard-code a value a token covers, never mix families.
2. **Reuse shared renderers** (`src/admin/ui.ts`, toast, confirm, text prompt, dirty state, `src/site/*`, print preview). Extract before a pattern's third copy.
3. **Escape everything** interpolated into HTML (`escapeHtml`, `localize`).
4. **Localized content** is `{ <en>, <vi> }`; forms show the primary language first; the page sets `<html lang>`; missing translations fall back to <en>.
5. **One primary action** per header; destructive actions behind More with a danger confirmation.
6. **Accessibility is part of done:** visible focus, accessible names, `aria-pressed` / `aria-expanded`, full keyboard support, image alt text, motion ≤150–180 ms and disabled under reduced motion.
7. **Reuse existing breakpoints:** <list them>.
8. **Print documents are fixed-size `mm` pages** with `@page { margin: 0 }`, `overflow: hidden`, overflow detection and browser-print export.
9. **Light theme only** unless a full dark token set is added.

## Backend

<Secrets policy, auth model, migration naming and privilege rules. For Supabase: no service-role key in frontend; `security definer` functions check the admin predicate and revoke EXECUTE from `anon` / `authenticated`.>

## Definition of done

1. `npm run verify` passes.
2. The relevant guideline checklist is satisfied.
3. Docs are updated in the same change when behavior, a rule or a budget changes.
