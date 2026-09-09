begin;

-- Sensitive operational writes are transactional only; direct policies bypassed audit and lifecycle checks.
drop policy if exists attendance_records_admin_insert on logos_academy.attendance_records;
drop policy if exists attendance_records_admin_update on logos_academy.attendance_records;
drop policy if exists attendance_private_notes_admin_insert on logos_academy.attendance_private_notes;
drop policy if exists attendance_private_notes_admin_update on logos_academy.attendance_private_notes;
drop policy if exists makeup_records_admin_insert on logos_academy.makeup_records;
drop policy if exists makeup_records_admin_update on logos_academy.makeup_records;
drop policy if exists presentation_records_admin_insert on logos_academy.presentation_records;
drop policy if exists presentation_records_admin_update on logos_academy.presentation_records;
drop policy if exists project_records_admin_insert on logos_academy.project_records;
drop policy if exists project_records_admin_update on logos_academy.project_records;
drop policy if exists enrollments_admin_insert on logos_academy.enrollments;
drop policy if exists enrollments_admin_update on logos_academy.enrollments;
drop policy if exists activity_assignments_admin_insert on logos_academy.activity_assignments;
drop policy if exists activity_assignments_admin_update on logos_academy.activity_assignments;

revoke insert, update, delete on logos_academy.attendance_records, logos_academy.attendance_private_notes, logos_academy.makeup_records,
  logos_academy.presentation_records, logos_academy.project_records, logos_academy.enrollments, logos_academy.activity_assignments from authenticated;

create function private.guard_class_curriculum_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.curriculum_id is distinct from old.curriculum_id and exists (
    select 1 from logos_academy.enrollments e where e.tenant_id=old.tenant_id and e.class_id=old.id and e.deleted_at is null
    union all
    select 1 from logos_academy.sessions s where s.tenant_id=old.tenant_id and s.class_id=old.id and s.deleted_at is null
  ) then raise exception using errcode='23514', message='class curriculum cannot change with active dependents'; end if;
  return new;
end;
$$;
create trigger classes_curriculum_immutable before update of curriculum_id on logos_academy.classes
for each row execute function private.guard_class_curriculum_mutation();

create function private.guard_enrollment_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.status='completed' or new.completed_at is not null)
    and current_setting('app.complete_enrollment', true) is distinct from 'on' then
    raise exception using errcode='42501', message='enrollment completion must use complete_enrollment';
  end if;
  return new;
end;
$$;
create trigger enrollments_completion_guard before update of status, completed_at on logos_academy.enrollments
for each row execute function private.guard_enrollment_completion();

create function private.guard_completion_evidence()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='project_records' then
    if new.status='approved' and current_setting('app.project_evidence', true) is distinct from 'on' then
      raise exception using errcode='42501', message='project approval requires the evidence workflow';
    end if;
  elsif tg_table_name='presentation_records' then
    if current_setting('app.record_presentation', true) is distinct from 'on' then
      raise exception using errcode='42501', message='presentation requires record_presentation';
    end if;
  elsif tg_table_name='completion_records' then
    if new.status='completed' and current_setting('app.complete_enrollment', true) is distinct from 'on' then
      raise exception using errcode='42501', message='completion record requires complete_enrollment';
    end if;
  end if;
  return new;
end;
$$;
create trigger project_records_completion_evidence_guard before insert or update of status, approved_submission_id, approved_at on logos_academy.project_records
for each row execute function private.guard_completion_evidence();
create trigger presentation_records_completion_evidence_guard before insert on logos_academy.presentation_records
for each row execute function private.guard_completion_evidence();
create trigger completion_records_completion_evidence_guard before insert on logos_academy.completion_records
for each row execute function private.guard_completion_evidence();

