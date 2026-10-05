-- Least-privilege database access for the scheduled trash purge Edge Function.
-- The Edge runtime authenticates to PostgREST as service_role, which bypasses
-- RLS but still requires explicit SQL table privileges.

grant select, delete
on table public.projects, public.automation_tools
to service_role;

grant select
on table public.project_images, public.tool_images, public.project_image_crops
to service_role;

notify pgrst, 'reload schema';
