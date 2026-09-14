begin;

create or replace function logos_academy.student_activity_detail(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_assignment_id uuid,
  p_encryption_key text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; v jsonb;
begin
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,false);
  with item_rows as (
    select si.submission_id,jsonb_agg(jsonb_build_object('id',si.id,'requirementId',si.activity_requirement_id,'kind',si.kind,'textValue',case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) end,'urlValue',case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted,p_encryption_key) end,'fileId',si.uploaded_file_id) order by si.created_at,si.id) items
    from logos_academy.submission_items si where si.tenant_id=aa.tenant_id and si.deleted_at is null group by si.submission_id
  ), review_rows as (
    select distinct on (r.submission_id) r.submission_id,jsonb_build_object('id',r.id,'decision',r.decision,'feedback',extensions.pgp_sym_decrypt(r.feedback_encrypted,p_encryption_key),'reviewerName',u.display_name,'reviewedAt',r.reviewed_at,'seenAt',fr.seen_at,'criteria',coalesce((select jsonb_agg(jsonb_build_object('criterionId',cr.activity_criterion_id,'result',cr.result,'comment',case when cr.comment_encrypted is null then null else extensions.pgp_sym_decrypt(cr.comment_encrypted,p_encryption_key) end) order by ac.position,cr.id) from logos_academy.criterion_reviews cr join logos_academy.activity_criteria ac on ac.tenant_id=cr.tenant_id and ac.id=cr.activity_criterion_id where cr.tenant_id=r.tenant_id and cr.review_id=r.id and cr.deleted_at is null),'[]'::jsonb)) review
    from logos_academy.reviews r join logos_academy.users u on u.tenant_id=r.tenant_id and u.id=r.reviewer_user_id left join logos_academy.feedback_receipts fr on fr.tenant_id=r.tenant_id and fr.review_id=r.id and fr.deleted_at is null where r.tenant_id=aa.tenant_id and r.deleted_at is null order by r.submission_id,r.reviewed_at desc
  ), submission_rows as (
    select s.id,s.is_draft,s.version,jsonb_build_object('id',s.id,'assignmentId',s.activity_assignment_id,'version',s.version,'isDraft',s.is_draft,'submittedAt',s.submitted_at,'items',coalesce(i.items,'[]'::jsonb),'review',rr.review) detail
    from logos_academy.submissions s left join item_rows i on i.submission_id=s.id left join review_rows rr on rr.submission_id=s.id where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null
  ), submission_projection as (
    select (select detail from submission_rows order by is_draft desc,version desc limit 1) latest_submission,coalesce((select jsonb_agg(detail order by version desc) from submission_rows where not is_draft),'[]'::jsonb) submission_history
  )
  select jsonb_build_object(
    'id',at.id,'assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'objective',at.objective,'instructions',at.instructions,'continuityGuidance',at.continuity_guidance,'estimatedMinutes',at.estimated_minutes,'dueAt',aa.due_at,'status',aa.status,'isOverdue',aa.due_at<now(),'supplementalInstructions',aa.supplemental_instructions,
    'project',(select private.project_dossier_json(aa.tenant_id,pr.id,p_encryption_key) from logos_academy.project_records pr where pr.tenant_id=aa.tenant_id and pr.enrollment_id=aa.enrollment_id and pr.cycle_id=lt.cycle_id and pr.deleted_at is null limit 1),
    'concepts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'releasedAt',aa.released_at)) from logos_academy.lesson_concepts lc join logos_academy.concepts c on c.tenant_id=lc.tenant_id and c.id=lc.concept_id where lc.tenant_id=aa.tenant_id and lc.lesson_template_id=lt.id and lc.deleted_at is null and c.deleted_at is null),'[]'::jsonb),
    'requirements',coalesce((select jsonb_agg(jsonb_build_object('id',ar.id,'kind',ar.kind,'label',ar.label,'required',ar.is_required,'position',ar.position) order by ar.position) from logos_academy.activity_requirements ar where ar.tenant_id=aa.tenant_id and ar.activity_template_id=at.id and ar.deleted_at is null),'[]'::jsonb),
    'criteria',coalesce((select jsonb_agg(jsonb_build_object('id',ac.id,'label',ac.label,'description',ac.description,'position',ac.position) order by ac.position) from logos_academy.activity_criteria ac where ac.tenant_id=aa.tenant_id and ac.activity_template_id=at.id and ac.deleted_at is null),'[]'::jsonb),
    'latestSubmission',sp.latest_submission,'submissionHistory',sp.submission_history
  ) into v
  from logos_academy.activity_templates at join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id cross join submission_projection sp
  where at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id;
  return v;
end; $$;

revoke all on function logos_academy.student_activity_detail(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function logos_academy.student_activity_detail(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
