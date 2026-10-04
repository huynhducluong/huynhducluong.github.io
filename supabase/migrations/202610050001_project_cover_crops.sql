-- Non-destructive, layout-specific crops for Project cover images in Portfolio documents.

create table if not exists public.project_image_crops (
  id uuid primary key default gen_random_uuid(),
  project_image_id uuid not null references public.project_images(id) on delete cascade,
  layout public.portfolio_layout not null,
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
  unique (project_image_id, layout),
  check (crop_x + crop_width <= 1.000001),
  check (crop_y + crop_height <= 1.000001)
);

drop trigger if exists project_image_crops_set_updated_at on public.project_image_crops;
create trigger project_image_crops_set_updated_at
before update on public.project_image_crops
for each row execute function public.set_updated_at();

alter table public.project_image_crops enable row level security;

drop policy if exists "admins manage project image crops" on public.project_image_crops;
create policy "admins manage project image crops"
on public.project_image_crops for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.project_image_crops to authenticated;
revoke all on public.project_image_crops from anon;

notify pgrst, 'reload schema';
