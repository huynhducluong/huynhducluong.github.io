-- Portfolio phase 4: public preview crops of credential evidence (docs/ui-guidelines.md §8.4).
-- The evidence file itself stays in the private bucket and is never modified. Only the crops an admin saves are
-- written to the public bucket ('portfolio-public', existing admin-only write policies), and a credential prints
-- one of them only after the admin switches "Show in Portfolio" on for that evidence file.

create table if not exists public.credential_media_crops (
  id uuid primary key default gen_random_uuid(),
  credential_asset_id uuid not null references public.credential_assets(id) on delete cascade,
  profile public.media_crop_profile not null check (profile in ('landscape', 'portrait')),
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
  unique (credential_asset_id, profile),
  check (crop_x + crop_width <= 1.000001),
  check (crop_y + crop_height <= 1.000001)
);

-- show_in_portfolio: explicit opt-in, off by default. preview_rotation: quarter turns applied to the private original
-- before cropping (the original is never rewritten). preview_profile: the crop the Portfolio prints.
alter table public.credential_assets
  add column if not exists show_in_portfolio boolean not null default false,
  add column if not exists preview_rotation smallint not null default 0,
  add column if not exists preview_profile public.media_crop_profile not null default 'landscape';

alter table public.credential_assets drop constraint if exists credential_assets_preview_rotation_check;
alter table public.credential_assets add constraint credential_assets_preview_rotation_check check (preview_rotation in (0, 1, 2, 3));
alter table public.credential_assets drop constraint if exists credential_assets_preview_profile_check;
alter table public.credential_assets add constraint credential_assets_preview_profile_check check (preview_profile in ('landscape', 'portrait'));
-- Only image evidence can be shown, and at most one file per credential.
alter table public.credential_assets drop constraint if exists credential_assets_show_image_only;
alter table public.credential_assets add constraint credential_assets_show_image_only check (not show_in_portfolio or mime_type <> 'application/pdf');
create unique index if not exists credential_assets_one_portfolio_preview
on public.credential_assets (credential_id) where show_in_portfolio;

create index if not exists credential_media_crops_asset_idx on public.credential_media_crops (credential_asset_id);

drop trigger if exists credential_media_crops_set_updated_at on public.credential_media_crops;
create trigger credential_media_crops_set_updated_at
before update on public.credential_media_crops
for each row execute function public.set_updated_at();

alter table public.credential_media_crops enable row level security;
drop policy if exists "admins manage credential media crops" on public.credential_media_crops;
create policy "admins manage credential media crops"
on public.credential_media_crops for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.credential_media_crops to authenticated;
revoke all on public.credential_media_crops from anon;

comment on table public.credential_media_crops is 'Public Portfolio preview crops of private credential evidence images.';
