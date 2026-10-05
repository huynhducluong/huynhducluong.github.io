-- Admin consistency hardening: transactional writes, schema health and release-aware media cleanup.
-- Apply after 202610050002_content_youtube_urls.sql.

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
  else
    raise exception 'Unsupported content type: %', target_type;
  end if;
end;
$$;

create or replace function public.reorder_admin_media(target_type text, ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id text;
  owner_count integer;
  supplied_count integer := coalesce(cardinality(ordered_ids), 0);
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;
  if supplied_count = 0 then return; end if;
  if supplied_count <> (select count(distinct supplied.id) from unnest(ordered_ids) as supplied(id)) then
    raise exception 'Media order contains duplicate ids';
  end if;

  if target_type = 'project' then
    select project_id into owner_id from public.project_images where id = ordered_ids[1];
    perform 1 from public.project_images where project_id = owner_id for update;
    select count(*) into owner_count from public.project_images where project_id = owner_id;
    if owner_id is null or owner_count <> supplied_count or exists (
      select 1 from unnest(ordered_ids) as supplied(id)
      where not exists (select 1 from public.project_images where project_images.id = supplied.id and project_id = owner_id)
    ) then
      raise exception 'Media order must contain every image for one project exactly once';
    end if;
    with ordered as (
      select value as id, ordinality::integer as position
      from unnest(ordered_ids) with ordinality as item(value, ordinality)
    )
    update public.project_images image
    set display_order = ordered.position
    from ordered
    where image.id = ordered.id;
  elsif target_type = 'tool' then
    select tool_id into owner_id from public.tool_images where id = ordered_ids[1];
    perform 1 from public.tool_images where tool_id = owner_id for update;
    select count(*) into owner_count from public.tool_images where tool_id = owner_id;
    if owner_id is null or owner_count <> supplied_count or exists (
      select 1 from unnest(ordered_ids) as supplied(id)
      where not exists (select 1 from public.tool_images where tool_images.id = supplied.id and tool_id = owner_id)
    ) then
      raise exception 'Media order must contain every image for one tool exactly once';
    end if;
    with ordered as (
      select value as id, ordinality::integer as position
      from unnest(ordered_ids) with ordinality as item(value, ordinality)
    )
    update public.tool_images image
    set display_order = ordered.position
    from ordered
    where image.id = ordered.id;
  else
    raise exception 'Unsupported media type: %', target_type;
  end if;
end;
$$;

create or replace function public.replace_cover_letter_evidence(
  p_letter_id uuid,
  p_project_ids text[],
  p_tool_ids text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.cover_letter_projects where cover_letter_id = p_letter_id;
  delete from public.cover_letter_tools where cover_letter_id = p_letter_id;

  insert into public.cover_letter_projects (cover_letter_id, project_id, display_order)
  select p_letter_id, value, ordinality::integer - 1
  from unnest(coalesce(p_project_ids, array[]::text[])) with ordinality as item(value, ordinality);

  insert into public.cover_letter_tools (cover_letter_id, tool_id, display_order)
  select p_letter_id, value, ordinality::integer - 1
  from unnest(coalesce(p_tool_ids, array[]::text[])) with ordinality as item(value, ordinality);
end;
$$;

create or replace function public.create_cover_letter_draft(
  p_letter jsonb,
  p_project_ids text[],
  p_tool_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  letter_id uuid;
begin
  if not public.is_portfolio_admin() then raise exception 'Portfolio admin access is required'; end if;
  insert into public.cover_letters (
    internal_title, company_name, position_title, recipient_name, recipient_title,
    company_address, application_date, salutation, opening_paragraph, fit_paragraph,
    company_paragraph, closing_paragraph, sign_off, private_notes,
    theme_id, theme_primary, theme_accent
  ) values (
    p_letter->>'internal_title', p_letter->>'company_name', p_letter->>'position_title',
    p_letter->>'recipient_name', p_letter->>'recipient_title', p_letter->>'company_address',
    coalesce(nullif(p_letter->>'application_date', '')::date, current_date),
    p_letter->>'salutation', p_letter->>'opening_paragraph', p_letter->>'fit_paragraph',
    p_letter->>'company_paragraph', p_letter->>'closing_paragraph', p_letter->>'sign_off',
    p_letter->>'private_notes', p_letter->>'theme_id', p_letter->>'theme_primary', p_letter->>'theme_accent'
  ) returning id into letter_id;
  perform public.replace_cover_letter_evidence(letter_id, p_project_ids, p_tool_ids);
  return letter_id;
end;
$$;

create or replace function public.save_cover_letter_draft(
  p_letter_id uuid,
  p_letter jsonb,
  p_project_ids text[],
  p_tool_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then raise exception 'Portfolio admin access is required'; end if;
  update public.cover_letters set
    internal_title = p_letter->>'internal_title', company_name = p_letter->>'company_name',
    position_title = p_letter->>'position_title', recipient_name = p_letter->>'recipient_name',
    recipient_title = p_letter->>'recipient_title', company_address = p_letter->>'company_address',
    application_date = coalesce(nullif(p_letter->>'application_date', '')::date, current_date),
    salutation = p_letter->>'salutation', opening_paragraph = p_letter->>'opening_paragraph',
    fit_paragraph = p_letter->>'fit_paragraph', company_paragraph = p_letter->>'company_paragraph',
    closing_paragraph = p_letter->>'closing_paragraph', sign_off = p_letter->>'sign_off',
    private_notes = p_letter->>'private_notes', theme_id = p_letter->>'theme_id',
    theme_primary = p_letter->>'theme_primary', theme_accent = p_letter->>'theme_accent'
  where id = p_letter_id and status = 'draft';
  if not found then raise exception 'Draft cover letter was not found'; end if;
  perform public.replace_cover_letter_evidence(p_letter_id, p_project_ids, p_tool_ids);
  return p_letter_id;
end;
$$;

create or replace function public.finalize_cover_letter_draft(
  p_letter_id uuid,
  p_letter jsonb,
  p_project_ids text[],
  p_tool_ids text[],
  p_sender jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.save_cover_letter_draft(p_letter_id, p_letter, p_project_ids, p_tool_ids);
  update public.cover_letters
  set status = 'final', sender_snapshot = p_sender, finalized_at = now()
  where id = p_letter_id and status = 'draft';
  if not found then raise exception 'Draft cover letter was not found'; end if;
  return p_letter_id;
end;
$$;

create or replace function public.publish_website(p_version text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  content jsonb := p_payload->'content';
  release_id uuid;
begin
  if not public.is_portfolio_admin() then raise exception 'Portfolio admin access is required'; end if;
  if content is null or jsonb_typeof(content) <> 'object' then raise exception 'Website payload is invalid'; end if;
  insert into public.website_content (
    id, version, seo_title, seo_description, navigation, hero_eyebrow, focus,
    specialization, expertise_title, experience_title, projects_title, automation_title,
    projects_page, tools_page, contact_kicker, contact_title, footer_text,
    theme, content_selection, sections
  ) values (
    'primary', p_version, content->'seoTitle', content->'seoDescription',
    '{"expertise":{"en":"Expertise","vi":"Chuyên môn"},"experience":{"en":"Experience","vi":"Kinh nghiệm"},"projects":{"en":"Projects","vi":"Dự án"},"automation":{"en":"Automation","vi":"Tự động hóa"}}'::jsonb,
    content->'heroEyebrow', content->'focus', content->'specialization',
    content->'expertiseTitle', content->'experienceTitle', content->'projectsTitle',
    content->'automationTitle', content->'projectsPage', content->'toolsPage',
    content->'contactKicker', content->'contactTitle', content->'footerText',
    content->'theme', content->'contentSelection', content->'sections'
  )
  on conflict (id) do update set
    version = excluded.version, seo_title = excluded.seo_title,
    seo_description = excluded.seo_description, hero_eyebrow = excluded.hero_eyebrow,
    focus = excluded.focus, specialization = excluded.specialization,
    expertise_title = excluded.expertise_title, experience_title = excluded.experience_title,
    projects_title = excluded.projects_title, automation_title = excluded.automation_title,
    projects_page = excluded.projects_page, tools_page = excluded.tools_page,
    contact_kicker = excluded.contact_kicker, contact_title = excluded.contact_title,
    footer_text = excluded.footer_text, theme = excluded.theme,
    content_selection = excluded.content_selection, sections = excluded.sections;
  insert into public.website_releases (version, payload, published_by)
  values (p_version, p_payload, (select auth.uid()))
  returning id into release_id;
  return release_id;
end;
$$;

create or replace function public.release_references_storage_path(target_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' and not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;
  return (select coalesce(target_path, '') <> '' and (
    exists (
      select 1 from public.website_releases release
      where jsonb_path_exists(release.payload, '$.**.storagePath ? (@ == $path)', jsonb_build_object('path', target_path))
         or jsonb_path_exists(release.payload, '$.**.storage_path ? (@ == $path)', jsonb_build_object('path', target_path))
    )
    or exists (
      select 1 from public.profile_document_releases release
      where jsonb_path_exists(release.payload, '$.**.storagePath ? (@ == $path)', jsonb_build_object('path', target_path))
         or jsonb_path_exists(release.payload, '$.**.storage_path ? (@ == $path)', jsonb_build_object('path', target_path))
    )
    or exists (
      select 1 from public.cv_releases release
      where jsonb_path_exists(release.payload, '$.**.storagePath ? (@ == $path)', jsonb_build_object('path', target_path))
         or jsonb_path_exists(release.payload, '$.**.storage_path ? (@ == $path)', jsonb_build_object('path', target_path))
    )
    or exists (
      select 1 from public.portfolio_releases release
      where jsonb_path_exists(release.payload, '$.**.storagePath ? (@ == $path)', jsonb_build_object('path', target_path))
         or jsonb_path_exists(release.payload, '$.**.storage_path ? (@ == $path)', jsonb_build_object('path', target_path))
    )
  ));
end;
$$;

create or replace function public.admin_schema_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_admin() then raise exception 'Portfolio admin access is required'; end if;
  return jsonb_build_object(
    'version', '202610050003',
    'transactionalPublishing', true,
    'releaseAwareMedia', true,
    'contentReadiness', true
  );
end;
$$;

revoke all on function public.replace_cover_letter_evidence(uuid, text[], text[]) from public;
revoke all on function public.reorder_admin_content(text, text[]) from public;
revoke all on function public.reorder_admin_media(text, uuid[]) from public;
revoke all on function public.create_cover_letter_draft(jsonb, text[], text[]) from public;
revoke all on function public.save_cover_letter_draft(uuid, jsonb, text[], text[]) from public;
revoke all on function public.finalize_cover_letter_draft(uuid, jsonb, text[], text[], jsonb) from public;
revoke all on function public.publish_website(text, jsonb) from public;
revoke all on function public.release_references_storage_path(text) from public;
revoke all on function public.admin_schema_health() from public;

grant execute on function public.reorder_admin_content(text, text[]) to authenticated;
grant execute on function public.reorder_admin_media(text, uuid[]) to authenticated;
grant execute on function public.create_cover_letter_draft(jsonb, text[], text[]) to authenticated;
grant execute on function public.save_cover_letter_draft(uuid, jsonb, text[], text[]) to authenticated;
grant execute on function public.finalize_cover_letter_draft(uuid, jsonb, text[], text[], jsonb) to authenticated;
grant execute on function public.publish_website(text, jsonb) to authenticated;
grant execute on function public.release_references_storage_path(text) to authenticated, service_role;
grant execute on function public.admin_schema_health() to authenticated;

notify pgrst, 'reload schema';
