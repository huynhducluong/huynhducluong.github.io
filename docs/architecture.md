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
- Each CV document draft owns detailed/compact selection, summary visibility, responsibility bullets and tool selection; each Portfolio draft owns selection and project layout. Both consume the shared Project/Tool order.
- Cover Letters keep their independent evidence references.

Legacy Project/Tool distribution columns remain readable for migration and old-release compatibility, but current Admin editors no longer write them. Existing published releases remain immutable snapshots.

## Publishing workflow

1. Create/import shared Project or Tool content: status is `draft`.
2. Edit text and upload sanitized public-ready images.
3. Mark the shared item **Ready**.
4. Select Ready items per channel; change their shared order once in Projects or Automation Tools.
5. Review that output's preview and publish its release.

Returning a shared item to Draft prevents it from being selected in new output drafts. Already published releases remain unchanged until that output is published again.

## Admin preview contract

- Website, CV and Portfolio previews exchange the latest unsaved form payload through a same-origin ready/rendered handshake. The iframe announces readiness after Admin authorization, so its first payload cannot be lost during asynchronous startup.
- Professional Profile remains the shared data editor. Website, CV, Portfolio and Cover Letter previews stay in their own workspaces; CV and Portfolio provide explicit sync actions before publishing.
- Project and automation-tool changes mark dependent workspaces stale. They reload on the next visit without discarding edits in another open workspace.
- CV and Portfolio drafts compose current shared Project/Tool records with their saved document settings. Published releases remain immutable snapshots.
- Cover Letter drafts render directly from the current form. Final and archived letters retain their saved sender snapshot.
- Website release versions are generated automatically at publish time. Release history remains available from the Homepage header without occupying the preview canvas.

## Security boundary

The browser contains only a Supabase publishable key. Row Level Security and an immutable `auth.uid()` allowlist protect writes and draft reads. The service-role key must never be added to frontend code or the repository.

The Storage bucket is public because approved images must render on GitHub Pages. Therefore a leaked direct object URL can still be opened even while its database record is Draft. Only sanitized public-ready media belongs in this bucket.
