begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(18);

select is((select count(*)::integer from cycles where curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid and deleted_at is null),4,'Explorer v3 has four projects');
select results_eq(
  $$select project_title from cycles where curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid and deleted_at is null order by position$$,
  $$values('Assistente Pessoal Inteligente'),('Creative Studio'),('Automation Lab'),('MVP: Produto Inteligente')$$,
  'Explorer v3 exposes the approved project sequence'
);
select is((select count(*)::integer from lesson_templates l join cycles c on c.id=l.cycle_id and c.tenant_id=l.tenant_id where c.curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid and l.deleted_at is null),16,'Explorer v3 has sixteen lessons');
select results_eq(
  $$select ((c.position-1)*4+l.position)::integer from lesson_templates l join cycles c on c.id=l.cycle_id and c.tenant_id=l.tenant_id where c.curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid and l.position=4 and l.deleted_at is null order by 1$$,
  $$values(4),(8),(12),(16)$$,
  'every fourth lesson is the project integration day'
);
select is((select title from lesson_templates where id=md5('logos-academy-explorer-v3-lesson-16')::uuid),'Demo Day: MVP publicado','lesson sixteen closes with the MVP Demo Day');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),16,'Explorer v3 has sixteen activities');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and length(btrim(title))>0 and length(btrim(context))>0 and length(btrim(objective))>0 and length(btrim(instructions))>0 and jsonb_typeof(steps)='array' and jsonb_array_length(steps)>=5 and length(btrim(continuity_guidance))>0 and length(btrim(plan_b))>0 and length(btrim(reflection_prompt))>0 and length(btrim(portfolio_evidence))>0 and length(btrim(tool_hint))>0),16,'all activities contain every pedagogical field and at least five steps');
select is((select count(*)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),69,'the curriculum exposes sixty-nine current deliverables');
select is((select count(*)::integer from activity_criteria where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),64,'the curriculum exposes four atomic criteria per activity');
select is((select count(*)::integer from activity_templates a where a.id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and (select count(*) from activity_requirements r where r.activity_template_id=a.id and r.is_required and r.deleted_at is null)<2),0,'every activity requires at least two concrete deliverables');
select is((select count(*)::integer from activity_templates a where a.id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and (select count(*) from activity_criteria r where r.activity_template_id=a.id and r.deleted_at is null)<>4),0,'every activity has exactly four quality criteria');
select is((select count(distinct project_slot)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null and project_slot is not null),6,'all six project dossier slots are represented');
select is((select count(*)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null and kind not in('text','file','external_link','github_repository')),0,'every deliverable uses a supported kind');
select ok((select instructions ilike '%não é obrigatório%' from activity_templates where id=md5('logos-academy-explorer-v3-activity-1')::uuid),'the visual reactive element is explicitly optional');
select ok((select context ilike '%apenas o exemplo%' from activity_templates where id=md5('logos-academy-explorer-v3-activity-1')::uuid),'the teacher assistant is explicitly an example');
select ok((select project_challenge ilike '%IA especializada%' and project_challenge ilike '%experiência visual%' and project_challenge ilike '%automação confiável%' from cycles where id=md5('logos-academy-explorer-v3-cycle-4')::uuid),'the MVP combines AI, visual experience and automation');
select is((select count(*)::integer from activity_templates where id in(md5('logos-academy-explorer-v3-activity-4')::uuid,md5('logos-academy-explorer-v3-activity-8')::uuid,md5('logos-academy-explorer-v3-activity-12')::uuid,md5('logos-academy-explorer-v3-activity-16')::uuid) and reference_content ilike '%não %nov%'),4,'project days explicitly avoid new core content');
select is((select count(*)::integer from lesson_templates where id in(select md5('logos-academy-explorer-v3-lesson-'||n)::uuid from generate_series(1,16)n) and estimated_activity_minutes=45),16,'every lesson reserves forty-five minutes for the hands-on mission');

select * from finish();
rollback;
