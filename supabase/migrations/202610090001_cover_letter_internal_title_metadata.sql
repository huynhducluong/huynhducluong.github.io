-- Treat a Cover Letter internal title as library metadata.
-- Final and archived letter content remains immutable; only its internal title may change.
create or replace function public.protect_final_cover_letter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'archived' then
    if new.status <> 'archived' or
       (to_jsonb(new) - array['internal_title', 'updated_at']) is distinct from
       (to_jsonb(old) - array['internal_title', 'updated_at']) then
      raise exception 'Archived cover letter content is immutable';
    end if;
  end if;

  if old.status = 'final' then
    if new.status not in ('final', 'archived') then
      raise exception 'Final cover letters may only be archived';
    end if;
    if (to_jsonb(new) - array['status', 'internal_title', 'updated_at']) is distinct from
       (to_jsonb(old) - array['status', 'internal_title', 'updated_at']) then
      raise exception 'Final cover letter content is immutable';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
