# Website and document UI/UX guidelines

These rules cover everything outside Admin: the public website (`/`, `/projects/`, `/project/`, `/tools/`, `/tool/`) and the printable documents (`/cv/`, `/portfolio/`, `/cover-letter/`). Admin has its own rules in `docs/admin-ui-guidelines.md`.

When a change must break a rule, update this file in the same change and explain why.

## 1. Three token families, never mixed

| Surface | Tokens | Defined in | Applied to |
|---|---|---|---|
| Public website | `--color-*`, `--space-*`, `--font-*`, `--font-size-*`, `--radius-*`, `--shadow-card`, `--transition-fast`, `--content-max-width` | `src/styles/tokens.css` | `:root` |
| Admin | `--admin-*` | `admin-ui.css`, `admin-typography.css` | `html.admin-app` |
| Documents (CV, Portfolio, Cover Letter) | `--document-*` | `src/themes/documentThemes.ts` → `applyDocumentTheme` | the document root element |

- Website selectors use only website tokens; document selectors use only `--document-*` tokens and physical units. Admin styles never read `--document-*` except inside an embedded document preview.
- Spacing on the website uses the `--space-1 … --space-20` scale (4 px steps up to 1.5 rem, then 2, 2.5, 3, 4, 5 rem). Do not add one-off rem values when a step fits.
- The website's brand colors are themeable: `applyWebsiteTheme` (`src/site/shell.ts`) overwrites `--color-primary`, `--color-primary-dark`, `--color-primary-light` and `--color-accent` from the Website draft theme. Always reference those variables; a hard-coded brand hex will not follow the theme.

## 2. Website typography and layout

- Body: `--font-body` (Inter → Aptos → Segoe UI), `line-height: 1.65`. Headings `h1–h3`: `--font-heading` (Arial Narrow / Roboto Condensed), `line-height: 1.05`.
- Size scale: `--font-size-xs`, `-sm`, `-base` are fixed; `-lg`, `-xl`, `-2xl`, `-hero` are fluid `clamp()` values. Use the scale, not new sizes.
- Page width: `.container` (`min(100% - 2rem, var(--content-max-width))`, max 1200 px). Sections use `.section` (`--space-20` vertical, `--space-16` below 700 px) and `.section--muted` for alternating backgrounds.
- Section header pattern: `.section-heading` containing `.section-kicker` (uppercase, letter-spaced, primary color) and `.section-title` (max 18ch).
- Eyebrow/kicker text is always uppercase, `--font-size-xs`, weight 800, letter-spacing ≥ 0.12em.

## 3. Website components

Reuse these before writing new markup:

| Pattern | Use |
|---|---|
| Page chrome (skip link, header, nav, language switch, footer) | `siteHeader`, `siteFooter` (`src/site/shell.ts`) |
| Project / tool listing card | `renderProjectCard`, `renderToolCard` (`.listing-card`) |
| Image with fallback placeholder | `renderMedia`, `renderMediaFigure` (`src/site/renderers.ts`) |
| Technology tags | `renderTags` inside `<ul class="tag-list">` |
| Buttons | `.button` (primary), `.button--secondary`; minimum height 46 px |
| Text call-to-action | `.text-link` with a trailing `→` |
| Internal links | `projectUrl`, `toolUrl`, `withWebsiteLanguage` (preserve `?lang=`) |

- Cards: `--radius-lg`, 1 px `--color-border`, `--shadow-card`. Hover may translate by at most `-2px`.
- Images are `loading="lazy"`, use `object-fit: cover` inside a fixed-height media box, and always carry localized `alt` text. A missing image renders the `.media-placeholder`, never a broken `<img>`.
- Loading/empty/error states of a page use `.website-load-state`.

## 4. Language (EN/VI)

