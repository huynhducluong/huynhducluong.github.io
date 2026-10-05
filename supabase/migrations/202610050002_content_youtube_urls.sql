-- Optional canonical YouTube video links for project and tool detail pages.

alter table public.projects
  add column if not exists youtube_url text;

alter table public.automation_tools
  add column if not exists youtube_url text;

alter table public.projects
  drop constraint if exists projects_youtube_url_canonical;
alter table public.projects
  add constraint projects_youtube_url_canonical check (
    youtube_url is null
    or youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'
  );

alter table public.automation_tools
  drop constraint if exists automation_tools_youtube_url_canonical;
alter table public.automation_tools
  add constraint automation_tools_youtube_url_canonical check (
    youtube_url is null
    or youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'
  );

comment on column public.projects.youtube_url is
  'Optional canonical YouTube watch URL for this project.';
comment on column public.automation_tools.youtube_url is
  'Optional canonical YouTube watch URL for this automation tool.';

notify pgrst, 'reload schema';
