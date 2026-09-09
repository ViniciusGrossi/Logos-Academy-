begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(18);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  (md5('admissions-admin-auth')::uuid, 'authenticated', 'authenticated', 'admissions-admin@example.test', '{}', '{}'),
  (md5('admissions-student-auth')::uuid, 'authenticated', 'authenticated', 'admissions-student@example.test', '{}', '{}'),
  (md5('admissions-tenant-b-admin-auth')::uuid, 'authenticated', 'authenticated', 'admissions-tenant-b-admin@example.test', '{}', '{}');

insert into tenants (id, tenant_id, name, slug) values
  (md5('admissions-tenant-a')::uuid, md5('admissions-tenant-a')::uuid, 'Admissions tenant A', 'admissions-tenant-a'),
  (md5('admissions-tenant-b')::uuid, md5('admissions-tenant-b')::uuid, 'Admissions tenant B', 'admissions-tenant-b');
insert into users (id, tenant_id, auth_user_id, email_encrypted, display_name) values
  (md5('admissions-admin-user')::uuid, md5('admissions-tenant-a')::uuid, md5('admissions-admin-auth')::uuid, extensions.pgp_sym_encrypt('admissions-admin@example.test','test-key'), 'Admin A'),
  (md5('admissions-tenant-b-admin-user')::uuid, md5('admissions-tenant-b')::uuid, md5('admissions-tenant-b-admin-auth')::uuid, extensions.pgp_sym_encrypt('admissions-tenant-b-admin@example.test','test-key'), 'Admin B');
insert into tenant_memberships (tenant_id, user_id, role) values
  (md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid, 'admin'),
  (md5('admissions-tenant-b')::uuid, md5('admissions-tenant-b-admin-user')::uuid, 'admin');
insert into curricula (id, tenant_id, name, version, status) values
  (md5('admissions-curriculum')::uuid, md5('admissions-tenant-a')::uuid, 'Admissions curriculum', 'v1', 'active');
insert into cycles (id, tenant_id, curriculum_id, position, title, project_title) values
  (md5('admissions-cycle')::uuid, md5('admissions-tenant-a')::uuid, md5('admissions-curriculum')::uuid, 1, 'Cycle', 'Project');
insert into lesson_templates (tenant_id, cycle_id, position, title, objective, reference_content, estimated_activity_minutes)
select md5('admissions-tenant-a')::uuid, md5('admissions-cycle')::uuid, n, 'Lesson ' || n, 'Objective ' || n, 'Reference ' || n, 30
from generate_series(1, 16) n;

select ok(has_function_privilege('service_role', 'logos_academy.claim_student_invitation(uuid,uuid,text,bytea)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.claim_student_invitation(uuid,uuid,text,bytea)', 'execute'),
  'invitation claim is service-role only');
select ok(has_function_privilege('service_role', 'logos_academy.create_class_with_sessions(uuid,uuid,text,uuid,jsonb,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.create_class_with_sessions(uuid,uuid,text,uuid,jsonb,uuid)', 'execute'),
  'class RPC is service-role only');
select ok(not has_function_privilege('authenticated', 'logos_academy.prepare_invited_student(uuid,uuid,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,uuid)', 'execute'),
  'unkeyed invitation RPC is unavailable to authenticated');

set local role service_role;
select lives_ok($$select logos_academy.create_class_with_sessions(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
  'Class A', md5('admissions-curriculum')::uuid,
  '{"startsOn":"2026-09-07","weekdays":[1,3],"startsAtLocal":["18:00","19:00"],"durationMinutes":90,"timezone":"America/Sao_Paulo"}'::jsonb,
  md5('admissions-class-request')::uuid)$$, 'tenant admin creates class transactionally');
select is((select count(*)::integer from sessions where class_id = (select id from classes where name = 'Class A')), 16,
  'class materializes sixteen sessions');
select is((select count(distinct lesson_template_id)::integer from sessions where class_id = (select id from classes where name = 'Class A')), 16,
  'class sessions follow each curriculum lesson once');
select throws_ok($$select logos_academy.create_class_with_sessions(md5('admissions-tenant-a')::uuid, md5('admissions-tenant-b-admin-user')::uuid,
  'Wrong tenant', md5('admissions-curriculum')::uuid,
  '{"startsOn":"2026-09-07","weekdays":[1,3],"startsAtLocal":["18:00","19:00"],"durationMinutes":90,"timezone":"America/Sao_Paulo"}'::jsonb,
  md5('admissions-wrong-tenant')::uuid)$$, '42501', 'tenant admin required', 'tenant B actor is denied');

select is((logos_academy.claim_student_invitation(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid, 'invite-1', digest('payload-1','sha256'))->>'state'),
  'claimed', 'claim reserves idempotency key without a domain row');
