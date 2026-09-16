begin;

create or replace function private.activity_review_json(p_tenant_id uuid,p_review_id uuid,p_student_profile_id uuid,p_encryption_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',r.id,'decision',r.decision,'feedback',extensions.pgp_sym_decrypt(r.feedback_encrypted,p_encryption_key),'reviewerName',u.display_name,'reviewedAt',r.reviewed_at,
    'seenAt',(select fr.seen_at from logos_academy.feedback_receipts fr where fr.tenant_id=r.tenant_id and fr.review_id=r.id and fr.student_profile_id=p_student_profile_id and fr.deleted_at is null order by fr.seen_at desc limit 1),
    'criteria',coalesce((select jsonb_agg(jsonb_build_object('criterionId',cr.activity_criterion_id,'result',cr.result,'comment',case when cr.comment_encrypted is null then null else extensions.pgp_sym_decrypt(cr.comment_encrypted,p_encryption_key) end) order by ac.position,cr.id) from logos_academy.criterion_reviews cr join logos_academy.activity_criteria ac on ac.tenant_id=cr.tenant_id and ac.id=cr.activity_criterion_id where cr.tenant_id=r.tenant_id and cr.review_id=r.id and cr.deleted_at is null),'[]'::jsonb))
  from logos_academy.reviews r join logos_academy.users u on u.tenant_id=r.tenant_id and u.id=r.reviewer_user_id
  where r.tenant_id=p_tenant_id and r.id=p_review_id and r.deleted_at is null;
$$;

create or replace function private.admin_submission_detail(p_tenant_id uuid,p_submission_id uuid,p_encryption_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',s.id,'assignmentId',s.activity_assignment_id,'version',s.version,'isDraft',s.is_draft,
    'isLate',coalesce(s.submitted_at>aa.due_at,false),'submittedAt',s.submitted_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',si.id,'requirementId',si.activity_requirement_id,'kind',si.kind,'textValue',case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) end,'urlValue',case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted,p_encryption_key) end,'fileId',si.uploaded_file_id,'fileName',case when uf.filename_encrypted is null then null else extensions.pgp_sym_decrypt(uf.filename_encrypted,p_encryption_key) end) order by si.created_at,si.id) from logos_academy.submission_items si left join logos_academy.uploaded_files uf on uf.tenant_id=si.tenant_id and uf.id=si.uploaded_file_id and uf.deleted_at is null where si.tenant_id=s.tenant_id and si.submission_id=s.id and si.deleted_at is null),'[]'::jsonb),
    'criteria',coalesce((select jsonb_agg(jsonb_build_object('id',ac.id,'label',ac.label,'description',ac.description,'position',ac.position) order by ac.position,ac.id) from logos_academy.activity_criteria ac where ac.tenant_id=aa.tenant_id and ac.activity_template_id=aa.activity_template_id and ac.deleted_at is null),'[]'::jsonb),
    'review',(select private.activity_review_json(s.tenant_id,r.id,e.student_profile_id,p_encryption_key) from logos_academy.reviews r where r.tenant_id=s.tenant_id and r.submission_id=s.id and r.deleted_at is null order by r.reviewed_at desc,r.id desc limit 1),
    'reviews',coalesce((select jsonb_agg(private.activity_review_json(s.tenant_id,r.id,e.student_profile_id,p_encryption_key) order by r.reviewed_at,r.id) from logos_academy.reviews r where r.tenant_id=s.tenant_id and r.submission_id=s.id and r.deleted_at is null),'[]'::jsonb))
  from logos_academy.submissions s join logos_academy.activity_assignments aa on aa.tenant_id=s.tenant_id and aa.id=s.activity_assignment_id join logos_academy.enrollments e on e.tenant_id=aa.tenant_id and e.id=aa.enrollment_id
  where s.tenant_id=p_tenant_id and s.id=p_submission_id and s.deleted_at is null;
$$;

drop function if exists logos_academy.student_activity_detail(uuid,uuid,uuid,text);