- Every user-facing string comes from a `{ en, vi }` object: `LocalizedText` for content, a local `copy`/`shellCopy` constant for UI chrome. Do not inline English-only strings in renderers.
- The website language comes from `?lang=vi` (`readWebsiteLanguage`); English is the default and the URL carries no `lang` parameter for it.
- Each page sets `document.documentElement.lang` to the active language.
- Rendering falls back to English when the Vietnamese value is empty (`localize(value, lang) || localize(value, "en")`).
- Profile names: `profileName(name, lang)` — Vietnamese keeps diacritics, English uses the ASCII form from `vietnameseToAscii`.
- CV and Portfolio are English documents; Cover Letters are single-language as written.

## 5. Website accessibility and motion

- Every page starts with the `.skip-link` to `#main-content`.
- Navigation uses `<nav aria-label>` and marks the current page with `aria-current="page"`.
- Focus: global `:focus-visible` is a 3 px `--color-accent` outline with 4 px offset. Never remove it without an equivalent replacement.
- Transitions use `--transition-fast` (180 ms) and only color, background, border and transform. `prefers-reduced-motion: reduce` disables them globally in `global.css`; keep new motion inside that rule.
- Text on the primary color is white; check contrast of any new color pair against WCAG AA (4.5:1 body, 3:1 large text). `getContrastRatio` in `documentThemes.ts` can do this in tests.

### Breakpoints in use

Website: `900px`, `760px`, `700px`, `650px`. Document screens: `760px`, and `720px` for the print toolbar. Reuse one of these before adding a new value.

## 6. Document page contract

| Document | Page size | Root page class | Print CSS |
|---|---|---|---|
| CV | A4 portrait, 210 × 297 mm, curated 2 pages | `.cv-page` (`[data-cv-page]`) | `cv-print.css` |
| Portfolio | A4 landscape, 297 × 210 mm | `.portfolio-page` | `portfolio-print.css` |
| Cover Letter | A4 portrait, exactly 1 page | `.cover-letter-page` | `cover-letter-print.css` |

- Each page is a fixed-size box with `overflow: hidden` and `box-sizing: border-box`. Inside a page, measure in `mm` and type in `pt`; do not use `rem`, `vw` or `clamp()`.
- `@page { size: …; margin: 0 }`; margins live in the page padding so screen preview and PDF match.
- Print CSS hides all screen chrome (`.cv-toolbar`, `[data-print-toolbar]`, `[data-print-status]`, skip links), removes shadows, sets `print-color-adjust: exact`, and uses `break-after: page` / `break-inside: avoid` per page.
- **Overflow is an error, not a style.** CV marks overflowing pages with `.cv-page--overflow` and reports "PDF export needs attention" through `updateDocumentPrintStatus`; the Cover Letter blocks Final when `coverLetterOverflows` is true. A new document or layout must detect overflow the same way (`scrollHeight > clientHeight + 1`, also for width) and surface it in the print status.
- A page-edge check is not enough when the page draws fixed chrome (header, footer, page number) on top of content: content can collide with the chrome while still inside the page. Portfolio therefore checks the **safe area** (§8.3); any new document with chrome does the same.
- Export always goes through the browser print engine (`window.print`, via `bindDocumentPrintButton`) so PDF text stays selectable. Never export via canvas or screenshot.

## 7. Document themes

- Themes are a pair of six-digit HEX colors (primary, accent). `buildDocumentThemeTokens` derives the rest: `primaryStrong` (28 % toward black), `surfaceMuted` (90 % toward white), `border` (68 % toward white), and readable `onPrimary` / `onAccent` text chosen by contrast.
- **Contrast is guaranteed by the engine.** The chosen primary is darkened in 2 % steps until it reaches `DOCUMENT_TEXT_CONTRAST` (4.5:1) both as text on `surfaceMuted` (and therefore on white) and as a background behind `onPrimary`. A user's custom color is respected when it already passes. Personal Blue's preset `#087fb6` therefore renders as `#0772a4`.
- `documentThemes.test.ts` checks every text/background pair the documents print, for every preset. Adding a preset or a new pair (for example accent-colored text) means adding it to that test.
- Presets live in `documentThemes`: Personal Blue (default), Professional Navy, Engineering Green, Architectural Burgundy, Neutral Graphite. Add a preset there rather than defining colors in CSS.
- Stored preference shape: `StoredDocumentTheme { presetId, primary?, accent? }`; `presetId: "custom"` uses the stored pair. Resolve with `resolveDocumentTheme`, apply with `applyDocumentTheme`.
- Document CSS defaults and `var(--document-*, fallback)` values must equal the **computed** Personal Blue tokens (`#0772a4`, `#055276`, `#e6f1f6`, `#b0d2e2`), not the preset input. Recompute them whenever the engine changes (`cv-screen.css`, `portfolio-screen.css`, `cover-letter-screen.css`, `docs/ui-kit/tokens.css`).
- Color roles:
  - Text on `--document-primary` or `--document-accent` uses `--document-on-primary` / `--document-on-accent`, never a fixed white.
  - Accent is decoration only (rails, rules, photo rings). It is never a text color: accent-on-white fails contrast in every preset.
  - Never lower text contrast with `opacity` or `color-mix` toward transparent. Secondary text on a colored area differs by size and weight, not transparency.

