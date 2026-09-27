-- Portfolio CMS schema. Apply with the Supabase SQL editor or CLI.
create extension if not exists pgcrypto;

create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.portfolio_layout as enum ('feature', 'standard', 'compact');
create type public.media_kind as enum ('cover', 'gallery');

create table public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolio_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

create table public.projects (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name jsonb not null default '{"en":"","vi":""}'::jsonb,
  location jsonb not null default '{"en":"","vi":""}'::jsonb,
  role jsonb,
  summary jsonb,
  challenge jsonb,
  approach jsonb,
  outcome jsonb,
  start_date text,
  end_date text,
  year integer,
  responsibilities jsonb not null default '[]'::jsonb,
  technologies text[] not null default '{}',
  featured boolean not null default false,
  status public.publication_status not null default 'draft',
  display_order integer not null default 100,
  include_in_portfolio boolean not null default false,
  portfolio_order integer not null default 100,
  portfolio_layout public.portfolio_layout not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  alt jsonb not null default '{"en":"","vi":""}'::jsonb,
  caption jsonb,
  kind public.media_kind not null default 'gallery',
  display_order integer not null default 100,
  mime_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create table public.automation_tools (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  problem jsonb not null default '{"en":"","vi":""}'::jsonb,
  solution jsonb not null default '{"en":"","vi":""}'::jsonb,
  benefit jsonb,
  technologies text[] not null default '{}',
  featured boolean not null default false,
  status public.publication_status not null default 'draft',
  display_order integer not null default 100,
  include_in_portfolio boolean not null default false,
  portfolio_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tool_images (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.automation_tools(id) on delete cascade,
  storage_path text not null unique,
  alt jsonb not null default '{"en":"","vi":""}'::jsonb,
  caption jsonb,
  kind public.media_kind not null default 'gallery',
  display_order integer not null default 100,
  mime_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger tools_set_updated_at before update on public.automation_tools
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.automation_tools enable row level security;
alter table public.tool_images enable row level security;

create policy "published projects are public"
on public.projects for select
to anon, authenticated
using (status = 'published' or public.is_portfolio_admin());

create policy "admins manage projects"
on public.projects for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "published project images are public"
on public.project_images for select
to anon, authenticated
using (
  public.is_portfolio_admin()
  or exists (
    select 1 from public.projects
    where projects.id = project_images.project_id
      and projects.status = 'published'
  )
);

create policy "admins manage project images"
on public.project_images for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "published tools are public"
on public.automation_tools for select
to anon, authenticated
using (status = 'published' or public.is_portfolio_admin());

create policy "admins manage tools"
on public.automation_tools for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "published tool images are public"
on public.tool_images for select
to anon, authenticated
using (
  public.is_portfolio_admin()
  or exists (
    select 1 from public.automation_tools
    where automation_tools.id = tool_images.tool_id
      and automation_tools.status = 'published'
  )
);

create policy "admins manage tool images"
on public.tool_images for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select on public.projects, public.project_images, public.automation_tools, public.tool_images to anon;
grant select, insert, update, delete on public.projects, public.project_images, public.automation_tools, public.tool_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-public',
  'portfolio-public',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admins upload portfolio media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio-public'
  and public.is_portfolio_admin()
);

create policy "admins list portfolio media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'portfolio-public'
  and public.is_portfolio_admin()
);

create policy "admins update portfolio media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'portfolio-public'
  and public.is_portfolio_admin()
)
with check (
  bucket_id = 'portfolio-public'
  and public.is_portfolio_admin()
);

create policy "admins delete portfolio media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'portfolio-public'
  and public.is_portfolio_admin()
);
