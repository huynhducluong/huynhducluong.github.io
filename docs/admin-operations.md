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

## Release quality gate

Run the same command locally that GitHub Actions runs before deployment:

```powershell
npm run verify:admin
```

It performs TypeScript checking, the Vitest regression suite and the production Vite build. A failure in any step returns a non-zero exit code and prevents GitHub Pages deployment.

Use `npm run test:watch` while developing Admin behavior. Use `npm run test` for one deterministic CI-style run.

## When health needs attention

- `Update migration`: apply the latest migration and refresh Admin.
- `Check grants`: reapply `202610050004_purge_admin_trash_service_role.sql`, then confirm the service-role health check can read Projects and Automation Tools.
- `Check Cron`: verify that `purge-admin-trash-daily` is active with `15 19 * * *`, then reapply `202610050005_schedule_admin_trash_purge.sql` if required.
- `Latest scheduled run: Review`: inspect the `purge-admin-trash` Edge Function logs and the latest `cron.job_run_details` entry. A manual POST success does not replace checking the failing scheduled request.

Do not put `ADMIN_TRASH_PURGE_SECRET`, a legacy service-role JWT or Vault values into frontend code, tests, logs, screenshots or Git.
