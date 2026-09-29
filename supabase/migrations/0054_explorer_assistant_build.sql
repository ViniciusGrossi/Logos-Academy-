begin;

-- Explorer v3 preserva turmas v2 e transforma somente o primeiro projeto em um build externo guiado.
alter table logos_academy.activity_requirements
  add column if not exists project_slot text check (project_slot in ('frontend','api','prompt','tests','deploy','repository'));

alter table logos_academy.uploaded_files drop constraint if exists uploaded_files_content_type_check;
alter table logos_academy.uploaded_files
  add constraint uploaded_files_content_type_check check (content_type in (
    'application/pdf','text/plain','text/markdown','text/html','text/css','text/javascript','application/json',
    'image/png','image/jpeg','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ));

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.curricula(id,tenant_id,name,version,status)
select md5('logos-academy-explorer-v3-curriculum')::uuid,id,'Explorer','v3','active' from tenant
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.cycles(id,tenant_id,curriculum_id,position,title,project_title,project_challenge,project_problem,project_audience,project_expected_result,project_quality_criteria,project_concepts)
select md5('logos-academy-explorer-v3-cycle-'||c.position)::uuid,t.id,md5('logos-academy-explorer-v3-curriculum')::uuid,c.position,c.title,c.project_title,c.project_challenge,c.project_problem,c.project_audience,c.project_expected_result,c.project_quality_criteria,c.project_concepts
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid and c.deleted_at is null
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.lesson_templates(id,tenant_id,cycle_id,position,title,objective,reference_content,estimated_activity_minutes)
select md5('logos-academy-explorer-v3-lesson-'||((c.position-1)*4+l.position))::uuid,t.id,md5('logos-academy-explorer-v3-cycle-'||c.position)::uuid,l.position,l.title,l.objective,l.reference_content,l.estimated_activity_minutes
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid
join logos_academy.lesson_templates l on l.tenant_id=t.id and l.cycle_id=c.id and l.deleted_at is null
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.lesson_concepts(id,tenant_id,lesson_template_id,concept_id)
select md5('logos-academy-explorer-v3-lesson-concept-'||((c.position-1)*4+l.position)||'-'||lc.concept_id)::uuid,t.id,md5('logos-academy-explorer-v3-lesson-'||((c.position-1)*4+l.position))::uuid,lc.concept_id
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid
join logos_academy.lesson_templates l on l.tenant_id=t.id and l.cycle_id=c.id
join logos_academy.lesson_concepts lc on lc.tenant_id=t.id and lc.lesson_template_id=l.id and lc.deleted_at is null
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.activity_templates(id,tenant_id,lesson_template_id,title,objective,instructions,continuity_guidance,estimated_minutes,context,expected_result,steps,plan_b,reflection_prompt,portfolio_evidence,tool_hint)
select md5('logos-academy-explorer-v3-activity-'||((c.position-1)*4+l.position))::uuid,t.id,md5('logos-academy-explorer-v3-lesson-'||((c.position-1)*4+l.position))::uuid,a.title,a.objective,a.instructions,a.continuity_guidance,a.estimated_minutes,a.context,a.expected_result,a.steps,a.plan_b,a.reflection_prompt,a.portfolio_evidence,a.tool_hint
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid
join logos_academy.lesson_templates l on l.tenant_id=t.id and l.cycle_id=c.id
join logos_academy.activity_templates a on a.tenant_id=t.id and a.lesson_template_id=l.id and a.deleted_at is null
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.activity_requirements(id,tenant_id,activity_template_id,kind,label,is_required,position)
select md5('logos-academy-explorer-v3-requirement-'||((c.position-1)*4+l.position)||'-'||r.position)::uuid,t.id,md5('logos-academy-explorer-v3-activity-'||((c.position-1)*4+l.position))::uuid,r.kind,r.label,r.is_required,r.position
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid
join logos_academy.lesson_templates l on l.tenant_id=t.id and l.cycle_id=c.id
join logos_academy.activity_templates a on a.tenant_id=t.id and a.lesson_template_id=l.id
join logos_academy.activity_requirements r on r.tenant_id=t.id and r.activity_template_id=a.id and r.deleted_at is null
on conflict do nothing;

with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null)
insert into logos_academy.activity_criteria(id,tenant_id,activity_template_id,label,description,position)
select md5('logos-academy-explorer-v3-criterion-'||((c.position-1)*4+l.position)||'-'||r.position)::uuid,t.id,md5('logos-academy-explorer-v3-activity-'||((c.position-1)*4+l.position))::uuid,r.label,r.description,r.position
from tenant t join logos_academy.cycles c on c.tenant_id=t.id and c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid
join logos_academy.lesson_templates l on l.tenant_id=t.id and l.cycle_id=c.id
join logos_academy.activity_templates a on a.tenant_id=t.id and a.lesson_template_id=l.id
join logos_academy.activity_criteria r on r.tenant_id=t.id and r.activity_template_id=a.id and r.deleted_at is null
on conflict do nothing;

-- A primeira rota ensina o build que o aluno vai sustentar fora da Academy.
update logos_academy.activity_templates set
  title='Interface do assistente', objective='Criar a primeira interface web do assistente e explicar para quem ela serve.',
  instructions='Defina um problema pequeno, monte uma interface em HTML/CSS/JS e teste a conversa sem chave no navegador. Envie o arquivo e registre as decisões.',
  continuity_guidance='A interface será conectada a uma rota server-side na próxima atividade.',
  context='A Academy registra a evolução; o código vive no repositório do aluno.', expected_result='Uma interface clara, um repositório e decisões explicadas.',
  steps='["Definir usuário e tarefa","Criar index.html","Testar o fluxo visual","Registrar decisões"]'::jsonb,
  reflection_prompt='Que decisão torna a primeira tela mais fácil de usar?', portfolio_evidence='Interface inicial e repositório.', tool_hint='Editor de código, GitHub e Vercel.'
where id=md5('logos-academy-explorer-v3-activity-1')::uuid;

update logos_academy.activity_templates set
  title='Resposta segura com IA', objective='Conectar a interface a uma rota server-side e escrever o system prompt inicial.',
  instructions='Crie uma rota /api/chat na Vercel. A chave GROQ_API_KEY fica apenas nas variáveis de ambiente. Envie a rota e o prompt, nunca a chave.',
  continuity_guidance='Use os testes para melhorar a resposta e a experiência na Atividade 3.',
  context='O navegador chama a rota; a rota chama a LLM com a variável de ambiente.', expected_result='Rota segura e system prompt testável.',
  steps='["Criar rota server-side","Configurar variável na Vercel","Escrever system prompt","Testar resposta"]'::jsonb,
  reflection_prompt='Que limite do assistente você deixou explícito?', portfolio_evidence='Rota segura e prompt v1.', tool_hint='Vercel, Groq e editor de código.'
where id=md5('logos-academy-explorer-v3-activity-2')::uuid;

update logos_academy.activity_templates set
  title='Refinamento e testes do assistente', objective='Aprimorar a interface e o prompt a partir de testes reais.',
  instructions='Faça cinco testes, corrija pelo menos uma falha e envie a versão refinada, o prompt e o registro de testes.',
  continuity_guidance='A versão aprovada será a base da publicação final.', context='Uma versão só melhora quando o teste deixa a próxima decisão visível.',
  expected_result='Interface e prompt revisados com evidência de testes.', steps='["Executar cinco testes","Registrar falhas","Refinar interface e prompt","Explicar melhoria"]'::jsonb,
  reflection_prompt='Qual teste mudou uma decisão do projeto?', portfolio_evidence='Versão refinada, prompt e testes.', tool_hint='Navegador e editor de código.'
where id=md5('logos-academy-explorer-v3-activity-3')::uuid;

update logos_academy.activity_templates set
  title='Project Day: Assistente publicado', objective='Publicar, documentar e demonstrar um assistente web de escopo pequeno.',
  instructions='Publique na Vercel, confirme o repositório final e registre os testes e limites. A chave continua exclusiva da Vercel.',
  continuity_guidance='O Projeto 1 preserva as peças aprovadas como uma construção explicável.', context='A demonstração é o app publicado; a Academy é o dossiê de aprendizagem.',
  expected_result='Deploy acessível, repositório e documentação para explicar o projeto.', steps='["Publicar na Vercel","Testar deploy","Documentar uso e limites","Demonstrar projeto"]'::jsonb,
  reflection_prompt='O que você sabe explicar sobre o caminho entre interface e resposta?', portfolio_evidence='Deploy, repositório, README e roteiro de testes.', tool_hint='GitHub, Vercel e navegador.'
where id=md5('logos-academy-explorer-v3-activity-4')::uuid;

delete from logos_academy.activity_requirements where activity_template_id in (select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,4) n);
with tenant as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null), data(activity,position,kind,required,label,slot) as (values
  (1,1,'file',true,'Interface inicial — index.html','frontend'),(1,2,'github_repository',true,'Repositório do assistente','repository'),(1,3,'text',true,'Decisões da interface',null),
  (2,1,'file',true,'Rota segura — api/chat.js ou app/api/chat/route.ts','api'),(2,2,'text',true,'System prompt v1','prompt'),(2,3,'text',true,'Contrato de ambiente e limites',null),
  (3,1,'file',true,'Interface refinada — index.html, CSS ou JS','frontend'),(3,2,'text',true,'System prompt refinado','prompt'),(3,3,'text',true,'Cinco testes e melhorias','tests'),
  (4,1,'external_link',true,'Versão publicada na Vercel','deploy'),(4,2,'github_repository',true,'Repositório final','repository'),(4,3,'text',true,'Roteiro de testes final','tests'),(4,4,'file',true,'README ou documentação técnica',null),(4,5,'text',true,'Limites e próximos passos',null),(4,6,'file',false,'Backup visual da demonstração',null)
)
insert into logos_academy.activity_requirements(id,tenant_id,activity_template_id,kind,label,is_required,position,project_slot)
select md5('logos-academy-explorer-v3-requirement-'||d.activity||'-'||d.position)::uuid,t.id,md5('logos-academy-explorer-v3-activity-'||d.activity)::uuid,d.kind,d.label,d.required,d.position,d.slot
from tenant t cross join data d;

