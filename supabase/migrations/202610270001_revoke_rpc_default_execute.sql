-- Remove EXECUTE privileges inherited from Supabase default privileges.
-- Supabase grants EXECUTE on new public functions directly to anon and
-- authenticated, so the earlier `revoke all ... from public` statements did not
-- remove those grants. Apply after 202610150002_professional_credential_order.sql.

-- Internal helper: only called inside the cover letter draft functions.
revoke execute on function public.replace_cover_letter_evidence(uuid, text[], text[]) from anon, authenticated;

-- Service-role only: used by the purge-admin-trash Edge Function.
revoke execute on function public.verify_admin_trash_purge_secret(text) from anon, authenticated;
revoke execute on function public.admin_trash_cron_health() from anon, authenticated;
grant execute on function public.verify_admin_trash_purge_secret(text) to service_role;
grant execute on function public.admin_trash_cron_health() to service_role;

-- Admin RPCs: each one checks is_portfolio_admin(), and anon never needs them.
revoke execute on function public.admin_schema_health() from anon;
revoke execute on function public.create_cover_letter_draft(jsonb, text[], text[]) from anon;
revoke execute on function public.finalize_cover_letter_draft(uuid, jsonb, text[], text[], jsonb) from anon;
revoke execute on function public.move_admin_item_to_trash(text, text) from anon;
revoke execute on function public.publish_profile_document(uuid, text, jsonb) from anon;
revoke execute on function public.publish_website(text, jsonb) from anon;
revoke execute on function public.purge_admin_item(text, text) from anon;
revoke execute on function public.release_references_storage_path(text) from anon;
revoke execute on function public.reorder_admin_content(text, text[]) from anon;
revoke execute on function public.reorder_admin_media(text, uuid[]) from anon;
revoke execute on function public.restore_admin_item_from_trash(text, text) from anon;
revoke execute on function public.save_cover_letter_draft(uuid, jsonb, text[], text[]) from anon;
revoke execute on function public.save_professional_profile(jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
revoke execute on function public.set_project_image_cover(uuid) from anon;
revoke execute on function public.set_tool_image_cover(uuid) from anon;

notify pgrst, 'reload schema';
