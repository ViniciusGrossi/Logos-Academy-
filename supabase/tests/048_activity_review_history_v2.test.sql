begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(21);

insert into activity_assignments(id,tenant_id,enrollment_id,session_id,activity_template_id,status)
values(md5('review-v2-locked')::uuid,'10000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001',md5('academy-a-session-2')::uuid,md5('academy-a-activity-2')::uuid,'locked');
insert into uploaded_files(id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status)
values(md5('review-v2-file-a')::uuid,'10000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/1a000000-0000-0000-0000-000000000001/'||md5('review-v2-file-a')::uuid,extensions.pgp_sym_encrypt('evidence.pdf','local-seed-only'),'application/pdf',100,'ready');

select throws_ok(
  $$select logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',md5('review-v2-locked')::uuid,'local-seed-only')$$,
  '42501','assignment not available','locked activity cannot be opened directly'
);

update activity_assignments set due_at=now()-interval '2 days'
where id='1a000000-0000-0000-0000-000000000001';
update submissions set submitted_at=now()-interval '1 day'
where id='1b000000-0000-0000-0000-000000000001';

select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'canEdit')::boolean,false,'submitted activity is read-only');
select is(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'readOnlyReason','submitted','submitted reason is projected');
select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'isOverdue')::boolean,false,'overdue is false while editing is blocked');
select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->'latestSubmission'->>'isLate')::boolean,true,'submission keeps late-at-submit state');

select throws_ok(
  $$select logos_academy.admin_publish_review('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','approved','Incoerente',jsonb_build_array(jsonb_build_object('criterionId',md5('academy-a-criterion-1')::uuid,'result','needs_adjustment')),'local-seed-only',md5('review-v2-invalid')::uuid)$$,
  '22023','review decision conflicts with rubric','approved rejects needs_adjustment rubric'
);

select lives_ok(
  $$select logos_academy.admin_publish_review('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','revision_requested','Ajuste solicitado',jsonb_build_array(jsonb_build_object('criterionId',md5('academy-a-criterion-1')::uuid,'result','needs_adjustment','comment','Detalhe')),'local-seed-only',md5('review-v2-valid')::uuid)$$,
  'coherent revision review is published'
);
select is((select count(*)::integer from submissions where activity_assignment_id='1a000000-0000-0000-0000-000000000001' and is_draft and deleted_at is null),1,'revision creates one next draft');
select is((select count(*)::integer from submission_items where submission_id=(select id from submissions where activity_assignment_id='1a000000-0000-0000-0000-000000000001' and is_draft and deleted_at is null)),1,'next draft copies prior items');

select lives_ok(
  $$select logos_academy.admin_publish_review('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','revision_requested','Correção administrativa',jsonb_build_array(jsonb_build_object('criterionId',md5('academy-a-criterion-1')::uuid,'result','needs_adjustment')),'local-seed-only',md5('review-v2-correction')::uuid)$$,
  'administrative correction appends another review'
);
select is((select count(*)::integer from reviews where submission_id='1b000000-0000-0000-0000-000000000001'),2,'multiple reviews remain auditable');
select throws_ok($$update reviews set decision='approved' where submission_id='1b000000-0000-0000-0000-000000000001'$$,'42501','reviews is append-only','published reviews remain immutable');

select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'canEdit')::boolean,true,'active enrollment can edit requested revision');
select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'isOverdue')::boolean,true,'editable overdue revision is marked overdue');
update enrollments set status='paused' where id='18000000-0000-0000-0000-000000000001';
select is(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'readOnlyReason','inactive_enrollment','inactive enrollment has explicit read-only reason');
select is((logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->>'isOverdue')::boolean,false,'inactive enrollment is never marked overdue');

select is(jsonb_array_length(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->'submissionHistory'->'items'),1,'history is returned as a bounded Page');
select is(jsonb_array_length(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->'submissionHistory'->'items'->0->'reviews'),2,'submission exposes all reviews');
select is(logos_academy.student_activity_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','1a000000-0000-0000-0000-000000000001','local-seed-only')->'submissionHistory'->'items'->0->'review'->>'feedback','Correção administrativa','review alias points to latest review');

select lives_ok($$select logos_academy.student_file_metadata('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('review-v2-file-a')::uuid,'local-seed-only')$$,'same-tenant admin can resolve download metadata');
select throws_ok($$select logos_academy.student_file_metadata('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',md5('review-v2-file-a')::uuid,'local-seed-only')$$,'42501','file not available','cross-tenant admin cannot resolve download metadata');

select * from finish();
rollback;
