# Purge Admin Trash

This Edge Function permanently removes Projects and Tools whose 30-day Trash retention has expired. Storage objects are removed only when no Website, CV or Portfolio release still references them.

Deploy it after applying migrations `202610050003` through `202610050005`:

```sh
supabase secrets set ADMIN_TRASH_PURGE_SECRET=<a-random-32-byte-secret>
supabase functions deploy purge-admin-trash --use-api
```

The function uses `SUPABASE_SERVICE_ROLE_KEY` only inside the Edge runtime. Migration `202610050005`
creates a dedicated encrypted Vault secret and a daily Cron job that sends it in the
`x-admin-purge-secret` header. The optional Edge secret remains supported for manual maintenance.
Do not send the service-role key to this endpoint.

Use an authenticated `GET` request for a non-destructive health check. Only `POST` performs the
purge operation.

The migration creates this daily Supabase Cron job automatically:

- Schedule: `15 19 * * *` (02:15 Asia/Bangkok)
- Type: Supabase Edge Function
- Function: `purge-admin-trash`
- Method: `POST`
- Header: `x-admin-purge-secret: <encrypted Vault secret>`

The Admin UI also supports immediate permanent deletion. This function deliberately uses
`verify_jwt = false` in `supabase/config.toml` because scheduled calls do not carry a user JWT;
authorization is enforced by the dedicated function secret instead.
