begin;
select plan(8);
set search_path = logos_academy, public, extensions;

select has_column('logos_academy', 'activity_templates', 'context', 'activity context is persisted');
select has_column('logos_academy', 'activity_templates', 'steps', 'activity steps are persisted');
select ok(exists(select 1 from pg_constraint where conname='activity_templates_steps_array_check' and conrelid='logos_academy.activity_templates'::regclass), 'steps must be a JSON array');
select is((select count(*)::integer from activity_templates at join tenants t on t.id=at.tenant_id where t.slug='logos-academy' and at.title not like 'Missão %' and at.context is not null and at.expected_result is not null), 16, 'all Explorer activities have pedagogical content and real titles');
select ok((select count(*) from activity_requirements ar join activity_templates at on at.id=ar.activity_template_id and at.tenant_id=ar.tenant_id join tenants t on t.id=at.tenant_id where t.slug='logos-academy') > 16, 'activities expose multiple deliverables');
select ok((select count(*) from activity_criteria ac join activity_templates at on at.id=ac.activity_template_id and at.tenant_id=ac.tenant_id join tenants t on t.id=at.tenant_id where t.slug='logos-academy') > 16, 'activities expose atomic criteria');
-- File metadata is projected by a reused helper, not inline SQL. Assert the
-- authorized public payload rather than the helper's implementation location.
insert into activity_requirements(id,tenant_id,activity_template_id,kind,label,is_required,position)
values(md5('workbench-file-requirement')::uuid,'10000000-0000-0000-0000-000000000001',md5('academy-a-activity-1')::uuid,'file','Interface',false,2);
insert into uploaded_files(id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status)
values(md5('workbench-file')::uuid,'10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/1a000000-0000-0000-0000-000000000001/'||md5('workbench-file')::uuid,extensions.pgp_sym_encrypt('interface-premium.png','local-seed-only'),'image/png',100,'ready');
insert into submissions(id,tenant_id,activity_assignment_id,version,is_draft)
values(md5('workbench-file-draft')::uuid,'10000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001',2,true);
insert into submission_items(id,tenant_id,submission_id,activity_requirement_id,kind,uploaded_file_id)
values(md5('workbench-file-item')::uuid,'10000000-0000-0000-0000-000000000001',md5('workbench-file-draft')::uuid,md5('workbench-file-requirement')::uuid,'file',md5('workbench-file')::uuid);
set local role service_role;
select is(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->'latestSubmission'->'items'->0->>'fileName','interface-premium.png','activity payload decrypts the owned file filename through its current helper');
reset role;
select ok(not has_function_privilege('authenticated','logos_academy.student_activity_detail(uuid,uuid,uuid,text,text,integer)','execute'), 'decrypting activity projection remains service-role only');

select * from finish();
rollback;
