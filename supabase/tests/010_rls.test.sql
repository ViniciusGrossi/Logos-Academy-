begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(21);

insert into uploaded_files (id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status)
values ('1a000000-0000-0000-0000-000000000098','10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001',
  '1a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/1a000000-0000-0000-0000-000000000001/1a000000-0000-0000-0000-000000000098',
  extensions.pgp_sym_encrypt('evidencia.txt','test'),'text/plain',10,'ready');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
select results_eq($$select id from classes order by id$$,
  $$values ('17000000-0000-0000-0000-000000000001'::uuid)$$, 'admin A SELECT sees only tenant A');
select is((select count(*)::integer from classes where tenant_id='20000000-0000-0000-0000-000000000001'),0,'admin A cannot SELECT tenant B');
select lives_ok($$insert into classes (id,tenant_id,name,curriculum_id,starts_on,status) values
  ('17000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','Turma RLS','16000000-0000-0000-0000-000000000001','2026-10-01','planned')$$,
  'admin A can INSERT in tenant A');
select throws_ok($$insert into classes (id,tenant_id,name,curriculum_id,starts_on,status) values
  ('27000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000001','Ataque','26000000-0000-0000-0000-000000000001','2026-10-01','planned')$$,
  '42501', null, 'admin A cannot INSERT in tenant B');
select lives_ok($$update classes set name='Turma RLS atualizada' where id='17000000-0000-0000-0000-000000000099'$$,
  'admin A can UPDATE in tenant A');
select results_eq($$update classes set name='Ataque' where id='27000000-0000-0000-0000-000000000001' returning id$$,
  $$select id from classes where false$$, 'admin A cannot UPDATE tenant B');
select results_eq($$delete from classes where id='17000000-0000-0000-0000-000000000099' returning id$$,
  $$select id from classes where false$$, 'hard DELETE is denied even in own tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
select results_eq($$select id from student_profiles order by id$$,
  $$values ('13000000-0000-0000-0000-000000000001'::uuid)$$, 'student A SELECT sees own profile');
select is((select count(*)::integer from users where tenant_id='20000000-0000-0000-0000-000000000001'),0,'student A cannot SELECT tenant B user');
select is((select count(*)::integer from guardian_records),0,'student cannot SELECT guardian PII table');
select is((select count(*)::integer from attendance_private_notes),0,'student cannot SELECT private attendance notes');
select results_eq($$select slug from concepts order by slug$$,
  $$values ('pensamento-computacional'::text)$$, 'student sees released concept but not future concept');
select is((select count(*)::integer from uploaded_files where id='1a000000-0000-0000-0000-000000000098'),1,'student A can SELECT own file metadata');
select lives_ok($$update users set display_name='Lia M.' where id='11000000-0000-0000-0000-000000000002'$$,
  'student can UPDATE own display name');
select throws_ok($$update users set access_enabled=false where id='11000000-0000-0000-0000-000000000002'$$,
  '42501', 'only display_name is self-service editable', 'student cannot escalate sensitive user UPDATE');
select results_eq($$update users set display_name='Ataque' where id='21000000-0000-0000-0000-000000000002' returning id$$,
  $$select id from users where false$$, 'student cannot UPDATE tenant B');
select throws_ok($$insert into submissions (id,tenant_id,activity_assignment_id,version,is_draft) values
  ('1b000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001',2,true)$$,
  '42501', null, 'student cannot INSERT using another tenant_id');
select results_eq($$delete from users where id='11000000-0000-0000-0000-000000000002' returning id$$,
  $$select id from users where false$$, 'student DELETE is denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
select results_eq($$select id from classes order by id$$,
  $$values ('27000000-0000-0000-0000-000000000001'::uuid)$$, 'admin B SELECT sees only tenant B');
select is((select count(*)::integer from classes where tenant_id='10000000-0000-0000-0000-000000000001'),0,'admin B cannot SELECT tenant A');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from uploaded_files where id='1a000000-0000-0000-0000-000000000098'),0,'student B cannot SELECT student A file metadata');
reset role;

select * from finish();
rollback;
