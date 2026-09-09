begin;

create or replace function private.student_uploaded_file_json(p_file logos_academy.uploaded_files, p_encryption_key text) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',p_file.id,'assignmentId',p_file.activity_assignment_id,'filename',extensions.pgp_sym_decrypt(p_file.filename_encrypted,p_encryption_key),'contentType',p_file.content_type,'sizeBytes',p_file.size_bytes,'status',p_file.status);
$$;

create or replace function private.student_submission_detail(p_tenant_id uuid,p_submission_id uuid,p_encryption_key text) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',s.id,'assignmentId',s.activity_assignment_id,'version',s.version,'isDraft',s.is_draft,'submittedAt',s.submitted_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',si.id,'requirementId',si.activity_requirement_id,'kind',si.kind,'textValue',case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) end,'urlValue',case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted,p_encryption_key) end,'fileId',si.uploaded_file_id) order by si.created_at,si.id) from logos_academy.submission_items si where si.tenant_id=s.tenant_id and si.submission_id=s.id and si.deleted_at is null),'[]'::jsonb),
    'review',(select jsonb_build_object('id',r.id,'decision',r.decision,'feedback',extensions.pgp_sym_decrypt(r.feedback_encrypted,p_encryption_key),'reviewerName',u.display_name,'reviewedAt',r.reviewed_at,'seenAt',fr.seen_at,'criteria',coalesce((select jsonb_agg(jsonb_build_object('criterionId',cr.activity_criterion_id,'result',cr.result,'comment',case when cr.comment_encrypted is null then null else extensions.pgp_sym_decrypt(cr.comment_encrypted,p_encryption_key) end) order by ac.position,cr.id) from logos_academy.criterion_reviews cr join logos_academy.activity_criteria ac on ac.tenant_id=cr.tenant_id and ac.id=cr.activity_criterion_id where cr.tenant_id=r.tenant_id and cr.review_id=r.id and cr.deleted_at is null),'[]'::jsonb)) from logos_academy.reviews r join logos_academy.users u on u.tenant_id=r.tenant_id and u.id=r.reviewer_user_id left join logos_academy.feedback_receipts fr on fr.tenant_id=r.tenant_id and fr.review_id=r.id and fr.deleted_at is null where r.tenant_id=s.tenant_id and r.submission_id=s.id and r.deleted_at is null order by r.reviewed_at desc limit 1)
  ) from logos_academy.submissions s where s.tenant_id=p_tenant_id and s.id=p_submission_id and s.deleted_at is null;
$$;

create or replace function logos_academy.student_activity_detail(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; v jsonb;
begin
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,false);
  select jsonb_build_object('id',at.id,'assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'objective',at.objective,'instructions',at.instructions,'continuityGuidance',at.continuity_guidance,'estimatedMinutes',at.estimated_minutes,'dueAt',aa.due_at,'status',aa.status,'isOverdue',aa.due_at<now(),'supplementalInstructions',aa.supplemental_instructions,'concepts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'releasedAt',aa.released_at)) from logos_academy.lesson_concepts lc join logos_academy.concepts c on c.tenant_id=lc.tenant_id and c.id=lc.concept_id where lc.tenant_id=aa.tenant_id and lc.lesson_template_id=lt.id and lc.deleted_at is null and c.deleted_at is null),'[]'::jsonb),'requirements',coalesce((select jsonb_agg(jsonb_build_object('id',ar.id,'kind',ar.kind,'label',ar.label,'required',ar.is_required,'position',ar.position) order by ar.position) from logos_academy.activity_requirements ar where ar.tenant_id=aa.tenant_id and ar.activity_template_id=at.id and ar.deleted_at is null),'[]'::jsonb),'criteria',coalesce((select jsonb_agg(jsonb_build_object('id',ac.id,'label',ac.label,'description',ac.description,'position',ac.position) order by ac.position) from logos_academy.activity_criteria ac where ac.tenant_id=aa.tenant_id and ac.activity_template_id=at.id and ac.deleted_at is null),'[]'::jsonb),'latestSubmission',(select private.student_submission_detail(aa.tenant_id,s.id,p_encryption_key) from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null order by s.is_draft desc,s.version desc limit 1),'submissionHistory',coalesce((select jsonb_agg(private.student_submission_detail(aa.tenant_id,s.id,p_encryption_key) order by s.version desc) from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and not s.is_draft and s.deleted_at is null),'[]'::jsonb)) into v from logos_academy.activity_templates at join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id;
  return v;
