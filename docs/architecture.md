# Portfolio platform architecture

## Routes

- `/`: responsive portfolio website and professional overview.
- `/projects/`, `/project/?id=slug`: published project listing and case study.
- `/tools/`, `/tool/?id=slug`: published BIM automation tools.
- `/cv/`: curated two-page A4 English CV.
- `/portfolio/`: English A4 landscape Portfolio preview and print/PDF export.
- `/admin/`: private Magic Link CMS.

## Data ownership

Supabase is authoritative for shared website, CV, Portfolio, project, tool and media content. The bundled data files seed a new installation and remain a development fallback when the remote schema is unavailable. Public outputs read immutable releases; authenticated Admin previews read their current editable drafts.

Projects and Automation Tools are master content libraries. Their editors own facts, descriptions, responsibilities, technologies and media, but do not own output placement. The backend `published` value is presented as **Ready** in Admin: it means the item may be selected by an output, not that changing the item immediately changes a public page.

Each output owns its composition:

- Projects and Automation Tools own the canonical cross-channel `display_order`; the Admin master lists provide drag-and-drop plus keyboard/touch reorder controls.
- Website draft content owns Website inclusion and Homepage highlighting in `website_content.content_selection`; its output follows the shared Project/Tool order.
- Each CV document draft owns Professional Profile background ordering, detailed/compact project selection, summary visibility, responsibility bullets and tool selection; each Portfolio draft owns selection and project layout. Both consume the shared Project/Tool order.
- Cover Letters keep their independent evidence references.

Legacy Project/Tool distribution columns remain readable for migration and old-release compatibility, but current Admin editors no longer write them. Existing published releases remain immutable snapshots.

## Publishing workflow

1. Create/import shared Project or Tool content: status is `draft`.
2. Edit text and upload sanitized public-ready images.
3. Resolve the Admin Ready check, then mark the shared item **Ready**. Required English detail content, technologies, a cover image and cover alt text block Ready; Vietnamese completeness and project crops are recommendations.
4. Select Ready items per channel; change their shared order once in Projects or Automation Tools.
5. Review that output's preview and publish its release.

Returning a shared item to Draft prevents it from being selected in new output drafts. Already published releases remain unchanged until that output is published again.

Project/Tool content saves automatically return a Ready item to Draft when a required Ready check no longer passes. Website publishing runs its own preflight against Website/Profile fields and every selected Project/Tool. Website publish, master/media reorder and Cover Letter draft/evidence writes use database transactions so partial multi-row state cannot be committed.

## Media lifecycle

Release JSON stores immutable content plus versioned Storage paths. Removing media from a draft deletes its editable metadata, but the stored object is retained whenever any Website, CV or Portfolio release still references that path. Crop replacement and Trash purging use the same release-reference check. Unreferenced objects may be removed immediately; referenced objects remain available so historical and active releases never lose their images.

Professional credentials are a normalized shared library. A credential may stand alone or link to an Education/Language entry; its evidence files live in the private `portfolio-private-documents` bucket. Original certificates, diplomas, transcripts and score reports are available only to authenticated Admin users through short-lived signed URLs. CV sync copies only Ready credential metadata into its draft and release—never private file paths or signed URLs.

## Admin preview contract

- Website, Project detail, Tool detail, CV and Portfolio previews exchange the latest unsaved form payload through a same-origin ready/rendered handshake. The iframe announces readiness after Admin authorization, so its first payload cannot be lost during asynchronous startup.
- Professional Profile remains the shared data editor. CV and Portfolio drafts always inherit name, email, phone, photo and location from the saved Professional Profile, while each document owns its role-specific title and summary and can explicitly refresh those two fields from the shared profile. Portfolio cover and narrative copy uses the same EN/VI localized-text shape as Website content. CV Background is a read-only composition view that stores Experience, Education, Skill Group and Language order by ID; explicit sync refreshes its snapshot without discarding that order. Website, CV, Portfolio and Cover Letter previews stay in their own workspaces, and published releases remain frozen.
- Project and automation-tool changes mark dependent workspaces stale. They reload on the next visit without discarding edits in another open workspace.
- CV and Portfolio drafts compose current shared Project/Tool records with their saved document settings. Published releases remain immutable snapshots.
- Cover Letter drafts render directly from the current form. Final and archived letters retain their saved sender snapshot.
- Website release versions are generated automatically at publish time. Release history remains available from the Homepage header without occupying the preview canvas.

## Security boundary

The browser contains only a Supabase publishable key. Row Level Security and an immutable `auth.uid()` allowlist protect writes and draft reads. The service-role key must never be added to frontend code or the repository.

The Storage bucket is public because approved images must render on GitHub Pages. Therefore a leaked direct object URL can still be opened even while its database record is Draft. Only sanitized public-ready media belongs in this bucket.

## Admin operational health and release gate

The Admin Overview reads `admin_schema_health()` when the authenticated workspace starts. The response contains no credentials; it reports the current schema version, transactional publishing safeguards, release-aware media cleanup, least-privilege `service_role` grants, the daily Trash Cron schedule and the most recent scheduled-run status. A Cron job that has not reached its first scheduled run is shown as pending and does not by itself make the system unhealthy.

Every GitHub Pages deployment runs `npm run verify:admin`. The gate stops deployment when TypeScript checking, Admin regression tests or the production build fails. The regression suite protects deep-link normalization, shared dirty-state behavior, content readiness, Website draft persistence/publish payloads and operational-health parsing.

See `docs/admin-operations.md` for deployment and incident checks.
