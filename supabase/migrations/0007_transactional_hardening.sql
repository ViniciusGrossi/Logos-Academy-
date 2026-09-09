begin;

-- PII decryption is deliberately owner-only. Public/authenticated callers use scoped RPCs.
revoke all on function private.decrypt_pii(uuid, bytea, text) from public, anon, authenticated, service_role;

create function private.current_user_id(p_tenant_id uuid, p_role text default null)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id
  from logos_academy.users u
  join logos_academy.tenant_memberships tm on tm.tenant_id = u.tenant_id and tm.user_id = u.id
  where u.tenant_id = p_tenant_id and u.auth_user_id = (select auth.uid())
    and u.access_enabled and u.deleted_at is null and tm.deleted_at is null
    and (p_role is null or tm.role = p_role)
  limit 1;
$$;

create function private.enrollment_accepts_mutation(p_tenant_id uuid, p_activity_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.activity_assignments aa
    join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
    where aa.tenant_id = p_tenant_id and aa.id = p_activity_assignment_id
      and aa.deleted_at is null and e.deleted_at is null and e.status = 'active'
      and aa.status in ('available','draft','submitted','revision_requested')
  );
$$;

create or replace function private.validate_attendance_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.sessions s join logos_academy.enrollments e on e.tenant_id = s.tenant_id
    where s.tenant_id = new.tenant_id and s.id = new.session_id and e.id = new.enrollment_id
      and e.deleted_at is null and s.deleted_at is null and s.status = 'completed'
      and ((s.class_id is not null and e.class_id = s.class_id) or s.enrollment_id = e.id)
  ) then raise exception using errcode = '23514', message = 'completed session does not belong to enrollment'; end if;
  return new;
end;
$$;

create or replace function private.validate_makeup_absence()
returns trigger language plpgsql set search_path = '' as $$
declare original_enrollment_id uuid;
begin
  select ar.enrollment_id into original_enrollment_id
  from logos_academy.attendance_records ar
  join logos_academy.sessions original_session on original_session.tenant_id = ar.tenant_id and original_session.id = ar.session_id
  where ar.tenant_id = new.tenant_id and ar.id = new.attendance_record_id
    and ar.status in ('absent','excused_absence') and ar.deleted_at is null
    and original_session.status = 'completed' and original_session.deleted_at is null;
  if original_enrollment_id is null then
    raise exception using errcode = '23514', message = 'makeup requires an active absence from a completed session';
  end if;
  if new.completed_at > now() then
    raise exception using errcode = '23514', message = 'makeup completion cannot be in the future';
  end if;
  if new.makeup_session_id is not null and not exists (
    select 1 from logos_academy.sessions s
    join logos_academy.enrollments e on e.tenant_id = s.tenant_id and e.id = original_enrollment_id
    where s.tenant_id = new.tenant_id and s.id = new.makeup_session_id
      and s.status = 'completed' and s.deleted_at is null and e.deleted_at is null
      and ((s.class_id is not null and s.class_id = e.class_id) or s.enrollment_id = e.id)
  ) then raise exception using errcode = '23514', message = 'makeup session is not a completed session for the enrollment'; end if;
  return new;
end;
$$;

