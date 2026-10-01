-- Multi-document CV and Portfolio library with one active public release per kind.
create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('cv', 'portfolio')),
  internal_title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_active boolean not null default false,
  draft_payload jsonb,
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_documents_active_state check (not is_active or status = 'published')
);

create unique index if not exists profile_documents_one_active_per_kind_idx
on public.profile_documents (kind)
where is_active;

create index if not exists profile_documents_kind_updated_at_idx
on public.profile_documents (kind, updated_at desc);

create table if not exists public.profile_document_releases (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.profile_documents(id) on delete cascade,
  kind text not null check (kind in ('cv', 'portfolio')),
  version text not null,
  payload jsonb not null,
  is_active boolean not null default false,
  source_release_id uuid unique,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create unique index if not exists profile_document_releases_one_active_per_kind_idx
on public.profile_document_releases (kind)
where is_active;

create index if not exists profile_document_releases_document_published_idx
on public.profile_document_releases (document_id, published_at desc);

drop trigger if exists profile_documents_set_updated_at on public.profile_documents;
create trigger profile_documents_set_updated_at
before update on public.profile_documents
for each row execute function public.set_updated_at();

alter table public.profile_documents enable row level security;
alter table public.profile_document_releases enable row level security;

drop policy if exists "admins manage profile documents" on public.profile_documents;
create policy "admins manage profile documents"
on public.profile_documents for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "active profile document releases are public" on public.profile_document_releases;
create policy "active profile document releases are public"
on public.profile_document_releases for select
to anon, authenticated
using (is_active or public.is_portfolio_admin());

drop policy if exists "admins manage profile document releases" on public.profile_document_releases;
create policy "admins manage profile document releases"
on public.profile_document_releases for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.profile_documents to authenticated;
grant select on public.profile_document_releases to anon;
grant select, insert, update, delete on public.profile_document_releases to authenticated;

insert into public.profile_documents (kind, internal_title, status, is_active)
select 'cv', 'General CV',
  case when exists (select 1 from public.cv_releases) then 'published' else 'draft' end,
  exists (select 1 from public.cv_releases)
where not exists (select 1 from public.profile_documents where kind = 'cv');

insert into public.profile_documents (kind, internal_title, status, is_active)
select 'portfolio', 'General Portfolio',
  case when exists (select 1 from public.portfolio_releases) then 'published' else 'draft' end,
  exists (select 1 from public.portfolio_releases)
where not exists (select 1 from public.profile_documents where kind = 'portfolio');

insert into public.profile_document_releases (
  document_id, kind, version, payload, is_active, source_release_id, published_at, published_by
)
select
  profile_document.id,
  'cv',
  legacy_release.version,
  legacy_release.payload,
  legacy_release.id = (select id from public.cv_releases order by published_at desc limit 1),
  legacy_release.id,
  legacy_release.published_at,
  legacy_release.published_by
from public.cv_releases legacy_release
cross join lateral (
  select id from public.profile_documents where kind = 'cv' order by created_at limit 1
) profile_document
on conflict (source_release_id) do nothing;

insert into public.profile_document_releases (
  document_id, kind, version, payload, is_active, source_release_id, published_at, published_by
)
select
  profile_document.id,
  'portfolio',
  legacy_release.version,
  legacy_release.payload,
  legacy_release.id = (select id from public.portfolio_releases order by published_at desc limit 1),
  legacy_release.id,
  legacy_release.published_at,
  legacy_release.published_by
from public.portfolio_releases legacy_release
cross join lateral (
  select id from public.profile_documents where kind = 'portfolio' order by created_at limit 1
) profile_document
on conflict (source_release_id) do nothing;

update public.profile_documents profile_document
set last_published_at = latest.published_at
from (
  select document_id, max(published_at) as published_at
  from public.profile_document_releases
  group by document_id
) latest
where profile_document.id = latest.document_id;

create or replace function public.publish_profile_document(
  p_document_id uuid,
  p_version text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_kind text;
  release_id uuid;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select kind into selected_kind
  from public.profile_documents
  where id = p_document_id and status <> 'archived'
  for update;

  if selected_kind is null then
    raise exception 'Document was not found or is archived.';
  end if;

  update public.profile_document_releases
  set is_active = false
  where kind = selected_kind and is_active;

  update public.profile_documents
  set is_active = false
  where kind = selected_kind and is_active;

  insert into public.profile_document_releases (
    document_id, kind, version, payload, is_active, published_by
  ) values (
    p_document_id, selected_kind, p_version, p_payload, true, auth.uid()
  ) returning id into release_id;

  update public.profile_documents
  set status = 'published',
      is_active = true,
      draft_payload = p_payload,
      last_published_at = now()
  where id = p_document_id;

  return release_id;
end;
$$;

revoke all on function public.publish_profile_document(uuid, text, jsonb) from public;
grant execute on function public.publish_profile_document(uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
