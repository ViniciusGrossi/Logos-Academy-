begin;

-- docs/specs/admin-operations-completion.md · Spec Sync Requests SR-A1..SR-A7 (aprovadas).
-- Só leituras (nenhuma tabela nova); todas as RPCs são service_role-only, admin validado.

-- ---------------------------------------------------------------------------
-- SR-A1: attendanceId em toda leitura que devolve AttendanceEntry.
-- Funções afetadas (grep por 'enrollmentId'+'privateNote' em todas as migrations):
-- logos_academy.admin_session_attendance, logos_academy.record_attendance,
-- logos_academy.record_makeup. Assinaturas preservadas.
-- ---------------------------------------------------------------------------

create or replace function logos_academy.admin_session_attendance(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_session_id uuid,
  p_encryption_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entries jsonb;
begin
  perform private.assert_admin_actor(p_tenant_id, p_actor_user_id);

  if nullif(p_encryption_key, '') is null then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;
  if not exists (
    select 1
    from logos_academy.sessions s
    where s.tenant_id = p_tenant_id
      and s.id = p_session_id
      and s.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'session not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attendanceId', ar.id,
        'enrollmentId', ar.enrollment_id,
        'studentName', u.display_name,
        'status', ar.status,
        'privateNote', case when pn.id is null then null else extensions.pgp_sym_decrypt(pn.note_encrypted, p_encryption_key) end,
        'makeup', case when mr.id is null then null else jsonb_build_object('completedAt', mr.completed_at, 'makeupSessionId', mr.makeup_session_id) end
      ) order by u.display_name, ar.id
    ),
    '[]'::jsonb
  )
  into v_entries
  from logos_academy.attendance_records ar
  join logos_academy.enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id
  join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id
  join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id
  left join logos_academy.attendance_private_notes pn on pn.tenant_id = ar.tenant_id and pn.attendance_record_id = ar.id and pn.deleted_at is null
  left join logos_academy.makeup_records mr on mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
  where ar.tenant_id = p_tenant_id
    and ar.session_id = p_session_id
    and ar.deleted_at is null;

  return jsonb_build_object('entries', v_entries);
end;
$$;

