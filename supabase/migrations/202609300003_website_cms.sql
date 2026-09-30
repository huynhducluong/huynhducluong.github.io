-- Unified professional profile and atomic Website publishing.
-- Apply after 202609300002_profile_documents.sql.

create table if not exists public.professional_profile (
  id text primary key default 'primary' check (id = 'primary'),
  profile jsonb not null,
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skill_groups jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.professional_profile (
  id,
  profile,
  experiences,
  education,
  skill_groups,
  languages
)
select
  'primary',
  profile,
  experiences,
  education,
  skill_groups,
  languages
from public.cv_content
where id = 'primary'
on conflict (id) do nothing;

create table if not exists public.website_content (
  id text primary key default 'primary' check (id = 'primary'),
  version text not null default '2026-09',
  seo_title jsonb not null,
  seo_description jsonb not null,
  navigation jsonb not null,
  hero_eyebrow jsonb not null,
  focus jsonb not null,
  specialization jsonb not null,
  expertise_title jsonb not null,
  experience_title jsonb not null,
  projects_title jsonb not null,
  automation_title jsonb not null,
  projects_page jsonb not null default '{"kicker":{"en":"Selected work","vi":"Dự án tiêu biểu"},"title":{"en":"Infrastructure projects shaped by BIM coordination.","vi":"Các dự án hạ tầng được triển khai bằng quy trình điều phối BIM."},"description":{"en":"A curated view of verified work from the latest website release.","vi":"Tuyển chọn các dự án đã được xác thực trong bản phát hành website mới nhất."}}'::jsonb,
  tools_page jsonb not null default '{"kicker":{"en":"BIM automation","vi":"Tự động hóa BIM"},"title":{"en":"Tools that remove repetitive work.","vi":"Công cụ giúp loại bỏ các thao tác lặp lại."},"description":{"en":"Practical automation from the latest website release.","vi":"Các giải pháp tự động hóa thực tiễn trong bản phát hành website mới nhất."}}'::jsonb,
  contact_kicker jsonb not null,
  contact_title jsonb not null,
  footer_text jsonb not null,
  theme jsonb not null default '{"presetId":"personal-blue"}'::jsonb,
  sections jsonb not null default '{"expertise":true,"experience":true,"projects":true,"automation":true,"contact":true}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Keep the migration safe if an early development version of this table already exists.
alter table public.website_content
  add column if not exists projects_page jsonb not null default '{"kicker":{"en":"Selected work","vi":"Dự án tiêu biểu"},"title":{"en":"Infrastructure projects shaped by BIM coordination.","vi":"Các dự án hạ tầng được triển khai bằng quy trình điều phối BIM."},"description":{"en":"A curated view of verified work from the latest website release.","vi":"Tuyển chọn các dự án đã được xác thực trong bản phát hành website mới nhất."}}'::jsonb,
  add column if not exists tools_page jsonb not null default '{"kicker":{"en":"BIM automation","vi":"Tự động hóa BIM"},"title":{"en":"Tools that remove repetitive work.","vi":"Công cụ giúp loại bỏ các thao tác lặp lại."},"description":{"en":"Practical automation from the latest website release.","vi":"Các giải pháp tự động hóa thực tiễn trong bản phát hành website mới nhất."}}'::jsonb;

create table if not exists public.website_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create index if not exists website_releases_published_at_idx
on public.website_releases (published_at desc);

drop trigger if exists professional_profile_set_updated_at on public.professional_profile;
create trigger professional_profile_set_updated_at
before update on public.professional_profile
for each row execute function public.set_updated_at();

drop trigger if exists website_content_set_updated_at on public.website_content;
create trigger website_content_set_updated_at
before update on public.website_content
for each row execute function public.set_updated_at();

alter table public.professional_profile enable row level security;
alter table public.website_content enable row level security;
alter table public.website_releases enable row level security;

drop policy if exists "admins manage professional profile" on public.professional_profile;
create policy "admins manage professional profile"
on public.professional_profile for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "admins manage website content" on public.website_content;
create policy "admins manage website content"
on public.website_content for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "website releases are public" on public.website_releases;
create policy "website releases are public"
on public.website_releases for select
to anon, authenticated
using (true);

drop policy if exists "admins publish website releases" on public.website_releases;
create policy "admins publish website releases"
on public.website_releases for insert
to authenticated
with check (
  public.is_portfolio_admin()
  and published_by = (select auth.uid())
);

grant select on public.website_releases to anon;
grant select, insert on public.website_releases to authenticated;
grant select, insert, update, delete on public.professional_profile, public.website_content to authenticated;

revoke all on public.professional_profile, public.website_content from anon;
revoke update, delete on public.website_releases from anon, authenticated;

notify pgrst, 'reload schema';