select throws_ok($$select logos_academy.claim_student_invitation(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid, 'invite-1', digest('other-payload','sha256'))$$,
  '23505', 'idempotency key payload mismatch', 'same key rejects another payload');
select lives_ok($$select logos_academy.finalize_invited_student(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
  'invite-1', digest('payload-1','sha256'), md5('admissions-student-auth')::uuid, 'student@example.test', 'Student A', '2011-04-12',
  'Guardian A', 'parent', 'guardian@example.test', null, '2026.1', '2026-09-01', true, md5('admissions-curriculum')::uuid, 'class',
  (select id from classes where name = 'Class A'), null, 'test-key', now(), md5('admissions-invite-request')::uuid)$$,
  'finalize creates invited student after Auth adapter work');
select is((select status from enrollments where student_profile_id = (select id from student_profiles where user_id = (select id from users where auth_user_id = md5('admissions-student-auth')::uuid))),
  'invited', 'invited student enrollment remains invited');
select is((select count(*)::integer from guardian_records where student_profile_id = (select id from student_profiles where user_id = (select id from users where auth_user_id = md5('admissions-student-auth')::uuid))),
  1, 'guardian is stored once');
select is((logos_academy.claim_student_invitation(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid, 'invite-1', digest('payload-1','sha256'))->>'created')::boolean,
  true, 'retry receives the completed result before any new Auth action');
select is((logos_academy.finalize_invited_student(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
  'invite-1', digest('payload-1','sha256'), md5('admissions-student-auth')::uuid, 'student@example.test', 'Student A', '2011-04-12',
  'Guardian A', 'parent', 'guardian@example.test', null, '2026.1', '2026-09-01', true, md5('admissions-curriculum')::uuid, 'class',
  (select id from classes where name = 'Class A'), null, 'test-key', now(), md5('admissions-invite-request')::uuid)->>'enrollmentId'),
  (select id::text from enrollments where student_profile_id = (select id from student_profiles where user_id = (select id from users where auth_user_id = md5('admissions-student-auth')::uuid))),
  'finalize retry returns original enrollment without duplication');
reset role;
insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
select md5('admissions-capacity-auth-' || n)::uuid, 'authenticated', 'authenticated', 'admissions-capacity-' || n || '@example.test', '{}', '{}'
from generate_series(2, 7) n;
insert into users (id, tenant_id, auth_user_id, email_encrypted, display_name)
select md5('admissions-capacity-user-' || n)::uuid, md5('admissions-tenant-a')::uuid, md5('admissions-capacity-auth-' || n)::uuid,
  extensions.pgp_sym_encrypt('admissions-capacity-' || n || '@example.test', 'test-key'), 'Capacity ' || n
from generate_series(2, 7) n;
insert into student_profiles (tenant_id, user_id, birth_date_encrypted)
select md5('admissions-tenant-a')::uuid, md5('admissions-capacity-user-' || n)::uuid, extensions.pgp_sym_encrypt('2011-04-12', 'test-key')
from generate_series(2, 7) n;
set local role service_role;
select lives_ok($outer$do $inner$
declare n integer;
begin
  for n in 2..6 loop
    perform logos_academy.create_admission_enrollment(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
      (select id from logos_academy.student_profiles where user_id = md5('admissions-capacity-user-' || n)::uuid), md5('admissions-curriculum')::uuid,
      'class', (select id from logos_academy.classes where name = 'Class A'), null, 'active', md5('admissions-capacity-request-' || n)::uuid);
  end loop;
end $inner$;$outer$, 'six active-or-invited placements fit in one class');
select is((select count(*)::integer from enrollments where class_id = (select id from classes where name = 'Class A') and status in ('invited','active','paused')),
  6, 'class capacity counts invited and active placements');
select throws_ok($$select logos_academy.create_admission_enrollment(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
  (select id from student_profiles where user_id = md5('admissions-capacity-user-7')::uuid), md5('admissions-curriculum')::uuid,
  'class', (select id from classes where name = 'Class A'), null, 'active', md5('admissions-capacity-request-7')::uuid)$$,
  '23514', 'class capacity of six enrollments exceeded', 'seventh placement is rejected');
select throws_ok($$select logos_academy.create_admission_enrollment(md5('admissions-tenant-a')::uuid, md5('admissions-admin-user')::uuid,
  (select id from student_profiles where user_id = (select id from users where auth_user_id = md5('admissions-student-auth')::uuid)), md5('admissions-curriculum')::uuid,
  'individual', null, null, 'active', md5('admissions-invalid-individual')::uuid)$$,
  '22023', 'invalid individual placement', 'individual enrollment requires its own schedule');

reset role;
select * from finish();
rollback;
