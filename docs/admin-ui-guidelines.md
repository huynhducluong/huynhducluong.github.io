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
| Select control | `renderAdminSelectControl` |
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
- Destructive or rare actions (archive, delete, duplicate, rename) go inside More, never as separate header buttons.
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

- Group fields in `renderAdminSectionCard` with a title and a one-line note.
- Required fields use `renderAdminFieldLabel(label, true)` and the matching `required` / `aria-required` attribute.
- Paired localized fields always appear English first, then Vietnamese, labelled `(EN)` and `(VI)`.
- Validation errors appear next to the field they belong to; publish-blocking issues are also listed in the pre-publish check dialog. Do not use a toast as the only place an error is shown.

## 7. Preview

- The toolbar order is: page select → device select → language toggle → zoom (Fit, −, +).
- Previews exchange unsaved form payloads through the same-origin protocol in `src/shared/previewProtocol.ts`; do not reload the iframe to show edits.
- Layout changes around the preview must keep Fit zoom working; `previewZoom.ts` observes the frame size.

## 8. Feedback

- Success and informational messages use `showAdminToast`. Errors that block an action use `showAdminToast(..., "error")` plus field-level or dialog-level detail.
- Dialogs use `<dialog class="admin-dialog">` with an eyebrow, a heading referenced by `aria-labelledby`, and an `.admin-actions` row where the primary action comes first and Cancel/Close is secondary.

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

## 12. CSS and bundle rules

- Stylesheet load order is locked by `adminStyles.test.ts`; `admin-ui.css` is the final normalization layer and holds shared chrome.
- Workspace-specific styles go in that workspace's stylesheet; shared patterns go in `admin-ui.css`.
- `npm run check:admin-bundle` enforces the initial Admin budget (JS 115 kB, CSS 26 kB gzip). Remove dead CSS before raising a budget, and explain any increase in the commit message.

## 13. Persisted UI preferences

Per-viewer conveniences (header density, last opened document) use `localStorage`. Every read and write is wrapped in `try/catch` and falls back to the default, so Admin still works in private windows. Content and anything that must be shared never goes into `localStorage`.

## 14. Checklist before finishing an Admin UI change

1. `npm run verify:admin` passes.
2. The change looks and behaves the same in Homepage, Professional Profile, CV, Portfolio and Cover Letters (or the difference is intentional and documented here).
3. Checked in comfortable and compact header density.
4. Checked at desktop width, around 1180px, and below 900px.
5. Every new control works by keyboard and has an accessible name.
