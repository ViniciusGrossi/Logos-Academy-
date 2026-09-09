begin;

-- 0010 exposes the custom schema to PostgREST. Preserve the restrictive
-- operational boundary established in 0008 after those schema-wide grants.
revoke insert, update, delete on logos_academy.attendance_records, logos_academy.attendance_private_notes,
  logos_academy.makeup_records, logos_academy.presentation_records, logos_academy.project_records,
  logos_academy.enrollments, logos_academy.activity_assignments from authenticated;

notify pgrst, 'reload schema';
commit;
