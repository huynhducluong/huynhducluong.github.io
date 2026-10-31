# Admin UI/UX guidelines

These rules keep every Admin workspace consistent. Read them before changing anything under `src/admin/` or `src/styles/admin*.css`. When a change needs to break a rule, update this file in the same change and explain why.

Related: public website and printable documents follow `docs/ui-guidelines.md`; code style, tests and migrations follow `docs/coding-conventions.md`; the reusable kit for other projects is `docs/ui-kit/README.md`.

## 1. One system, shared components

Admin has one visual system. A workspace composes shared renderers from `src/admin/ui.ts` instead of writing its own markup for the same pattern.

| Pattern | Use |
|---|---|
| Document workspace header (Homepage, Profile, CV, Portfolio, Cover Letters) | `renderAdminDocumentHeader` |
| Master-item editor header (Projects, Automation tools) | `renderAdminEditorHeader` |
| Form section card | `renderAdminSectionCard` |
| Field label, required marker | `renderAdminFieldLabel(label, required)` |
| Preview toolbar and its controls | `renderAdminPreviewToolbar`, `renderAdminPreviewSelect`, `renderAdminPreviewLanguageToggle`, `renderPreviewZoomControls` |
| Select control, dropdown chevron | `renderAdminSelectControl`, `adminChevronIcon` (see §6.1) |
| Dialog header and close button | `renderAdminDialogHeader`, `adminCloseIcon` (see §8.1) |
| Clipped user text, move up/down icons | `renderAdminTruncatedText`, `adminArrowUpIcon`, `adminArrowDownIcon` (see §6.2) |
| Card More menu (⋯) | `renderAdminMoreMenu`, `installAdminMoreMenus` (see §6.4) |
| Scroll an element into view | `revealAdminElement` (see §12) |
| Media row (pending and saved), file picker, segmented choice | `renderPendingMediaRow`, `renderSavedMediaRow` (`mediaRows.ts`), `renderAdminFilePicker` + `bindAdminFilePickers`, `renderAdminSegmented` (see §6.5) |
| Selection group heading and count | `renderAdminSelectionHeading`, `bindAdminSelectionCounts`, `adminSelectionCountText` (see §6.6) |
| Field label row, inline checkbox, static field, hint | `.admin-field-label-row`, `.admin-inline-check`, `.admin-field-static`, `.admin-field-hint` (see §6.3) |
| Image cropper | `cropGeometry.ts` (pure math), `bindCropStage` / `waitForCropImage` (`cropStage.ts`), `renderAdminCropZoomControls` (see §7.1) |
| Loading, empty and error states | `renderAdminWorkspaceState` |
| Confirmation | `confirmAdmin` (`confirmDialog.ts`) |
| Text prompt | `requestAdminText` (`textInputDialog.ts`) |
| Feedback message | `showAdminToast` (`toast.ts`) |
| Unsaved changes | `setAdminDirty` / `isAdminDirty` (`dirtyState.ts`) |

If a new pattern appears in two workspaces, extract it into `ui.ts` before adding a third copy.

## 2. Page structure

Every workspace uses the same layers, top to bottom:

1. **Admin top bar** (`.admin-header`): breadcrumb on the left; global actions on the right (header density toggle, View website). Workspace-specific actions never go here.
2. **Workspace header**: identity on the left (eyebrow, title or title switcher, meta) and actions on the right.
3. **Body**: document workspaces use the two-column split `--admin-document-columns` (editor 44 / preview 56). The editor column starts with tabs (`.admin-document-tabs`, `role="tablist"`); the preview column starts with the preview toolbar.

The eyebrow names the workspace type (Website, CV document, Portfolio document, Applications, Shared content). The title is the document name; when several documents exist, the title is the document switcher (`.admin-document-title-switcher`) that opens the library drawer.

## 3. Header actions

Actions appear in this fixed order, left to right, through the `renderAdminDocumentHeader` slots:

`saveState` → `utilityActions` (History) → `moreActions` (More) → `saveActions` (Save draft) → `primaryActions` (Publish / Finalize)

