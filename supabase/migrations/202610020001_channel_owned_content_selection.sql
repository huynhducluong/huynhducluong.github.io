-- Move Website composition out of the shared Project and Automation records.
-- CV and Portfolio composition already live in each profile document draft payload.

alter table public.website_content
  add column if not exists content_selection jsonb not null default '{"projectIds":[],"featuredProjectIds":[],"toolIds":[],"featuredToolIds":[]}'::jsonb;

update public.website_content
set content_selection = jsonb_build_object(
  'projectIds', (
    select coalesce(jsonb_agg(project.id order by project.display_order), '[]'::jsonb)
    from public.projects project
    where project.status = 'published' and project.deleted_at is null
  ),
  'featuredProjectIds', (
    select coalesce(jsonb_agg(project.id order by project.display_order), '[]'::jsonb)
    from public.projects project
    where project.status = 'published' and project.featured and project.deleted_at is null
  ),
  'toolIds', (
    select coalesce(jsonb_agg(tool.id order by tool.display_order), '[]'::jsonb)
    from public.automation_tools tool
    where tool.status = 'published' and tool.deleted_at is null
  ),
  'featuredToolIds', (
    select coalesce(jsonb_agg(tool.id order by tool.display_order), '[]'::jsonb)
    from public.automation_tools tool
    where tool.status = 'published' and tool.featured and tool.deleted_at is null
  )
)
where id = 'primary';

notify pgrst, 'reload schema';
