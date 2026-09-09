-- Dados exclusivamente fictícios. A chave abaixo cifra apenas fixtures locais e nunca deve ser usada fora do reset local.
set check_function_bodies = on;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated','admin.a@academy.test',extensions.crypt('AcademyDev123!',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated','aluna.a@academy.test',extensions.crypt('AcademyDev123!',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b0000000-0000-0000-0000-000000000001','authenticated','authenticated','admin.b@academy.test',extensions.crypt('AcademyDev123!',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b0000000-0000-0000-0000-000000000002','authenticated','authenticated','aluno.b@academy.test',extensions.crypt('AcademyDev123!',extensions.gen_salt('bf')),now(),' {"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','','')
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id, email, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users
where id in (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002'
)
on conflict (provider_id, provider) do nothing;

insert into logos_academy.tenants (id, tenant_id, name, slug) values
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Logos Academy','logos-academy'),
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Academy Isolamento','academy-isolamento')
on conflict (id) do nothing;

insert into logos_academy.users (id, tenant_id, auth_user_id, email_encrypted, display_name) values
  ('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',extensions.pgp_sym_encrypt('admin.a@academy.test','local-seed-only'),'Ana Admin'),
  ('11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',extensions.pgp_sym_encrypt('aluna.a@academy.test','local-seed-only'),'Lia Monteiro'),
  ('21000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',extensions.pgp_sym_encrypt('admin.b@academy.test','local-seed-only'),'Bruno Admin'),
  ('21000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',extensions.pgp_sym_encrypt('aluno.b@academy.test','local-seed-only'),'Caio Ribeiro')
on conflict (id) do nothing;

insert into logos_academy.tenant_memberships (id, tenant_id, user_id, role) values
  ('12000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','admin'),
  ('12000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','student'),
  ('22000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','admin'),
  ('22000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','student')
on conflict (id) do nothing;

insert into logos_academy.student_profiles (id, tenant_id, user_id, birth_date_encrypted, github_username) values
  ('13000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',extensions.pgp_sym_encrypt('2011-04-12','local-seed-only'),'lia-academy'),
  ('23000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002',extensions.pgp_sym_encrypt('2010-09-08','local-seed-only'),null)
on conflict (id) do nothing;

insert into logos_academy.guardian_records (id, tenant_id, student_profile_id, name_encrypted, relationship, email_encrypted, phone_encrypted) values
  ('14000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001',extensions.pgp_sym_encrypt('Marina Monteiro','local-seed-only'),'mãe',extensions.pgp_sym_encrypt('marina@example.test','local-seed-only'),null),
  ('24000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001',extensions.pgp_sym_encrypt('Rafael Ribeiro','local-seed-only'),'pai',null,extensions.pgp_sym_encrypt('+5511999990000','local-seed-only'))
on conflict (id) do nothing;

insert into logos_academy.consent_records (id, tenant_id, student_profile_id, guardian_record_id, status, term_version, signed_at, physical_copy_archived, verified_by_user_id, verified_at) values
  ('15000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','verified','2026.1','2026-08-20',true,'11000000-0000-0000-0000-000000000001',now()),
  ('25000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','verified','2026.1','2026-08-21',true,'21000000-0000-0000-0000-000000000001',now())
on conflict (id) do nothing;

insert into logos_academy.curricula (id, tenant_id, name, version, status) values
  ('16000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Explorer','2026.1','active'),
  ('26000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Explorer','2026.1','active')
on conflict (id) do nothing;

insert into logos_academy.cycles (id, tenant_id, curriculum_id, position, title, project_title)
select md5('academy-a-cycle-' || n)::uuid, '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', n,
  'Ciclo ' || n, (array['Mapa de Problema','Protótipo Interativo','Automação Útil','Projeto Explorer'])[n]
from generate_series(1,4) n on conflict (id) do nothing;

insert into logos_academy.lesson_templates (id, tenant_id, cycle_id, position, title, objective, reference_content, estimated_activity_minutes)
select md5('academy-a-lesson-' || n)::uuid, '10000000-0000-0000-0000-000000000001', md5('academy-a-cycle-' || ceil(n / 4.0)::int)::uuid,
  n, 'Aula ' || lpad(n::text,2,'0'), 'Construir evidência da aula ' || n, 'Referência canônica fictícia da aula ' || n || '.', 30
from generate_series(1,16) n on conflict (id) do nothing;

insert into logos_academy.activity_templates (id, tenant_id, lesson_template_id, title, objective, instructions, continuity_guidance, estimated_minutes)
select md5('academy-a-activity-' || n)::uuid, '10000000-0000-0000-0000-000000000001', md5('academy-a-lesson-' || n)::uuid,
  'Missão ' || lpad(n::text,2,'0'), 'Aplicar o conceito da aula ' || n, 'Produza uma evidência curta e verificável.', 'Continue na próxima aula a partir da evidência salva.', 30
from generate_series(1,16) n on conflict (id) do nothing;

