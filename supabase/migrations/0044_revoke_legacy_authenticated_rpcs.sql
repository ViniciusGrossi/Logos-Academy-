begin;

-- The HTTP layer invokes the server-only replacements. Keeping these legacy
-- SECURITY DEFINER functions callable from PostgREST would bypass validation,
-- idempotency and audit boundaries.
revoke all on function logos_academy.complete_enrollment(uuid,uuid) from authenticated;
revoke all on function logos_academy.completion_check(uuid) from authenticated;
revoke all on function logos_academy.finalize_uploaded_file(uuid,uuid) from authenticated;
revoke all on function logos_academy.submit_activity(uuid,uuid,uuid) from authenticated;

notify pgrst,'reload schema';

commit;