create or replace function logos_academy.student_activity_detail(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_encryption_key text,p_history_cursor text default null,p_history_limit integer default 5)
returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; enrollment_status text; student_id uuid; can_edit boolean; v jsonb; history_limit integer:=greatest(1,least(coalesce(p_history_limit,5),20)); cursor_value jsonb; cursor_version integer; cursor_id uuid;
begin
  if p_history_cursor is not null then
    begin
      cursor_value:=convert_from(decode(p_history_cursor,'base64'),'utf8')::jsonb;
      cursor_version:=(cursor_value->>0)::integer;
      cursor_id:=(cursor_value->>1)::uuid;
    exception when others then
      raise exception using errcode='22023',message='invalid history cursor';
    end;
  end if;
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,false);
  select e.status,e.student_profile_id into enrollment_status,student_id from logos_academy.enrollments e where e.tenant_id=aa.tenant_id and e.id=aa.enrollment_id and e.deleted_at is null;
  can_edit:=enrollment_status='active' and aa.status in ('available','draft','revision_requested');
  with submission_rows as (
    select s.id,s.version,s.is_draft,private.admin_submission_detail(aa.tenant_id,s.id,p_encryption_key) detail
    from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null
  ), submitted_page as (
    select * from submission_rows where not is_draft and (cursor_value is null or (version,id)<(cursor_version,cursor_id)) order by version desc,id desc limit history_limit+1
  )
  select jsonb_build_object('id',at.id,'assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'objective',at.objective,'instructions',at.instructions,'continuityGuidance',at.continuity_guidance,'estimatedMinutes',at.estimated_minutes,'dueAt',aa.due_at,'status',aa.status,
    'isOverdue',can_edit and aa.due_at<now(),'canEdit',can_edit,'readOnlyReason',case when enrollment_status<>'active' then 'inactive_enrollment' when aa.status='submitted' then 'submitted' when aa.status='approved' then 'approved' else null end,
    'supplementalInstructions',aa.supplemental_instructions,'context',at.context,'expectedResult',at.expected_result,'steps',coalesce((select jsonb_agg(jsonb_build_object('position',x.ordinality,'label',x.value #>> '{}') order by x.ordinality) from jsonb_array_elements(at.steps) with ordinality x(value,ordinality)),'[]'::jsonb),'planB',at.plan_b,'reflectionPrompt',at.reflection_prompt,'portfolioEvidence',at.portfolio_evidence,'toolHint',at.tool_hint,
    'project',(select private.project_dossier_json(aa.tenant_id,pr.id,p_encryption_key) from logos_academy.project_records pr where pr.tenant_id=aa.tenant_id and pr.enrollment_id=aa.enrollment_id and pr.cycle_id=lt.cycle_id and pr.deleted_at is null limit 1),
    'concepts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'releasedAt',aa.released_at)) from logos_academy.lesson_concepts lc join logos_academy.concepts c on c.tenant_id=lc.tenant_id and c.id=lc.concept_id where lc.tenant_id=aa.tenant_id and lc.lesson_template_id=lt.id and lc.deleted_at is null and c.deleted_at is null),'[]'::jsonb),
    'requirements',coalesce((select jsonb_agg(jsonb_build_object('id',ar.id,'kind',ar.kind,'label',ar.label,'required',ar.is_required,'position',ar.position) order by ar.position) from logos_academy.activity_requirements ar where ar.tenant_id=aa.tenant_id and ar.activity_template_id=at.id and ar.deleted_at is null),'[]'::jsonb),
    'criteria',coalesce((select jsonb_agg(jsonb_build_object('id',ac.id,'label',ac.label,'description',ac.description,'position',ac.position) order by ac.position) from logos_academy.activity_criteria ac where ac.tenant_id=aa.tenant_id and ac.activity_template_id=at.id and ac.deleted_at is null),'[]'::jsonb),
    'latestReview',(select private.activity_review_json(aa.tenant_id,r.id,student_id,p_encryption_key) from logos_academy.reviews r join logos_academy.submissions s on s.tenant_id=r.tenant_id and s.id=r.submission_id where r.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and r.deleted_at is null order by r.reviewed_at desc,r.id desc limit 1),
    'latestSubmission',(select detail from submission_rows order by is_draft desc,version desc,id desc limit 1),
    'submissionHistory',jsonb_build_object('items',coalesce((select jsonb_agg(detail order by version desc,id desc) from (select * from submitted_page limit history_limit) p),'[]'::jsonb),'nextCursor',case when exists(select 1 from submitted_page offset history_limit limit 1) then (select encode(convert_to(jsonb_build_array(version,id)::text,'utf8'),'base64') from submitted_page offset greatest(history_limit-1,0) limit 1) else null end)
  ) into v from logos_academy.activity_templates at join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id;
  return v;
end; $$;

create or replace function logos_academy.student_file_metadata(p_tenant_id uuid,p_actor_user_id uuid,p_file_id uuid,p_encryption_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f logos_academy.uploaded_files%rowtype;
begin
  select uf.* into f from logos_academy.uploaded_files uf
  where uf.tenant_id=p_tenant_id and uf.id=p_file_id and uf.status='ready' and uf.deleted_at is null
    and (exists(select 1 from logos_academy.student_profiles sp where sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id and sp.user_id=p_actor_user_id and sp.deleted_at is null)
      or exists(select 1 from logos_academy.tenant_memberships tm join logos_academy.users u on u.tenant_id=tm.tenant_id and u.id=tm.user_id where tm.tenant_id=uf.tenant_id and tm.user_id=p_actor_user_id and tm.role='admin' and tm.deleted_at is null and u.access_enabled and u.deleted_at is null));
  if f.id is null then raise exception using errcode='42501',message='file not available'; end if;
  return jsonb_build_object('file',private.student_uploaded_file_json(f,p_encryption_key),'storagePath',f.storage_path);
end; $$;

create or replace function logos_academy.admin_publish_review(p_tenant_id uuid,p_actor_user_id uuid,p_submission_id uuid,p_decision text,p_feedback text,p_criteria jsonb,p_encryption_key text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare submission logos_academy.submissions%rowtype; assignment logos_academy.activity_assignments%rowtype; review_id uuid:=gen_random_uuid(); prior_id uuid; draft_id uuid; item jsonb; criterion_count integer; has_adjustment boolean;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if p_decision not in ('approved','revision_requested') or length(btrim(coalesce(p_feedback,'')))=0 or jsonb_typeof(p_criteria)<>'array' or length(coalesce(p_encryption_key,''))=0 then raise exception using errcode='22023',message='invalid review payload'; end if;
  select s.* into submission from logos_academy.submissions s where s.tenant_id=p_tenant_id and s.id=p_submission_id and not s.is_draft and s.deleted_at is null for update;
  if submission.id is null then raise exception using errcode='P0002',message='submission not found'; end if;
  select aa.* into assignment from logos_academy.activity_assignments aa where aa.tenant_id=p_tenant_id and aa.id=submission.activity_assignment_id and aa.deleted_at is null for update;
  select count(*) into criterion_count from logos_academy.activity_criteria ac where ac.tenant_id=p_tenant_id and ac.activity_template_id=assignment.activity_template_id and ac.deleted_at is null;
  if jsonb_array_length(p_criteria)<>criterion_count or (select count(distinct value->>'criterionId') from jsonb_array_elements(p_criteria))<>criterion_count or exists(select 1 from jsonb_array_elements(p_criteria) j(value) where value->>'result' not in ('met','needs_adjustment') or not exists(select 1 from logos_academy.activity_criteria ac where ac.tenant_id=p_tenant_id and ac.activity_template_id=assignment.activity_template_id and ac.id=(value->>'criterionId')::uuid and ac.deleted_at is null)) then raise exception using errcode='22023',message='review criteria must exactly match the activity'; end if;
  select exists(select 1 from jsonb_array_elements(p_criteria) j(value) where value->>'result'='needs_adjustment') into has_adjustment;
  if (p_decision='approved' and has_adjustment) or (p_decision='revision_requested' and not has_adjustment) then raise exception using errcode='22023',message='review decision conflicts with rubric'; end if;
  select r.id into prior_id from logos_academy.reviews r where r.tenant_id=p_tenant_id and r.submission_id=submission.id and r.deleted_at is null order by r.reviewed_at desc,r.id desc limit 1;
  if assignment.status<>'submitted' and prior_id is null then raise exception using errcode='23505',message='submission is not awaiting review'; end if;
  insert into logos_academy.reviews(id,tenant_id,submission_id,reviewer_user_id,decision,feedback_encrypted,reviewed_at,supersedes_review_id) values(review_id,p_tenant_id,submission.id,p_actor_user_id,p_decision,extensions.pgp_sym_encrypt(btrim(p_feedback),p_encryption_key),now(),prior_id);
  for item in select value from jsonb_array_elements(p_criteria) loop insert into logos_academy.criterion_reviews(tenant_id,review_id,activity_criterion_id,result,comment_encrypted) values(p_tenant_id,review_id,(item->>'criterionId')::uuid,item->>'result',case when nullif(btrim(item->>'comment'),'') is null then null else extensions.pgp_sym_encrypt(btrim(item->>'comment'),p_encryption_key) end); end loop;
  update logos_academy.activity_assignments set status=p_decision where tenant_id=p_tenant_id and id=assignment.id;
  if p_decision='revision_requested' and not exists(select 1 from logos_academy.submissions s where s.tenant_id=p_tenant_id and s.activity_assignment_id=assignment.id and s.is_draft and s.deleted_at is null) then
    insert into logos_academy.submissions(tenant_id,activity_assignment_id,version,is_draft) select p_tenant_id,assignment.id,coalesce(max(s.version),0)+1,true from logos_academy.submissions s where s.tenant_id=p_tenant_id and s.activity_assignment_id=assignment.id returning id into draft_id;
    insert into logos_academy.submission_items(tenant_id,submission_id,activity_requirement_id,kind,text_value_encrypted,url_value_encrypted,uploaded_file_id)
      select p_tenant_id,draft_id,si.activity_requirement_id,si.kind,si.text_value_encrypted,si.url_value_encrypted,si.uploaded_file_id from logos_academy.submission_items si where si.tenant_id=p_tenant_id and si.submission_id=submission.id and si.deleted_at is null;
  end if;
  if prior_id is not null then
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata) values(p_tenant_id,p_actor_user_id,'review.superseded','review',prior_id,p_request_id,jsonb_build_object('superseded_by_review_id',review_id));
  end if;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata) values(p_tenant_id,p_actor_user_id,'review.published','review',review_id,p_request_id,jsonb_build_object('submission_id',submission.id,'decision',p_decision,'supersedes_review_id',prior_id));
  return private.admin_review_detail(p_tenant_id,review_id,p_encryption_key);
end; $$;

revoke all on function private.activity_review_json(uuid,uuid,uuid,text),private.admin_submission_detail(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function logos_academy.student_activity_detail(uuid,uuid,uuid,text, text,integer),logos_academy.student_file_metadata(uuid,uuid,uuid,text),logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_activity_detail(uuid,uuid,uuid,text,text,integer),logos_academy.student_file_metadata(uuid,uuid,uuid,text),logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
