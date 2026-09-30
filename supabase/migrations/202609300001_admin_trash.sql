-- Reversible 30-day Trash for unified Project and Tool administration.
-- Apply after 202609290001_unified_admin_cv.sql.

alter table public.projects
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_from_status public.publication_status;

alter table public.automation_tools
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_from_status public.publication_status;

alter table public.projects drop constraint if exists projects_trash_state;
alter table public.projects add constraint projects_trash_state check (
  (deleted_at is null and purge_after is null and deleted_by is null and deleted_from_status is null)
  or
  (deleted_at is not null and purge_after is not null and purge_after >= deleted_at and deleted_from_status is not null)
);

alter table public.automation_tools drop constraint if exists automation_tools_trash_state;
alter table public.automation_tools add constraint automation_tools_trash_state check (
  (deleted_at is null and purge_after is null and deleted_by is null and deleted_from_status is null)
  or
  (deleted_at is not null and purge_after is not null and purge_after >= deleted_at and deleted_from_status is not null)
);

create index if not exists projects_trash_purge_idx
on public.projects (purge_after)
where deleted_at is not null;

create index if not exists automation_tools_trash_purge_idx
on public.automation_tools (purge_after)
where deleted_at is not null;

-- Deleted records are immediately removed from all public reads.
drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public"
on public.projects for select
to anon, authenticated
using (
  (deleted_at is null and status = 'published')
  or public.is_portfolio_admin()
);

drop policy if exists "published project images are public" on public.project_images;
create policy "published project images are public"
on public.project_images for select
to anon, authenticated
using (
  public.is_portfolio_admin()
  or exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and projects.deleted_at is null
      and projects.status = 'published'
  )
);

drop policy if exists "published tools are public" on public.automation_tools;
create policy "published tools are public"
on public.automation_tools for select
to anon, authenticated
using (
  (deleted_at is null and status = 'published')
  or public.is_portfolio_admin()
);

drop policy if exists "published tool images are public" on public.tool_images;
create policy "published tool images are public"
on public.tool_images for select
to anon, authenticated
using (
  public.is_portfolio_admin()
  or exists (
    select 1
    from public.automation_tools
    where automation_tools.id = tool_images.tool_id
      and automation_tools.deleted_at is null
      and automation_tools.status = 'published'
  )
);

create or replace function public.move_admin_item_to_trash(target_type text, target_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  if target_type = 'project' then
    update public.projects
    set deleted_from_status = status,
        status = 'draft',
        deleted_at = now(),
        deleted_by = (select auth.uid()),
        purge_after = now() + interval '30 days'
    where id = target_id and deleted_at is null;
  elsif target_type = 'tool' then
    update public.automation_tools
    set deleted_from_status = status,
        status = 'draft',
        deleted_at = now(),
        deleted_by = (select auth.uid()),
        purge_after = now() + interval '30 days'
    where id = target_id and deleted_at is null;
  else
    raise exception 'Unsupported admin item type: %', target_type;
  end if;

  if not found then
    raise exception 'Active % was not found', target_type;
  end if;
end;
$$;

create or replace function public.restore_admin_item_from_trash(target_type text, target_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  if target_type = 'project' then
    update public.projects
    set status = 'draft',
        deleted_at = null,
        deleted_by = null,
        purge_after = null,
        deleted_from_status = null
    where id = target_id and deleted_at is not null;
  elsif target_type = 'tool' then
    update public.automation_tools
    set status = 'draft',
        deleted_at = null,
        deleted_by = null,
        purge_after = null,
        deleted_from_status = null
    where id = target_id and deleted_at is not null;
  else
    raise exception 'Unsupported admin item type: %', target_type;
  end if;

  if not found then
    raise exception 'Trashed % was not found', target_type;
  end if;
end;
$$;

create or replace function public.purge_admin_item(target_type text, target_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  if target_type = 'project' then
    delete from public.projects where id = target_id and deleted_at is not null;
  elsif target_type = 'tool' then
    delete from public.automation_tools where id = target_id and deleted_at is not null;
  else
    raise exception 'Unsupported admin item type: %', target_type;
  end if;

  if not found then
    raise exception 'Trashed % was not found', target_type;
  end if;
end;
$$;

revoke all on function public.move_admin_item_to_trash(text, text) from public;
revoke all on function public.restore_admin_item_from_trash(text, text) from public;
revoke all on function public.purge_admin_item(text, text) from public;
grant execute on function public.move_admin_item_to_trash(text, text) to authenticated;
grant execute on function public.restore_admin_item_from_trash(text, text) to authenticated;
grant execute on function public.purge_admin_item(text, text) to authenticated;

-- Permanent deletion removes only evidence links, never the cover letter itself.
alter table public.cover_letter_projects
  drop constraint if exists cover_letter_projects_project_id_fkey;
alter table public.cover_letter_projects
  add constraint cover_letter_projects_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.cover_letter_tools
  drop constraint if exists cover_letter_tools_tool_id_fkey;
alter table public.cover_letter_tools
  add constraint cover_letter_tools_tool_id_fkey
  foreign key (tool_id) references public.automation_tools(id) on delete cascade;

notify pgrst, 'reload schema';
