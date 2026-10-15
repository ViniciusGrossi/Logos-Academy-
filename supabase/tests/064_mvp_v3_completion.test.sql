begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(13);
select set_config('test.mvp_tenant',(select tenant_id::text from curricula where id=md5('logos-academy-explorer-v3-curriculum')::uuid),true);
insert into auth.users(id,aud,role,email) values
(md5('mvp064-admin-auth')::uuid,'authenticated','authenticated','mvp064-admin@fixture.test'),
(md5('mvp064-student-auth')::uuid,'authenticated','authenticated','mvp064-student@fixture.test');
insert into users(id,tenant_id,auth_user_id,email_encrypted,display_name) values
(md5('mvp064-admin')::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin-auth')::uuid,extensions.pgp_sym_encrypt('mvp064-admin@fixture.test','test-key'),'Admin fixture'),
(md5('mvp064-student')::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-student-auth')::uuid,extensions.pgp_sym_encrypt('mvp064-student@fixture.test','test-key'),'Aluno fixture');
insert into tenant_memberships(tenant_id,user_id,role) values (current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin')::uuid,'admin'),(current_setting('test.mvp_tenant')::uuid,md5('mvp064-student')::uuid,'student');
insert into student_profiles(id,tenant_id,user_id,birth_date_encrypted)
values(md5('mvp064-profile')::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-student')::uuid,extensions.pgp_sym_encrypt('2000-01-01','test-key'));
insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,status,invited_at,activated_at)
values(md5('mvp064-enrollment')::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-profile')::uuid,md5('logos-academy-explorer-v3-curriculum')::uuid,'individual','active',now(),now());
insert into sessions(id,tenant_id,enrollment_id,lesson_template_id,starts_at,ends_at,status)
select md5('mvp064-session-'||n)::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-enrollment')::uuid,md5('logos-academy-explorer-v3-lesson-'||n)::uuid,now()-interval '2 days',now()-interval '1 day','completed' from generate_series(1,16)n;
insert into attendance_records(tenant_id,session_id,enrollment_id,status,recorded_by_user_id)
select current_setting('test.mvp_tenant')::uuid,md5('mvp064-session-'||n)::uuid,md5('mvp064-enrollment')::uuid,'present',md5('mvp064-admin')::uuid from generate_series(1,16)n;
insert into activity_assignments(id,tenant_id,enrollment_id,session_id,activity_template_id,status,released_at)
select md5('mvp064-assignment-'||n)::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-enrollment')::uuid,md5('mvp064-session-'||n)::uuid,md5('logos-academy-explorer-v3-activity-'||n)::uuid,'available',now() from generate_series(1,16)n;
insert into submissions(id,tenant_id,activity_assignment_id,version,is_draft,submitted_at)
select md5('mvp064-submission-'||n)::uuid,current_setting('test.mvp_tenant')::uuid,md5('mvp064-assignment-'||n)::uuid,1,false,now() from generate_series(1,16)n;
-- Exercise the existing evidence trigger: approving project days creates four approved projects.
update activity_assignments set status='approved' where enrollment_id=md5('mvp064-enrollment')::uuid;
select is((select max(position)::integer from lesson_templates where cycle_id=md5('logos-academy-explorer-v3-cycle-4')::uuid),4,'fixture is the actual v3 with local lesson positions');
select ok((select 'presentation_incomplete'=any(blockers) from private.completion_snapshot(md5('mvp064-enrollment')::uuid)),'missing presentation blocks completion');
select logos_academy.admin_record_presentation(current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin')::uuid,md5('mvp064-enrollment')::uuid,'demo_day',now(),null,'test-key',gen_random_uuid());
set local role service_role;
select is((logos_academy.admin_completion_check(current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin')::uuid,md5('mvp064-enrollment')::uuid)->>'eligible')::boolean,true,'v3 is eligible with all sixteen attendances, four projects, final reflection and presentation');
reset role;
update attendance_records set status='absent' where enrollment_id=md5('mvp064-enrollment')::uuid and session_id=md5('mvp064-session-1')::uuid;
select ok((select 'attendance_incomplete'=any(blockers) from private.completion_snapshot(md5('mvp064-enrollment')::uuid)),'missing attendance blocks completion');
update attendance_records set status='present' where enrollment_id=md5('mvp064-enrollment')::uuid;
update project_records set deleted_at=now() where enrollment_id=md5('mvp064-enrollment')::uuid and cycle_id=md5('logos-academy-explorer-v3-cycle-1')::uuid;
select ok((select 'projects_incomplete'=any(blockers) from private.completion_snapshot(md5('mvp064-enrollment')::uuid)),'missing project blocks completion');
update project_records set deleted_at=null where enrollment_id=md5('mvp064-enrollment')::uuid;
update activity_assignments set status='submitted' where id=md5('mvp064-assignment-16')::uuid;
select ok((select 'reflection_incomplete'=any(blockers) from private.completion_snapshot(md5('mvp064-enrollment')::uuid)),'final reflection must be approved');
update activity_assignments set status='approved' where id=md5('mvp064-assignment-16')::uuid;
update activity_assignments set status='revision_requested' where id=md5('mvp064-assignment-2')::uuid;
select ok((select 'pending_revisions'=any(blockers) from private.completion_snapshot(md5('mvp064-enrollment')::uuid)),'any pending revision blocks completion');
update activity_assignments set status='approved' where id=md5('mvp064-assignment-2')::uuid;
set local role service_role;
select is((logos_academy.admin_complete_enrollment(current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin')::uuid,md5('mvp064-enrollment')::uuid,gen_random_uuid())->>'eligible')::boolean,true,'authorized completion succeeds on v3');
reset role;
select is((select status from enrollments where id=md5('mvp064-enrollment')::uuid),'completed','enrollment becomes completed');
select is((select count(*)::integer from completion_records where enrollment_id=md5('mvp064-enrollment')::uuid and status='completed'),1,'completion evidence persists');
set local role service_role;
select lives_ok($$select logos_academy.student_projects(current_setting('test.mvp_tenant')::uuid,md5('mvp064-student')::uuid,md5('mvp064-enrollment')::uuid)$$,'completed projects remain readable');
select throws_ok($$select logos_academy.student_save_draft(current_setting('test.mvp_tenant')::uuid,md5('mvp064-student')::uuid,md5('mvp064-assignment-1')::uuid,'[]','test-key')$$,'42501','assignment not available','completed enrollment rejects new drafts');
select throws_ok($$select logos_academy.admin_complete_enrollment(current_setting('test.mvp_tenant')::uuid,md5('mvp064-admin')::uuid,md5('mvp064-enrollment')::uuid,gen_random_uuid())$$,'23505','enrollment is not active','completion cannot be repeated');
reset role;
select * from finish();
rollback;
