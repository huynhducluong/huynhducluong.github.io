-- Draft and immutable release workflow for Curriculum Vitae and Portfolio.
-- Apply after 202609300001_admin_trash.sql.

alter table public.cv_content
  add column if not exists theme jsonb not null default '{"presetId":"personal-blue"}'::jsonb;

update public.cv_content
set theme = jsonb_build_object('presetId', theme_id)
where theme is null or theme = '{}'::jsonb;

-- CV working content is an Admin draft. Public visitors only read cv_releases.
drop policy if exists "cv content is public" on public.cv_content;
drop policy if exists "admins read cv content" on public.cv_content;
create policy "admins read cv content"
on public.cv_content for select
to authenticated
using (public.is_portfolio_admin());

create table if not exists public.portfolio_content (
  id text primary key default 'primary' check (id = 'primary'),
  version text not null default '2026-09',
  title text not null default 'PORTFOLIO',
  year text not null default '2026',
  kicker text not null default 'BIM · Infrastructure · Automation',
  about_kicker text not null default 'About me',
  about_heading text not null default 'Coordination built on clear information and practical automation.',
  closing_kicker text not null default 'Thank you',
  closing_heading text not null default 'Let''s build clearer BIM workflows.',
  closing_text text not null default 'Infrastructure BIM coordination · Model quality · Automation',
  theme jsonb not null default '{"presetId":"personal-blue"}'::jsonb,
  profile jsonb not null,
  skill_groups jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create index if not exists cv_releases_published_at_idx
on public.cv_releases (published_at desc);

create index if not exists portfolio_releases_published_at_idx
on public.portfolio_releases (published_at desc);

drop trigger if exists portfolio_content_set_updated_at on public.portfolio_content;
create trigger portfolio_content_set_updated_at
before update on public.portfolio_content
for each row execute function public.set_updated_at();

alter table public.portfolio_content enable row level security;
alter table public.portfolio_releases enable row level security;

drop policy if exists "admins manage portfolio content" on public.portfolio_content;
create policy "admins manage portfolio content"
on public.portfolio_content for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "portfolio releases are public" on public.portfolio_releases;
create policy "portfolio releases are public"
on public.portfolio_releases for select
to anon, authenticated
using (true);

drop policy if exists "admins publish portfolio releases" on public.portfolio_releases;
create policy "admins publish portfolio releases"
on public.portfolio_releases for insert
to authenticated
with check (
  public.is_portfolio_admin()
  and published_by = (select auth.uid())
);

grant select on public.cv_releases, public.portfolio_releases to anon;
grant select, insert on public.cv_releases, public.portfolio_releases to authenticated;
grant select, insert, update, delete on public.cv_content, public.portfolio_content to authenticated;

revoke insert, update, delete on public.cv_content, public.portfolio_content from anon;
revoke update, delete on public.cv_releases, public.portfolio_releases from anon, authenticated;

notify pgrst, 'reload schema';
