-- Run only after the Auth user exists in Authentication > Users.
-- This lookup is deliberately executed in the trusted SQL editor, never in the browser.
insert into public.portfolio_admins (user_id)
select id
from auth.users
where lower(email) = lower('huynhluong321998@gmail.com')
on conflict (user_id) do nothing;

select user_id, created_at from public.portfolio_admins;