## 8. Document typography and layouts

- Body face: Aptos → Segoe UI → Arial. Display names and headings: Arial Narrow / Roboto Condensed.
- Typical sizes: CV body via `--cv-font-body`; Cover Letter body 10.5 pt, name 26 pt. Portfolio sizes are tokens (§8.1).

### 8.1 Portfolio page grid

Every Portfolio layout aligns to the `--pf-*` tokens on `.portfolio-document` (`portfolio-screen.css`). Use them; do not add per-layout paddings that duplicate them.

| Token | Value | Meaning |
|---|---|---|
| `--pf-margin-x` | 11 mm | Outer horizontal margin of content, header and footer |
| `--pf-header` / `--pf-footer` | 15 mm / 12 mm | Chrome bands. Mirrored by `PORTFOLIO_PAGE_MM` in `safeArea.ts`; a test locks both together |
| `--pf-body-height` | 183 mm | Height of the content frame between the bands |
| `--pf-content-top` | 8 mm | Gap from the header band to the first kicker |
| `--pf-top` | 23 mm | First line on full-bleed layouts (= header + content-top), so kickers never jump between pages |
| `--pf-bottom` | 18 mm | Lowest content edge on full-bleed layouts (footer + 6 mm) |
| `--pf-kicker-gap` | 5 mm | Kicker → title spacing |
| `--pf-title-size` | 30 pt | Page title (index, project, automation, credentials) |
| `--pf-title-rail-size` | 26 pt | Title inside a colored rail or narrow column |
| `--pf-statement-size` | 27 pt | Profile statement heading |
| `--pf-caption-size` | 7 pt | Figure captions |

- Kicker: 8 pt, weight 900, letter-spacing 0.18em, uppercase, `--document-primary`. Body: 10 pt.
- Every page with chrome is a block with `padding: var(--pf-header) var(--pf-margin-x) var(--pf-footer)`, and its content starts with `padding-top: var(--pf-content-top)`.
- **Full-bleed layouts** (a colored rail or an edge-to-edge image: Profile Classic and Capability, Index Editorial, Project Classic, Editorial and Technical) cancel the frame with negative margins and `height: 210mm`. Each of their columns uses `padding: var(--pf-top) var(--pf-margin-x) var(--pf-bottom)`. These rules carry a `.portfolio-page` prefix because the generic family heights and the list reset would otherwise override them.

### 8.2 Page chrome

- `page()` in `renderPortfolioV2.ts` draws the chrome. The header shows the person's name and the **section label** from `copy` (Professional profile, Project index, Selected work, Selected BIM automation, Education & credentials, Let's connect). It never shows a layout id. The footer shows the localized cover kicker (`content.kicker`) and `NN / TT`.
- Cover and full-color closing pages have no header or footer, only `.portfolio-page-number`, whose color follows the background under it (`--document-on-primary` on color, `--document-text-muted` on white).
- **Chrome never sits on a rail.** Each full-bleed layout declares its rail width once as `--pf-rail-left` or `--pf-rail-right` on its page class. That variable sets both the grid column and the header/footer inset, so the chrome always starts or ends on white and uses the normal text colors. A new rail layout must declare its width this way.
- Images that are meant to run under the chrome area are wrapped in an element with `data-pf-bleed`.

