begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(27);

select is((select count(*)::integer from curricula where id=md5('logos-academy-explorer-v2-curriculum')::uuid and version='v2' and status='active' and deleted_at is null),1,'Explorer v2 is the active version');
select is((select count(*)::integer from cycles where curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid and deleted_at is null),4,'Explorer v2 has four cycles');
select is((select count(*)::integer from lesson_templates l join cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid and l.deleted_at is null),16,'Explorer v2 has sixteen lessons');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),16,'Explorer v2 has sixteen activities');
select results_eq($$select ((c.position-1)*4+l.position)::integer from lesson_templates l join cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid order by 1$$,$$select n from generate_series(1,16)n$$,'global activity positions are exactly 1 through 16');
select results_eq($$select ((c.position-1)*4+l.position)::integer from lesson_templates l join cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where c.curriculum_id=md5('logos-academy-explorer-v2-curriculum')::uuid and l.position=4 order by 1$$,$$values(4),(8),(12),(16)$$,'Project Days are at positions 4, 8, 12 and 16');
select is((select title from lesson_templates where id=md5('logos-academy-explorer-v2-lesson-16')::uuid),'Demo Day: eu construí isto','Demo Day is at position 16');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and length(btrim(title))>0 and length(btrim(context))>0 and length(btrim(objective))>0 and length(btrim(instructions))>0 and jsonb_typeof(steps)='array' and jsonb_array_length(steps)>0 and length(btrim(continuity_guidance))>0 and length(btrim(plan_b))>0 and length(btrim(reflection_prompt))>0 and length(btrim(portfolio_evidence))>0),16,'all activities have every pedagogical field');
select is((select count(*)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n)),63,'v2 has all 63 atomic requirements');
select is((select count(*)::integer from activity_criteria where activity_template_id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n)),92,'v2 has all 92 atomic criteria');
select is((select count(*)::integer from activity_templates a where a.id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and exists(select 1 from activity_requirements r where r.activity_template_id=a.id and r.is_required and r.deleted_at is null)),16,'each activity has at least one required artifact');
select is((select count(*)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and kind not in('text','file','external_link','github_repository')),0,'all requirement kinds are supported');
select is((select count(*)::integer from activity_requirements where activity_template_id in(md5('logos-academy-explorer-v2-activity-15')::uuid,md5('logos-academy-explorer-v2-activity-16')::uuid) and kind='github_repository' and not is_required),2,'GitHub is optional in activities 15 and 16');
select is((select count(*)::integer from activity_requirements where activity_template_id in(md5('logos-academy-explorer-v2-activity-4')::uuid,md5('logos-academy-explorer-v2-activity-10')::uuid,md5('logos-academy-explorer-v2-activity-11')::uuid,md5('logos-academy-explorer-v2-activity-12')::uuid,md5('logos-academy-explorer-v2-activity-16')::uuid) and kind='external_link' and not is_required),5,'video and sharing links are optional where the spec allows offline or simulated work');
select is((select count(*)::integer from activity_requirements r where r.activity_template_id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and r.position<>(select count(*) from activity_requirements p where p.activity_template_id=r.activity_template_id and p.position<=r.position)),0,'requirement positions are contiguous per activity');
select is((select count(*)::integer from activity_criteria r where r.activity_template_id in(select md5('logos-academy-explorer-v2-activity-'||n)::uuid from generate_series(1,16)n) and r.position<>(select count(*) from activity_criteria p where p.activity_template_id=r.activity_template_id and p.position<=r.position)),0,'criterion positions are contiguous per activity');

select is((select count(*)::integer from curricula where id=md5('logos-academy-explorer-v1-curriculum')::uuid and name='Explorer' and version='v1'),1,'Explorer v1 curriculum is preserved');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v1-activity-'||n)::uuid from generate_series(1,16)n)),16,'Explorer v1 activities are preserved');
select is((select count(*)::integer from activity_requirements where id in(select md5('logos-academy-explorer-v1-requirement-'||n)::uuid from generate_series(1,16)n)),16,'Explorer v1 aggregated requirements are preserved');
select throws_ok($$insert into classes(tenant_id,name,curriculum_id,starts_on,status) values(md5('logos-academy-operational-tenant')::uuid,'Turma v1 tardia',md5('logos-academy-explorer-v1-curriculum')::uuid,current_date,'planned')$$,'23514','Explorer v1 no longer accepts new classes or enrollments','v1 rejects new classes without changing its snapshot');
select throws_ok($$insert into enrollments(tenant_id,student_profile_id,curriculum_id,kind,status,invited_at) values(md5('logos-academy-operational-tenant')::uuid,md5('explorer-v2-missing-student')::uuid,md5('logos-academy-explorer-v1-curriculum')::uuid,'individual','invited',now())$$,'23514','Explorer v1 no longer accepts new classes or enrollments','v1 rejects new enrollments before any historical row is touched');
select lives_ok($$insert into classes(id,tenant_id,name,curriculum_id,starts_on,status) values(md5('explorer-v2-test-class')::uuid,md5('logos-academy-operational-tenant')::uuid,'Turma Explorer v2',md5('logos-academy-explorer-v2-curriculum')::uuid,current_date,'planned')$$,'v2 accepts new classes');
select lives_ok($$insert into curricula(id,tenant_id,name,version,status) values(md5('logos-academy-explorer-v2-curriculum')::uuid,md5('logos-academy-operational-tenant')::uuid,'Explorer','v2','active') on conflict do nothing$$,'v2 curriculum insert is idempotent');
select is((select count(*)::integer from curricula where id=md5('logos-academy-explorer-v2-curriculum')::uuid),1,'idempotent insert does not duplicate v2');

set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from curricula where id=md5('logos-academy-explorer-v2-curriculum')::uuid),0,'authenticated tenant B cannot read the tenant A v2 curriculum');
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from activity_templates where id=md5('logos-academy-explorer-v2-activity-1')::uuid),0,'student cannot bypass release policy to read v2 activity');
reset role;

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='logos_academy.activity_templates'::regclass),'v2 activity rows remain protected by enabled and forced RLS');

select * from finish();
rollback;
