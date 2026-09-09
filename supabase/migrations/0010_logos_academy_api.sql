begin;

-- The Academy is isolated from the project's existing public tables.
grant usage on schema logos_academy to authenticated, service_role;
grant select, insert, update, delete on all tables in schema logos_academy to authenticated, service_role;
grant usage, select, update on all sequences in schema logos_academy to authenticated, service_role;
grant execute on all routines in schema logos_academy to service_role;

-- Backend-only operational writes remain unavailable to browser sessions.
revoke insert, update, delete on logos_academy.attendance_records, logos_academy.attendance_private_notes,
  logos_academy.makeup_records, logos_academy.presentation_records, logos_academy.project_records,
  logos_academy.enrollments, logos_academy.activity_assignments from authenticated;

alter default privileges for role postgres in schema logos_academy
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges for role postgres in schema logos_academy
  grant usage, select, update on sequences to authenticated, service_role;
alter default privileges for role postgres in schema logos_academy
  grant execute on routines to service_role;

notify pgrst, 'reload schema';
commit;
