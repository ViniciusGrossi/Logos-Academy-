begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(40);

-- ---------------------------------------------------------------------------
-- Fixture: 2 tenants. Tenant A tem currículo ativo + rascunho, 1 turma, 1
-- matrícula, 3 encontros (para frequência/reposição), 2 atividades liberadas
-- (para entregas/workspace) e 2 arquivos (ready/pending) para SR-A7.
-- ---------------------------------------------------------------------------

insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
  (md5('ops51-admin-a-auth')::uuid,'authenticated','authenticated','ops51-admin-a@test','{}','{}'),
  (md5('ops51-admin-b-auth')::uuid,'authenticated','authenticated','ops51-admin-b@test','{}','{}'),
  (md5('ops51-student-a1-auth')::uuid,'authenticated','authenticated','ops51-student-a1@test','{}','{}');

insert into tenants(id,tenant_id,name,slug) values
  (md5('ops51-tenant-a')::uuid,md5('ops51-tenant-a')::uuid,'Ops51 Tenant A','ops51-tenant-a'),
  (md5('ops51-tenant-b')::uuid,md5('ops51-tenant-b')::uuid,'Ops51 Tenant B','ops51-tenant-b');

insert into users(id,tenant_id,auth_user_id,email_encrypted,display_name) values
  (md5('ops51-admin-a')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-admin-a-auth')::uuid,extensions.pgp_sym_encrypt('ops51-admin-a@test','test-key'),'Admin A'),
  (md5('ops51-admin-b')::uuid,md5('ops51-tenant-b')::uuid,md5('ops51-admin-b-auth')::uuid,extensions.pgp_sym_encrypt('ops51-admin-b@test','test-key'),'Admin B'),
  (md5('ops51-student-a1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-student-a1-auth')::uuid,extensions.pgp_sym_encrypt('ops51-student-a1@test','test-key'),'Student A1');

insert into tenant_memberships(tenant_id,user_id,role) values
  (md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,'admin'),
  (md5('ops51-tenant-b')::uuid,md5('ops51-admin-b')::uuid,'admin'),
  (md5('ops51-tenant-a')::uuid,md5('ops51-student-a1')::uuid,'student');

insert into student_profiles(id,tenant_id,user_id,birth_date_encrypted) values
  (md5('ops51-student-a1-profile')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-student-a1')::uuid,extensions.pgp_sym_encrypt('2012-03-01','test-key'));

insert into curricula(id,tenant_id,name,version,status) values
  (md5('ops51-curriculum-active')::uuid,md5('ops51-tenant-a')::uuid,'Ops51 Curriculum','v1','active'),
  (md5('ops51-curriculum-draft')::uuid,md5('ops51-tenant-a')::uuid,'Ops51 Curriculum Draft','v1','draft');

insert into cycles(id,tenant_id,curriculum_id,position,title,project_title) values
  (md5('ops51-cycle-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-curriculum-active')::uuid,1,'Cycle One','Project One');

insert into lesson_templates(id,tenant_id,cycle_id,position,title,objective,reference_content,estimated_activity_minutes) values
  (md5('ops51-lesson-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-cycle-1')::uuid,1,'Lesson 1','Objective 1','Reference 1',30),
  (md5('ops51-lesson-2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-cycle-1')::uuid,2,'Lesson 2','Objective 2','Reference 2',30),
  (md5('ops51-lesson-3')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-cycle-1')::uuid,3,'Lesson 3','Objective 3','Reference 3',30);

insert into activity_templates(id,tenant_id,lesson_template_id,title,objective,instructions,continuity_guidance,estimated_minutes) values
  (md5('ops51-activity-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-lesson-1')::uuid,'Activity One','Objective A1','Instructions A1','Continuity A1',20),
  (md5('ops51-activity-2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-lesson-2')::uuid,'Activity Two','Objective A2','Instructions A2','Continuity A2',20);

insert into activity_requirements(id,tenant_id,activity_template_id,kind,label,is_required,position) values
  (md5('ops51-requirement-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-activity-1')::uuid,'text','Reflexão',true,1);

insert into classes(id,tenant_id,name,curriculum_id,starts_on,status) values
  (md5('ops51-class-1')::uuid,md5('ops51-tenant-a')::uuid,'Ops51 Class',md5('ops51-curriculum-active')::uuid,'2026-09-01','active');

insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at) values
  (md5('ops51-enrollment-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-student-a1-profile')::uuid,md5('ops51-curriculum-active')::uuid,'class',md5('ops51-class-1')::uuid,'active',now(),now());

insert into sessions(id,tenant_id,class_id,lesson_template_id,starts_at,ends_at,status) values
  (md5('ops51-session-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-class-1')::uuid,md5('ops51-lesson-1')::uuid,'2026-09-01 14:00:00+00','2026-09-01 15:00:00+00','completed'),
  (md5('ops51-session-2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-class-1')::uuid,md5('ops51-lesson-2')::uuid,'2026-09-03 14:00:00+00','2026-09-03 15:00:00+00','completed'),
  (md5('ops51-session-3')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-class-1')::uuid,md5('ops51-lesson-3')::uuid,'2026-09-05 14:00:00+00','2026-09-05 15:00:00+00','completed');

insert into activity_assignments(id,tenant_id,enrollment_id,session_id,activity_template_id,status,released_at,due_at) values
  (md5('ops51-assignment-1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-enrollment-1')::uuid,md5('ops51-session-1')::uuid,md5('ops51-activity-1')::uuid,'submitted','2026-09-01 00:00:00+00','2026-09-10 12:00:00+00'),
  (md5('ops51-assignment-2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-enrollment-1')::uuid,md5('ops51-session-2')::uuid,md5('ops51-activity-2')::uuid,'submitted','2026-09-01 00:00:00+00','2026-09-20 12:00:00+00');

insert into submissions(id,tenant_id,activity_assignment_id,version,is_draft,submitted_at) values
  (md5('ops51-submission-1-v1')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-assignment-1')::uuid,1,false,'2026-09-05 10:00:00+00'),
  (md5('ops51-submission-1-v2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-assignment-1')::uuid,2,false,'2026-09-12 10:00:00+00'),
  (md5('ops51-submission-2')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-assignment-2')::uuid,1,false,'2026-09-13 10:00:00+00');

insert into uploaded_files(id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status) values
  (md5('ops51-file-ready')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-student-a1-profile')::uuid,md5('ops51-assignment-1')::uuid,md5('ops51-student-a1')::uuid,
    md5('ops51-tenant-a')::uuid::text||'/'||md5('ops51-student-a1-profile')::uuid::text||'/'||md5('ops51-assignment-1')::uuid::text||'/'||md5('ops51-file-ready')::uuid::text,
    extensions.pgp_sym_encrypt('relatorio.pdf','test-key'),'application/pdf',1000,'ready'),
  (md5('ops51-file-pending')::uuid,md5('ops51-tenant-a')::uuid,md5('ops51-student-a1-profile')::uuid,md5('ops51-assignment-1')::uuid,md5('ops51-student-a1')::uuid,
    md5('ops51-tenant-a')::uuid::text||'/'||md5('ops51-student-a1-profile')::uuid::text||'/'||md5('ops51-assignment-1')::uuid::text||'/'||md5('ops51-file-pending')::uuid::text,
    extensions.pgp_sym_encrypt('rascunho.pdf','test-key'),'application/pdf',500,'pending');

-- ---------------------------------------------------------------------------
-- Grants: backend-only, nunca authenticated/anon.
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege('service_role','logos_academy.admin_session_attendance(uuid,uuid,uuid,text)','execute')
  and has_function_privilege('service_role','logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid)','execute')
  and has_function_privilege('service_role','logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid)','execute')
  and has_function_privilege('service_role','logos_academy.admin_submission_workspace(uuid,uuid,uuid,text)','execute')
  and has_function_privilege('service_role','logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer)','execute')
  and has_function_privilege('service_role','logos_academy.admin_active_curricula(uuid,uuid)','execute')
  and has_function_privilege('service_role','logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer)','execute')
  and has_function_privilege('service_role','logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer)','execute')
  and has_function_privilege('service_role','logos_academy.admin_file_download_target(uuid,uuid,uuid,text)','execute')
  and not has_function_privilege('authenticated','logos_academy.admin_submission_workspace(uuid,uuid,uuid,text)','execute')
  and not has_function_privilege('authenticated','logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer)','execute')
  and not has_function_privilege('authenticated','logos_academy.admin_file_download_target(uuid,uuid,uuid,text)','execute')
  and not has_function_privilege('anon','logos_academy.admin_submission_workspace(uuid,uuid,uuid,text)','execute')
  and not has_function_privilege('anon','logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer)','execute')
  and not has_function_privilege('anon','logos_academy.admin_file_download_target(uuid,uuid,uuid,text)','execute'),
  'RPCs de leitura admin são exclusivas do service_role'
);

set local role service_role;

-- ---------------------------------------------------------------------------
-- SR-A1: attendanceId em toda leitura de AttendanceEntry.
-- ---------------------------------------------------------------------------

select ok(
  (logos_academy.record_attendance(md5('ops51-admin-a')::uuid,md5('ops51-session-1')::uuid,
    jsonb_build_array(jsonb_build_object('enrollmentId',md5('ops51-enrollment-1')::uuid,'status','absent','privateNote','nota confidencial 1')),
    'test-key',gen_random_uuid())->'entries'->0->>'attendanceId') is not null,
  'record_attendance retorna attendanceId (SR-A1)'
);
select ok(
  (logos_academy.record_attendance(md5('ops51-admin-a')::uuid,md5('ops51-session-2')::uuid,
    jsonb_build_array(jsonb_build_object('enrollmentId',md5('ops51-enrollment-1')::uuid,'status','excused_absence')),
    'test-key',gen_random_uuid())->'entries'->0->>'attendanceId') is not null,
  'record_attendance (excused_absence) retorna attendanceId (SR-A1)'
);
select ok(
  (logos_academy.record_attendance(md5('ops51-admin-a')::uuid,md5('ops51-session-3')::uuid,
    jsonb_build_array(jsonb_build_object('enrollmentId',md5('ops51-enrollment-1')::uuid,'status','present','privateNote','nota pessoal')),
    'test-key',gen_random_uuid())->'entries'->0->>'attendanceId') is not null,
  'record_attendance (present) retorna attendanceId (SR-A1)'
);
select is(
  (logos_academy.admin_session_attendance(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-session-1')::uuid,'test-key')->'entries'->0->>'attendanceId'),
  (select id::text from logos_academy.attendance_records where tenant_id=md5('ops51-tenant-a')::uuid and session_id=md5('ops51-session-1')::uuid and deleted_at is null),
  'admin_session_attendance expõe attendanceId (SR-A1)'
);

-- ---------------------------------------------------------------------------
-- SR-A2: fila de reposições pendentes.
-- ---------------------------------------------------------------------------

select is(
  jsonb_array_length(logos_academy.admin_pending_makeups_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid)->'items'),
  2,
  'fila inicial contém as duas faltas sem reposição'
);
select ok(
  (logos_academy.record_makeup(md5('ops51-admin-a')::uuid,
    (select id from logos_academy.attendance_records where tenant_id=md5('ops51-tenant-a')::uuid and session_id=md5('ops51-session-1')::uuid and deleted_at is null),
    null,'2026-09-08 14:00:00+00',null,'test-key',gen_random_uuid())->>'attendanceId') is not null,
  'record_makeup retorna attendanceId (SR-A1)'
);
select is(
  jsonb_array_length(logos_academy.admin_pending_makeups_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid)->'items'),
  1,
  'fila remove a falta reposta e mantém a pendente (GWT-A05)'
);
select is(
  (logos_academy.admin_pending_makeups_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid)->'items'->0->>'attendanceId'),
  (select id::text from logos_academy.attendance_records where tenant_id=md5('ops51-tenant-a')::uuid and session_id=md5('ops51-session-2')::uuid and deleted_at is null),
  'item remanescente na fila é a falta da session-2'
);

-- ---------------------------------------------------------------------------
-- SR-A3: currículos ativos.
-- ---------------------------------------------------------------------------

select is(
  jsonb_array_length(logos_academy.admin_active_curricula(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid)->'items'),
  1,
  'apenas currículo active aparece'
);
select is(
  (logos_academy.admin_active_curricula(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid)->'items'->0->>'id'),
  md5('ops51-curriculum-active')::uuid::text,
  'currículo retornado é o esperado'
);

-- ---------------------------------------------------------------------------
-- SR-A4/SR-A5: workspace único de revisão.
-- ---------------------------------------------------------------------------

select is(
  (logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'student'->>'displayName'),
  'Student A1',
  'workspace traz o aluno (SR-A4)'
);
select is(
  (logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'activity'->>'title'),
  'Activity One',
  'workspace traz o título da atividade (SR-A4)'
);
select is(
  ((logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'activity'->>'lessonPosition')::int),
  1,
  'workspace traz lessonPosition (SR-A4)'
);
select is(
  ((logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'activity'->>'cyclePosition')::int),
  1,
  'workspace traz cyclePosition (SR-A4)'
);
select is(
  (logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'classSummary'->>'name'),
  'Ops51 Class',
  'workspace traz a turma (SR-A4)'
);
select ok(
  (logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->>'dueAt') is not null,
  'workspace traz dueAt (SR-A4)'
);
select is(
  jsonb_array_length(logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'requirements'),
  1,
  'workspace traz os requirements da atividade (SR-A5)'
);
select is(
  jsonb_array_length(logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'previousVersions'),
  1,
  'workspace traz apenas a versão anterior (SR-A5)'
);
select is(
  (logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-submission-1-v2')::uuid,'test-key')->'previousVersions'->0->>'id'),
  md5('ops51-submission-1-v1')::uuid::text,
  'versão anterior é a v1, mais recente primeiro (SR-A5)'
);
select throws_ok(
  $$select logos_academy.admin_submission_workspace(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,gen_random_uuid(),'test-key')$$,
  'P0002',
  'submission not found',
  'workspace de submissão inexistente falha com P0002'
);

-- SR-A4 propagando para o consumidor existente (admin_reviews_page), sem
-- alterar sua assinatura.
select ok(
  exists(
    select 1 from jsonb_array_elements(logos_academy.admin_reviews_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,'test-key')->'items') item
    where item->>'id' = md5('ops51-submission-1-v2')::uuid::text
      and item->'student'->>'displayName' = 'Student A1'
      and (item->'activity'->>'title') is not null
      and (item->>'dueAt') is not null
  ),
  'admin_reviews_page carrega o contexto SR-A4 sem mudar assinatura'
);

-- ---------------------------------------------------------------------------
-- SR-A6: Entregas e Frequência da ficha do aluno.
-- ---------------------------------------------------------------------------

select is(
  (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',null,2)->'items'->0->>'id'),
  md5('ops51-submission-2')::uuid::text,
  'entregas do aluno vêm mais recentes primeiro (item 0)'
);
select is(
  (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',null,2)->'items'->1->>'id'),
  md5('ops51-submission-1-v2')::uuid::text,
  'entregas do aluno vêm mais recentes primeiro (item 1)'
);
select ok(
  (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',null,2)->>'nextCursor') is not null,
  'primeira página de entregas tem cursor'
);
select is(
  (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',
    (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',null,2)->>'nextCursor'),2)
    ->'items'->0->>'id'),
  md5('ops51-submission-1-v1')::uuid::text,
  'segunda página traz a versão mais antiga'
);
select ok(
  (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',
    (logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,'test-key',null,2)->>'nextCursor'),2)
    ->>'nextCursor') is null,
  'segunda página de entregas é a última'
);
select throws_ok(
  $$select logos_academy.admin_student_submissions_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,gen_random_uuid(),'test-key')$$,
  'P0002',
  'student profile not found',
  'entregas de aluno inexistente falham com P0002'
);

select is(
  jsonb_array_length(logos_academy.admin_student_attendance_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,null,'test-key')->'items'),
  3,
  'frequência do aluno lista os três encontros'
);
select is(
  (logos_academy.admin_student_attendance_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,null,'test-key')->'items'->2->>'privateNote'),
  'nota pessoal',
  'frequência do aluno decifra a nota privada (SR-A6)'
);
select is(
  (logos_academy.admin_student_attendance_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-student-a1-profile')::uuid,null,'test-key')->'items'->2->>'attendanceId'),
  (select id::text from logos_academy.attendance_records where tenant_id=md5('ops51-tenant-a')::uuid and session_id=md5('ops51-session-3')::uuid and deleted_at is null),
  'frequência do aluno expõe attendanceId (SR-A1/SR-A6)'
);
select throws_ok(
  $$select logos_academy.admin_student_attendance_page(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,gen_random_uuid(),null,'test-key')$$,
  'P0002',
  'student profile not found',
  'frequência de aluno inexistente falha com P0002'
);

-- ---------------------------------------------------------------------------
-- SR-A7: autorização de download de anexo para admin.
-- ---------------------------------------------------------------------------

select is(
  (logos_academy.admin_file_download_target(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-file-ready')::uuid,'test-key')->>'filename'),
  'relatorio.pdf',
  'admin baixa o nome do arquivo decifrado (SR-A7)'
);
select is(
  (logos_academy.admin_file_download_target(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-file-ready')::uuid,'test-key')->>'contentType'),
  'application/pdf',
  'admin recebe o contentType (SR-A7)'
);
select is(
  (logos_academy.admin_file_download_target(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-file-ready')::uuid,'test-key')->>'storagePath'),
  (select storage_path from logos_academy.uploaded_files where id=md5('ops51-file-ready')::uuid),
  'admin recebe o storagePath correto (SR-A7)'
);
select throws_ok(
  $$select logos_academy.admin_file_download_target(md5('ops51-tenant-a')::uuid,md5('ops51-admin-a')::uuid,md5('ops51-file-pending')::uuid,'test-key')$$,
  '42501',
  'file not available',
  'arquivo pending não pode ser baixado'
);
select throws_ok(
  $$select logos_academy.admin_file_download_target(md5('ops51-tenant-b')::uuid,md5('ops51-admin-b')::uuid,md5('ops51-file-ready')::uuid,'test-key')$$,
  '42501',
  'file not available',
  'admin de outro tenant não baixa o arquivo (isolamento)'
);

-- ---------------------------------------------------------------------------
-- Isolamento: papel aluno e tenant B nunca leem dados do tenant A.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select logos_academy.admin_pending_makeups_page(md5('ops51-tenant-a')::uuid,md5('ops51-student-a1')::uuid)$$,
  '42501',
  'tenant admin required',
  'aluno não pode chamar RPC administrativa (GWT-A10)'
);
select throws_ok(
  $$select logos_academy.admin_active_curricula(md5('ops51-tenant-a')::uuid,md5('ops51-admin-b')::uuid)$$,
  '42501',
  'tenant admin required',
  'admin de outro tenant não acessa currículos do tenant A (GWT-A10)'
);
select is(
  jsonb_array_length(logos_academy.admin_pending_makeups_page(md5('ops51-tenant-b')::uuid,md5('ops51-admin-b')::uuid)->'items'),
  0,
  'tenant B não vê as reposições pendentes do tenant A'
);

reset role;
select * from finish();
rollback;