end; $$;

create or replace function logos_academy.student_save_draft(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_items jsonb,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; draft_id uuid; item jsonb;
begin
  if jsonb_typeof(p_items)<>'array' then raise exception using errcode='22023',message='items must be array'; end if;
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,true);
  insert into logos_academy.submissions(tenant_id,activity_assignment_id,version,is_draft) select p_tenant_id,aa.id,coalesce(max(version),0)+1,true from logos_academy.submissions where tenant_id=p_tenant_id and activity_assignment_id=aa.id on conflict do nothing returning id into draft_id;
  if draft_id is null then select id into draft_id from logos_academy.submissions where tenant_id=p_tenant_id and activity_assignment_id=aa.id and is_draft and deleted_at is null; end if;
  delete from logos_academy.submission_items where tenant_id=p_tenant_id and submission_id=draft_id;
  for item in select value from jsonb_array_elements(p_items) loop
    if not exists(select 1 from logos_academy.activity_requirements ar where ar.tenant_id=p_tenant_id and ar.id=(item->>'requirementId')::uuid and ar.activity_template_id=aa.activity_template_id and ar.deleted_at is null) then raise exception using errcode='22023',message='invalid requirement'; end if;
    if item->>'kind' in ('external_link','github_repository') and (item->>'urlValue') !~ '^https://' then raise exception using errcode='22023',message='HTTPS URL required'; end if;
    insert into logos_academy.submission_items(tenant_id,submission_id,activity_requirement_id,kind,text_value_encrypted,url_value_encrypted,uploaded_file_id) values(p_tenant_id,draft_id,(item->>'requirementId')::uuid,item->>'kind',case when item->>'kind'='text' then extensions.pgp_sym_encrypt(item->>'textValue',p_encryption_key) end,case when item->>'kind' in ('external_link','github_repository') then extensions.pgp_sym_encrypt(item->>'urlValue',p_encryption_key) end,case when item->>'kind'='file' then (item->>'fileId')::uuid end);
  end loop;
  update logos_academy.activity_assignments set status='draft' where id=aa.id and status='available';
  return private.student_submission_detail(p_tenant_id,draft_id,p_encryption_key);
end; $$;

create or replace function logos_academy.student_submit_activity(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_expected_draft_id uuid,p_request_id uuid,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; draft logos_academy.submissions%rowtype;
begin
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,true); select * into draft from logos_academy.submissions where tenant_id=p_tenant_id and id=p_expected_draft_id and activity_assignment_id=aa.id and is_draft and deleted_at is null for update;
  if draft.id is null then raise exception using errcode='40001',message='draft stale'; end if;
  if exists(select 1 from logos_academy.activity_requirements ar where ar.tenant_id=p_tenant_id and ar.activity_template_id=aa.activity_template_id and ar.is_required and ar.deleted_at is null and not exists(select 1 from logos_academy.submission_items si where si.tenant_id=p_tenant_id and si.submission_id=draft.id and si.activity_requirement_id=ar.id and si.deleted_at is null)) then raise exception using errcode='23514',message='required items missing'; end if;
  update logos_academy.submissions set is_draft=false,submitted_at=now() where id=draft.id; update logos_academy.activity_assignments set status='submitted' where id=aa.id;
  return private.student_submission_detail(p_tenant_id,draft.id,p_encryption_key);
end; $$;

