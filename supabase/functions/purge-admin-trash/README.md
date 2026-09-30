# Purge Admin Trash

This Edge Function permanently removes Projects and Tools whose 30-day Trash retention has expired. Storage objects are removed before their database records.

Deploy it after applying `202609300001_admin_trash.sql`:

```sh
supabase functions deploy purge-admin-trash
```

Create a daily Supabase Cron job in **Integrations → Cron**:

- Schedule: `15 2 * * *`
- Type: Supabase Edge Function
- Function: `purge-admin-trash`
- Method: `POST`
- Authorization: service-role JWT

The Admin UI also supports immediate permanent deletion. Keep JWT verification enabled for this function.
