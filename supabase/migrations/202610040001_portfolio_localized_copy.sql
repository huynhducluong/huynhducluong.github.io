-- Store Portfolio cover and narrative copy in the same EN/VI shape used by the Website CMS.
-- Existing English text is preserved; Vietnamese copy can be completed in each Portfolio draft.

alter table public.portfolio_content
  alter column kicker drop default,
  alter column about_kicker drop default,
  alter column about_heading drop default,
  alter column closing_kicker drop default,
  alter column closing_heading drop default,
  alter column closing_text drop default;

alter table public.portfolio_content
  alter column kicker type jsonb
    using jsonb_build_object('en', coalesce(kicker, ''), 'vi', ''),
  alter column about_kicker type jsonb
    using jsonb_build_object('en', coalesce(about_kicker, ''), 'vi', ''),
  alter column about_heading type jsonb
    using jsonb_build_object('en', coalesce(about_heading, ''), 'vi', ''),
  alter column closing_kicker type jsonb
    using jsonb_build_object('en', coalesce(closing_kicker, ''), 'vi', ''),
  alter column closing_heading type jsonb
    using jsonb_build_object('en', coalesce(closing_heading, ''), 'vi', ''),
  alter column closing_text type jsonb
    using jsonb_build_object('en', coalesce(closing_text, ''), 'vi', '');

alter table public.portfolio_content
  alter column kicker set default '{"en":"BIM · Infrastructure · Automation","vi":"BIM · Hạ tầng · Tự động hóa"}'::jsonb,
  alter column about_kicker set default '{"en":"About me","vi":"Về tôi"}'::jsonb,
  alter column about_heading set default '{"en":"Coordination built on clear information and practical automation.","vi":"Điều phối được xây dựng trên thông tin rõ ràng và tự động hóa thực tiễn."}'::jsonb,
  alter column closing_kicker set default '{"en":"Thank you","vi":"Cảm ơn"}'::jsonb,
  alter column closing_heading set default '{"en":"Let''s build clearer BIM workflows.","vi":"Hãy cùng xây dựng các quy trình BIM rõ ràng hơn."}'::jsonb,
  alter column closing_text set default '{"en":"Infrastructure BIM coordination · Model quality · Automation","vi":"Điều phối BIM hạ tầng · Chất lượng mô hình · Tự động hóa"}'::jsonb;

notify pgrst, 'reload schema';
