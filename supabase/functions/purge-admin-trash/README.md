# Purge Admin Trash

This Edge Function permanently removes Projects and Tools whose 30-day Trash retention has expired. Storage objects are removed only when no Website, CV or Portfolio release still references them.

Deploy it after applying `202610050003_admin_consistency_phase_1_2.sql` and
`202610050004_purge_admin_trash_service_role.sql`:

```sh
supabase secrets set ADMIN_TRASH_PURGE_SECRET=<a-random-32-byte-secret>
supabase functions deploy purge-admin-trash --use-api
```

The function uses `SUPABASE_SERVICE_ROLE_KEY` only inside the Edge runtime. Callers must send the
dedicated secret in the `x-admin-purge-secret` header. Do not send the service-role key to this
endpoint.

Use an authenticated `GET` request for a non-destructive health check. Only `POST` performs the
purge operation.

Create a daily Supabase Cron job in **Integrations -> Cron**:

- Schedule: `15 2 * * *`
- Type: Supabase Edge Function
- Function: `purge-admin-trash`
- Method: `POST`
- Header: `x-admin-purge-secret: <ADMIN_TRASH_PURGE_SECRET>`

The Admin UI also supports immediate permanent deletion. This function deliberately uses
`verify_jwt = false` in `supabase/config.toml` because scheduled calls do not carry a user JWT;
authorization is enforced by the dedicated function secret instead.
