begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(8);

insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
  (md5('review58-admin-auth')::uuid,'authenticated','authenticated','review58-admin@test','{}','{}'),
  (md5('review58-other-auth')::uuid,'authenticated','authenticated','review58-other@test','{}','{}'),
  (md5('review58-student-1-auth')::uuid,'authenticated','authenticated','review58-student-1@test','{}','{}'),
  (md5('review58-student-2-auth')::uuid,'authenticated','authenticated','review58-student-2@test','{}','{}');

insert into tenants(id,tenant_id,name,slug) values
  (md5('review58-tenant')::uuid,md5('review58-tenant')::uuid,'Review 58','review-58'),
  (md5('review58-other-tenant')::uuid,md5('review58-other-tenant')::uuid,'Review 58 Other','review-58-other');

insert into users(id,tenant_id,auth_user_id,email_encrypted,display_name) values
  (md5('review58-admin')::uuid,md5('review58-tenant')::uuid,md5('review58-admin-auth')::uuid,extensions.pgp_sym_encrypt('review58-admin@test','test-key'),'Admin Review'),
  (md5('review58-other-admin')::uuid,md5('review58-other-tenant')::uuid,md5('review58-other-auth')::uuid,extensions.pgp_sym_encrypt('review58-other@test','test-key'),'Other Admin'),
  (md5('review58-student-1')::uuid,md5('review58-tenant')::uuid,md5('review58-student-1-auth')::uuid,extensions.pgp_sym_encrypt('review58-student-1@test','test-key'),'Ana Enviou'),
  (md5('review58-student-2')::uuid,md5('review58-tenant')::uuid,md5('review58-student-2-auth')::uuid,extensions.pgp_sym_encrypt('review58-student-2@test','test-key'),'Bia Construindo');

insert into tenant_memberships(tenant_id,user_id,role) values
  (md5('review58-tenant')::uuid,md5('review58-admin')::uuid,'admin'),
  (md5('review58-other-tenant')::uuid,md5('review58-other-admin')::uuid,'admin'),
  (md5('review58-tenant')::uuid,md5('review58-student-1')::uuid,'student'),
  (md5('review58-tenant')::uuid,md5('review58-student-2')::uuid,'student');

insert into student_profiles(id,tenant_id,user_id,birth_date_encrypted) values
  (md5('review58-profile-1')::uuid,md5('review58-tenant')::uuid,md5('review58-student-1')::uuid,extensions.pgp_sym_encrypt('2012-01-01','test-key')),
  (md5('review58-profile-2')::uuid,md5('review58-tenant')::uuid,md5('review58-student-2')::uuid,extensions.pgp_sym_encrypt('2012-02-01','test-key'));

insert into curricula(id,tenant_id,name,version,status) values
  (md5('review58-curriculum')::uuid,md5('review58-tenant')::uuid,'Explorer','v3','active');
insert into cycles(id,tenant_id,curriculum_id,position,title,project_title) values
  (md5('review58-cycle')::uuid,md5('review58-tenant')::uuid,md5('review58-curriculum')::uuid,1,'Assistente','Assistente pessoal');
insert into lesson_templates(id,tenant_id,cycle_id,position,title,objective,reference_content,estimated_activity_minutes) values
  (md5('review58-lesson')::uuid,md5('review58-tenant')::uuid,md5('review58-cycle')::uuid,1,'Contrato','Definir contrato','Referência',45);
insert into activity_templates(id,tenant_id,lesson_template_id,title,objective,instructions,continuity_guidance,estimated_minutes) values
  (md5('review58-activity')::uuid,md5('review58-tenant')::uuid,md5('review58-lesson')::uuid,'Contrato e interface','Definir contrato','Construa','Continue',45);
insert into activity_criteria(id,tenant_id,activity_template_id,label,description,position) values
  (md5('review58-criterion')::uuid,md5('review58-tenant')::uuid,md5('review58-activity')::uuid,'Contrato completo','Há regras e limites.',1);
insert into classes(id,tenant_id,name,curriculum_id,starts_on,status) values
  (md5('review58-class')::uuid,md5('review58-tenant')::uuid,'Turma Sudoeste',md5('review58-curriculum')::uuid,'2026-10-01','active');
insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at) values
  (md5('review58-enrollment-1')::uuid,md5('review58-tenant')::uuid,md5('review58-profile-1')::uuid,md5('review58-curriculum')::uuid,'class',md5('review58-class')::uuid,'active',now(),now()),
  (md5('review58-enrollment-2')::uuid,md5('review58-tenant')::uuid,md5('review58-profile-2')::uuid,md5('review58-curriculum')::uuid,'class',md5('review58-class')::uuid,'active',now(),now());
insert into sessions(id,tenant_id,class_id,lesson_template_id,starts_at,ends_at,status) values
  (md5('review58-session')::uuid,md5('review58-tenant')::uuid,md5('review58-class')::uuid,md5('review58-lesson')::uuid,'2026-10-01 12:00:00+00','2026-10-01 13:00:00+00','completed');
insert into activity_assignments(id,tenant_id,enrollment_id,session_id,activity_template_id,status,released_at,due_at) values
  (md5('review58-assignment-1')::uuid,md5('review58-tenant')::uuid,md5('review58-enrollment-1')::uuid,md5('review58-session')::uuid,md5('review58-activity')::uuid,'submitted','2026-10-01 12:00:00+00','2026-10-08 12:00:00+00'),
  (md5('review58-assignment-2')::uuid,md5('review58-tenant')::uuid,md5('review58-enrollment-2')::uuid,md5('review58-session')::uuid,md5('review58-activity')::uuid,'available','2026-10-01 12:00:00+00','2026-10-08 12:00:00+00');
insert into submissions(id,tenant_id,activity_assignment_id,version,is_draft,submitted_at) values
  (md5('review58-submission')::uuid,md5('review58-tenant')::uuid,md5('review58-assignment-1')::uuid,1,false,'2026-10-07 12:00:00+00');

select ok(
  has_function_privilege('service_role','logos_academy.admin_review_overview(uuid,uuid,uuid,uuid)','execute')
  and not has_function_privilege('authenticated','logos_academy.admin_review_overview(uuid,uuid,uuid,uuid)','execute')
  and not has_function_privilege('anon','logos_academy.admin_review_overview(uuid,uuid,uuid,uuid)','execute'),
  'overview é exclusivo do backend'
);

set local role service_role;

select is(
  jsonb_array_length(logos_academy.admin_review_overview(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-class')::uuid)->'activities'),
  1,
  'overview lista as atividades do currículo da turma'
);
select is(
  jsonb_array_length(logos_academy.admin_review_overview(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-class')::uuid)->'students'),
  2,
  'overview inclui todos os alunos da turma'
);
select is(
  (logos_academy.admin_review_overview(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-class')::uuid)->'students'->0->>'status'),
  'submitted',
  'aluno que enviou aparece primeiro, aguardando revisão'
);
select is(
  (logos_academy.admin_review_overview(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-class')::uuid)->'students'->1->>'status'),
  'available',
  'aluno sem envio permanece visível'
);
select throws_ok(
  $$select logos_academy.admin_review_overview(md5('review58-tenant')::uuid,md5('review58-other-admin')::uuid,md5('review58-class')::uuid)$$,
  '42501', 'tenant admin required', 'admin de outro tenant não acessa o overview'
);
select throws_ok(
  $$select logos_academy.admin_publish_review(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-submission')::uuid,'revision_requested','',jsonb_build_array(jsonb_build_object('criterionId',md5('review58-criterion')::uuid,'result','needs_adjustment')),'test-key',gen_random_uuid())$$,
  '22023', 'review decision conflicts with rubric', 'correção continua exigindo orientação textual'
);
select is(
  (logos_academy.admin_publish_review(md5('review58-tenant')::uuid,md5('review58-admin')::uuid,md5('review58-submission')::uuid,'approved','',jsonb_build_array(jsonb_build_object('criterionId',md5('review58-criterion')::uuid,'result','met')),'test-key',gen_random_uuid())->>'feedback'),
  '',
  'aprovação sem observações é registrada com feedback vazio'
);

reset role;
select * from finish();
rollback;
