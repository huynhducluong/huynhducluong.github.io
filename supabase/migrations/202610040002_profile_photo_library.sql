-- Reusable cropped profile photos for the shared Professional Profile.

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  storage_path text not null unique,
  mime_type text not null default 'image/webp',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  file_size bigint not null check (file_size > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profile_photos_set_updated_at on public.profile_photos;
create trigger profile_photos_set_updated_at
before update on public.profile_photos
for each row execute function public.set_updated_at();

alter table public.profile_photos enable row level security;

drop policy if exists "admins manage profile photos" on public.profile_photos;
create policy "admins manage profile photos"
on public.profile_photos for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.profile_photos to authenticated;
revoke all on public.profile_photos from anon;
