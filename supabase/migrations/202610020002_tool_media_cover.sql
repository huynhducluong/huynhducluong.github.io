-- Give Automation tools the same single-cover media workflow as Projects.

with ranked_covers as (
  select id, row_number() over (partition by tool_id order by display_order, created_at, id) as cover_rank
  from public.tool_images
  where kind = 'cover'
)
update public.tool_images
set kind = 'gallery'
where id in (select id from ranked_covers where cover_rank > 1);

with ordered_media as (
  select id, row_number() over (
    partition by tool_id
    order by case when kind = 'cover' then 0 else 1 end, display_order, created_at, id
  ) as next_order
  from public.tool_images
)
update public.tool_images image
set display_order = ordered_media.next_order
from ordered_media
where image.id = ordered_media.id;

create unique index if not exists tool_images_one_cover
on public.tool_images (tool_id)
where kind = 'cover';

create or replace function public.set_tool_image_cover(target_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_tool_id text;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Portfolio admin access is required';
  end if;

  select tool_id into target_tool_id
  from public.tool_images
  where id = target_image_id;

  if target_tool_id is null then
    raise exception 'Tool image was not found';
  end if;

  update public.tool_images
  set kind = 'gallery'
  where tool_id = target_tool_id and kind = 'cover';

  update public.tool_images
  set kind = 'cover'
  where id = target_image_id;

  with ordered_media as (
    select id, row_number() over (
      order by case when id = target_image_id then 0 else 1 end, display_order, created_at, id
    ) as next_order
    from public.tool_images
    where tool_id = target_tool_id
  )
  update public.tool_images image
  set display_order = ordered_media.next_order
  from ordered_media
  where image.id = ordered_media.id;
end;
$$;

revoke all on function public.set_tool_image_cover(uuid) from public;
grant execute on function public.set_tool_image_cover(uuid) to authenticated;

notify pgrst, 'reload schema';
