begin;

-- Exclusive keyset predicates require the cursor of the last RETURNED row.
-- A look-ahead row only indicates that another page exists; never use its key.

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
    select * from rows order by starts_at, attendance_id limit p_limit
  ), tail as (
    select * from page
    where exists (select 1 from rows offset p_limit limit 1)
    order by starts_at desc, attendance_id desc limit 1
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
    select * from rows order by submitted_at desc, id desc limit p_limit
  ), tail as (
    select * from page
    where exists (select 1 from rows offset p_limit limit 1)
    order by submitted_at, id limit 1
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
    select * from rows order by starts_at, attendance_created_at, attendance_id limit p_limit
  ), tail as (
    select * from page
    where exists (select 1 from rows offset p_limit limit 1)
    order by starts_at desc, attendance_created_at desc, attendance_id desc limit 1
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

-- Preserve backend-only execution; authorization and tenant filters unchanged.
revoke all on function
  logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer),
  logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer)
from public,anon,authenticated;
grant execute on function
  logos_academy.admin_pending_makeups_page(uuid,uuid,uuid,uuid,text,integer),
  logos_academy.admin_student_submissions_page(uuid,uuid,uuid,text,text,integer),
  logos_academy.admin_student_attendance_page(uuid,uuid,uuid,uuid,text,text,integer)
to service_role;
notify pgrst,'reload schema';
commit;
