# Supabase setup

The website uses the public publishable key in `src/config/supabase.ts`. Never add a secret or service-role key to this repository.

## One-time setup

1. Open the Supabase project SQL editor and run `supabase/migrations/202609270001_portfolio_cms.sql`.
2. In Authentication settings, keep email enabled and add the production GitHub Pages URL plus its `/admin/` URL to the allowed redirect URLs.
3. Disable public user signup. In Authentication > Users, invite `huynhluong321998@gmail.com`.
4. After that user exists, run `supabase/bootstrap-admin.sql` in the SQL editor.
5. Open `/admin/`, request a magic link, and sign in.

All newly created projects and tools default to `draft` at both database and UI level. Uploading an image does not publish its parent record. A public page can read image metadata only when its project/tool is published.

## Media safety

The `portfolio-public` bucket serves approved public-ready images. Do not upload source drawings, screenshots containing project accounts, internal filenames, client data, coordinates, or other confidential material. Sanitize/export images before upload. Use generated storage filenames; the original local filename is not stored in the public path.

## Backup

Export the database regularly from Supabase and back up the Storage bucket separately. Database backups do not constitute a backup of uploaded image objects.