insert into logos_academy.concepts (id, tenant_id, slug, title, summary, body) values
  (md5('academy-a-concept-1')::uuid,'10000000-0000-0000-0000-000000000001','pensamento-computacional','Pensamento computacional','Decompor antes de construir.','Conceito fictício liberado na primeira aula.'),
  (md5('academy-a-concept-2')::uuid,'10000000-0000-0000-0000-000000000001','automacao','Automação','Transformar uma sequência em processo.','Conceito fictício da segunda aula, ainda futuro.')
on conflict (id) do nothing;

insert into logos_academy.lesson_concepts (id, tenant_id, lesson_template_id, concept_id) values
  (md5('academy-a-lesson-concept-1')::uuid,'10000000-0000-0000-0000-000000000001',md5('academy-a-lesson-1')::uuid,md5('academy-a-concept-1')::uuid),
  (md5('academy-a-lesson-concept-2')::uuid,'10000000-0000-0000-0000-000000000001',md5('academy-a-lesson-2')::uuid,md5('academy-a-concept-2')::uuid)
on conflict (id) do nothing;

insert into logos_academy.activity_requirements (id, tenant_id, activity_template_id, kind, label, is_required, position)
select md5('academy-a-requirement-' || n)::uuid, '10000000-0000-0000-0000-000000000001', md5('academy-a-activity-' || n)::uuid,
  'text', 'Descreva sua evidência', true, 1 from generate_series(1,16) n on conflict (id) do nothing;

insert into logos_academy.activity_criteria (id, tenant_id, activity_template_id, label, description, position)
select md5('academy-a-criterion-' || n)::uuid, '10000000-0000-0000-0000-000000000001', md5('academy-a-activity-' || n)::uuid,
  'Evidência verificável', 'A entrega demonstra o objetivo da aula.', 1 from generate_series(1,16) n on conflict (id) do nothing;

insert into logos_academy.classes (id, tenant_id, name, curriculum_id, starts_on, status) values
  ('17000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Explorer Setembro','16000000-0000-0000-0000-000000000001','2026-09-08','active'),
  ('27000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Turma Isolamento','26000000-0000-0000-0000-000000000001','2026-09-08','active')
on conflict (id) do nothing;

insert into logos_academy.enrollments (id, tenant_id, student_profile_id, curriculum_id, kind, class_id, status, invited_at, activated_at) values
  ('18000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','class','17000000-0000-0000-0000-000000000001','active',now()-interval '7 days',now()-interval '6 days'),
  ('28000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','class','27000000-0000-0000-0000-000000000001','active',now()-interval '7 days',now()-interval '6 days')
on conflict (id) do nothing;

insert into logos_academy.sessions (id, tenant_id, class_id, lesson_template_id, starts_at, ends_at, status)
select md5('academy-a-session-' || n)::uuid, '10000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001',
  md5('academy-a-lesson-' || n)::uuid, '2026-09-08 18:00:00-03'::timestamptz + ((n-1) * interval '3 days'),
  '2026-09-08 20:00:00-03'::timestamptz + ((n-1) * interval '3 days'), case when n=1 then 'completed' else 'scheduled' end
from generate_series(1,16) n on conflict (id) do nothing;

insert into logos_academy.attendance_records (id, tenant_id, session_id, enrollment_id, status, recorded_by_user_id) values
  ('19000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',md5('academy-a-session-1')::uuid,'18000000-0000-0000-0000-000000000001','present','11000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into logos_academy.activity_assignments (id, tenant_id, enrollment_id, session_id, activity_template_id, status, released_at, due_at) values
  ('1a000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001',md5('academy-a-session-1')::uuid,md5('academy-a-activity-1')::uuid,'submitted',now()-interval '3 days',now()+interval '2 days')
on conflict (id) do nothing;

insert into logos_academy.submissions (id, tenant_id, activity_assignment_id, version, is_draft) values
  ('1b000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001',1,true)
on conflict (id) do nothing;

insert into logos_academy.submission_items (id, tenant_id, submission_id, activity_requirement_id, kind, text_value_encrypted) values
  ('1c000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001',md5('academy-a-requirement-1')::uuid,'text',extensions.pgp_sym_encrypt('Evidência fictícia da primeira missão.','local-seed-only'))
on conflict (id) do nothing;

-- A versão só é finalizada depois de todos os itens obrigatórios existirem.
update logos_academy.submissions set is_draft = false, submitted_at = now() - interval '1 day'
where id = '1b000000-0000-0000-0000-000000000001' and is_draft;

insert into logos_academy.project_records (id, tenant_id, enrollment_id, cycle_id, status)
select md5('academy-a-project-' || n)::uuid, '10000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001',
  md5('academy-a-cycle-' || n)::uuid, case when n=1 then 'in_progress' else 'locked' end
from generate_series(1,4) n on conflict (id) do nothing;

insert into logos_academy.audit_events (id, tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata) values
  ('1d000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','student.invited','student_profile','13000000-0000-0000-0000-000000000001','1e000000-0000-0000-0000-000000000001','{"result":"success"}')
on conflict (id) do nothing;
