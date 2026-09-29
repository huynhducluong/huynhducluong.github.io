-- Unified Portfolio and CV administration.
-- Apply after 202609270001_portfolio_cms.sql and 202609280001_cover_letters.sql.

do $$
begin
  create type public.cv_project_display as enum ('detailed', 'compact');
exception
  when duplicate_object then null;
end
$$;

alter table public.projects
  add column if not exists is_current boolean not null default false,
  add column if not exists include_in_cv boolean not null default false,
  add column if not exists cv_order integer not null default 100,
  add column if not exists cv_display public.cv_project_display not null default 'compact',
  add column if not exists cv_show_summary boolean not null default true,
  add column if not exists cv_responsibility_ids text[] not null default '{}';

alter table public.projects drop constraint if exists projects_current_end_date;
alter table public.projects add constraint projects_current_end_date
check (not is_current or end_date is null);

alter table public.automation_tools
  add column if not exists include_in_cv boolean not null default false,
  add column if not exists cv_order integer not null default 100;

-- Preserve the current curated CV selection while moving ownership to Admin.
update public.projects set include_in_cv = true, cv_order = 1, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['hon-khoai-lead','hon-khoai-quality','hon-khoai-acc','hon-khoai-automation'] where id = 'hon-khoai-road';
update public.projects set include_in_cv = true, cv_order = 2, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['ca-mau-cai-nuoc-lead','ca-mau-cai-nuoc-quality','ca-mau-cai-nuoc-automation'] where id = 'ca-mau-cai-nuoc-expressway';
update public.projects set is_current = true, end_date = null where id in ('hon-khoai-road', 'ca-mau-cai-nuoc-expressway');
update public.projects set include_in_cv = true, cv_order = 3, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['la-son-hoa-lien-lead','la-son-hoa-lien-quality','la-son-hoa-lien-automation'] where id = 'la-son-hoa-lien-expressway';
update public.projects set include_in_cv = true, cv_order = 4, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['cam-lo-la-son-lead','cam-lo-la-son-quality','cam-lo-la-son-acc','cam-lo-la-son-automation'] where id = 'cam-lo-la-son-expressway';
update public.projects set include_in_cv = true, cv_order = 5, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['tham-luong-lead','tham-luong-quality','tham-luong-acc','tham-luong-automation'] where id = 'tham-luong-ben-cat-rach-nuoc-len';
update public.projects set include_in_cv = true, cv_order = 6, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['cao-lanh-an-huu-lead','cao-lanh-an-huu-modeling','cao-lanh-an-huu-cde','cao-lanh-an-huu-reports'] where id = 'cao-lanh-an-huu-expressway';
update public.projects set include_in_cv = true, cv_order = 7, cv_display = 'detailed', cv_show_summary = true, cv_responsibility_ids = array['dong-phu-binh-duong-lead','dong-phu-binh-duong-modeling','dong-phu-binh-duong-cde','dong-phu-binh-duong-reports'] where id = 'dong-phu-binh-duong-road';

update public.projects set include_in_cv = true, cv_order = 1, cv_display = 'compact', cv_show_summary = false where id = 'cai-nuoc-dat-mui-expressway';
update public.projects set include_in_cv = true, cv_order = 2, cv_display = 'compact', cv_show_summary = false where id = 'ring-road-4-hcmc';
update public.projects set include_in_cv = true, cv_order = 3, cv_display = 'compact', cv_show_summary = false where id = 'hcmc-thu-dau-mot-chon-thanh-expressway';
update public.projects set include_in_cv = true, cv_order = 4, cv_display = 'compact', cv_show_summary = false where id = 'nguyen-huu-tho-road';
update public.projects set include_in_cv = true, cv_order = 5, cv_display = 'compact', cv_show_summary = false where id = 'ha-tien-coastal-road';
update public.projects set include_in_cv = true, cv_order = 6, cv_display = 'compact', cv_show_summary = false where id = 'phu-yen-coastal-road';
update public.projects set include_in_cv = true, cv_order = 7, cv_display = 'compact', cv_show_summary = false where id = 'long-thanh-airport-phase-1';
update public.projects set include_in_cv = true, cv_order = 8, cv_display = 'compact', cv_show_summary = false where id = 'ring-road-3-hcmc';

update public.automation_tools set include_in_cv = true, cv_order = 1 where id = 'bridge-deck-generator';

create table if not exists public.cv_content (
  id text primary key default 'primary' check (id = 'primary'),
  version text not null default '2026-09',
  theme_id text not null default 'personal-blue',
  page_one_project_count integer not null default 3 check (page_one_project_count between 1 and 8),
  profile jsonb not null,
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skill_groups jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

drop trigger if exists cv_content_set_updated_at on public.cv_content;
create trigger cv_content_set_updated_at before update on public.cv_content
for each row execute function public.set_updated_at();

alter table public.cv_content enable row level security;
alter table public.cv_releases enable row level security;

drop policy if exists "cv content is public" on public.cv_content;
create policy "cv content is public" on public.cv_content for select
to anon, authenticated using (true);

drop policy if exists "admins manage cv content" on public.cv_content;
create policy "admins manage cv content" on public.cv_content for all
to authenticated using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "cv releases are public" on public.cv_releases;
create policy "cv releases are public" on public.cv_releases for select
to anon, authenticated using (true);

drop policy if exists "admins publish cv releases" on public.cv_releases;
create policy "admins publish cv releases" on public.cv_releases for insert
to authenticated with check (
  public.is_portfolio_admin()
  and published_by = (select auth.uid())
);

grant select on public.cv_content, public.cv_releases to anon;
grant select, insert, update, delete on public.cv_content to authenticated;
grant select, insert on public.cv_releases to authenticated;

-- Normalize existing media before enforcing one Cover per project.
with ranked_covers as (
  select id, row_number() over (partition by project_id order by display_order, created_at, id) as cover_rank
  from public.project_images
  where kind = 'cover'
)
update public.project_images
set kind = 'gallery'
where id in (select id from ranked_covers where cover_rank > 1);

create unique index if not exists project_images_one_cover
on public.project_images (project_id)
where kind = 'cover';

create or replace function public.set_project_image_cover(target_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_project_id text;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  select project_id into target_project_id
  from public.project_images
  where id = target_image_id;

  if target_project_id is null then
    raise exception 'Project image was not found';
  end if;

  update public.project_images
  set kind = 'gallery'
  where project_id = target_project_id and kind = 'cover';

  update public.project_images
  set kind = 'cover'
  where id = target_image_id;
end;
$$;

revoke all on function public.set_project_image_cover(uuid) from public;
grant execute on function public.set_project_image_cover(uuid) to authenticated;

notify pgrst, 'reload schema';
