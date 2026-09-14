begin;
select plan(8);
set search_path = logos_academy, public, extensions;

select has_column('logos_academy', 'activity_templates', 'context', 'activity context is persisted');
select has_column('logos_academy', 'activity_templates', 'steps', 'activity steps are persisted');
select ok(exists(select 1 from pg_constraint where conname='activity_templates_steps_array_check' and conrelid='logos_academy.activity_templates'::regclass), 'steps must be a JSON array');
select is((select count(*)::integer from activity_templates at join tenants t on t.id=at.tenant_id where t.slug='logos-academy' and at.title not like 'Missão %' and at.context is not null and at.expected_result is not null), 16, 'all Explorer activities have pedagogical content and real titles');
select ok((select count(*) from activity_requirements ar join activity_templates at on at.id=ar.activity_template_id and at.tenant_id=ar.tenant_id join tenants t on t.id=at.tenant_id where t.slug='logos-academy') > 16, 'activities expose multiple deliverables');
select ok((select count(*) from activity_criteria ac join activity_templates at on at.id=ac.activity_template_id and at.tenant_id=ac.tenant_id join tenants t on t.id=at.tenant_id where t.slug='logos-academy') > 16, 'activities expose atomic criteria');
select ok(pg_get_functiondef('logos_academy.student_activity_detail(uuid,uuid,uuid,text)'::regprocedure) like '%fileName%', 'activity projection exposes the encrypted filename safely');
select ok(not has_function_privilege('authenticated','logos_academy.student_activity_detail(uuid,uuid,uuid,text)','execute'), 'decrypting activity projection remains service-role only');

select * from finish();
rollback;