create or replace function logos_academy.student_create_upload(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_filename text,p_content_type text,p_size_bytes integer,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; sp uuid; f logos_academy.uploaded_files%rowtype; file_id uuid:=gen_random_uuid(); path text;
begin
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,true); if p_size_bytes not between 1 and 20971520 or p_content_type not in ('application/pdf','text/plain','text/markdown','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation') then raise exception using errcode='22023',message='invalid file metadata'; end if;
  select id into sp from logos_academy.student_profiles where tenant_id=p_tenant_id and user_id=p_actor_user_id and deleted_at is null; path:=p_tenant_id::text||'/'||sp::text||'/'||aa.id::text||'/'||file_id::text;
  insert into logos_academy.uploaded_files(id,tenant_id,student_profile_id,activity_assignment_id,uploaded_by_user_id,storage_path,filename_encrypted,content_type,size_bytes,status) values(file_id,p_tenant_id,sp,aa.id,p_actor_user_id,path,extensions.pgp_sym_encrypt(p_filename,p_encryption_key),p_content_type,p_size_bytes,'pending') returning * into f;
  return jsonb_build_object('file',private.student_uploaded_file_json(f,p_encryption_key),'storagePath',f.storage_path);
end; $$;

create or replace function logos_academy.student_finalize_upload(p_tenant_id uuid,p_actor_user_id uuid,p_file_id uuid,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f logos_academy.uploaded_files%rowtype; m jsonb;
begin select uf.* into f from logos_academy.uploaded_files uf join logos_academy.student_profiles sp on sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id where uf.tenant_id=p_tenant_id and uf.id=p_file_id and uf.deleted_at is null and sp.user_id=p_actor_user_id for update; if f.id is null then raise exception using errcode='42501',message='file not available'; end if; perform private.student_actor_assignment(p_tenant_id,p_actor_user_id,f.activity_assignment_id,true); select metadata into m from storage.objects where bucket_id='submissions' and name=f.storage_path; if m is null or coalesce(m->>'size','') !~ '^[0-9]+$' or (m->>'size')::integer<>f.size_bytes or m->>'mimetype' is distinct from f.content_type then raise exception using errcode='23514',message='uploaded object mismatch'; end if; update logos_academy.uploaded_files set status='ready' where id=f.id returning * into f; return private.student_uploaded_file_json(f,p_encryption_key); end; $$;

create or replace function logos_academy.student_file_metadata(p_tenant_id uuid,p_actor_user_id uuid,p_file_id uuid,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f logos_academy.uploaded_files%rowtype;
begin select uf.* into f from logos_academy.uploaded_files uf join logos_academy.student_profiles sp on sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id where uf.tenant_id=p_tenant_id and uf.id=p_file_id and uf.deleted_at is null and sp.user_id=p_actor_user_id; if f.id is null or f.status<>'ready' then raise exception using errcode='42501',message='file not available'; end if; return jsonb_build_object('file',private.student_uploaded_file_json(f,p_encryption_key),'storagePath',f.storage_path); end; $$;

revoke all on function private.student_uploaded_file_json(logos_academy.uploaded_files,text),private.student_submission_detail(uuid,uuid,text),logos_academy.student_activity_detail(uuid,uuid,uuid,text),logos_academy.student_save_draft(uuid,uuid,uuid,jsonb,text),logos_academy.student_submit_activity(uuid,uuid,uuid,uuid,uuid,text),logos_academy.student_create_upload(uuid,uuid,uuid,text,text,integer,text),logos_academy.student_finalize_upload(uuid,uuid,uuid,text),logos_academy.student_file_metadata(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function logos_academy.student_activity_detail(uuid,uuid,uuid,text),logos_academy.student_save_draft(uuid,uuid,uuid,jsonb,text),logos_academy.student_submit_activity(uuid,uuid,uuid,uuid,uuid,text),logos_academy.student_create_upload(uuid,uuid,uuid,text,text,integer,text),logos_academy.student_finalize_upload(uuid,uuid,uuid,text),logos_academy.student_file_metadata(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema'; commit;
