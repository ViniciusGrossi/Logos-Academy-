begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(13);

select ok(exists(select 1 from tenants where slug = 'logos-academy' and id = md5('logos-academy-operational-tenant')::uuid), 'operational tenant has deterministic Explorer id');
select is((select count(*)::integer from curricula where tenant_id = md5('logos-academy-operational-tenant')::uuid and name = 'Explorer' and version = 'v1'), 1, 'Explorer v1 curriculum is unique');
select is((select count(*)::integer from cycles where curriculum_id = md5('logos-academy-explorer-v1-curriculum')::uuid), 4, 'Explorer v1 has four cycles/projects');
select is((select count(*)::integer from lesson_templates l join cycles c on c.id = l.cycle_id where c.curriculum_id = md5('logos-academy-explorer-v1-curriculum')::uuid), 16, 'Explorer v1 has sixteen lessons');
select is((select count(*)::integer from activity_templates where id::text like '%' and tenant_id = md5('logos-academy-operational-tenant')::uuid and id in (select md5('logos-academy-explorer-v1-activity-' || n)::uuid from generate_series(1,16) n)), 16, 'Explorer v1 has one activity template per lesson');
select is((select count(*)::integer from activity_requirements where activity_template_id in (select md5('logos-academy-explorer-v1-activity-' || n)::uuid from generate_series(1,16) n)), 16, 'Explorer v1 has activity requirements');
select is((select count(*)::integer from activity_criteria where activity_template_id in (select md5('logos-academy-explorer-v1-activity-' || n)::uuid from generate_series(1,16) n)), 16, 'Explorer v1 has activity criteria');
select is((select count(*)::integer from lesson_concepts where lesson_template_id in (select md5('logos-academy-explorer-v1-lesson-' || n)::uuid from generate_series(1,16) n)), 16, 'Explorer v1 preserves lesson-concept relations');
select is((select title from lesson_templates where id = md5('logos-academy-explorer-v1-lesson-16')::uuid), 'Demo Day', 'Explorer v1 preserves Demo Day');
select is((select title from lesson_templates where id = md5('logos-academy-explorer-v1-lesson-4')::uuid), 'Project Day: Meu Assistente Inteligente', 'Explorer v1 preserves first Project Day');
select lives_ok($$insert into curricula (id, tenant_id, name, version, status) values (md5('logos-academy-explorer-v1-curriculum')::uuid, md5('logos-academy-operational-tenant')::uuid, 'Explorer', 'v1', 'active') on conflict do nothing$$, 'canonical curriculum upsert remains idempotent');
select is((select count(*)::integer from curricula where tenant_id = md5('logos-academy-operational-tenant')::uuid and name = 'Explorer' and version = 'v1'), 1, 'idempotent re-import does not duplicate version');
select throws_ok($$update curricula set name = 'Explorer changed' where id = md5('logos-academy-explorer-v1-curriculum')::uuid$$, '42501', 'Explorer v1 curriculum is immutable', 'canonical curriculum cannot be edited');

select * from finish();
rollback;
