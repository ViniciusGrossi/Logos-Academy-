begin;

create or replace function private.admin_submission_detail(
  p_tenant_id uuid,
  p_submission_id uuid,
  p_encryption_key text
) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id', s.id,
    'assignmentId', s.activity_assignment_id,
    'version', s.version,
    'isDraft', s.is_draft,
    'submittedAt', s.submitted_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', si.id, 'requirementId', si.activity_requirement_id, 'kind', si.kind,
        'textValue', case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted, p_encryption_key) end,
        'urlValue', case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted, p_encryption_key) end,
        'fileId', si.uploaded_file_id
      ) order by si.created_at, si.id)
      from logos_academy.submission_items si
      where si.tenant_id = s.tenant_id and si.submission_id = s.id and si.deleted_at is null
    ), '[]'::jsonb),
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object('id', ac.id, 'label', ac.label, 'description', ac.description, 'position', ac.position) order by ac.position, ac.id)
      from logos_academy.activity_criteria ac
      where ac.tenant_id = aa.tenant_id and ac.activity_template_id = aa.activity_template_id and ac.deleted_at is null
    ), '[]'::jsonb),
    'review', (
      select private.admin_review_detail(s.tenant_id, r.id, p_encryption_key)
      from logos_academy.reviews r
      where r.tenant_id = s.tenant_id and r.submission_id = s.id and r.deleted_at is null
      order by r.reviewed_at desc, r.id desc limit 1
    )
  )
  from logos_academy.submissions s
  join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id and aa.deleted_at is null
  where s.tenant_id = p_tenant_id and s.id = p_submission_id and s.deleted_at is null;
$$;

create or replace function logos_academy.student_journey(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_enrollment_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment_id uuid; v jsonb;
begin
  select e.id into v_enrollment_id
  from logos_academy.enrollments e
  join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id and sp.deleted_at is null
  where e.tenant_id = p_tenant_id and e.deleted_at is null and sp.user_id = p_actor_user_id
    and (p_enrollment_id is null and e.status = 'active' or p_enrollment_id is not null and e.id = p_enrollment_id)
  order by e.activated_at desc nulls last, e.created_at desc
  limit 1;
  if v_enrollment_id is null then raise exception using errcode = '42501', message = 'student enrollment required'; end if;

  select jsonb_build_object(
    'enrollment', jsonb_build_object('id', e.id, 'studentId', e.student_profile_id, 'studentName', u.display_name, 'curriculumName', cu.name, 'kind', e.kind, 'classId', e.class_id, 'status', e.status, 'activatedAt', e.activated_at, 'completedAt', e.completed_at),
    'projects', coalesce((select jsonb_agg(private.student_project_summary(e.tenant_id, e.id, cy.id) order by cy.position) from logos_academy.cycles cy where cy.tenant_id = e.tenant_id and cy.curriculum_id = e.curriculum_id and cy.deleted_at is null), '[]'::jsonb),
    'sessionsCompleted', (select count(*) from logos_academy.sessions s where s.tenant_id = e.tenant_id and s.status = 'completed' and s.deleted_at is null and ((e.class_id is not null and s.class_id = e.class_id) or s.enrollment_id = e.id)),
    'sessionsTotal', (select count(*) from logos_academy.sessions s where s.tenant_id = e.tenant_id and s.deleted_at is null and ((e.class_id is not null and s.class_id = e.class_id) or s.enrollment_id = e.id))
  ) into v
  from logos_academy.enrollments e
  join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id
  join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id
  join logos_academy.curricula cu on cu.tenant_id = e.tenant_id and cu.id = e.curriculum_id
  where e.tenant_id = p_tenant_id and e.id = v_enrollment_id;
  return v;
end;
$$;

revoke all on function private.admin_submission_detail(uuid,uuid,text) from public, anon, authenticated, service_role;
revoke all on function logos_academy.student_journey(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function logos_academy.student_journey(uuid,uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