create or replace function logos_academy.complete_enrollment(p_enrollment_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare snapshot record; actor_id uuid; result jsonb;
begin
  select * into snapshot from private.completion_snapshot(p_enrollment_id);
  if not found then raise exception using errcode='P0002', message='enrollment not found'; end if;
  actor_id := private.current_user_id(snapshot.tenant_id, 'admin');
  if actor_id is null then raise exception using errcode='42501', message='tenant admin required'; end if;
  if not snapshot.eligible then return logos_academy.completion_check(p_enrollment_id); end if;
  perform set_config('app.complete_enrollment','on',true);
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

-- RPCs requiring a pgcrypto key are backend-only. The route authenticates the admin before using service_role.
revoke all on function logos_academy.publish_review(uuid,text,text,jsonb,text,uuid), logos_academy.revoke_student_consent(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function logos_academy.publish_review(uuid,text,text,jsonb,text,uuid), logos_academy.revoke_student_consent(uuid,text,text,uuid) to service_role;
comment on function logos_academy.publish_review(uuid,text,text,jsonb,text,uuid) is 'Backend-only: encryption key never reaches an authenticated client.';
comment on function logos_academy.revoke_student_consent(uuid,text,text,uuid) is 'Backend-only: encryption key never reaches an authenticated client.';

create function private.assert_admin_actor(p_tenant_id uuid, p_actor_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from logos_academy.users u join logos_academy.tenant_memberships tm on tm.tenant_id=u.tenant_id and tm.user_id=u.id
    where u.tenant_id=p_tenant_id and u.id=p_actor_user_id and u.access_enabled and u.deleted_at is null and tm.deleted_at is null and tm.role='admin') then
    raise exception using errcode='42501', message='tenant admin required';
  end if;
end;
$$;

create function logos_academy.record_attendance(p_actor_user_id uuid, p_session_id uuid, p_entries jsonb, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare session_row logos_academy.sessions%rowtype; entry jsonb; attendance_id uuid; result jsonb;
begin
  select s.* into session_row from logos_academy.sessions s where s.id=p_session_id and s.deleted_at is null for update;
  if not found or session_row.status <> 'completed' or jsonb_typeof(p_entries) <> 'array' then raise exception using errcode='23514', message='completed session and attendance entries required'; end if;
  perform private.assert_admin_actor(session_row.tenant_id,p_actor_user_id);
  for entry in select value from jsonb_array_elements(p_entries) loop
    if not exists (select 1 from logos_academy.enrollments e where e.tenant_id=session_row.tenant_id and e.id=(entry->>'enrollmentId')::uuid
      and e.status='active' and e.deleted_at is null) then raise exception using errcode='23514', message='attendance enrollment must be active'; end if;
    insert into logos_academy.attendance_records(tenant_id,session_id,enrollment_id,status,recorded_by_user_id)
      values(session_row.tenant_id,session_row.id,(entry->>'enrollmentId')::uuid,entry->>'status',p_actor_user_id)
      on conflict on constraint attendance_records_active_key do update set status=excluded.status,recorded_by_user_id=excluded.recorded_by_user_id
      returning id into attendance_id;
    if nullif(entry->>'privateNote','') is not null then
      insert into logos_academy.attendance_private_notes(tenant_id,attendance_record_id,note_encrypted,recorded_by_user_id)
        values(session_row.tenant_id,attendance_id,extensions.pgp_sym_encrypt(entry->>'privateNote',p_encryption_key),p_actor_user_id)
        on conflict on constraint attendance_private_notes_active_key do update set note_encrypted=excluded.note_encrypted,recorded_by_user_id=excluded.recorded_by_user_id;
    end if;
  end loop;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(session_row.tenant_id,p_actor_user_id,'attendance.recorded','session',session_row.id,p_request_id,jsonb_build_object('entries',jsonb_array_length(p_entries)));
  select coalesce(jsonb_agg(jsonb_build_object('id',ar.id,'enrollmentId',ar.enrollment_id,'status',ar.status) order by ar.id),'[]'::jsonb) into result
    from logos_academy.attendance_records ar where ar.tenant_id=session_row.tenant_id and ar.session_id=session_row.id and ar.deleted_at is null;
  return result;
end;
$$;

create function logos_academy.record_makeup(p_actor_user_id uuid, p_attendance_record_id uuid, p_makeup_session_id uuid, p_completed_at timestamptz, p_note text, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare attendance_row logos_academy.attendance_records%rowtype; makeup_id uuid;
begin
  select ar.* into attendance_row from logos_academy.attendance_records ar where ar.id=p_attendance_record_id and ar.deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='attendance record not found'; end if;
  perform private.assert_admin_actor(attendance_row.tenant_id,p_actor_user_id);
  if not exists (select 1 from logos_academy.enrollments e where e.tenant_id=attendance_row.tenant_id and e.id=attendance_row.enrollment_id
    and e.status='active' and e.deleted_at is null) then raise exception using errcode='23514', message='makeup enrollment must be active'; end if;
  insert into logos_academy.makeup_records(tenant_id,attendance_record_id,makeup_session_id,completed_at,recorded_by_user_id,note_encrypted)
    values(attendance_row.tenant_id,attendance_row.id,p_makeup_session_id,p_completed_at,p_actor_user_id,
      case when nullif(btrim(p_note),'') is null then null else extensions.pgp_sym_encrypt(p_note,p_encryption_key) end)
    on conflict on constraint makeup_records_active_key do update set makeup_session_id=excluded.makeup_session_id,completed_at=excluded.completed_at,recorded_by_user_id=excluded.recorded_by_user_id,note_encrypted=excluded.note_encrypted
    returning id into makeup_id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(attendance_row.tenant_id,p_actor_user_id,'attendance.makeup_recorded','attendance_record',attendance_row.id,p_request_id,jsonb_build_object('makeup_id',makeup_id));
  return jsonb_build_object('id',makeup_id,'attendanceId',attendance_row.id,'completedAt',p_completed_at);
end;
$$;

create function logos_academy.record_presentation(p_actor_user_id uuid, p_enrollment_id uuid, p_kind text, p_performed_at timestamptz, p_contextual_note text, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare enrollment_row logos_academy.enrollments%rowtype; presentation_id uuid;
begin
  select e.* into enrollment_row from logos_academy.enrollments e where e.id=p_enrollment_id and e.deleted_at is null and e.status='active' for update;
  if not found or p_kind not in ('demo_day','substitute') then raise exception using errcode='23514', message='active enrollment and presentation kind required'; end if;
  perform private.assert_admin_actor(enrollment_row.tenant_id,p_actor_user_id);
  perform set_config('app.record_presentation','on',true);
  insert into logos_academy.presentation_records(tenant_id,enrollment_id,kind,performed_at,contextual_note_encrypted,recorded_by_user_id)
    values(enrollment_row.tenant_id,enrollment_row.id,p_kind,p_performed_at,
      case when nullif(btrim(p_contextual_note),'') is null then null else extensions.pgp_sym_encrypt(p_contextual_note,p_encryption_key) end,p_actor_user_id)
    returning id into presentation_id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(enrollment_row.tenant_id,p_actor_user_id,'presentation.recorded','presentation_record',presentation_id,p_request_id,'{}');
  return jsonb_build_object('id',presentation_id,'enrollmentId',enrollment_row.id,'kind',p_kind,'performedAt',p_performed_at);
end;
$$;

revoke all on function logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid), logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid), logos_academy.record_presentation(uuid,uuid,text,timestamptz,text,text,uuid), private.assert_admin_actor(uuid,uuid) from public, anon, authenticated;
grant execute on function logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid), logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid), logos_academy.record_presentation(uuid,uuid,text,timestamptz,text,text,uuid) to service_role;
comment on function logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid) is 'Backend-only: validates admin actor, completed session, scope and audit; encryption key is server-only.';
comment on function logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid) is 'Backend-only: validates admin actor and makeup evidence; encryption key is server-only.';
comment on function logos_academy.record_presentation(uuid,uuid,text,timestamptz,text,text,uuid) is 'Backend-only: validates active enrollment and admin actor; encryption key is server-only.';

