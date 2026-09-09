begin;

-- Keep migration and local config aligned: private, bounded evidence storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions', 'submissions', false, 20971520,
  array[
    'application/pdf', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The primitive must never be callable by browser roles; DTO access stays server-only.
revoke all on function private.decrypt_pii(uuid, bytea, text) from public, anon, authenticated, service_role;

create function logos_academy.read_guardian_record(
  p_actor_user_id uuid,
  p_student_profile_id uuid,
  p_encryption_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare guardian_row logos_academy.guardian_records%rowtype;
begin
  select gr.* into guardian_row
  from logos_academy.guardian_records gr
  where gr.student_profile_id = p_student_profile_id and gr.deleted_at is null;
  if not found then raise exception using errcode='P0002', message='guardian record not found'; end if;
  perform private.assert_admin_actor(guardian_row.tenant_id, p_actor_user_id);
  return jsonb_build_object(
    'id', guardian_row.id,
    'name', extensions.pgp_sym_decrypt(guardian_row.name_encrypted, p_encryption_key),
    'relationship', guardian_row.relationship,
    'email', case when guardian_row.email_encrypted is null then null else extensions.pgp_sym_decrypt(guardian_row.email_encrypted, p_encryption_key) end,
    'phone', case when guardian_row.phone_encrypted is null then null else extensions.pgp_sym_decrypt(guardian_row.phone_encrypted, p_encryption_key) end
  );
end;
$$;

create function logos_academy.approve_project(
  p_actor_user_id uuid,
  p_project_record_id uuid,
  p_submission_id uuid,
  p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare project_row logos_academy.project_records%rowtype;
begin
  select pr.* into project_row from logos_academy.project_records pr
  where pr.id = p_project_record_id and pr.deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='project record not found'; end if;
  perform private.assert_admin_actor(project_row.tenant_id, p_actor_user_id);
  if project_row.status = 'approved' then raise exception using errcode='23514', message='project is already approved'; end if;
  if not exists (
    select 1
    from logos_academy.enrollments e
    join logos_academy.cycles c on c.tenant_id=e.tenant_id and c.id=project_row.cycle_id and c.deleted_at is null
    join logos_academy.submissions s on s.tenant_id=e.tenant_id and s.id=p_submission_id and not s.is_draft and s.deleted_at is null
    join logos_academy.activity_assignments aa on aa.tenant_id=s.tenant_id and aa.id=s.activity_assignment_id
      and aa.enrollment_id=e.id and aa.status='approved' and aa.deleted_at is null
    join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id and at.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id and lt.deleted_at is null
    where e.tenant_id=project_row.tenant_id and e.id=project_row.enrollment_id and e.status='active' and e.deleted_at is null
      and e.curriculum_id=c.curriculum_id and lt.cycle_id=project_row.cycle_id
  ) then raise exception using errcode='23514', message='approved submission must belong to the active enrollment and project cycle'; end if;
  perform set_config('app.project_evidence','on',true);
  update logos_academy.project_records set status='approved', approved_submission_id=p_submission_id, approved_at=now()
  where tenant_id=project_row.tenant_id and id=project_row.id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(project_row.tenant_id,p_actor_user_id,'project.approved','project_record',project_row.id,p_request_id,jsonb_build_object('submission_id',p_submission_id));
  return jsonb_build_object('id',project_row.id,'status','approved','approvedAt',now(),'approvedSubmissionId',p_submission_id);
end;
$$;

revoke all on function logos_academy.read_guardian_record(uuid,uuid,text), logos_academy.approve_project(uuid,uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function logos_academy.read_guardian_record(uuid,uuid,text), logos_academy.approve_project(uuid,uuid,uuid,uuid) to service_role;
comment on function logos_academy.read_guardian_record(uuid,uuid,text) is 'Backend-only: validates tenant admin actor before producing the authorized guardian DTO.';
comment on function logos_academy.approve_project(uuid,uuid,uuid,uuid) is 'Backend-only: validates actor, tenant, curriculum, cycle and approved evidence; writes audit event atomically.';

notify pgrst, 'reload schema';
commit;
