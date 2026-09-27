# Portfolio platform architecture

## Routes

- `/`: responsive portfolio website and professional overview.
- `/projects/`, `/project/?id=slug`: published project listing and case study.
- `/tools/`, `/tool/?id=slug`: published BIM automation tools.
- `/cv/`: curated two-page A4 English CV.
- `/portfolio/`: English A4 landscape Portfolio preview and print/PDF export.
- `/admin/`: private Magic Link CMS.

## Data ownership

Career facts that require strict versioned layout in the two-page CV remain in `src/data` and `src/config/cv.en.ts`. Portfolio projects, tools and media use the `PortfolioRepository` interface. Supabase is authoritative after migration; the local seed is a development/deployment fallback when the remote schema is unavailable.

The website, project/tool routes and printable Portfolio all consume the same repository. This avoids a separate print-only copy of project data. Only published records are returned publicly. The Portfolio adds another explicit selection layer with `include_in_portfolio`, `portfolio_order` and `portfolio_layout`.

## Publishing workflow

1. Create/import a record: status is `draft`.
2. Edit text and upload sanitized public-ready images: status remains unchanged.
3. Explicitly publish the record in Admin.
4. Public website queries only `published` records.
5. Printable Portfolio queries only published records that are also selected for the document.

Archiving or returning a record to Draft removes it from public queries without deleting its history or media.

## Security boundary

The browser contains only a Supabase publishable key. Row Level Security and an immutable `auth.uid()` allowlist protect writes and draft reads. The service-role key must never be added to frontend code or the repository.

The Storage bucket is public because approved images must render on GitHub Pages. Therefore a leaked direct object URL can still be opened even while its database record is Draft. Only sanitized public-ready media belongs in this bucket.
