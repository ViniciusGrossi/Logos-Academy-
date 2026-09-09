begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(21);

select ok(exists(select 1 from storage.buckets where id='submissions' and public is false), 'submissions bucket is private');
select ok(not has_function_privilege('authenticated', 'private.decrypt_pii(uuid,bytea,text)', 'execute'), 'authenticated cannot execute decrypt_pii');
select ok(has_function_privilege('service_role', 'logos_academy.read_guardian_record(uuid,uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.read_guardian_record(uuid,uuid,text)', 'execute'), 'guardian DTO RPC is service-role only');
select ok(has_function_privilege('service_role', 'logos_academy.approve_project(uuid,uuid,uuid,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.approve_project(uuid,uuid,uuid,uuid)', 'execute'), 'project approval RPC is service-role only');

update sessions set status='completed' where id=md5('academy-a-session-2')::uuid;
insert into attendance_records (id,tenant_id,session_id,enrollment_id,status,recorded_by_user_id)
values ('39000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',md5('academy-a-session-2')::uuid,
  '18000000-0000-0000-0000-000000000001','absent','11000000-0000-0000-0000-000000000001');

set local role service_role;
select is((logos_academy.read_guardian_record('11000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','local-seed-only')->>'name'),
  'Marina Monteiro', 'backend-only guardian DTO decrypts for tenant admin');
select throws_ok($$select logos_academy.read_guardian_record('21000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','local-seed-only')$$,
  '42501', 'tenant admin required', 'guardian DTO rejects actor from another tenant');

select lives_ok($$select logos_academy.record_attendance('11000000-0000-0000-0000-000000000001',md5('academy-a-session-1')::uuid,
  '[{"enrollmentId":"18000000-0000-0000-0000-000000000001","status":"present"}]'::jsonb,'test','31000000-0000-0000-0000-000000000001')$$,
  'record_attendance succeeds for tenant admin');
select throws_ok($$select logos_academy.record_attendance('21000000-0000-0000-0000-000000000001',md5('academy-a-session-1')::uuid,
  '[{"enrollmentId":"18000000-0000-0000-0000-000000000001","status":"present"}]'::jsonb,'test','31000000-0000-0000-0000-000000000002')$$,
  '42501', 'tenant admin required', 'record_attendance rejects tenant B actor');
select ok(exists(select 1 from audit_events where request_id='31000000-0000-0000-0000-000000000001' and action='attendance.recorded'), 'attendance RPC writes audit event');

select lives_ok($$select logos_academy.record_makeup('11000000-0000-0000-0000-000000000001','39000000-0000-0000-0000-000000000001',null,now(),'','test','32000000-0000-0000-0000-000000000001')$$,
  'record_makeup succeeds for tenant admin');
select throws_ok($$select logos_academy.record_makeup('21000000-0000-0000-0000-000000000001','39000000-0000-0000-0000-000000000001',null,now(),'','test','32000000-0000-0000-0000-000000000002')$$,
  '42501', 'tenant admin required', 'record_makeup rejects tenant B actor');
select ok(exists(select 1 from audit_events where request_id='32000000-0000-0000-0000-000000000001' and action='attendance.makeup_recorded'), 'makeup RPC writes audit event');

select lives_ok($$select logos_academy.record_presentation('11000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','demo_day',now(),'','test','33000000-0000-0000-0000-000000000001')$$,
  'record_presentation succeeds for tenant admin');
select throws_ok($$select logos_academy.record_presentation('21000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','demo_day',now(),'','test','33000000-0000-0000-0000-000000000002')$$,
  '42501', 'tenant admin required', 'record_presentation rejects tenant B actor');
select ok(exists(select 1 from audit_events where request_id='33000000-0000-0000-0000-000000000001' and action='presentation.recorded'), 'presentation RPC writes audit event');

select lives_ok($$select logos_academy.release_session_assignments('11000000-0000-0000-0000-000000000001',md5('academy-a-session-2')::uuid,
  array['18000000-0000-0000-0000-000000000001'::uuid],now()+interval '1 day','', '34000000-0000-0000-0000-000000000001')$$,
  'release_session_assignments succeeds for tenant admin');
select throws_ok($$select logos_academy.release_session_assignments('21000000-0000-0000-0000-000000000001',md5('academy-a-session-2')::uuid,
  array['18000000-0000-0000-0000-000000000001'::uuid],now()+interval '1 day','', '34000000-0000-0000-0000-000000000002')$$,
  '42501', 'tenant admin required', 'release_session_assignments rejects tenant B actor');
select ok(exists(select 1 from audit_events where request_id='34000000-0000-0000-0000-000000000001' and action='assignment.released'), 'release RPC writes audit event');

reset role;
update activity_assignments set status='approved' where id='1a000000-0000-0000-0000-000000000001';
set local role service_role;
select throws_ok($$select logos_academy.approve_project('21000000-0000-0000-0000-000000000001',md5('academy-a-project-1')::uuid,
  '1b000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001')$$,
  '42501', 'tenant admin required', 'approve_project rejects tenant B actor');
select is((logos_academy.approve_project('11000000-0000-0000-0000-000000000001',md5('academy-a-project-1')::uuid,
  '1b000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000002')->>'status'),'approved', 'approve_project records authorized evidence');
select ok(exists(select 1 from audit_events where request_id='35000000-0000-0000-0000-000000000002' and action='project.approved'), 'project approval writes audit event');

reset role;
select * from finish();
rollback;
