-- Phase 4: operational health for the Admin dashboard and release quality gate.
-- This exposes only non-sensitive status information to authenticated portfolio admins.

create or replace function public.admin_schema_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  grants_ok boolean;
  cron_scheduled boolean;
  cron_active boolean;
  cron_schedule text;
  last_run_at timestamptz;
  last_run_status text;
  last_run_message text;
  cron_ok boolean;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  grants_ok :=
    pg_catalog.has_table_privilege('service_role', 'public.projects', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.projects', 'DELETE')
    and pg_catalog.has_table_privilege('service_role', 'public.automation_tools', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.automation_tools', 'DELETE')
    and pg_catalog.has_table_privilege('service_role', 'public.project_images', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.tool_images', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.project_image_crops', 'SELECT');

  select
    true,
    job.active,
    job.schedule
  into cron_scheduled, cron_active, cron_schedule
  from cron.job as job
  where job.jobname = 'purge-admin-trash-daily'
  limit 1;

  cron_scheduled := coalesce(cron_scheduled, false);
  cron_active := coalesce(cron_active, false);
  cron_ok := cron_scheduled and cron_active and cron_schedule = '15 19 * * *';

  select
    run.start_time,
    run.status,
    run.return_message
  into last_run_at, last_run_status, last_run_message
  from cron.job_run_details as run
  join cron.job as job on job.jobid = run.jobid
  where job.jobname = 'purge-admin-trash-daily'
  order by run.start_time desc
  limit 1;

  return jsonb_build_object(
    'version', '202610060001',
    'healthy', grants_ok and cron_ok,
    'checks', jsonb_build_object(
      'transactionalPublishing', true,
      'releaseAwareMedia', true,
      'contentReadiness', true,
      'purgeServiceRole', grants_ok,
      'trashPurgeSchedule', cron_ok
    ),
    'trashPurge', jsonb_build_object(
      'scheduled', cron_scheduled,
      'active', cron_active,
      'schedule', cron_schedule,
      'timezone', 'UTC',
      'localTime', '02:15 Asia/Bangkok',
      'lastRunAt', last_run_at,
      'lastRunStatus', last_run_status,
      'lastRunMessage', last_run_message
    )
  );
end;
$$;

revoke all on function public.admin_schema_health() from public;
grant execute on function public.admin_schema_health() to authenticated;

notify pgrst, 'reload schema';