create function logos_academy.release_session_assignments(p_actor_user_id uuid, p_session_id uuid, p_target_enrollment_ids uuid[], p_due_at timestamptz, p_supplemental_instructions text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare session_row logos_academy.sessions%rowtype; result jsonb;
begin
  select s.* into session_row from logos_academy.sessions s where s.id=p_session_id and s.deleted_at is null for update;
  if not found or session_row.status='cancelled' or p_due_at <= now() then raise exception using errcode='23514', message='active session and future due date required'; end if;
  perform private.assert_admin_actor(session_row.tenant_id,p_actor_user_id);
  insert into logos_academy.activity_assignments(tenant_id,enrollment_id,session_id,activity_template_id,status,released_at,due_at,supplemental_instructions)
    select session_row.tenant_id,e.id,session_row.id,at.id,'available',now(),p_due_at,p_supplemental_instructions
    from logos_academy.enrollments e join logos_academy.activity_templates at on at.tenant_id=e.tenant_id and at.lesson_template_id=session_row.lesson_template_id
    where e.tenant_id=session_row.tenant_id and e.deleted_at is null and e.status='active' and at.deleted_at is null
      and ((session_row.class_id is not null and e.class_id=session_row.class_id) or session_row.enrollment_id=e.id)
      and (p_target_enrollment_ids is null or e.id=any(p_target_enrollment_ids))
    on conflict on constraint activity_assignments_active_key do nothing;
  if p_target_enrollment_ids is not null and exists (
    select 1 from unnest(p_target_enrollment_ids) target_id where not exists (
      select 1 from logos_academy.enrollments e where e.tenant_id=session_row.tenant_id and e.id=target_id and e.status='active' and e.deleted_at is null
        and ((session_row.class_id is not null and e.class_id=session_row.class_id) or session_row.enrollment_id=e.id))) then
    raise exception using errcode='23514', message='release target is not an active enrollment for the session';
  end if;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(session_row.tenant_id,p_actor_user_id,'assignment.released','session',session_row.id,p_request_id,jsonb_build_object('target_count',coalesce(array_length(p_target_enrollment_ids,1),0)));
  select jsonb_build_object('assignmentIds',coalesce(jsonb_agg(aa.id order by aa.id),'[]'::jsonb),'releasedAt',now()) into result
    from logos_academy.activity_assignments aa where aa.tenant_id=session_row.tenant_id and aa.session_id=session_row.id and aa.deleted_at is null
      and (p_target_enrollment_ids is null or aa.enrollment_id=any(p_target_enrollment_ids));
  return result;
end;
$$;
revoke all on function logos_academy.release_session_assignments(uuid,uuid,uuid[],timestamptz,text,uuid) from public, anon, authenticated;
grant execute on function logos_academy.release_session_assignments(uuid,uuid,uuid[],timestamptz,text,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