create or replace function logos_academy.record_attendance(p_actor_user_id uuid, p_session_id uuid, p_entries jsonb, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare session_row logos_academy.sessions%rowtype; entry jsonb; attendance_id uuid; result jsonb;
begin
  select s.* into session_row from logos_academy.sessions s where s.id=p_session_id and s.deleted_at is null for update;
  if not found or session_row.status <> 'completed' or jsonb_typeof(p_entries) <> 'array' then raise exception using errcode='23514', message='completed session and attendance entries required'; end if;
  perform private.assert_admin_actor(session_row.tenant_id,p_actor_user_id);
  for entry in select value from jsonb_array_elements(p_entries) loop
    if not exists (select 1 from logos_academy.enrollments e where e.tenant_id=session_row.tenant_id and e.id=(entry->>'enrollmentId')::uuid and e.status='active' and e.deleted_at is null) then raise exception using errcode='23514', message='attendance enrollment must be active'; end if;
    insert into logos_academy.attendance_records(tenant_id,session_id,enrollment_id,status,recorded_by_user_id)
      values(session_row.tenant_id,session_row.id,(entry->>'enrollmentId')::uuid,entry->>'status',p_actor_user_id)
      on conflict on constraint attendance_records_active_key do update set status=excluded.status,recorded_by_user_id=excluded.recorded_by_user_id
      returning id into attendance_id;
    if nullif(btrim(coalesce(entry->>'privateNote','')),'') is null then
      update logos_academy.attendance_private_notes
      set deleted_at=now(), updated_at=now()
      where tenant_id=session_row.tenant_id and attendance_record_id=attendance_id and deleted_at is null;
    else
      insert into logos_academy.attendance_private_notes(tenant_id,attendance_record_id,note_encrypted,recorded_by_user_id)
        values(session_row.tenant_id,attendance_id,extensions.pgp_sym_encrypt(entry->>'privateNote',p_encryption_key),p_actor_user_id)
        on conflict on constraint attendance_private_notes_active_key do update set note_encrypted=excluded.note_encrypted,recorded_by_user_id=excluded.recorded_by_user_id;
    end if;
  end loop;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(session_row.tenant_id,p_actor_user_id,'attendance.recorded','session',session_row.id,p_request_id,jsonb_build_object('entries',jsonb_array_length(p_entries)));
  select coalesce(jsonb_agg(jsonb_build_object('attendanceId',ar.id,'enrollmentId',ar.enrollment_id,'studentName',u.display_name,'status',ar.status,'privateNote',case when pn.id is null then null else extensions.pgp_sym_decrypt(pn.note_encrypted,p_encryption_key) end,'makeup',case when mr.id is null then null else jsonb_build_object('completedAt',mr.completed_at,'makeupSessionId',mr.makeup_session_id) end) order by u.display_name),'[]'::jsonb)
  into result from logos_academy.attendance_records ar join logos_academy.enrollments e on e.tenant_id=ar.tenant_id and e.id=ar.enrollment_id join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id left join logos_academy.attendance_private_notes pn on pn.tenant_id=ar.tenant_id and pn.attendance_record_id=ar.id and pn.deleted_at is null left join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null where ar.tenant_id=session_row.tenant_id and ar.session_id=session_row.id and ar.deleted_at is null;
  return jsonb_build_object('entries',result);
end; $$;

create or replace function logos_academy.record_makeup(p_actor_user_id uuid, p_attendance_record_id uuid, p_makeup_session_id uuid, p_completed_at timestamptz, p_note text, p_encryption_key text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare attendance_row logos_academy.attendance_records%rowtype; makeup_id uuid; result jsonb;
begin
  select ar.* into attendance_row from logos_academy.attendance_records ar where ar.id=p_attendance_record_id and ar.deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='attendance record not found'; end if;
  perform private.assert_admin_actor(attendance_row.tenant_id,p_actor_user_id);
  if not exists (select 1 from logos_academy.enrollments e where e.tenant_id=attendance_row.tenant_id and e.id=attendance_row.enrollment_id and e.status='active' and e.deleted_at is null) then raise exception using errcode='23514', message='makeup enrollment must be active'; end if;
  insert into logos_academy.makeup_records(tenant_id,attendance_record_id,makeup_session_id,completed_at,recorded_by_user_id,note_encrypted)
    values(attendance_row.tenant_id,attendance_row.id,p_makeup_session_id,p_completed_at,p_actor_user_id,case when nullif(btrim(p_note),'') is null then null else extensions.pgp_sym_encrypt(p_note,p_encryption_key) end)
    on conflict on constraint makeup_records_active_key do update set makeup_session_id=excluded.makeup_session_id,completed_at=excluded.completed_at,recorded_by_user_id=excluded.recorded_by_user_id,note_encrypted=excluded.note_encrypted
    returning id into makeup_id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(attendance_row.tenant_id,p_actor_user_id,'attendance.makeup_recorded','attendance_record',attendance_row.id,p_request_id,jsonb_build_object('makeup_id',makeup_id));
  select jsonb_build_object('attendanceId',ar.id,'enrollmentId',ar.enrollment_id,'studentName',u.display_name,'status',ar.status,'privateNote',case when pn.id is null then null else extensions.pgp_sym_decrypt(pn.note_encrypted,p_encryption_key) end,'makeup',jsonb_build_object('completedAt',mr.completed_at,'makeupSessionId',mr.makeup_session_id))
  into result from logos_academy.attendance_records ar join logos_academy.enrollments e on e.tenant_id=ar.tenant_id and e.id=ar.enrollment_id join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id left join logos_academy.attendance_private_notes pn on pn.tenant_id=ar.tenant_id and pn.attendance_record_id=ar.id and pn.deleted_at is null join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.id=makeup_id and mr.deleted_at is null where ar.tenant_id=attendance_row.tenant_id and ar.id=attendance_row.id;
  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- SR-A4: private.admin_submission_detail ganha student/activity/classSummary/dueAt.
-- Consumidores existentes (admin_reviews_page, student_activity_detail via
-- latestSubmission/submissionHistory) recebem os campos extras sem quebrar —
-- os tipos TS correspondentes (SubmissionDetail) ignoram propriedades extras.
-- Assinatura preservada.
-- ---------------------------------------------------------------------------

create or replace function private.admin_submission_detail(
  p_tenant_id uuid,
  p_submission_id uuid,
  p_encryption_key text
) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'assignmentId', s.activity_assignment_id,
    'version', s.version,
    'isDraft', s.is_draft,
    'isLate', coalesce(s.submitted_at > aa.due_at, false),
    'submittedAt', s.submitted_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', si.id,
        'requirementId', si.activity_requirement_id,
        'kind', si.kind,
        'textValue', case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted, p_encryption_key) end,
        'urlValue', case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted, p_encryption_key) end,
        'fileId', si.uploaded_file_id,
        'fileName', case when uf.filename_encrypted is null then null else extensions.pgp_sym_decrypt(uf.filename_encrypted, p_encryption_key) end
      ) order by si.created_at, si.id)
      from logos_academy.submission_items si
      left join logos_academy.uploaded_files uf on uf.tenant_id = si.tenant_id and uf.id = si.uploaded_file_id and uf.deleted_at is null
      where si.tenant_id = s.tenant_id and si.submission_id = s.id and si.deleted_at is null
    ), '[]'::jsonb),
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object('id', ac.id, 'label', ac.label, 'description', ac.description, 'position', ac.position) order by ac.position, ac.id)
      from logos_academy.activity_criteria ac
      where ac.tenant_id = aa.tenant_id and ac.activity_template_id = aa.activity_template_id and ac.deleted_at is null
    ), '[]'::jsonb),
    'review', (
      select private.activity_review_json(s.tenant_id, r.id, e.student_profile_id, p_encryption_key)
      from logos_academy.reviews r
      where r.tenant_id = s.tenant_id and r.submission_id = s.id and r.deleted_at is null
      order by r.reviewed_at desc, r.id desc
      limit 1
    ),
    'reviews', coalesce((
      select jsonb_agg(private.activity_review_json(s.tenant_id, r.id, e.student_profile_id, p_encryption_key) order by r.reviewed_at, r.id)
      from logos_academy.reviews r
      where r.tenant_id = s.tenant_id and r.submission_id = s.id and r.deleted_at is null
    ), '[]'::jsonb),
    'student', jsonb_build_object('id', sp.id, 'displayName', u.display_name),
    'activity', jsonb_build_object('title', at.title, 'lessonPosition', lt.position, 'cyclePosition', cy.position),
    'classSummary', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end,
    'dueAt', aa.due_at
  )
  from logos_academy.submissions s
  join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id
  join logos_academy.activity_templates at on at.tenant_id = aa.tenant_id and at.id = aa.activity_template_id
  join logos_academy.lesson_templates lt on lt.tenant_id = at.tenant_id and lt.id = at.lesson_template_id
  join logos_academy.cycles cy on cy.tenant_id = lt.tenant_id and cy.id = lt.cycle_id
  join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
  join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id
  join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id
  left join logos_academy.classes c on c.tenant_id = e.tenant_id and c.id = e.class_id
  where s.tenant_id = p_tenant_id and s.id = p_submission_id and s.deleted_at is null;
