# Cover Letter workspace

The Cover Letter feature is a private Supabase-backed workspace. Letter content is not bundled into the public site and anonymous users have no database access.

## One-time Supabase setup

Run `supabase/migrations/202609280001_cover_letters.sql` in the Supabase SQL Editor after the Portfolio CMS migration. The migration creates the private letter tables, project/tool relationships, row-level security policies, and the Draft → Final → Archived lifecycle rules.

Do not place application letters, recipient details, access tokens, or company-confidential material in source files or public seed data.

## Routes

- `/admin/cover-letters/` — private letter list and status filters.
- `/admin/cover-letter/` — create a new Draft.
- `/admin/cover-letter/?id=...` — edit a Draft or view/duplicate a locked Final letter.
- `/cover-letter/?id=...` — authenticated A4 preview and browser Print / Save PDF.

If a protected route is opened while signed out, the shared Admin login returns the user to that route after Password or Magic Link authentication.

## Workflow

1. Create a Draft and enter only verified company and recipient information.
2. Optionally link existing projects and automation tools as private writing references.
3. Select a preset or company-specific color pair. Colors are stored with the letter.
4. Resolve required-field, placeholder, and one-page overflow checks.
5. Mark the letter Final. Sender details and theme are snapshotted and the content becomes immutable.
6. Use the private print view and the browser's **Save as PDF** destination. This preserves selectable, searchable text.
7. Duplicate a Final letter to tailor a new Draft; archive old Final letters when no longer active.

Only never-finalized Drafts can be deleted. Final letters can be archived but not edited or deleted through the application.

## Sender defaults

Sender defaults live in `src/cover-letter/defaults.ts` and currently use:

- Title: `BIM Coordinator - Infrastructure`
- Location: `Ho Chi Minh City, Viet Nam`
- Vietnamese phone display format
- Sign-off: `Sincerely,`
- Typed name; no image signature
- No `Subject / Re:` line
- Portfolio URL: unset (`null`)

When the Portfolio URL is available, update `portfolioUrl` in that file. New and non-finalized previews will use it; already finalized letters retain their original sender snapshot.

## Print contract

The print stylesheet sets A4 portrait with zero browser-layout margins, removes the toolbar and screen shadow, preserves colors, and renders one HTML page. Export uses the browser print engine rather than a screenshot or canvas, so PDF text remains searchable and selectable.