### 8.3 Safe area and overflow

- `findPortfolioLayoutIssues` (`src/portfolio/safeArea.ts`) reports a page when content crosses the page edge **or** enters the header/footer band (pages without chrome reserve only the bottom band). Elements inside `[data-pf-bleed]` and the chrome itself are ignored.
- The print preview lists these issues in its readiness status. The Admin Portfolio preview adds them to the "N issues" count and the Pre-publish check, without blocking Publish (content validation still blocks).
- Fixed-height areas fit by design: flex columns with `flex: 1; min-height: 0`, sizes that sum to `--pf-body-height`, and line clamps on free text that can grow (workflow steps, visual index titles). Do not hide overflow with `overflow: hidden` inside a page; it hides the problem from the check.

### 8.4 Layout content rules

- Layouts are declared in `src/portfolio/layouts.ts` as `{ id: "<section>.<variant>", label, description, preview }`. A new layout adds an option there, works without an image (media slots fall back automatically), and requests media through the `wide` (21:9), `landscape` (4:3) or `portrait` (3:4) crop profiles only.
- **Bilingual.** Every visible string comes from the `copy` object in `renderPortfolioV2.ts` or from localized content. That includes captions, labels, step names, credential kinds and contact labels. The test "prints no English chrome in the Vietnamese PDF" lists known English strings; extend it when you add copy.
- **No duplicate information on a page.** Do not print the same number twice (an index badge next to a "01 / …" kicker), the same headline twice (a kicker and a title both saying "Thank you"), or the same paragraph twice (the solution in the aside and again as a workflow step).
- **Unknown values are omitted.** Facts without a value (year, tool count) are left out instead of printing "—". Placeholders appear only where the whole slot is empty (no image, no selected credential).
- **Sparse content stretches.** Grids whose item count varies (automation tools, evidence contributions, profile capability cards) set `--pf-columns` through `columnsStyle(count, max)` instead of leaving half a page empty.
- **Equal rows line up.** Cards in one row reserve the same title height (two lines in the visual index; `min-height` on the Dual credential header) so the meta lines and frames start at the same height.
- **One tag component.** All technology and skill lists use `<ul class="portfolio-tags">` via `tagList()`. Do not restyle `li` inside other containers; scope list styles to their own class (for example `.portfolio-workflow-steps`).
- **Credential titles** use `.portfolio-credential__title` (15 pt) in every credentials layout. Credential kinds are printed through `copy.credentialKinds`, never as database values.
- A page family that can outgrow one page paginates instead of truncating. Credentials show `PORTFOLIO_CREDENTIALS_PER_PAGE` (2) per page in every credentials layout. `portfolioCredentialPages` drives both the renderer and `portfolioPageCount`. Numbering continues across pages, the kicker adds `· n / total` when there is more than one page, and placeholders appear only when nothing is selected. Never `slice` a selection without telling the editor.
- Page numbers, kickers and rules use `--document-primary` / `--document-text-muted`; do not introduce extra accent colors.

## 9. Checklist before finishing a website or document change

1. `npm run verify:admin` passes.
2. Website: checked in EN and `?lang=vi`, at desktop, ~900 px and ≤650 px, with keyboard only.
3. Website: no horizontal scroll at 360 px; images have alt text; links keep the language parameter.
4. Documents: no page shows the overflow state with realistic long content; Print preview in Chrome shows the exact page count with no blank trailing page.
5. Documents: checked with at least two theme presets (one light, one dark primary) for readable text.
6. Admin embedded preview of the changed page still syncs and Fit zoom still works.
7. Portfolio: every layout of the changed family checked in EN and VI with realistic long content. The print status and the Admin "issues" count report no layout issue, and nothing touches the header or footer.
8. Portfolio: kickers and titles start at the same height as on neighbouring pages, and the header/footer start on white on rail layouts.
