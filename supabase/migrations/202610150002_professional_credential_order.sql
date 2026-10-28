-- Add Professional Credentials to the existing atomic Admin ordering workflow.
-- Apply after 202610090001_cover_letter_internal_title_metadata.sql.

create or replace function public.reorder_admin_content(target_type text, ordered_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  supplied_count integer := coalesce(cardinality(ordered_ids), 0);
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;
  if supplied_count <> (select count(distinct supplied.id) from unnest(coalesce(ordered_ids, array[]::text[])) as supplied(id)) then
    raise exception 'Content order contains duplicate ids';
  end if;

  if target_type = 'project' then
    perform 1 from public.projects where deleted_at is null for update;
    select count(*) into active_count from public.projects where deleted_at is null;
    if active_count <> supplied_count or exists (
      select 1 from unnest(coalesce(ordered_ids, array[]::text[])) as supplied(id)
      where not exists (select 1 from public.projects where projects.id = supplied.id and deleted_at is null)
    ) then
      raise exception 'Project order must contain every active project exactly once';
    end if;
    with ordered as (
      select value as id, ordinality::integer as position
      from unnest(ordered_ids) with ordinality as item(value, ordinality)
    )
    update public.projects item
    set display_order = ordered.position
    from ordered
    where item.id = ordered.id;
  elsif target_type = 'tool' then
    perform 1 from public.automation_tools where deleted_at is null for update;
    select count(*) into active_count from public.automation_tools where deleted_at is null;
    if active_count <> supplied_count or exists (
      select 1 from unnest(coalesce(ordered_ids, array[]::text[])) as supplied(id)
      where not exists (select 1 from public.automation_tools where automation_tools.id = supplied.id and deleted_at is null)
    ) then
      raise exception 'Tool order must contain every active tool exactly once';
    end if;
    with ordered as (
      select value as id, ordinality::integer as position
      from unnest(ordered_ids) with ordinality as item(value, ordinality)
    )
    update public.automation_tools item
    set display_order = ordered.position
    from ordered
    where item.id = ordered.id;
  elsif target_type = 'credential' then
    perform 1 from public.professional_credentials for update;
    select count(*) into active_count from public.professional_credentials;
    if active_count <> supplied_count or exists (
      select 1 from unnest(coalesce(ordered_ids, array[]::text[])) as supplied(id)
      where not exists (select 1 from public.professional_credentials where professional_credentials.id::text = supplied.id)
    ) then
      raise exception 'Credential order must contain every credential exactly once';
    end if;
    with ordered as (
      select value as id, ordinality::integer as position
      from unnest(ordered_ids) with ordinality as item(value, ordinality)
    )
    update public.professional_credentials item
    set display_order = ordered.position
    from ordered
    where item.id::text = ordered.id;
  else
    raise exception 'Unsupported content type: %', target_type;
  end if;
end;
$$;

revoke all on function public.reorder_admin_content(text, text[]) from public;
grant execute on function public.reorder_admin_content(text, text[]) to authenticated;
