begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(8);

insert into tenants(id,tenant_id,name,slug) values (md5('attendance-tenant')::uuid,md5('attendance-tenant')::uuid,'Attendance tenant','attendance-tenant');
insert into users(id,tenant_id,auth_user_id,email_encrypted,display_name) values
  (md5('attendance-admin')::uuid,md5('attendance-tenant')::uuid,md5('attendance-admin-auth')::uuid,extensions.pgp_sym_encrypt('admin@test','test-key'),'Admin'),
  (md5('attendance-student')::uuid,md5('attendance-tenant')::uuid,md5('attendance-student-auth')::uuid,extensions.pgp_sym_encrypt('student@test','test-key'),'Student');
insert into tenant_memberships(tenant_id,user_id,role) values (md5('attendance-tenant')::uuid,md5('attendance-admin')::uuid,'admin'),(md5('attendance-tenant')::uuid,md5('attendance-student')::uuid,'student');
insert into student_profiles(id,tenant_id,user_id,birth_date_encrypted) values (md5('attendance-profile')::uuid,md5('attendance-tenant')::uuid,md5('attendance-student')::uuid,extensions.pgp_sym_encrypt('2012-01-01','test-key'));
insert into curricula(id,tenant_id,name,version,status) values (md5('attendance-curriculum')::uuid,md5('attendance-tenant')::uuid,'Attendance','v1','active');
insert into cycles(id,tenant_id,curriculum_id,position,title,project_title) values (md5('attendance-cycle')::uuid,md5('attendance-tenant')::uuid,md5('attendance-curriculum')::uuid,1,'Cycle','Project');
insert into lesson_templates(id,tenant_id,cycle_id,position,title,objective,reference_content,estimated_activity_minutes)
select md5('attendance-lesson-'||n)::uuid,md5('attendance-tenant')::uuid,md5('attendance-cycle')::uuid,n,'Lesson '||n,'Objective','Reference',30 from generate_series(1,5) n;
insert into classes(id,tenant_id,name,curriculum_id,starts_on,status) values (md5('attendance-class')::uuid,md5('attendance-tenant')::uuid,'Class',md5('attendance-curriculum')::uuid,'2026-09-01','active');
insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at) values (md5('attendance-enrollment')::uuid,md5('attendance-tenant')::uuid,md5('attendance-profile')::uuid,md5('attendance-curriculum')::uuid,'class',md5('attendance-class')::uuid,'active',now(),now());
insert into sessions(id,tenant_id,class_id,lesson_template_id,starts_at,ends_at,status)
select md5('attendance-session-'||n)::uuid,md5('attendance-tenant')::uuid,md5('attendance-class')::uuid,md5('attendance-lesson-'||case when n=3 then 5 else n end)::uuid,('2026-09-0'||n||' 14:00:00+00')::timestamptz,('2026-09-0'||n||' 15:00:00+00')::timestamptz,'completed' from generate_series(1,3) n;

select ok(has_function_privilege('service_role','logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer)','execute') and not has_function_privilege('authenticated','logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer)','execute'),'attendance page is server-only');
set local role service_role;
select is((logos_academy.record_attendance(md5('attendance-admin')::uuid,md5('attendance-session-1')::uuid,jsonb_build_array(jsonb_build_object('enrollmentId',md5('attendance-enrollment')::uuid,'status','absent','privateNote','private context')),'test-key',md5('attendance-r1')::uuid)->'entries'->0->>'studentName'),'Student','admin attendance response contains student name');
select is((logos_academy.record_attendance(md5('attendance-admin')::uuid,md5('attendance-session-2')::uuid,jsonb_build_array(jsonb_build_object('enrollmentId',md5('attendance-enrollment')::uuid,'status','present')),'test-key',md5('attendance-r2')::uuid)->'entries'->0->>'privateNote'),null,'absence note does not leak across session');
select lives_ok($$select logos_academy.record_attendance(md5('attendance-admin')::uuid,md5('attendance-session-3')::uuid,jsonb_build_array(jsonb_build_object('enrollmentId',md5('attendance-enrollment')::uuid,'status','present')),'test-key',md5('attendance-r3')::uuid)$$,'third attendance recorded');
select ok((logos_academy.student_attendance_page(md5('attendance-tenant')::uuid,md5('attendance-student')::uuid,md5('attendance-enrollment')::uuid,null,1)->>'nextCursor') is not null,'first page has opaque cursor');
select is((logos_academy.student_attendance_page(md5('attendance-tenant')::uuid,md5('attendance-student')::uuid,md5('attendance-enrollment')::uuid,null,1)->'items'->0->>'privateNote'),null,'student page omits private note');
select is((logos_academy.record_makeup(md5('attendance-admin')::uuid,(select id from attendance_records where session_id=md5('attendance-session-1')::uuid),null,'2026-09-04 14:00:00+00',null,'test-key',md5('attendance-makeup')::uuid)->'makeup'->>'completedAt'),'2026-09-04T14:00:00+00:00','makeup returns complete attendance DTO');
select is((logos_academy.admin_update_session(md5('attendance-tenant')::uuid,md5('attendance-admin')::uuid,md5('attendance-session-3')::uuid,null,null,'rescheduled')->>'lessonPosition')::integer,5,'session update preserves global lesson position after filtering target lesson');
reset role;
select * from finish();
rollback;