create function private.validate_enrollment_curriculum()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.class_id is not null and not exists (
    select 1 from logos_academy.classes c where c.tenant_id = new.tenant_id and c.id = new.class_id
      and c.curriculum_id = new.curriculum_id and c.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'enrollment curriculum must match class curriculum'; end if;
  return new;
end;
$$;

create function private.validate_session_curriculum()
returns trigger language plpgsql set search_path = '' as $$
declare owner_curriculum_id uuid; lesson_curriculum_id uuid;
begin
  if new.class_id is not null then
    select c.curriculum_id into owner_curriculum_id from logos_academy.classes c
      where c.tenant_id = new.tenant_id and c.id = new.class_id and c.deleted_at is null;
  else
    select e.curriculum_id into owner_curriculum_id from logos_academy.enrollments e
      where e.tenant_id = new.tenant_id and e.id = new.enrollment_id and e.deleted_at is null;
  end if;
  select c.curriculum_id into lesson_curriculum_id
  from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id = lt.tenant_id and c.id = lt.cycle_id
  where lt.tenant_id = new.tenant_id and lt.id = new.lesson_template_id and lt.deleted_at is null and c.deleted_at is null;
  if owner_curriculum_id is null or lesson_curriculum_id is distinct from owner_curriculum_id then
    raise exception using errcode = '23514', message = 'session lesson must belong to owner curriculum';
  end if;
  return new;
end;
$$;

create or replace function private.validate_assignment_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.enrollments e
    join logos_academy.sessions s on s.tenant_id = e.tenant_id
    join logos_academy.activity_templates at on at.tenant_id = e.tenant_id and at.id = new.activity_template_id
    join logos_academy.lesson_templates lt on lt.tenant_id = at.tenant_id and lt.id = at.lesson_template_id
    join logos_academy.cycles c on c.tenant_id = lt.tenant_id and c.id = lt.cycle_id
    where e.tenant_id = new.tenant_id and e.id = new.enrollment_id and s.id = new.session_id
      and e.deleted_at is null and s.deleted_at is null and at.deleted_at is null and lt.deleted_at is null and c.deleted_at is null
      and e.curriculum_id = c.curriculum_id
      and ((s.class_id is not null and s.class_id = e.class_id) or s.enrollment_id = e.id)
      and s.lesson_template_id = at.lesson_template_id
  ) then raise exception using errcode = '23514', message = 'assignment scope or curriculum mismatch'; end if;
  return new;
end;
$$;

