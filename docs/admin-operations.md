# Admin operations

## Phase 4 activation

Apply the migrations in order through the Supabase SQL Editor or the normal migration workflow. Phase 4 requires the existing `202610050004` service-role grants and `202610050005` Cron schedule, followed by:

```text
supabase/migrations/202610060001_admin_operational_health.sql
```

The migration replaces `admin_schema_health()` with an admin-only, read-only health response. It does not expose the Edge Function secret, Vault data or service-role key.

After applying it, sign in to `/admin/` and open Overview. `System health` should show `Healthy`, and the Operational health panel should show:

- Publishing database: Ready
- Purge database access: Ready
- Daily Trash cleanup: Active
- Latest scheduled run: Passed, or Pending until the first 02:15 Asia/Bangkok run

Refresh once after applying the migration so PostgREST and the Admin page both load the new schema response.

## Credentials and private documents

Apply `supabase/migrations/202610060002_professional_credentials.sql` after the Phase 4 migration. It creates the credential library, private evidence metadata, transactional Professional Profile save function and the private `portfolio-private-documents` Storage bucket with admin-only policies.

After applying it:

1. Reload Admin and open Professional Profile → Credentials.
2. Create the credential details as Draft.
3. Upload PDF, JPEG, PNG or WebP evidence up to 10 MB per file.
4. Change the credential to Ready after it has evidence or an HTTPS verification URL.
5. In a CV draft, use Sync latest to copy Ready credential metadata into the CV. Private files are never copied into the release.

Education and Language cards link to the same credential library. Save a newly created Education or Language entry before linking a credential to it.

## Portfolio media crop profiles

Apply `supabase/migrations/202610150001_portfolio_media_crop_profiles.sql` before deploying the matching frontend build. It creates reusable `wide`, `landscape` and `portrait` crops for both Project and Tool media. The previous Project cover-crop table remains intact so older releases and legacy portrait crops continue to render.

Redeploy `supabase/functions/purge-admin-trash` with the same release so scheduled permanent deletion also cleans the new Project and Tool crop assets.

After applying it, refresh Admin and verify that Media for both Projects and Automation Tools shows `Adjust crops`. A crop stays `Auto` until an editor changes that profile; only modified profiles are generated and stored. Returning a profile to automatic crop removes its editable crop row without removing any file referenced by a published release.

## Release quality gate

Run the same command locally that GitHub Actions runs before deployment:

```powershell
npm run verify:admin
```

It performs TypeScript checking, the Vitest regression suite, the production Vite build and the Admin initial-bundle budget check. A failure in any step returns a non-zero exit code and prevents GitHub Pages deployment.

The current initial budgets are 115 kB gzip for JavaScript and 26 kB gzip for CSS. Admin workspace CSS is loaded eagerly in a deterministic order so the final UI normalization layer cannot be reversed by route loading. Run only the bundle check after an existing production build with:

```powershell
npm run check:admin-bundle
```

Website/Profile, CV/Portfolio, Cover Letter and Portfolio media-crop JavaScript modules load on demand. Workspace CSS is intentionally part of the initial Admin bundle to preserve deterministic layout and responsive behavior.

Use `npm run test:watch` while developing Admin behavior. Use `npm run test` for one deterministic CI-style run.

## When health needs attention

- `Update migration`: apply the latest migration and refresh Admin.
- `Check grants`: reapply `202610050004_purge_admin_trash_service_role.sql`, then confirm the service-role health check can read Projects and Automation Tools.
- `Check Cron`: verify that `purge-admin-trash-daily` is active with `15 19 * * *`, then reapply `202610050005_schedule_admin_trash_purge.sql` if required.
- `Latest scheduled run: Review`: inspect the `purge-admin-trash` Edge Function logs and the latest `cron.job_run_details` entry. A manual POST success does not replace checking the failing scheduled request.

Do not put `ADMIN_TRASH_PURGE_SECRET`, a legacy service-role JWT or Vault values into frontend code, tests, logs, screenshots or Git.
