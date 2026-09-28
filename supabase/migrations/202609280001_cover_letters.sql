-- Private Cover Letter workspace. No anonymous access or public seed fallback.
create type public.cover_letter_status as enum ('draft', 'final', 'archived');

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  internal_title text not null default 'Untitled cover letter',
  company_name text not null default '',
  position_title text not null default '',
  recipient_name text not null default '',
  recipient_title text not null default '',
  company_address text not null default '',
  application_date date not null default current_date,
  salutation text not null default 'Dear Hiring Manager,',
  opening_paragraph text not null default '',
  fit_paragraph text not null default '',
  company_paragraph text not null default '',
  closing_paragraph text not null default '',
  sign_off text not null default 'Sincerely,',
  private_notes text not null default '',
  status public.cover_letter_status not null default 'draft',
  theme_id text not null default 'personal-blue',
  theme_primary text not null default '#087fb6' check (theme_primary ~ '^#[0-9A-Fa-f]{6}$'),
  theme_accent text not null default '#14a8d6' check (theme_accent ~ '^#[0-9A-Fa-f]{6}$'),
  sender_snapshot jsonb,
  template_version text not null default 'cover-letter-v1',
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cover_letters_finalized_state check (
    (status = 'draft' and finalized_at is null)
    or (status in ('final', 'archived') and finalized_at is not null)
  )
);

create table public.cover_letter_projects (
  cover_letter_id uuid not null references public.cover_letters(id) on delete cascade,
  project_id text not null references public.projects(id) on delete restrict,
  display_order integer not null default 100,
  primary key (cover_letter_id, project_id)
);

create table public.cover_letter_tools (
  cover_letter_id uuid not null references public.cover_letters(id) on delete cascade,
  tool_id text not null references public.automation_tools(id) on delete restrict,
  display_order integer not null default 100,
  primary key (cover_letter_id, tool_id)
);

create trigger cover_letters_set_updated_at before update on public.cover_letters
for each row execute function public.set_updated_at();

create or replace function public.protect_final_cover_letter()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'archived' then
    raise exception 'Archived cover letters are immutable';
  end if;
  if old.status = 'final' then
    if new.status <> 'archived' then
      raise exception 'Final cover letters may only be archived';
    end if;
    if (to_jsonb(new) - array['status', 'updated_at']) is distinct from
       (to_jsonb(old) - array['status', 'updated_at']) then
      raise exception 'Final cover letter content is immutable';
    end if;
  end if;
  return new;
end;
$$;

create trigger cover_letters_protect_final before update on public.cover_letters
for each row execute function public.protect_final_cover_letter();

alter table public.cover_letters enable row level security;
alter table public.cover_letter_projects enable row level security;
alter table public.cover_letter_tools enable row level security;

create policy "admins read cover letters" on public.cover_letters for select
to authenticated using (public.is_portfolio_admin());
create policy "admins create cover letters" on public.cover_letters for insert
to authenticated with check (public.is_portfolio_admin());
create policy "admins update cover letters" on public.cover_letters for update
to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "admins delete draft cover letters" on public.cover_letters for delete
to authenticated using (public.is_portfolio_admin() and status = 'draft');

create policy "admins read cover letter projects" on public.cover_letter_projects for select
to authenticated using (public.is_portfolio_admin());
create policy "admins add draft cover letter projects" on public.cover_letter_projects for insert
to authenticated with check (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));
create policy "admins update draft cover letter projects" on public.cover_letter_projects for update
to authenticated using (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'))
with check (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));
create policy "admins delete draft cover letter projects" on public.cover_letter_projects for delete
to authenticated using (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));

create policy "admins read cover letter tools" on public.cover_letter_tools for select
to authenticated using (public.is_portfolio_admin());
create policy "admins add draft cover letter tools" on public.cover_letter_tools for insert
to authenticated with check (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));
create policy "admins update draft cover letter tools" on public.cover_letter_tools for update
to authenticated using (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'))
with check (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));
create policy "admins delete draft cover letter tools" on public.cover_letter_tools for delete
to authenticated using (public.is_portfolio_admin() and exists (select 1 from public.cover_letters where id = cover_letter_id and status = 'draft'));

revoke all on public.cover_letters, public.cover_letter_projects, public.cover_letter_tools from anon;
grant select, insert, update, delete on public.cover_letters, public.cover_letter_projects, public.cover_letter_tools to authenticated;