$$;

-- ---------------------------------------------------------------------------
-- SR-A5: workspace único de revisão (AdminSubmissionWorkspace).
-- ---------------------------------------------------------------------------

create or replace function logos_academy.admin_submission_workspace(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_encryption_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_submission logos_academy.submissions%rowtype; v_detail jsonb; v_requirements jsonb; v_previous jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;

  select s.* into v_submission
  from logos_academy.submissions s
  where s.tenant_id = p_tenant_id and s.id = p_submission_id and s.deleted_at is null;
  if v_submission.id is null then
    raise exception using errcode = 'P0002', message = 'submission not found';
  end if;

  v_detail := private.admin_submission_detail(p_tenant_id, v_submission.id, p_encryption_key);

  select coalesce(
    jsonb_agg(jsonb_build_object('id', ar.id, 'kind', ar.kind, 'label', ar.label, 'required', ar.is_required, 'position', ar.position) order by ar.position, ar.id),
    '[]'::jsonb
  )
  into v_requirements
  from logos_academy.activity_requirements ar
  join logos_academy.activity_assignments aa on aa.tenant_id = ar.tenant_id and aa.activity_template_id = ar.activity_template_id
  where ar.tenant_id = p_tenant_id and aa.id = v_submission.activity_assignment_id and ar.deleted_at is null;

  select coalesce(
    jsonb_agg(private.admin_submission_detail(p_tenant_id, s.id, p_encryption_key) order by s.version desc, s.id desc),
    '[]'::jsonb
  )
  into v_previous
  from logos_academy.submissions s
  where s.tenant_id = p_tenant_id
    and s.activity_assignment_id = v_submission.activity_assignment_id
    and not s.is_draft
    and s.version < v_submission.version
    and s.deleted_at is null;

  return v_detail || jsonb_build_object('requirements', v_requirements, 'previousVersions', v_previous);
end;
$$;

-- ---------------------------------------------------------------------------
-- SR-A2: fila de reposições pendentes (Page<PendingMakeup>).
-- ---------------------------------------------------------------------------

create index if not exists attendance_records_pending_makeup_idx
  on logos_academy.attendance_records (tenant_id, status)
  where deleted_at is null and status in ('absent', 'excused_absence');

create or replace function logos_academy.admin_pending_makeups_page(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_class_id uuid default null,
  p_student_profile_id uuid default null,
  p_cursor text default null,
  p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);

  with rows as (
    select
      ar.id attendance_id, ar.enrollment_id, ar.status,
      s.id session_id, s.starts_at, s.ends_at, s.status session_status,
      lt.position lesson_position, lt.title lesson_title,
      sp.id student_profile_id, u.display_name student_name,
      e.class_id, c.name class_name
    from logos_academy.attendance_records ar
    join logos_academy.sessions s on s.tenant_id = ar.tenant_id and s.id = ar.session_id and s.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
    join logos_academy.enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id and e.deleted_at is null
    join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id and sp.deleted_at is null
    join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id and u.deleted_at is null
    left join logos_academy.classes c on c.tenant_id = e.tenant_id and c.id = e.class_id
    where ar.tenant_id = p_tenant_id
      and ar.status in ('absent', 'excused_absence')
      and ar.deleted_at is null
      and not exists (
        select 1 from logos_academy.makeup_records mr
        where mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
      )
      and (p_class_id is null or e.class_id = p_class_id)
      and (p_student_profile_id is null or sp.id = p_student_profile_id)
      and (v_cursor is null or (s.starts_at, ar.id) > ((v_cursor->>0)::timestamptz, (v_cursor->>1)::uuid))
    order by s.starts_at, ar.id
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(
      jsonb_agg(jsonb_build_object(
        'attendanceId', attendance_id,
        'enrollmentId', enrollment_id,
        'studentId', student_profile_id,
        'studentName', student_name,
        'classId', class_id,
        'className', class_name,
        'session', jsonb_build_object('id', session_id, 'lessonPosition', lesson_position, 'lessonTitle', lesson_title, 'startsAt', starts_at, 'endsAt', ends_at, 'status', session_status),
        'status', status
      ) order by starts_at, attendance_id),
      '[]'::jsonb
    ),
    -- terceiro elemento é padding: private.admissions_page exige cursor de comprimento 3;
    -- a ordenação e a comparação usam apenas starts_at e attendance_id (índices 0 e 1).
    (select encode(convert_to(jsonb_build_array(starts_at, attendance_id, attendance_id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$$;

-- ---------------------------------------------------------------------------
-- SR-A3: currículos ativos.
-- ---------------------------------------------------------------------------

create or replace function logos_academy.admin_active_curricula(p_tenant_id uuid, p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_items jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  select coalesce(
    jsonb_agg(jsonb_build_object('id', cu.id, 'name', cu.name, 'version', cu.version, 'status', cu.status) order by cu.name, cu.version),
    '[]'::jsonb
  )
  into v_items
  from logos_academy.curricula cu
  where cu.tenant_id = p_tenant_id and cu.status = 'active' and cu.deleted_at is null;
  return jsonb_build_object('items', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- SR-A6: abas Entregas e Frequência da ficha do aluno (visão admin).
-- ---------------------------------------------------------------------------

create or replace function logos_academy.admin_student_submissions_page(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_student_profile_id uuid,
  p_encryption_key text,
  p_cursor text default null,
  p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;
  if not exists (
    select 1 from logos_academy.student_profiles sp
    where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'student profile not found';
  end if;

  with rows as (
    select s.id, s.submitted_at
    from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id and aa.deleted_at is null
    join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id and e.deleted_at is null
    where s.tenant_id = p_tenant_id
      and e.student_profile_id = p_student_profile_id
      and not s.is_draft
      and s.deleted_at is null
      and (v_cursor is null or (s.submitted_at, s.id) < ((v_cursor->>0)::timestamptz, (v_cursor->>1)::uuid))
    order by s.submitted_at desc, s.id desc
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(jsonb_agg(private.admin_submission_detail(p_tenant_id, id, p_encryption_key) order by submitted_at desc, id desc), '[]'::jsonb),
    -- terceiro elemento é padding (ver admin_pending_makeups_page acima).
    (select encode(convert_to(jsonb_build_array(submitted_at, id, id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$$;

create or replace function logos_academy.admin_student_attendance_page(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_student_profile_id uuid,
  p_enrollment_id uuid default null,
  p_encryption_key text default null,
  p_cursor text default null,
  p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text; v_student_name text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;

  select u.display_name into v_student_name
  from logos_academy.student_profiles sp
  join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id
  where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null;
  if v_student_name is null then
    raise exception using errcode = 'P0002', message = 'student profile not found';
  end if;

  with rows as (
    select
      ar.id attendance_id, ar.created_at attendance_created_at, ar.enrollment_id, ar.status,
      s.id session_id, s.starts_at, s.ends_at, s.status session_status, lt.position lesson_position, lt.title lesson_title,
      pn.note_encrypted, mr.completed_at, mr.makeup_session_id
    from logos_academy.attendance_records ar
    join logos_academy.enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id and e.deleted_at is null
    join logos_academy.sessions s on s.tenant_id = ar.tenant_id and s.id = ar.session_id and s.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
    left join logos_academy.attendance_private_notes pn on pn.tenant_id = ar.tenant_id and pn.attendance_record_id = ar.id and pn.deleted_at is null
    left join logos_academy.makeup_records mr on mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
    where ar.tenant_id = p_tenant_id
      and e.student_profile_id = p_student_profile_id
      and ar.deleted_at is null
      and (p_enrollment_id is null or ar.enrollment_id = p_enrollment_id)
      and (v_cursor is null or (s.starts_at, ar.created_at, ar.id) > ((v_cursor->>0)::timestamptz, (v_cursor->>1)::timestamptz, (v_cursor->>2)::uuid))
    order by s.starts_at, ar.created_at, ar.id
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(
      jsonb_agg(jsonb_build_object(
        'attendanceId', attendance_id,
        'enrollmentId', enrollment_id,
        'studentName', v_student_name,
        'status', status,
        'privateNote', case when note_encrypted is null then null else extensions.pgp_sym_decrypt(note_encrypted, p_encryption_key) end,
        'makeup', case when completed_at is null then null else jsonb_build_object('completedAt', completed_at, 'makeupSessionId', makeup_session_id) end,
        'session', jsonb_build_object('id', session_id, 'lessonPosition', lesson_position, 'lessonTitle', lesson_title, 'startsAt', starts_at, 'endsAt', ends_at, 'status', session_status)
      ) order by starts_at, attendance_created_at, attendance_id),
      '[]'::jsonb
    ),
    (select encode(convert_to(jsonb_build_array(starts_at, attendance_created_at, attendance_id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$$;

-- ---------------------------------------------------------------------------
-- SR-A7: autorização de download de anexo para admin do mesmo tenant.
-- Segue o padrão de logos_academy.student_file_metadata (0050): como o nome do
-- arquivo só existe cifrado (filename_encrypted), a RPC recebe p_encryption_key
-- além de (p_tenant_id, p_actor_user_id, p_file_id) — desvio declarado no report.
-- ---------------------------------------------------------------------------

create or replace function logos_academy.admin_file_download_target(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_file_id uuid,
  p_encryption_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare f logos_academy.uploaded_files%rowtype;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;

  select uf.* into f
  from logos_academy.uploaded_files uf
  where uf.tenant_id = p_tenant_id and uf.id = p_file_id and uf.status = 'ready' and uf.deleted_at is null;
  if f.id is null then
    raise exception using errcode = '42501', message = 'file not available';
  end if;

  return jsonb_build_object(
    'storagePath', f.storage_path,
    'filename', extensions.pgp_sym_decrypt(f.filename_encrypted, p_encryption_key),
    'contentType', f.content_type
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: backend-only (service_role). Nunca authenticated/anon.
-- ---------------------------------------------------------------------------

revoke all on function
  logos_academy.admin_session_attendance(uuid,uuid,uuid,text),
  logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid),
  logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid),
  logos_academy.admin_submission_workspace(uuid,uuid,uuid,text),
  logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer),
  logos_academy.admin_active_curricula(uuid,uuid),
  logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_file_download_target(uuid,uuid,uuid,text)
from public, anon, authenticated;

grant execute on function
  logos_academy.admin_session_attendance(uuid,uuid,uuid,text),
  logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid),
  logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid),
  logos_academy.admin_submission_workspace(uuid,uuid,uuid,text),
  logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer),
  logos_academy.admin_active_curricula(uuid,uuid),
  logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_file_download_target(uuid,uuid,uuid,text)
to service_role;

revoke all on function private.admin_submission_detail(uuid,uuid,text) from public, anon, authenticated, service_role;

comment on function logos_academy.admin_submission_workspace(uuid,uuid,uuid,text) is 'Backend-only: SR-A5 workspace único de revisão (requirements + previousVersions).';
comment on function logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer) is 'Backend-only: SR-A2 fila de reposições pendentes.';
comment on function logos_academy.admin_active_curricula(uuid,uuid) is 'Backend-only: SR-A3 currículos ativos do tenant.';
comment on function logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer) is 'Backend-only: SR-A6 aba Entregas da ficha do aluno.';
comment on function logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer) is 'Backend-only: SR-A6 aba Frequência da ficha do aluno (nota privada decifrada).';
comment on function logos_academy.admin_file_download_target(uuid,uuid,uuid,text) is 'Backend-only: SR-A7 autorização de download de anexo para admin do mesmo tenant.';

notify pgrst, 'reload schema';
commit;