create function private.validate_project_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.enrollments e join logos_academy.cycles c on c.tenant_id = e.tenant_id
    where e.tenant_id = new.tenant_id and e.id = new.enrollment_id and c.id = new.cycle_id
      and e.curriculum_id = c.curriculum_id and e.deleted_at is null and c.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'project cycle must belong to enrollment curriculum'; end if;
  if new.approved_submission_id is not null and not exists (
    select 1 from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id
    join logos_academy.activity_templates at on at.tenant_id = aa.tenant_id and at.id = aa.activity_template_id
    join logos_academy.lesson_templates lt on lt.tenant_id = at.tenant_id and lt.id = at.lesson_template_id
    where s.tenant_id = new.tenant_id and s.id = new.approved_submission_id and not s.is_draft
      and aa.enrollment_id = new.enrollment_id and aa.status = 'approved' and lt.cycle_id = new.cycle_id
      and s.deleted_at is null and aa.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'approved project submission must belong to enrollment and cycle'; end if;
  return new;
end;
$$;

create function private.guard_submission_item_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare parent_id uuid := case when tg_op = 'DELETE' then old.submission_id else new.submission_id end;
declare parent_tenant_id uuid := case when tg_op = 'DELETE' then old.tenant_id else new.tenant_id end;
declare parent_is_draft boolean; assignment_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.submission_id is distinct from old.submission_id or new.activity_requirement_id is distinct from old.activity_requirement_id or
    new.kind is distinct from old.kind or new.created_at is distinct from old.created_at
  ) then raise exception using errcode = '42501', message = 'submission item identity and parent are immutable'; end if;
  select s.is_draft, s.activity_assignment_id into parent_is_draft, assignment_id
  from logos_academy.submissions s where s.tenant_id = parent_tenant_id and s.id = parent_id and s.deleted_at is null;
  if parent_is_draft is distinct from true then
    raise exception using errcode = '42501', message = 'items of submitted versions are immutable';
  end if;
  if not private.enrollment_accepts_mutation(parent_tenant_id, assignment_id) then
    raise exception using errcode = '42501', message = 'active enrollment required for submission item mutation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.validate_file_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.student_profile_id is distinct from old.student_profile_id or new.activity_assignment_id is distinct from old.activity_assignment_id or
    new.uploaded_by_user_id is distinct from old.uploaded_by_user_id or new.storage_path is distinct from old.storage_path or
    new.filename_encrypted is distinct from old.filename_encrypted or new.content_type is distinct from old.content_type or
    new.size_bytes is distinct from old.size_bytes or new.created_at is distinct from old.created_at or new.deleted_at is distinct from old.deleted_at
  ) then raise exception using errcode = '42501', message = 'uploaded file identity and metadata are immutable'; end if;
  if not private.enrollment_accepts_mutation(new.tenant_id, new.activity_assignment_id) then
    raise exception using errcode = '42501', message = 'active enrollment required for file mutation';
  end if;
  if not exists (
    select 1 from logos_academy.activity_assignments aa join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
    where aa.tenant_id = new.tenant_id and aa.id = new.activity_assignment_id
      and e.student_profile_id = new.student_profile_id and aa.deleted_at is null and e.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'file student must own assignment'; end if;
  return new;
end;
$$;

create function private.guard_authenticated_authorship()
returns trigger language plpgsql security definer set search_path = '' as $$
declare claimed_user_id uuid;
begin
  if (select auth.uid()) is null then return new; end if;
  claimed_user_id := case tg_table_name
    when 'reviews' then new.reviewer_user_id
    when 'uploaded_files' then new.uploaded_by_user_id
    when 'audit_events' then new.actor_user_id
    else new.recorded_by_user_id end;
  if claimed_user_id is distinct from private.current_user_id(new.tenant_id, null) then
    raise exception using errcode = '42501', message = 'actor must match authenticated user';
  end if;
  return new;
end;
$$;

create trigger enrollments_curriculum before insert or update of class_id, curriculum_id on logos_academy.enrollments
for each row execute function private.validate_enrollment_curriculum();
create trigger sessions_curriculum before insert or update of class_id, enrollment_id, lesson_template_id on logos_academy.sessions
for each row execute function private.validate_session_curriculum();
create trigger project_records_scope before insert or update of enrollment_id, cycle_id, approved_submission_id on logos_academy.project_records
for each row execute function private.validate_project_scope();
create trigger submission_items_immutable before insert or update or delete on logos_academy.submission_items
for each row execute function private.guard_submission_item_mutation();
create trigger uploaded_files_scope before insert or update on logos_academy.uploaded_files
for each row execute function private.validate_file_mutation();
create trigger attendance_records_authorship before insert or update of recorded_by_user_id on logos_academy.attendance_records
for each row execute function private.guard_authenticated_authorship();
create trigger attendance_private_notes_authorship before insert or update of recorded_by_user_id on logos_academy.attendance_private_notes
for each row execute function private.guard_authenticated_authorship();
create trigger makeup_records_authorship before insert or update of recorded_by_user_id on logos_academy.makeup_records
for each row execute function private.guard_authenticated_authorship();
create trigger presentation_records_authorship before insert or update of recorded_by_user_id on logos_academy.presentation_records
for each row execute function private.guard_authenticated_authorship();
create trigger reviews_authorship before insert or update of reviewer_user_id on logos_academy.reviews
for each row execute function private.guard_authenticated_authorship();
create trigger uploaded_files_authorship before insert or update of uploaded_by_user_id on logos_academy.uploaded_files
for each row execute function private.guard_authenticated_authorship();
create trigger audit_events_authorship before insert or update of actor_user_id on logos_academy.audit_events
for each row execute function private.guard_authenticated_authorship();

drop policy submissions_draft_update on logos_academy.submissions;
create policy submissions_draft_update on logos_academy.submissions for update to authenticated
  using (deleted_at is null and is_draft and (select private.owns_submission(tenant_id, id)) and (select private.enrollment_accepts_mutation(tenant_id, activity_assignment_id)))
  with check (deleted_at is null and is_draft and submitted_at is null and (select private.owns_assignment(tenant_id, activity_assignment_id)) and (select private.enrollment_accepts_mutation(tenant_id, activity_assignment_id)));
drop policy submission_items_draft_insert on logos_academy.submission_items;
create policy submission_items_draft_insert on logos_academy.submission_items for insert to authenticated with check (
  deleted_at is null and (select private.owns_submission(tenant_id, submission_id))
  and exists (select 1 from logos_academy.submissions s where s.tenant_id = submission_items.tenant_id and s.id = submission_items.submission_id
    and s.is_draft and s.deleted_at is null and private.enrollment_accepts_mutation(s.tenant_id, s.activity_assignment_id))
);
drop policy submission_items_draft_update on logos_academy.submission_items;
create policy submission_items_draft_update on logos_academy.submission_items for update to authenticated
  using (deleted_at is null and (select private.owns_submission(tenant_id, submission_id)) and exists (
    select 1 from logos_academy.submissions s where s.tenant_id = submission_items.tenant_id and s.id = submission_items.submission_id
      and s.is_draft and s.deleted_at is null and private.enrollment_accepts_mutation(s.tenant_id, s.activity_assignment_id)))
  with check ((select private.owns_submission(tenant_id, submission_id)));
drop policy uploaded_files_pending_insert on logos_academy.uploaded_files;
create policy uploaded_files_pending_insert on logos_academy.uploaded_files for insert to authenticated with check (
  deleted_at is null and status = 'pending' and (select private.is_student_profile(tenant_id, student_profile_id))
  and (select private.is_user(tenant_id, uploaded_by_user_id)) and (select private.owns_assignment(tenant_id, activity_assignment_id))
  and (select private.enrollment_accepts_mutation(tenant_id, activity_assignment_id))
);

-- Sensitive domain tables are mutated only through the transactional RPCs below.
drop policy submissions_admin_insert on logos_academy.submissions;
drop policy submissions_admin_update on logos_academy.submissions;
drop policy submission_items_admin_insert on logos_academy.submission_items;
drop policy submission_items_admin_update on logos_academy.submission_items;
drop policy uploaded_files_admin_insert on logos_academy.uploaded_files;
drop policy uploaded_files_admin_update on logos_academy.uploaded_files;
drop policy reviews_admin_insert on logos_academy.reviews;
drop policy criterion_reviews_admin_insert on logos_academy.criterion_reviews;
drop policy audit_events_admin_insert on logos_academy.audit_events;

create function logos_academy.submit_activity(p_activity_assignment_id uuid, p_expected_draft_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare assignment_row logos_academy.activity_assignments%rowtype; draft_row logos_academy.submissions%rowtype; actor_id uuid;
begin
  if (select auth.uid()) is null then raise exception using errcode='42501', message='authentication required'; end if;
  select aa.* into assignment_row from logos_academy.activity_assignments aa
    where aa.id=p_activity_assignment_id and aa.deleted_at is null for update;
  if not found or not private.owns_assignment(assignment_row.tenant_id, assignment_row.id) then
    raise exception using errcode='42501', message='assignment access denied';
  end if;
  actor_id := private.current_user_id(assignment_row.tenant_id, 'student');
  if actor_id is null or not private.enrollment_accepts_mutation(assignment_row.tenant_id, assignment_row.id)
    or assignment_row.status not in ('available','draft','revision_requested') then
    raise exception using errcode='42501', message='active enrollment and editable assignment required';
  end if;
  select s.* into draft_row from logos_academy.submissions s
    where s.tenant_id=assignment_row.tenant_id and s.id=p_expected_draft_id
      and s.activity_assignment_id=assignment_row.id and s.is_draft and s.deleted_at is null for update;
  if not found then raise exception using errcode='40001', message='expected draft is stale or missing'; end if;
  if exists (
    select 1 from logos_academy.activity_requirements ar
    where ar.tenant_id=assignment_row.tenant_id and ar.activity_template_id=assignment_row.activity_template_id
      and ar.is_required and ar.deleted_at is null and not exists (
        select 1 from logos_academy.submission_items si where si.tenant_id=ar.tenant_id and si.submission_id=draft_row.id
          and si.activity_requirement_id=ar.id and si.deleted_at is null))
  then raise exception using errcode='23514', message='required submission items are missing'; end if;
  update logos_academy.submissions set is_draft=false, submitted_at=now() where id=draft_row.id;
  update logos_academy.activity_assignments set status='submitted' where id=assignment_row.id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(assignment_row.tenant_id,actor_id,'submission.submitted','submission',draft_row.id,p_request_id,jsonb_build_object('assignment_id',assignment_row.id,'version',draft_row.version));
  return jsonb_build_object('id',draft_row.id,'assignmentId',assignment_row.id,'version',draft_row.version,'isDraft',false,'submittedAt',now());
end;
$$;

create function logos_academy.finalize_uploaded_file(p_uploaded_file_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare file_row logos_academy.uploaded_files%rowtype; object_metadata jsonb; actor_id uuid;
begin
  if (select auth.uid()) is null then raise exception using errcode='42501', message='authentication required'; end if;
  select uf.* into file_row from logos_academy.uploaded_files uf where uf.id=p_uploaded_file_id and uf.deleted_at is null for update;
  if not found or file_row.status <> 'pending' or not private.owns_file(file_row.tenant_id,file_row.id)
    or not private.enrollment_accepts_mutation(file_row.tenant_id,file_row.activity_assignment_id) then
    raise exception using errcode='42501', message='pending owned file on active enrollment required';
  end if;
  actor_id := private.current_user_id(file_row.tenant_id,'student');
  if actor_id is distinct from file_row.uploaded_by_user_id then raise exception using errcode='42501', message='file actor mismatch'; end if;
  select o.metadata into object_metadata from storage.objects o
    where o.bucket_id='submissions' and o.name=file_row.storage_path;
  if object_metadata is null
    or coalesce(object_metadata->>'size','') !~ '^[0-9]+$'
    or (object_metadata->>'size')::bigint <> file_row.size_bytes
    or object_metadata->>'mimetype' is distinct from file_row.content_type then
    raise exception using errcode='23514', message='storage object metadata does not match declared file';
  end if;
  update logos_academy.uploaded_files set status='ready' where id=file_row.id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(file_row.tenant_id,actor_id,'file.finalized','uploaded_file',file_row.id,p_request_id,jsonb_build_object('assignment_id',file_row.activity_assignment_id));
  return jsonb_build_object('id',file_row.id,'assignmentId',file_row.activity_assignment_id,'contentType',file_row.content_type,'sizeBytes',file_row.size_bytes,'status','ready');
end;
$$;
comment on function logos_academy.finalize_uploaded_file(uuid,uuid) is
  'Validates database-visible Storage metadata only. The server Storage adapter must verify the underlying object through the Storage API before calling.';

create function logos_academy.publish_review(p_submission_id uuid, p_decision text, p_feedback text, p_criteria jsonb, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare submission_row logos_academy.submissions%rowtype; assignment_row logos_academy.activity_assignments%rowtype;
  actor_id uuid; review_id uuid := gen_random_uuid(); item jsonb; criteria_count integer;
begin
  if (select auth.uid()) is null or p_decision not in ('approved','revision_requested') or length(btrim(p_feedback))=0
    or jsonb_typeof(p_criteria) <> 'array' then raise exception using errcode='23514', message='invalid review payload'; end if;
  select s.* into submission_row from logos_academy.submissions s where s.id=p_submission_id and not s.is_draft and s.deleted_at is null for update;
  if not found then raise exception using errcode='23514', message='review requires a final submission'; end if;
  select aa.* into assignment_row from logos_academy.activity_assignments aa where aa.tenant_id=submission_row.tenant_id
    and aa.id=submission_row.activity_assignment_id and aa.status='submitted' and aa.deleted_at is null for update;
  if not found then raise exception using errcode='23514', message='assignment is not awaiting review'; end if;
  actor_id := private.current_user_id(submission_row.tenant_id,'admin');
  if actor_id is null then raise exception using errcode='42501', message='tenant admin required'; end if;
  select count(*) into criteria_count from logos_academy.activity_criteria ac
    where ac.tenant_id=assignment_row.tenant_id and ac.activity_template_id=assignment_row.activity_template_id and ac.deleted_at is null;
  if jsonb_array_length(p_criteria) <> criteria_count
    or (select count(distinct value->>'criterionId') from jsonb_array_elements(p_criteria)) <> criteria_count
    or exists (select 1 from jsonb_array_elements(p_criteria) j(value)
      where value->>'result' not in ('met','needs_adjustment') or not exists (
        select 1 from logos_academy.activity_criteria ac where ac.tenant_id=assignment_row.tenant_id
          and ac.activity_template_id=assignment_row.activity_template_id and ac.id=(value->>'criterionId')::uuid and ac.deleted_at is null))
  then raise exception using errcode='23514', message='review criteria must exactly match the activity'; end if;
  insert into logos_academy.reviews(id,tenant_id,submission_id,reviewer_user_id,decision,feedback_encrypted,reviewed_at)
    values(review_id,submission_row.tenant_id,submission_row.id,actor_id,p_decision,extensions.pgp_sym_encrypt(p_feedback,p_encryption_key),now());
  for item in select value from jsonb_array_elements(p_criteria) loop
    insert into logos_academy.criterion_reviews(tenant_id,review_id,activity_criterion_id,result,comment_encrypted)
      values(submission_row.tenant_id,review_id,(item->>'criterionId')::uuid,item->>'result',
        case when nullif(btrim(item->>'comment'),'') is null then null else extensions.pgp_sym_encrypt(item->>'comment',p_encryption_key) end);
  end loop;
  update logos_academy.activity_assignments set status=p_decision where id=assignment_row.id;
  if p_decision='revision_requested' then
    insert into logos_academy.submissions(tenant_id,activity_assignment_id,version,is_draft)
      select submission_row.tenant_id,assignment_row.id,coalesce(max(s.version),0)+1,true
      from logos_academy.submissions s where s.tenant_id=submission_row.tenant_id and s.activity_assignment_id=assignment_row.id;
  end if;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(submission_row.tenant_id,actor_id,'review.published','review',review_id,p_request_id,jsonb_build_object('submission_id',submission_row.id,'decision',p_decision));
  return jsonb_build_object('id',review_id,'decision',p_decision,'feedback',p_feedback,'reviewerName',(select display_name from logos_academy.users where id=actor_id),'reviewedAt',now());
end;
$$;

drop function logos_academy.complete_enrollment(uuid);
create function logos_academy.complete_enrollment(p_enrollment_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare snapshot record; actor_id uuid; result jsonb;
begin
  select * into snapshot from private.completion_snapshot(p_enrollment_id);
  if not found then raise exception using errcode='P0002', message='enrollment not found'; end if;
  actor_id := private.current_user_id(snapshot.tenant_id,'admin');
  if actor_id is null then raise exception using errcode='42501', message='tenant admin required'; end if;
  if not snapshot.eligible then return logos_academy.completion_check(p_enrollment_id); end if;
  insert into logos_academy.completion_records(tenant_id,enrollment_id,status,attendance_complete,projects_complete,reflection_complete,presentation_complete,no_pending_revisions,completed_at)
    values(snapshot.tenant_id,p_enrollment_id,'completed',true,true,true,true,true,now())
    on conflict on constraint completion_records_active_key do nothing;
  update logos_academy.enrollments set status='completed',completed_at=coalesce(completed_at,now())
    where tenant_id=snapshot.tenant_id and id=p_enrollment_id and status<>'completed';
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(snapshot.tenant_id,actor_id,'enrollment.completed','enrollment',p_enrollment_id,p_request_id,'{}');
  result := logos_academy.completion_check(p_enrollment_id);
  return result;
end;
$$;

create function logos_academy.revoke_student_consent(p_student_profile_id uuid, p_reason text, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare consent_row logos_academy.consent_records%rowtype; actor_id uuid; student_user_id uuid; paused_ids uuid[];
begin
  if length(btrim(p_reason))=0 then raise exception using errcode='23514', message='revocation reason required'; end if;
  select cr.* into consent_row from logos_academy.consent_records cr
    where cr.student_profile_id=p_student_profile_id and cr.deleted_at is null and cr.status='verified' for update;
  if not found then raise exception using errcode='23514', message='verified consent not found'; end if;
  actor_id := private.current_user_id(consent_row.tenant_id,'admin');
  if actor_id is null then raise exception using errcode='42501', message='tenant admin required'; end if;
  select sp.user_id into student_user_id from logos_academy.student_profiles sp
    where sp.tenant_id=consent_row.tenant_id and sp.id=p_student_profile_id and sp.deleted_at is null;
  update logos_academy.consent_records set status='revoked',revoked_at=now(),revocation_reason_encrypted=extensions.pgp_sym_encrypt(p_reason,p_encryption_key)
    where id=consent_row.id;
  with paused as (
    update logos_academy.enrollments set status='paused'
    where tenant_id=consent_row.tenant_id and student_profile_id=p_student_profile_id and status='active' and deleted_at is null
    returning id
  ) select coalesce(array_agg(id),'{}'::uuid[]) into paused_ids from paused;
  update logos_academy.users set access_enabled=false where tenant_id=consent_row.tenant_id and id=student_user_id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(consent_row.tenant_id,actor_id,'consent.revoked','student_profile',p_student_profile_id,p_request_id,jsonb_build_object('paused_enrollment_ids',paused_ids));
  return jsonb_build_object('consentId',consent_row.id,'pausedEnrollmentIds',paused_ids,'accessDisabled',true);
end;
$$;

create index reviews_tenant_created_cursor_idx on logos_academy.reviews(tenant_id,created_at,id) where deleted_at is null;

revoke all on function private.current_user_id(uuid,text), private.enrollment_accepts_mutation(uuid,uuid),
  private.validate_enrollment_curriculum(), private.validate_session_curriculum(), private.validate_project_scope(),
  private.guard_submission_item_mutation(), private.validate_file_mutation(), private.guard_authenticated_authorship()
  from public,anon,authenticated,service_role;
grant execute on function private.current_user_id(uuid,text), private.enrollment_accepts_mutation(uuid,uuid) to authenticated;
revoke all on function logos_academy.submit_activity(uuid,uuid,uuid), logos_academy.finalize_uploaded_file(uuid,uuid),
  logos_academy.publish_review(uuid,text,text,jsonb,text,uuid), logos_academy.complete_enrollment(uuid,uuid),
  logos_academy.revoke_student_consent(uuid,text,text,uuid) from public,anon;
grant execute on function logos_academy.submit_activity(uuid,uuid,uuid), logos_academy.finalize_uploaded_file(uuid,uuid),
  logos_academy.publish_review(uuid,text,text,jsonb,text,uuid), logos_academy.complete_enrollment(uuid,uuid),
  logos_academy.revoke_student_consent(uuid,text,text,uuid) to authenticated;

create or replace function private.completion_snapshot(p_enrollment_id uuid)
returns table(tenant_id uuid,attendance_complete boolean,projects_complete boolean,reflection_complete boolean,
  presentation_complete boolean,no_pending_revisions boolean,eligible boolean,blockers text[])
language sql stable security definer set search_path='' as $$
  with target as (
    select e.tenant_id,e.id,e.class_id,e.curriculum_id from logos_academy.enrollments e where e.id=p_enrollment_id and e.deleted_at is null
  ), relevant_sessions as (
    select s.tenant_id,s.id from logos_academy.sessions s join target t on t.tenant_id=s.tenant_id
    join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id
    join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
    where s.deleted_at is null and s.status='completed' and c.curriculum_id=t.curriculum_id
      and (s.enrollment_id=t.id or (t.class_id is not null and s.class_id=t.class_id))
  ), facts as (
    select t.tenant_id,
      ((select count(*) from relevant_sessions)=16 and
       (select count(*) from relevant_sessions rs where exists (
         select 1 from logos_academy.attendance_records ar where ar.tenant_id=rs.tenant_id and ar.session_id=rs.id and ar.enrollment_id=t.id
           and ar.deleted_at is null and (ar.status='present' or exists (
             select 1 from logos_academy.makeup_records mr left join logos_academy.sessions ms on ms.tenant_id=mr.tenant_id and ms.id=mr.makeup_session_id
             where mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null
               and mr.completed_at<=now() and (mr.makeup_session_id is null or (ms.status='completed' and ms.deleted_at is null))))))=16) attendance_complete,
      ((select count(*) from logos_academy.project_records pr join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id
        where pr.tenant_id=t.tenant_id and pr.enrollment_id=t.id and pr.status='approved' and pr.deleted_at is null and c.curriculum_id=t.curriculum_id)=4) projects_complete,
      exists(select 1 from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id
        join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
        join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
        where aa.tenant_id=t.tenant_id and aa.enrollment_id=t.id and aa.status='approved' and aa.deleted_at is null
          and lt.position=16 and c.curriculum_id=t.curriculum_id) reflection_complete,
      exists(select 1 from logos_academy.presentation_records pr where pr.tenant_id=t.tenant_id and pr.enrollment_id=t.id and pr.deleted_at is null) presentation_complete,
      not exists(select 1 from logos_academy.activity_assignments aa where aa.tenant_id=t.tenant_id and aa.enrollment_id=t.id and aa.status='revision_requested' and aa.deleted_at is null) no_pending_revisions
    from target t
  )
  select f.*,(f.attendance_complete and f.projects_complete and f.reflection_complete and f.presentation_complete and f.no_pending_revisions),
    array_remove(array[case when not f.attendance_complete then 'attendance_incomplete' end,case when not f.projects_complete then 'projects_incomplete' end,
      case when not f.reflection_complete then 'reflection_incomplete' end,case when not f.presentation_complete then 'presentation_incomplete' end,
      case when not f.no_pending_revisions then 'pending_revisions' end],null) from facts f;
$$;

notify pgrst,'reload schema';
commit;
