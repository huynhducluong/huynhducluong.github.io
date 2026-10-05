-- Daily automatic Trash purge using pg_cron, pg_net and an encrypted Vault secret.
-- 19:15 UTC is 02:15 the following day in Asia/Bangkok (UTC+7).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'admin_trash_purge_secret'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'admin_trash_purge_secret',
      'Authenticates the daily purge-admin-trash Cron request.'
    );
  end if;
end;
$$;

create or replace function public.verify_admin_trash_purge_secret(candidate_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(candidate_secret, '') <> '' and exists (
    select 1
    from vault.decrypted_secrets
    where name = 'admin_trash_purge_secret'
      and decrypted_secret = candidate_secret
  );
$$;

create or replace function public.admin_trash_cron_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'scheduled', exists (
      select 1 from cron.job where jobname = 'purge-admin-trash-daily'
    ),
    'active', coalesce((
      select active from cron.job where jobname = 'purge-admin-trash-daily' limit 1
    ), false),
    'schedule', (
      select schedule from cron.job where jobname = 'purge-admin-trash-daily' limit 1
    ),
    'timezone', 'UTC',
    'localTime', '02:15 Asia/Bangkok'
  );
$$;

revoke all on function public.verify_admin_trash_purge_secret(text) from public;
revoke all on function public.admin_trash_cron_health() from public;
grant execute on function public.verify_admin_trash_purge_secret(text) to service_role;
grant execute on function public.admin_trash_cron_health() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-admin-trash-daily';

select cron.schedule(
  'purge-admin-trash-daily',
  '15 19 * * *',
  $cron$
    select net.http_post(
      url := 'https://xktfazwwenqhsncoovjw.supabase.co/functions/v1/purge-admin-trash',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-admin-purge-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'admin_trash_purge_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    ) as request_id;
  $cron$
);

do $$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'purge-admin-trash-daily'
      and active
      and schedule = '15 19 * * *'
  ) then
    raise exception 'purge-admin-trash-daily Cron job was not created correctly';
  end if;
end;
$$;

notify pgrst, 'reload schema';
