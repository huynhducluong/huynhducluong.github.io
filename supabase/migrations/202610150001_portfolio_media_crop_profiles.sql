-- Reusable Portfolio media crops shared by layouts and supported for both Projects and Tools.

do $$ begin
  create type public.media_crop_profile as enum ('wide', 'landscape', 'portrait');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.project_media_crops (
  id uuid primary key default gen_random_uuid(),
  project_image_id uuid not null references public.project_images(id) on delete cascade,
  profile public.media_crop_profile not null,
  storage_path text not null unique,
  crop_x double precision not null check (crop_x >= 0 and crop_x <= 1),
  crop_y double precision not null check (crop_y >= 0 and crop_y <= 1),
  crop_width double precision not null check (crop_width > 0 and crop_width <= 1),
  crop_height double precision not null check (crop_height > 0 and crop_height <= 1),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  mime_type text not null default 'image/webp',
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_image_id, profile),
  check (crop_x + crop_width <= 1.000001),
  check (crop_y + crop_height <= 1.000001)
);

create table if not exists public.tool_media_crops (
  id uuid primary key default gen_random_uuid(),
  tool_image_id uuid not null references public.tool_images(id) on delete cascade,
  profile public.media_crop_profile not null,
  storage_path text not null unique,
  crop_x double precision not null check (crop_x >= 0 and crop_x <= 1),
  crop_y double precision not null check (crop_y >= 0 and crop_y <= 1),
  crop_width double precision not null check (crop_width > 0 and crop_width <= 1),
  crop_height double precision not null check (crop_height > 0 and crop_height <= 1),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  mime_type text not null default 'image/webp',
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_image_id, profile),
  check (crop_x + crop_width <= 1.000001),
  check (crop_y + crop_height <= 1.000001)
);

drop trigger if exists project_media_crops_set_updated_at on public.project_media_crops;
create trigger project_media_crops_set_updated_at before update on public.project_media_crops
for each row execute function public.set_updated_at();

drop trigger if exists tool_media_crops_set_updated_at on public.tool_media_crops;
create trigger tool_media_crops_set_updated_at before update on public.tool_media_crops
for each row execute function public.set_updated_at();

alter table public.project_media_crops enable row level security;
alter table public.tool_media_crops enable row level security;

drop policy if exists "admins manage project media crops" on public.project_media_crops;
create policy "admins manage project media crops" on public.project_media_crops for all to authenticated
using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "admins manage tool media crops" on public.tool_media_crops;
create policy "admins manage tool media crops" on public.tool_media_crops for all to authenticated
using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.project_media_crops, public.tool_media_crops to authenticated;
grant select on public.project_media_crops, public.tool_media_crops to service_role;
revoke all on public.project_media_crops, public.tool_media_crops from anon;

notify pgrst, 'reload schema';
