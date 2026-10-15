begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(16);
-- Reproduce local positions 1..4 per cycle, including global lessons 9 and 16.
update lesson_templates set position=((position-1)%4)+1 where tenant_id='10000000-0000-0000-0000-000000000001';
update sessions set status='cancelled' where tenant_id='10000000-0000-0000-0000-000000000001';
update sessions set status='scheduled',starts_at=now()+interval '1 day',ends_at=now()+interval '1 day 1 hour' where id=md5('academy-a-session-9')::uuid;
update sessions set status='rescheduled',starts_at=now()+interval '2 days',ends_at=now()+interval '2 days 1 hour' where id=md5('academy-a-session-16')::uuid;
update sessions set status='rescheduled',starts_at=now()-interval '2 days',ends_at=now()-interval '2 days'+interval '1 hour' where id=md5('academy-a-session-2')::uuid;
update sessions set starts_at=now()+interval '3 days',ends_at=now()+interval '3 days 1 hour' where id=md5('academy-a-session-4')::uuid;
insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,status,invited_at,activated_at)
values(md5('mvp069-individual')::uuid,'10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','individual','active',now(),now());
insert into sessions(id,tenant_id,enrollment_id,lesson_template_id,starts_at,ends_at,status)
values(md5('mvp069-individual-13')::uuid,'10000000-0000-0000-0000-000000000001',md5('mvp069-individual')::uuid,md5('academy-a-lesson-13')::uuid,now()+interval '3 days',now()+interval '3 days 1 hour','rescheduled');
insert into cycles(id,tenant_id,curriculum_id,position,title,project_title)
values(md5('mvp069-cycle-b')::uuid,'20000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001',1,'Cycle B','Project B');
insert into lesson_templates(id,tenant_id,cycle_id,position,title,objective,reference_content,estimated_activity_minutes)
values(md5('mvp069-lesson-b')::uuid,'20000000-0000-0000-0000-000000000001',md5('mvp069-cycle-b')::uuid,1,'Lesson B','Objective B','Reference B',30);
insert into sessions(id,tenant_id,class_id,lesson_template_id,starts_at,ends_at,status)
values(md5('mvp069-session-b')::uuid,'20000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001',md5('mvp069-lesson-b')::uuid,now()+interval '1 hour',now()+interval '2 hours','scheduled');
set local role service_role;
select results_eq($$select (item->>'lessonPosition')::integer from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only','17000000-0000-0000-0000-000000000001')->'upcomingSessions') item$$,$$values(9),(16)$$,'dashboard labels global lesson 9/16 instead of local 1/4');
select is((select item->>'status' from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions') item where item->>'id'=md5('academy-a-session-16')::uuid::text),'rescheduled','future rescheduled meeting is included');
select is((select count(*)::integer from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions') item where item->>'id'=md5('academy-a-session-4')::uuid::text),0,'future cancelled meeting is excluded');
select is((select count(*)::integer from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions') item where item->>'id'=md5('academy-a-session-2')::uuid::text),0,'past rescheduled meeting is excluded');
select is(jsonb_array_length(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions'),3,'unfiltered dashboard includes class and individual sessions');
select is((select (item->>'lessonPosition')::integer from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions') item where item->>'id'=md5('mvp069-individual-13')::uuid::text),13,'individual rescheduled lesson also has global label');
select is(jsonb_array_length(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only','17000000-0000-0000-0000-000000000001')->'upcomingSessions'),2,'class filter excludes unrelated individual sessions');
select is((select count(*)::integer from jsonb_array_elements(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions') item where item->>'id'=md5('mvp069-session-b')::uuid::text),0,'tenant A upcoming list never includes tenant B');
select is(jsonb_array_length(logos_academy.admin_dashboard('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions'),1,'tenant B sees its own future meeting');
select throws_ok($$select logos_academy.admin_dashboard('20000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)$$,'42501','tenant admin required','tenant A admin cannot request tenant B dashboard');
select throws_ok($$select logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only','27000000-0000-0000-0000-000000000001')$$,'42501','class unavailable','foreign class filter is rejected');
select is((logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->>'awaitingReviewCount')::integer,1,'pending review indicator is preserved');
select is((logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->>'deliveryApprovalRate')::numeric,0::numeric,'empty review rate indicator is preserved');
reset role;
insert into sessions(id,tenant_id,enrollment_id,lesson_template_id,starts_at,ends_at,status)
select md5('mvp069-extra-'||n)::uuid,'10000000-0000-0000-0000-000000000001',md5('mvp069-individual')::uuid,md5('academy-a-lesson-'||n)::uuid,now()+n*interval '10 days',now()+n*interval '10 days'+interval '1 hour','scheduled' from generate_series(1,6)n;
set local role service_role;
select is(jsonb_array_length(logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)->'upcomingSessions'),5,'upcoming section keeps its five-meeting limit');
reset role;
set local role authenticated;
select throws_ok($$select logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)$$,'42501',null,'authenticated cannot invoke administrative dashboard directly');
reset role;
set local role anon;
select throws_ok($$select logos_academy.admin_dashboard('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','local-seed-only',null)$$,'42501',null,'anon cannot invoke administrative dashboard');
reset role;
select * from finish();
rollback;
