begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(20);

select throws_ok($$insert into enrollments (tenant_id,student_profile_id,curriculum_id,kind,status,invited_at)
  values ('10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','class','invited',now())$$,
  '23514', null, 'class enrollment requires class_id');
select throws_ok($$insert into sessions (tenant_id,class_id,enrollment_id,lesson_template_id,starts_at,ends_at,status)
  values ('10000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001',md5('academy-a-lesson-2')::uuid,now(),now()+interval '2 hours','scheduled')$$,
  '23514', null, 'session requires exactly one owner');
select throws_ok($$insert into classes (tenant_id,name,curriculum_id,starts_on,status)
  values ('10000000-0000-0000-0000-000000000001','Cross tenant','26000000-0000-0000-0000-000000000001',current_date,'planned')$$,
  '23503', null, 'composite FK rejects cross-tenant association');
select throws_ok($$insert into guardian_records (tenant_id,student_profile_id,name_encrypted,relationship)
  values ('10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001',extensions.pgp_sym_encrypt('Teste','test'),'responsável')$$,
  '23514', null, 'guardian requires email or phone');
select throws_ok($$insert into submissions (tenant_id,activity_assignment_id,version,is_draft,submitted_at)
  values ('10000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001',1,false,now())$$,
  '23505', null, 'submission version is unique per assignment');
select throws_ok($$insert into uploaded_files (id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status)
  values ('1a000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001',
    '1a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','unsafe/path',extensions.pgp_sym_encrypt('arquivo.txt','test'),'text/plain',10,'pending')$$,
  '23514', null, 'storage path must use opaque tenant/student/assignment/file ids');
select throws_ok($$update submissions set submitted_at=now() where id='1b000000-0000-0000-0000-000000000001'$$,
  '42501', 'submitted versions are immutable', 'submitted version is immutable');

insert into reviews (id,tenant_id,submission_id,reviewer_user_id,decision,feedback_encrypted,reviewed_at) values
  ('1f000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','approved',extensions.pgp_sym_encrypt('Bom trabalho','test'),now());
select throws_ok($$update reviews set decision='revision_requested' where id='1f000000-0000-0000-0000-000000000001'$$,
  '42501', 'reviews is append-only', 'published review is append-only');

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
select '00000000-0000-0000-0000-000000000000', md5('capacity-auth-'||n)::uuid, 'authenticated', 'authenticated',
  'capacity-'||n||'@academy.test', extensions.crypt('test',extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from generate_series(1,6) n;
insert into users (id,tenant_id,auth_user_id,email_encrypted,display_name)
select md5('capacity-user-'||n)::uuid, '10000000-0000-0000-0000-000000000001', md5('capacity-auth-'||n)::uuid,
  extensions.pgp_sym_encrypt('capacity-'||n||'@academy.test','test'), 'Capacity '||n from generate_series(1,6) n;
insert into student_profiles (id,tenant_id,user_id,birth_date_encrypted)
select md5('capacity-profile-'||n)::uuid, '10000000-0000-0000-0000-000000000001', md5('capacity-user-'||n)::uuid,
  extensions.pgp_sym_encrypt('2010-01-01','test') from generate_series(1,6) n;
insert into enrollments (tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at)
select '10000000-0000-0000-0000-000000000001', md5('capacity-profile-'||n)::uuid,
  '16000000-0000-0000-0000-000000000001','class','17000000-0000-0000-0000-000000000001','active',now(),now()
from generate_series(1,5) n;
select throws_ok($$insert into enrollments (tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at)
  values ('10000000-0000-0000-0000-000000000001',md5('capacity-profile-6')::uuid,'16000000-0000-0000-0000-000000000001',
    'class','17000000-0000-0000-0000-000000000001','active',now(),now())$$,
  '23514', 'class capacity of six active enrollments exceeded', 'seventh active enrollment is rejected');

update project_records set deleted_at=now() where id=md5('academy-a-project-1')::uuid;
select lives_ok($$insert into project_records (tenant_id,enrollment_id,cycle_id,status)
  values ('10000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001',md5('academy-a-cycle-1')::uuid,'in_progress')$$,
  'soft delete releases active uniqueness without hard deletion');
select is((select count(*)::integer from project_records where enrollment_id='18000000-0000-0000-0000-000000000001' and cycle_id=md5('academy-a-cycle-1')::uuid),2,
  'soft-deleted history remains stored');

update sessions set status='completed' where id=md5('academy-a-session-2')::uuid;
insert into attendance_records (id,tenant_id,session_id,enrollment_id,status,recorded_by_user_id) values
  ('29000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',md5('academy-a-session-2')::uuid,'18000000-0000-0000-0000-000000000001','absent','11000000-0000-0000-0000-000000000001');
insert into makeup_records (tenant_id,attendance_record_id,completed_at,recorded_by_user_id) values
  ('10000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001',now(),'11000000-0000-0000-0000-000000000001');
select is((select status from attendance_records where id='29000000-0000-0000-0000-000000000001'),'absent','makeup preserves original absence');
select is((select count(*)::integer from makeup_records where attendance_record_id='29000000-0000-0000-0000-000000000001' and deleted_at is null),1,'makeup is separate evidence');

insert into curricula (id,tenant_id,name,version,status) values
  ('16000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','Explorer alternativo','2026.2','draft');
select throws_ok($$update classes set curriculum_id='16000000-0000-0000-0000-000000000099' where id='17000000-0000-0000-0000-000000000001'$$,
  '23514', 'class curriculum cannot change with active dependents', 'class curriculum is immutable with active dependents');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
select is((logos_academy.completion_check('18000000-0000-0000-0000-000000000001')->>'eligible')::boolean,false,'completion stays ineligible with missing evidence');
select is((select status from enrollments where id='18000000-0000-0000-0000-000000000001'),'active','ineligible completion check does not mutate enrollment');
select throws_ok($$update enrollments set status='completed', completed_at=now() where id='18000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'direct enrollment completion is rejected');
select throws_ok($$insert into attendance_records (tenant_id,session_id,enrollment_id,status,recorded_by_user_id) values
  ('10000000-0000-0000-0000-000000000001',md5('academy-a-session-1')::uuid,'18000000-0000-0000-0000-000000000001','present','11000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin direct attendance write is denied');
select throws_ok($$update project_records set status='approved', approved_submission_id='1b000000-0000-0000-0000-000000000001', approved_at=now()
  where id=md5('academy-a-project-2')::uuid$$,
  '42501', null, 'admin direct project approval is denied');
select is((select count(*)::integer from pg_policies where schemaname='logos_academy' and policyname in
  ('attendance_records_admin_insert','attendance_records_admin_update','project_records_admin_update','presentation_records_admin_insert')),0,
  'sensitive administrative write policies are removed');
reset role;

select * from finish();
rollback;