update logos_academy.cycles set project_challenge='Criar um assistente web simples, útil e explicável, com interface, rota segura, prompt, testes e publicação.', project_expected_result='Aplicação publicada na Vercel com código no GitHub, uma rota server-side para a LLM e decisões documentadas.', project_quality_criteria=array['Interface clara','Chave somente na Vercel','Prompt com limites','Testes e melhoria registrados','Deploy acessível'], project_concepts=array['Interface','Rota server-side','Variável de ambiente','System prompt','Teste','Deploy']
where id=md5('logos-academy-explorer-v3-cycle-1')::uuid;

-- Novas turmas recebem v3; turmas v2 e suas entregas permanecem imutáveis.
update logos_academy.curricula set status='archived' where id=md5('logos-academy-explorer-v2-curriculum')::uuid and status='active';

create or replace function private.project_dossier_json(p_tenant_id uuid,p_project_id uuid,p_encryption_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.project_summary_json(pr.tenant_id,pr.enrollment_id,pr.cycle_id) || jsonb_build_object(
    'brief',jsonb_build_object('challenge',c.project_challenge,'problem',c.project_problem,'audience',c.project_audience,'expectedResult',c.project_expected_result,'qualityCriteria',c.project_quality_criteria,'concepts',c.project_concepts),
    'build',coalesce((
      select jsonb_agg(jsonb_build_object('slot',b.project_slot,'label',b.label,'sourceActivityPosition',b.lesson_position,'version',b.version,'kind',b.kind,'value',b.value,'fileId',b.file_id,'fileName',b.file_name) order by array_position(array['frontend','api','prompt','tests','repository','deploy'],b.project_slot))
      from (
        select distinct on (ar.project_slot) ar.project_slot,ar.label,lt.position lesson_position,s.version,si.kind,
          case when si.kind='text' then extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) when si.kind in ('external_link','github_repository') then extensions.pgp_sym_decrypt(si.url_value_encrypted,p_encryption_key) else null end value,
          si.uploaded_file_id file_id,case when uf.id is null then null else extensions.pgp_sym_decrypt(uf.filename_encrypted,p_encryption_key) end file_name
        from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id join logos_academy.submissions s on s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and not s.is_draft and s.deleted_at is null join logos_academy.reviews r on r.tenant_id=s.tenant_id and r.submission_id=s.id and r.decision='approved' and r.deleted_at is null join logos_academy.submission_items si on si.tenant_id=s.tenant_id and si.submission_id=s.id and si.deleted_at is null join logos_academy.activity_requirements ar on ar.tenant_id=si.tenant_id and ar.id=si.activity_requirement_id and ar.project_slot is not null and ar.deleted_at is null left join logos_academy.uploaded_files uf on uf.tenant_id=si.tenant_id and uf.id=si.uploaded_file_id and uf.deleted_at is null
        where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null
        order by ar.project_slot,s.version desc,r.reviewed_at desc
      ) b
    ),'[]'::jsonb),
    'activities',coalesce((select jsonb_agg(jsonb_build_object('assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'status',aa.status,'latestVersion',lv.version,'decision',di.value,'latestFeedback',case when lf.id is null then null else jsonb_build_object('decision',lf.decision,'feedback',lf.feedback,'reviewerName',lf.reviewer_name,'reviewedAt',lf.reviewed_at) end) order by lt.position) from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id left join lateral (select s.version from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null order by s.version desc limit 1) lv on true left join lateral (select extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) value from logos_academy.submissions s join logos_academy.submission_items si on si.tenant_id=s.tenant_id and si.submission_id=s.id and si.kind='text' and si.deleted_at is null join logos_academy.activity_requirements ar on ar.tenant_id=si.tenant_id and ar.id=si.activity_requirement_id and ar.deleted_at is null where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null order by s.version desc,(lower(ar.label) like '%decis%') desc,ar.position limit 1) di on true left join lateral (select r.id,r.decision,extensions.pgp_sym_decrypt(r.feedback_encrypted,p_encryption_key) feedback,u.display_name reviewer_name,r.reviewed_at from logos_academy.submissions s join logos_academy.reviews r on r.tenant_id=s.tenant_id and r.submission_id=s.id and r.deleted_at is null join logos_academy.users u on u.tenant_id=r.tenant_id and u.id=r.reviewer_user_id and u.deleted_at is null where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null order by r.reviewed_at desc,r.id desc limit 1) lf on true where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null),'[]'::jsonb)
  ) from logos_academy.project_records pr join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
$$;

notify pgrst,'reload schema';
commit;
