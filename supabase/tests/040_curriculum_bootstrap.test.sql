begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(13);

-- 0059 deliberately purges v1/v2. Test the final state, not old snapshots.
select ok(exists(select 1 from tenants where slug='logos-academy' and id=md5('logos-academy-operational-tenant')::uuid),'operational tenant has deterministic Explorer id');
select is((select count(*)::integer from curricula where name='Explorer' and version in('v1','v2')),0,'retired Explorer snapshots are absent');
select is((select count(*)::integer from curricula where id=md5('logos-academy-explorer-v3-curriculum')::uuid and version='v3' and status='active'),1,'Explorer v3 is the canonical active snapshot');
select is((select count(*)::integer from cycles where curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid),4,'current Explorer has four projects');
select is((select count(*)::integer from lesson_templates l join cycles c on c.id=l.cycle_id and c.tenant_id=l.tenant_id where c.curriculum_id=md5('logos-academy-explorer-v3-curriculum')::uuid),16,'current Explorer has sixteen lessons');
select is((select count(*)::integer from activity_templates where id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n)),16,'current Explorer has one activity per lesson');
select is((select count(*)::integer from activity_requirements where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),69,'current Explorer requirements remain complete');
select is((select count(*)::integer from activity_criteria where activity_template_id in(select md5('logos-academy-explorer-v3-activity-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),64,'current Explorer criteria remain complete');
select is((select count(distinct lesson_template_id)::integer from lesson_concepts where lesson_template_id in(select md5('logos-academy-explorer-v3-lesson-'||n)::uuid from generate_series(1,16)n) and deleted_at is null),16,'every current lesson preserves concept relations');
select is((select title from lesson_templates where id=md5('logos-academy-explorer-v3-lesson-16')::uuid),'Demo Day: MVP publicado','current Explorer preserves Demo Day');
select lives_ok($$insert into curricula(id,tenant_id,name,version,status) values(md5('logos-academy-explorer-v3-curriculum')::uuid,md5('logos-academy-operational-tenant')::uuid,'Explorer','v3','active') on conflict do nothing$$,'current curriculum upsert remains idempotent');
select is((select count(*)::integer from curricula where tenant_id=md5('logos-academy-operational-tenant')::uuid and name='Explorer' and version='v3'),1,'idempotent import does not duplicate current version');
select is((select count(*)::integer from pg_trigger where tgname like '%explorer_v1_immutable' and not tgisinternal),0,'retired v1 immutability triggers are absent');
select * from finish();
rollback;
