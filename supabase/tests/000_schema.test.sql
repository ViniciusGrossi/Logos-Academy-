begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(10);

select is(
  (select count(*)::integer from information_schema.tables where table_schema = 'logos_academy' and table_name in (
    'tenants','users','tenant_memberships','student_profiles','guardian_records','consent_records','curricula','cycles',
    'lesson_templates','concepts','lesson_concepts','activity_templates','activity_requirements','activity_criteria','classes',
    'enrollments','sessions','attendance_records','attendance_private_notes','makeup_records','activity_assignments','submissions',
    'submission_items','uploaded_files','reviews','criterion_reviews','feedback_receipts','project_records','presentation_records',
    'completion_records','audit_events','idempotency_keys'
  )), 32, 'all 32 approved public tables exist');

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logos_academy' and c.relname in (select table_name from information_schema.tables where table_schema='logos_academy')
    and c.relrowsecurity), 32, 'RLS is enabled on every product table');

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logos_academy' and c.relname in (select table_name from information_schema.tables where table_schema='logos_academy')
    and c.relforcerowsecurity), 32, 'RLS is forced on every product table');

select is((select count(*)::integer from information_schema.columns
  where table_schema='logos_academy' and table_name in (select table_name from information_schema.tables where table_schema='logos_academy')
    and column_name='created_at'), 32, 'every product table has created_at');
select is((select count(*)::integer from information_schema.columns
  where table_schema='logos_academy' and table_name in (select table_name from information_schema.tables where table_schema='logos_academy')
    and column_name='updated_at'), 32, 'every product table has updated_at');
select is((select count(*)::integer from information_schema.columns
  where table_schema='logos_academy' and table_name in (select table_name from information_schema.tables where table_schema='logos_academy')
    and column_name='deleted_at'), 32, 'every product table has soft-delete timestamp');

select ok(exists(select 1 from pg_extension where extname='pgcrypto'), 'pgcrypto is installed');
select is((select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'submissions_objects_%'), 4, 'storage has four operation policies');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='logos_academy' and grantee='anon'), 0, 'anon has no product-table grants');
select is((select count(*)::integer from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
  where n.nspname='logos_academy' and c.contype='f' and c.confdeltype <> 'r'), 0, 'every foreign key uses explicit ON DELETE RESTRICT');

select * from finish();
rollback;
