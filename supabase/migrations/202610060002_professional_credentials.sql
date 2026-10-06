-- Shared professional credentials with private evidence documents.
-- Apply after 202610060001_admin_operational_health.sql.

create table if not exists public.professional_credentials (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'professional_certification' check (kind in (
    'professional_certification', 'academic_degree', 'language_exam',
    'license', 'course', 'award', 'membership', 'other'
  )),
  related_type text check (related_type in ('education', 'language')),
  related_id text,
  title jsonb not null default '{"en":"","vi":""}'::jsonb,
  issuer jsonb not null default '{"en":"","vi":""}'::jsonb,
  description jsonb not null default '{"en":"","vi":""}'::jsonb,
  issued_on date,
  expires_on date,
  does_not_expire boolean not null default true,
  credential_number text,
  verification_url text check (verification_url is null or verification_url ~ '^https://'),
  status public.publication_status not null default 'draft',
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((related_type is null) = (related_id is null)),
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (does_not_expire or expires_on is not null)
);

create table if not exists public.credential_assets (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.professional_credentials(id) on delete cascade,
  document_kind text not null default 'certificate' check (document_kind in (
    'certificate', 'diploma', 'transcript', 'score_report', 'supporting_document', 'other'
  )),
  name text not null check (char_length(trim(name)) between 1 and 180),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  display_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists professional_credentials_related_idx
on public.professional_credentials (related_type, related_id);

create index if not exists professional_credentials_order_idx
on public.professional_credentials (display_order, created_at);

create index if not exists credential_assets_credential_order_idx
on public.credential_assets (credential_id, display_order, created_at);

drop trigger if exists professional_credentials_set_updated_at on public.professional_credentials;
create trigger professional_credentials_set_updated_at
before update on public.professional_credentials
for each row execute function public.set_updated_at();

create or replace function public.validate_professional_credential_relation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.related_type is null then return new; end if;
  if not exists (
    select 1
    from public.professional_profile profile,
      jsonb_array_elements(
        case new.related_type
          when 'education' then profile.education
          when 'language' then profile.languages
        end
      ) item
    where profile.id = 'primary' and item->>'id' = new.related_id
  ) then
    raise exception 'Save the related Professional Profile entry before linking this credential';
  end if;
  return new;
end;
$$;

drop trigger if exists professional_credentials_validate_relation on public.professional_credentials;
create trigger professional_credentials_validate_relation
before insert or update of related_type, related_id on public.professional_credentials
for each row execute function public.validate_professional_credential_relation();

create or replace function public.save_professional_profile(
  p_profile jsonb,
  p_experiences jsonb,
  p_education jsonb,
  p_skill_groups jsonb,
  p_languages jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  insert into public.professional_profile (
    id, profile, experiences, education, skill_groups, languages
  ) values (
    'primary', p_profile, p_experiences, p_education, p_skill_groups, p_languages
  )
  on conflict (id) do update set
    profile = excluded.profile,
    experiences = excluded.experiences,
    education = excluded.education,
    skill_groups = excluded.skill_groups,
    languages = excluded.languages;

  update public.professional_credentials credential
  set related_type = null, related_id = null
  where credential.related_type = 'education'
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_education, '[]'::jsonb)) item
      where item->>'id' = credential.related_id
    );

  update public.professional_credentials credential
  set related_type = null, related_id = null
  where credential.related_type = 'language'
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_languages, '[]'::jsonb)) item
      where item->>'id' = credential.related_id
    );
end;
$$;

alter table public.professional_credentials enable row level security;
alter table public.credential_assets enable row level security;

drop policy if exists "admins manage professional credentials" on public.professional_credentials;
create policy "admins manage professional credentials"
on public.professional_credentials for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "admins manage credential assets" on public.credential_assets;
create policy "admins manage credential assets"
on public.credential_assets for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.professional_credentials, public.credential_assets to authenticated;
revoke all on public.professional_credentials, public.credential_assets from anon;
revoke all on function public.validate_professional_credential_relation() from public;
revoke all on function public.save_professional_profile(jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_professional_profile(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-private-documents',
  'portfolio-private-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload credential documents" on storage.objects;
create policy "admins upload credential documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-private-documents' and public.is_portfolio_admin());

drop policy if exists "admins read credential documents" on storage.objects;
create policy "admins read credential documents"
on storage.objects for select
to authenticated
using (bucket_id = 'portfolio-private-documents' and public.is_portfolio_admin());

drop policy if exists "admins update credential documents" on storage.objects;
create policy "admins update credential documents"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-private-documents' and public.is_portfolio_admin())
with check (bucket_id = 'portfolio-private-documents' and public.is_portfolio_admin());

drop policy if exists "admins delete credential documents" on storage.objects;
create policy "admins delete credential documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-private-documents' and public.is_portfolio_admin());

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
  credential_storage_ok boolean;
begin
  if not public.is_portfolio_admin() then raise exception 'Portfolio admin access is required'; end if;
  grants_ok :=
    pg_catalog.has_table_privilege('service_role', 'public.projects', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.projects', 'DELETE')
    and pg_catalog.has_table_privilege('service_role', 'public.automation_tools', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.automation_tools', 'DELETE')
    and pg_catalog.has_table_privilege('service_role', 'public.project_images', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.tool_images', 'SELECT')
    and pg_catalog.has_table_privilege('service_role', 'public.project_image_crops', 'SELECT');
  select true, job.active, job.schedule into cron_scheduled, cron_active, cron_schedule
  from cron.job as job where job.jobname = 'purge-admin-trash-daily' limit 1;
  cron_scheduled := coalesce(cron_scheduled, false);
  cron_active := coalesce(cron_active, false);
  cron_ok := cron_scheduled and cron_active and cron_schedule = '15 19 * * *';
  select run.start_time, run.status, run.return_message
  into last_run_at, last_run_status, last_run_message
  from cron.job_run_details as run join cron.job as job on job.jobid = run.jobid
  where job.jobname = 'purge-admin-trash-daily' order by run.start_time desc limit 1;
  credential_storage_ok := exists (
    select 1 from storage.buckets bucket
    where bucket.id = 'portfolio-private-documents'
      and bucket.public = false
      and bucket.file_size_limit = 10485760
  );
  return jsonb_build_object(
    'version', '202610060002',
    'healthy', grants_ok and cron_ok and credential_storage_ok,
    'checks', jsonb_build_object(
      'transactionalPublishing', true,
      'releaseAwareMedia', true,
      'contentReadiness', true,
      'purgeServiceRole', grants_ok,
      'trashPurgeSchedule', cron_ok,
      'credentialStorage', credential_storage_ok
    ),
    'trashPurge', jsonb_build_object(
      'scheduled', cron_scheduled, 'active', cron_active, 'schedule', cron_schedule,
      'timezone', 'UTC', 'localTime', '02:15 Asia/Bangkok',
      'lastRunAt', last_run_at, 'lastRunStatus', last_run_status, 'lastRunMessage', last_run_message
    )
  );
end;
$$;

revoke all on function public.admin_schema_health() from public;
grant execute on function public.admin_schema_health() to authenticated;

notify pgrst, 'reload schema';