- Exactly one primary button per header, with class `admin-action-publish`. Save uses `admin-action-save`, History and similar use `admin-action-utility`, create uses `admin-action-new`.
- Destructive or rare actions (archive, delete, duplicate, rename) go inside More, never as separate header buttons. The same rule applies to every card (Experience, Education, Language, Credential, evidence file, photo); see §6.4.
- Every destructive action asks for confirmation through `confirmAdmin` with `tone: "danger"`.
- Button labels are short verbs in sentence case: "Save draft", "Publish", "History (4)".

## 4. Header density

The top-bar toggle (`headerDensity.ts`) switches every document header between comfortable and compact. It is one global preference stored in `localStorage` and applied as `data-header-density="compact"` on `<html>`.

Compact mode may hide only the eyebrow and secondary meta details. It must never hide:

- the title or document switcher,
- the status chip and the active-version marker,
- the save state ("Saved" / unsaved),
- any header action.

Hidden meta remains readable through the meta tooltip (`adminDocumentMetaText`). New meta content therefore uses `.status`, `.admin-document-meta__active` or `.admin-document-meta__detail` spans, so compact mode and the tooltip handle it automatically.

## 5. Status and state

- Status chips use `.status` with one modifier defined in `admin-ui.css`: `status--draft`, `status--published`, `status--final`, `status--archived`, or `status--new` (an entry that needs the editor's attention, such as a Profile entry not yet selected in a document). Add a modifier there before using a new one. In Admin copy, the backend `published` value of a master item is presented as **Ready**.
- Every editable workspace reports unsaved changes through `dirtyState.ts`. Leaving a dirty workspace asks for confirmation; closing the tab is guarded by `bindAdminBeforeUnload`.
- Save state text is a live region (`aria-live="polite"`).
- Preview status ("Synced", "Ready", "N issues") lives in the preview toolbar meta. Issues open the pre-publish check dialog.

### Shared data and outputs

- Professional Profile is the single source for identity, photo, Experience, Education, Credentials, Skills and Languages, and for their order. Projects and Automation tools are the single source for their own content and order.
- Outputs (Website, CV, Portfolio, Cover Letters) only **select** shared entries. They never store a separate order or an editable copy of shared content; role-specific fields (CV/Portfolio title and summary) are the only exception and refresh only through an explicit "Sync from …" action.
- Every mutation of shared data must refresh the workspaces that consume it (for example `onProfessionalProfileSaved`, `onProfessionalCredentialsChanged`). Do not add manual "Sync latest" buttons to work around a missing refresh.
- Background selection uses one pattern everywhere: `backgroundGroup` sections with `backgroundRow` checkboxes, a "N of M shown" count, a **New** chip for unselected entries added since the draft was last saved, and an "Edit Professional Profile" action.

## 6. Forms

- Group fields in `renderAdminSectionCard` with a title and a one-line note. The note is clipped to one line, so keep it at 60 characters or fewer (it must fit the narrow side cards on the 1440px laptop) and do not repeat the title.
- Required fields use `renderAdminFieldLabel(label, true)` and the matching `required` / `aria-required` attribute.
- Paired localized fields always appear English first, then Vietnamese, labelled `(EN)` and `(VI)`.
- Validation errors appear next to the field they belong to; publish-blocking issues are also listed in the pre-publish check dialog. Do not use a toast as the only place an error is shown.

### 6.1 Dropdown chevrons

Every dropdown arrow in Admin is the same glyph in the same place, so a column of selects, pickers and comboboxes lines up vertically.

- **Glyph.** Use `adminChevronIcon` from `ui.ts` (16×16 viewBox, `m4 6 4 4 4-4`, stroke 1.75, `currentColor`, muted text color). Never paste the SVG, use another arrow shape, a Unicode `▾`, or a CSS `background-image` arrow.
- **Native selects.** Always render through `renderAdminSelectControl`. A bare `<select>` shows the browser's own arrow, which sits at a different offset and looks different in every browser. The preview toolbar uses the same control through `renderAdminPreviewSelect`.
- **Geometry.** The chevron is centered in a slot flush with the control's right edge. Use the tokens in `admin-ui.css`, never literal widths:

  | Token | Default | Compact (`.admin-select-control--compact`, preview toolbar) |
  |---|---|---|
  | `--admin-chevron-size` (icon) | `1rem` | `.875rem` |
  | `--admin-chevron-slot` (slot width; icon center sits half of it from the right edge) | `2.5rem` | `1.5rem` |
  | `--admin-chevron-reserve` (text `padding-right` so a long value never runs under the icon) | `3rem` | `1.75rem` |

- **Custom pickers** (year picker, profile photo, location combobox) reuse the same slot: either an absolutely positioned `.admin-select-chevron` inside a `position: relative` control with `padding-right: var(--admin-chevron-reserve)`, or a last grid column of `var(--admin-chevron-slot)` with no right padding on the control.
- **State.** The chevron rotates 180° when its control has `aria-expanded="true"` (140 ms, off under `prefers-reduced-motion`). Disabled selects fade the chevron to 50 %.
- **Allowed difference.** The document title switcher keeps its tinted icon tile because it is a header button, not a form field, but it still uses `adminChevronIcon` and the shared stroke.
- Glyph and rotation rules live only in `admin-ui.css`. `adminStyles.test.ts` fails if a workspace renders a bare `<select>`, copies the chevron SVG, restyles the chevron glyph outside `admin-ui.css`, or hard-codes `padding-right: 3rem`.

### 6.2 Long user text next to controls

User data has no length limit; fixed interface copy does. Layout must give way on the user data, never on the interface.

- **Fixed copy never shrinks or wraps.** Labels, section titles, counts and action buttons use `white-space: nowrap` and `flex: 0 0 auto` (or an `auto` grid track). Never put fixed copy in a `minmax(0, 1fr)` track beside an `auto` track that holds user data. That is exactly what squeezed "Credentials & evidence" onto two lines.
- **Only user data truncates.** It sits in a `minmax(0, 1fr)` track (or a flex item with `min-width: 0`), on one line with an ellipsis, and always with the full value as a tooltip. Use `renderAdminTruncatedText(text)` (`.admin-truncate` plus `title`); a truncated heading gets a `title` attribute. Clipping without a tooltip is a bug.
- **Never concatenate user data and meta in one label.** "Engineer Degree … · 1 file" cannot be truncated sensibly. The count, date or status is its own element that does not shrink.
- **A list of 0..n user items is vertical.** Render one full-width row per item (the `.admin-linked-credential` pattern: kind badge, truncating title, status, meta, chevron), not inline buttons beside a label. Rows stay aligned with fixed-width badge columns.
- **Narrow layouts stack with `align-items: stretch`.** A `flex-direction: column` with `align-items: flex-start` sizes each child to its full text width, so the ellipsis never applies and the card overflows.
- **React to the container, not the viewport.** Layout inside a form card uses `@container admin-form` (40rem, as the entry cards do), never `@media`. The editor column is only about 44% of the screen.
- **Icon-only buttons use shared SVGs.** Move up/down uses `adminArrowUpIcon` / `adminArrowDownIcon` with `aria-label` and `title`, never a typed `↑` or `&#8593;`.

### 6.3 Field rows and field states

- **Every row follows the form grid.** A row of fields uses `.admin-form-grid` (two equal columns) or `.admin-site-bilingual`. Never give one row its own column count (the old three-column date row did not line up with the fields above and below).
- **An option that changes one field lives in that field's label row.** Use `.admin-field-label-row`: the label on the left, an `.admin-inline-check` checkbox on the right ("Expiry date … ☑ Does not expire"). Never make it a separate boxed control or field.
- **A field that does not apply looks disabled, or is replaced.** Disabled fields get the muted background (the disabled rule repeats the base field selector so it always wins). When a value cannot apply at all, hide the input and show an `.admin-field-static` box with the reason ("No expiry"), styled like a disabled field. Turning the field back on moves focus into it.
- **Browser-locale controls get a hint.** Native date inputs show the browser's own format (mm/dd/yyyy), while Admin shows "14 Sept 2021". Add an `.admin-field-hint` under the input that repeats the value through `formatAdminDate`. Keep the native input; it is keyboard and screen-reader friendly.
- **Swap, don't resize.** When a field is replaced by a stand-in ("No expiry"), wrap both in `.admin-field-swap`. The input stays in the layout, invisible and disabled, and the stand-in covers it exactly, so the row never changes height. Never use `hidden` on one and show the other: their heights differ by a few pixels in each browser, and the row goes uneven.

#### Rows must not jump (alignment contract)

Uneven rows and labels that suddenly wrap are the most frequent Admin regression. They almost always come from a component that looks right in one place and is restyled in another. These rules apply to every field, form row and dialog:

1. **Fields in one grid row align on their control.** Every cell's label line has the height of a plain label (one line of `--admin-text-xs`), so the inputs below start at the same y. Anything placed in a label row (a checkbox option, a counter, a help link) must fit that height. Checkboxes use a negative block margin so the 1rem box never makes the row taller.
2. **Components do not depend on where they are rendered.** Broad container rules (`.admin-document-editor`, `.admin-form-section`, `.admin-dialog`, workspaces) may style field labels and text fields only. They select `label:where(:not(.admin-inline-check))` and `input:where(:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"]))`, never a bare `input` or `label`. Bare rules turned the "Does not expire" checkbox into a full-width grid stacked above its text. `:where()` keeps specificity unchanged. Shared field-row components in `admin-ui.css` are prefixed with `html.admin-app` so no container rule outranks them.
3. **A dialog measures itself.** `.admin-dialog` declares `container: admin-form / inline-size`, so container queries inside a modal use the dialog's width, not the panel behind it. Without it, a wide dialog over a narrow editor collapsed to one column.
4. **Test in the real context.** Check a component where it is actually rendered (a dialog opened from inside the Profile editor, not on an empty page), with both states of every toggle, at 1440px and around 1180px. `npm run shots` reports *uneven field row* and *checkbox stacked above its text* for every visible form grid (§11).

### 6.4 Item cards

Profile cards (Experience, Education, Language, Credential, photo) and the rows inside them share one anatomy:

| Part | Rules |
|---|---|
| **Identity (left)** | Eyebrow (type) with the status chip beside it, then the title, then a muted subtitle. Status belongs to the identity, never between action buttons. Clipped values carry a `title` (§6.2). |
| **Actions (right)** | In this order: move up/down → the one frequent action ("Edit", "Open") → More (⋯, `renderAdminMoreMenu`) with the rare or destructive actions (Delete, Archive, Rename), marked `tone: "danger"` when they destroy. A card never shows a loose destructive button. An archived item shows "Restore as draft" instead of Edit and More. |
| **Facts** | One meta line separated by `·` (`.admin-credential-card__meta`), not boxed tiles. In narrow cards the facts stack one per line without separators. A fact that points to another entry is a link that opens it (`showRelatedEntry`). |
| **Description** | At most two lines (`line-clamp`), with the full text as a `title`. |
| **Child list** | A header row (name, count, "+ Add …"), then one row per child. Hide a zero count when an empty-state line already says so. Uploads stage in a pending row (file, type, Upload, Cancel), like pending project media; nothing uploads on file selection alone. |

- **At most two levels of boxes:** the card, and the rows inside it. Sections inside a card are separated by a divider, not by another bordered box.
- **Each fact appears once per card.** Counts, privacy notes and status are not repeated in tiles, headings and rows at the same time.
- **Archived items read as muted through color and a dashed border,** never through `opacity`.
- **More menus share one behavior** (`installAdminMoreMenus`, installed once in `main.ts`): only one menu is open at a time, it closes on an outside click, on Escape and after an action is chosen, and focus returns to the ⋯ trigger, so a confirmation dialog restores focus to something visible. An ancestor of a card with a More menu must not use `overflow: hidden`, or the menu is clipped (the photo card rounds its image instead).

### 6.5 Media rows and file uploads

Project and tool media (`mediaRows.ts`) use one row anatomy for pending uploads and saved images, so both read as the same component. Only the status line and the actions differ.

```
[thumb 4:3]  File name or "Image 01" (truncated, title)        [↑][↓] [primary] [⋯]
             JPEG · 0.44 MB · Not uploaded yet
             Use as [Cover | Gallery]   (pending)   /   COVER chip (saved)
Alt text (EN) *        | Alt text (VI)
Caption (EN)           | Caption (VI)
```

- **Bilingual pairs share a row.** The `.admin-form-grid` holds only EN | VI pairs, in order (Alt EN, Alt VI, Caption EN, Caption VI). A control that is not a bilingual pair ("Use as") never sits in that grid, or the pairs shift diagonally. Below 40rem the grid stacks into one column in the same EN-then-VI order.
- **The role appears once.** Pending rows use `renderAdminSegmented` (Cover | Gallery, native radios, so arrow keys work). Saved rows show a role chip. There is no badge over the thumbnail. Choosing Cover makes English alt text required, and only one pending image can be the cover.
- **Actions follow §6.4.** Pending: move, and More → Remove from upload. Saved: move (gallery only), "Adjust crops", and More → Set as cover, Download original, Delete image. **Save appears only while the row has unsaved edits**, together with an *Unsaved* chip.
- **Never show the browser's file input.** Bulk uploads use `renderAdminFilePicker` (drop zone, drag and drop, visually hidden native input, focus ring on the zone) with `bindAdminFilePickers`. A single-file action uses a button that clicks an input with the `hidden` attribute (profile photo, credential evidence). `adminStyles.test.ts` fails on a visible file input.
- **The upload footer says what will happen.** It shows "N images ready" with Clear and "Upload N images". Upload stays disabled, and the reason shows in the footer, while a pending cover lacks English alt text; that field is marked `aria-invalid`.
- **`hidden` always wins.** `html.admin-app [hidden] { display: none !important; }`: a class that sets `display` (`.button`, `.status`) can never keep a hidden element visible. Components do not add their own `[hidden]` rules.

### 6.6 Selection counts ("shown" vs "selected")

Every list where you include or exclude items has a heading with a count chip, rendered by `renderAdminSelectionHeading` and kept live by `bindAdminSelectionCounts`. The word follows what the checkbox does:

| Word | When | Where |
|---|---|---|
| **N of M shown** | The toggle controls whether an entry that already belongs to the source appears in the output. | CV Background (Experience, Education, Credentials, Skills, Languages); Website content ("On website", plus "· K on Homepage") |
| **N of M selected** | You pick items from a library to include in a document or letter. | CV content (Projects: Display is not "Not included"; Tools), Portfolio content (Projects, Tools), Cover letter evidence (Projects, Tools) |

- **M counts only eligible items.** Draft or archived items cannot be chosen, so they are not part of the total and carry no `data-selection-count-item`. A finalized letter disables its inputs but keeps them eligible.
- **Empty states are words, not zero.** "Hidden" (shown lists), "None selected" (selected lists), "None available" when the source is empty. The chip uses the muted color via `data-empty`.
- **One wording function.** `adminSelectionCountText` is the only place that writes these strings; workspaces never format their own "… selected" text. `adminStyles.test.ts` checks that every selection list uses the shared heading.
- Disclosure summaries over an already-selected subset (Portfolio media, layout overrides) show a plain number, because they list only the chosen items.

## 7. Preview

- The toolbar order is: page select → device select → language toggle → zoom (Fit, −, +).
- Previews exchange unsaved form payloads through the same-origin protocol in `src/shared/previewProtocol.ts`; do not reload the iframe to show edits.
- Layout changes around the preview must keep Fit zoom working; `previewZoom.ts` observes the frame size.

### 7.1 Image crop editors and their previews

Implemented by `cropGeometry.ts` (pure, unit-tested in `cropGeometry.test.ts`) and `cropStage.ts`; both the Portfolio media and the profile photo croppers use them.

A crop preview is a promise about the saved file. These rules apply to every cropper (Portfolio media, profile photo, and any future one).

1. **One source of truth.** The editor keeps one normalized crop per format: `{ x, y, width, height }`, fractions of the original image. The preview, the saved crop row and the exported file are all computed from that same object. Never let a preview read the cropper's DOM or a library widget (`cropper-viewer`) on its own. It uses different timing and a different coordinate space, and it drifts.
2. **Same math everywhere.** Preview and export use one pure function (crop state + output size → source rectangle). Unit-test it with a non-square source image in every format.
3. **What you see is what you save.** The visible selection box, the preview and the saved file show exactly the same area. Values are clamped *before* the user sees them, never silently at save time.
4. **No empty pixels.** The image always covers the selection. Bound panning and zoom-out with arithmetic, not by probing the DOM, so the checkerboard never shows inside the selection.
5. **Preview at output ratio, without decoration.** The preview frame uses the output aspect ratio and shows only what the output contains. Chrome the real output adds on top (for example a page-number tile) is shown only when the real layout places it there, and in the same position and size.
6. **Format tabs carry their facts.** Each tab shows a live thumbnail of its crop, its name and ratio ("Wide 21:9"), and a status only when it is informative: *Auto* (no saved custom crop) or *Edited* (changed in this session, not saved). A saved custom crop shows no label. Do not repeat the same word on every tab. Tabs follow §10: `role="tab"`, `aria-selected`, `aria-controls` pointing to one `role="tabpanel"`, and Arrow, Home and End keys. Because the thumbnails show every format, the side preview may hide on narrow screens.
7. **Zoom controls match preview zoom.** Render them with `renderAdminCropZoomControls` and update them with `setAdminCropZoomValue`. They use the same − / + icons as `renderPreviewZoomControls` (`adminZoomOutIcon`, `adminZoomInIcon`), never typed `-` or `+`. Zoom 100% means the image just covers the selection, and the slider shows and announces its percentage.
8. **Reset is explicit.** "Reset to auto" affects only the active format, and it is part of the unsaved changes Cancel discards.
9. **Drag anywhere.** A plain `cropper-handle action="move"` is the last child of the selection, so a drag inside the selection moves the image instead of landing on the grid or crosshair.
10. **Wait for the image.** Call `waitForCropImage` before setting a crop. `$ready()` alone resolves early for a cached source, and the element then re-centers itself over the crop you set.
11. **Dispose before destroy.** Call `CropStage.dispose()` before `cropper.destroy()`, so teardown transforms never overwrite a stored crop.

## 8. Feedback

- Success and informational messages use `showAdminToast`. Errors that block an action use `showAdminToast(..., "error")` plus field-level or dialog-level detail.
- Dialogs use `<dialog class="admin-dialog">` with an eyebrow, a heading referenced by `aria-labelledby`, and an `.admin-actions` row. See §8.1.

### 8.1 Dialog anatomy

Every Admin dialog has the same three bands, so they look like one family regardless of size.

| Band | Rules |
|---|---|
| **Header** | Eyebrow (`.section-kicker`, names the area) → title (`h2`, `--admin-title-sm` in every dialog) → optional one-line note (`--admin-text-xs`, muted, ≤ 80 characters, hidden below 680px height). The close button sits top-right, vertically centered on the **title line**, and the right gutter equals the left gutter. One divider below. |
| **Body** | Same horizontal gutter as the header. Tabs, when present, sit directly under the header with that same gutter. |
| **Footer** | One divider above. Tools for the content (zoom, reset) on the left; actions on the right in the §3 order: **Cancel, then the single primary action at the far right**. |

- **Close button:** one component for every dialog, rendered by `renderAdminDialogHeader`: `.admin-dialog__close`, a square icon button at `--admin-control-height-sm` with `--admin-control-radius` and `adminCloseIcon`. Never use a typed `×`, which sits on the text baseline and looks off-center. Library drawer close buttons (`.admin-drawer-close`) use the same icon. Accessible name: "Close <dialog name>".
- **Gutters:** `--admin-dialog-gutter` (1rem, .75rem below 560px) for header, tabs, body and footer. A dialog never mixes gutters between bands.
- **No per-dialog header CSS.** Size differences between dialogs come from the dialog width, never from restyled headers. Every dialog with a close button uses `renderAdminDialogHeader`. The small form dialogs (confirm, text input, rename) have no close button and keep their compact form header.
- **Dismissal:** Escape, backdrop click, the close button and Cancel all close the dialog. When the dialog holds unsaved input, every one of them first asks through `confirmAdmin` ("Keep editing" / "Discard changes", `tone: "danger"`).

## 9. Design tokens

Use the `--admin-*` tokens from `admin-ui.css` and `admin-typography.css`; do not hard-code values that a token already covers.

- Colors: `--admin-color-*` (canvas, surface, border, text, focus, success, warning, danger).
- Controls: `--admin-control-height` (2.5rem), `-sm`, `-lg`, `--admin-control-radius`, `--admin-control-padding-x`.
- Radius and shadow: `--admin-radius-sm|md|lg`, `--admin-shadow-card`.
- Type scale: `--admin-text-2xs` … `--admin-text-lg`, `--admin-title-sm|md|lg`, `--admin-weight-*`.
- Layout: `--admin-workspace-gutter`, `--admin-workspace-header-min-height`, `--admin-document-columns`, `--admin-tabs-height`.

Icons are inline SVG on a 16×16 (controls) or 24×24 (navigation) view box, drawn with `stroke: currentcolor`, no fill, round caps and joins.

## 10. Accessibility

- Icon-only buttons have an `aria-label` and a matching `title` tooltip.
- Toggles use `aria-pressed`; disclosures, menus and drawers use `aria-expanded` and `aria-controls`.
- Focus is always visible (`:focus-visible` outline in `--admin-color-focus`). Never remove an outline without a replacement.
- Every action works by keyboard. Tabs follow `bindAdminTablists` (Arrow keys, Home, End).
- Motion stays at or below 150 ms and is disabled under `prefers-reduced-motion: reduce`. Do not animate height.

## 11. Responsive behavior

Existing breakpoints: `1280px`, `1180px`, `900px` (rail/mobile switch; `901px` for desktop-only rules), `720px`, `560px`, and the `64rem` container query on document headers. Reuse these instead of adding new values.

Below the container breakpoint, the header identity stacks above the actions and the actions wrap; action order never changes.

### Target screens

The owner works on these three screens. Every Admin layout change must look right at all three CSS viewports (resolution ÷ Windows scale, minus taskbar and browser chrome). Heights are approximate for a maximized Chrome window; confirm with `innerWidth`/`innerHeight` when it matters.

| Screen | Physical | Scale | CSS viewport | Band |
|---|---|---|---|---|
| Laptop | 2880×1800 | 200% (DPR 2) | 1440 × 731 (measured) | 1281–1480 wide; height in the 621–760 band (compact rail) |
| Monitor 1 | 2560×1440 | 100% | 2560 × ≈1300 | wide desktop (no rule above 1480) |
| Monitor 2 | 1920×1080 | 100% | 1920 × ≈940 | wide desktop (no rule above 1480) |

Mobile breakpoints (`900px` and below) stay supported but are not the daily target.

### Visual check

After any Admin layout change, capture the affected views at the three target screens and look at the images before calling the change done. `scripts/admin-screenshots.mjs` holds the same viewports as the table above; keep them in sync.

- `npm run shots:login` — once per machine (and when the session expires): opens Chromium, you sign in, the session is saved to `.auth/admin.json` (git-ignored).
- `npm run shots` — starts Vite on port 5199 and writes `tmp/screenshots/<screen>/<view>.png` for every view.
- `npm run shots -- --views=cv,portfolio --screens=laptop` — limit the run.
- `npm run shots -- --path="/admin/?view=projects&item=new" --name=new-project` — capture a specific route.

The run opens every workspace tab and warns when a page scrolls horizontally, an element extends past the right edge, or a single-line text is clipped. Each clipped text is labelled **with tooltip** or **NO TOOLTIP**. Clipped fixed copy (notes, meta, health descriptions) must be shortened. Clipped user data (long project names, slugs) is acceptable only when it is labelled *with tooltip* (§6.2). Any *NO TOOLTIP* line is a bug.

Before a layout change to anything that shows user data, test it once with maximum-length data: names, titles and file names of about 120 characters, and at least three linked items (for example three credentials on one Education entry). Do it at 1440px and around 1180px. Most "wraps badly" bugs only show up with long data.

The run also reports **uneven field row** when the fields sharing one row of an `.admin-form-grid` or `.admin-site-bilingual` start their controls more than 1px apart. It reports **checkbox stacked above its text** when an `.admin-inline-check` box and its text are not on one line. Both are bugs (§6.3, "Rows must not jump"). Forms inside dialogs are not opened by the run, so open them by hand in both toggle states.

Collection lists beside an editor (Content, CV/Portfolio library, Cover letters) use `--admin-collection-width`, which grows from 21.5rem on the laptop to 30rem on wide monitors; the `1280px` and `1180px` rules still narrow it.

## 12. CSS and bundle rules

- Stylesheet load order is locked by `adminStyles.test.ts`; `admin-ui.css` is the final normalization layer and holds shared chrome.
- Workspace-specific styles go in that workspace's stylesheet; shared patterns go in `admin-ui.css`.
- **Scrolling and layout frames.** The shell, workspace and two-column layout frames use `overflow: clip`, not `hidden`. A `hidden` frame can still be scrolled by script, so `element.scrollIntoView()` (or `focus()` on a far-away field) could scroll the whole workspace up and leave an empty band below (the "Language: English" link bug). Only the editor, preview and list panes scroll (`overflow-y: auto`). To bring something into view, call `revealAdminElement(element, { align })`. It scrolls only the nearest real scroll container. After switching tab or panel, wait one animation frame before revealing, and focus with `{ preventScroll: true }`. Never call `scrollIntoView` in Admin; `adminStyles.test.ts` enforces this.
- `npm run check:admin-bundle` enforces the initial Admin budget (JS 115 kB, CSS 26 kB gzip). Remove dead CSS before raising a budget, and explain any increase in the commit message.

## 13. Persisted UI preferences

Per-viewer conveniences (header density, last opened document) use `localStorage`. Every read and write is wrapped in `try/catch` and falls back to the default, so Admin still works in private windows. Content and anything that must be shared never goes into `localStorage`.

## 14. Checklist before finishing an Admin UI change

1. `npm run verify:admin` passes.
2. The change looks and behaves the same in Homepage, Professional Profile, CV, Portfolio and Cover Letters (or the difference is intentional and documented here).
3. Checked in comfortable and compact header density.
4. Checked at desktop width, around 1180px, and below 900px.
5. Every new control works by keyboard and has an accessible name.
6. Every new dropdown uses `renderAdminSelectControl` or the shared chevron slot (§6.1); its arrow lines up with the selects above and below it.
7. A new or changed dialog follows §8.1 (header, close button, gutters, footer order). Compare it side by side with one existing dialog.
8. Any preview of a generated file (crop, PDF, image) is computed from the same state and function as the saved output (§7.1). Change a value and check that the preview and the saved result match.
9. Anything that shows user data was checked with maximum-length data (§6.2, §11). Fixed labels stay on one line, and every clipped value has a tooltip.
10. New fields sit on the form grid, and their disabled state looks disabled (§6.3). New cards follow the item-card anatomy: status with the identity, destructive actions in More, facts as one meta line, at most two levels of boxes (§6.4).
11. Anything that jumps to another place (links to an entry, reorder, validation focus) uses `revealAdminElement` and leaves the shell, header and tabs where they were (§12).
12. Every form row you touched was checked in its real container and in each toggle state: the controls in a row start at the same height, labels stay on one line, and no checkbox stacks above its text (§6.3 "Rows must not jump"). `npm run shots` shows no *uneven field row* lines.
13. Lists of uploaded or pending items follow §6.5: one row anatomy, EN | VI pairs on the same row, actions in More, no visible native file input, and Save only while a row has edits. Anything you hide with the `hidden` attribute is actually invisible.
14. Every list that includes or excludes items has a `renderAdminSelectionHeading` count with the right word: *shown* for visibility toggles, *selected* for library picks (§6.6). The total counts only eligible items.
