begin;

-- These RPCs are deliberately service-role only. The server adapter creates or
-- reuses auth.users first, then calls prepare_invited_student atomically.
create or replace function private.assert_tenant_admin(p_tenant_id uuid, p_actor_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.tenant_id = p_tenant_id
      and u.id = p_actor_user_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.role = 'admin'
      and tm.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'tenant admin required';
  end if;
end;
$$;

create or replace function private.schedule_sessions(
  p_tenant_id uuid,
  p_curriculum_id uuid,
  p_class_id uuid,
  p_enrollment_id uuid,
  p_schedule jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts_on date;
  v_weekdays integer[];
  v_times time[];
  v_duration integer;
  v_timezone text;
  v_lesson record;
  v_date date;
  v_starts_at timestamptz;
  v_count integer := 0;
begin
  if jsonb_typeof(p_schedule) <> 'object'
    or p_schedule ?| array['startsOn', 'weekdays', 'startsAtLocal', 'durationMinutes', 'timezone'] is false
    or exists (select 1 from jsonb_object_keys(p_schedule) k where k not in ('startsOn', 'weekdays', 'startsAtLocal', 'durationMinutes', 'timezone'))
  then
    raise exception using errcode = '22023', message = 'invalid schedule';
  end if;

  begin
    v_starts_on := (p_schedule->>'startsOn')::date;
    v_weekdays := array(select jsonb_array_elements_text(p_schedule->'weekdays')::integer);
    v_times := array(select jsonb_array_elements_text(p_schedule->'startsAtLocal')::time);
    v_duration := (p_schedule->>'durationMinutes')::integer;
    v_timezone := p_schedule->>'timezone';
    perform now() at time zone v_timezone;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid schedule';
  end;

  if coalesce(array_length(v_weekdays, 1), 0) <> 2
    or coalesce(array_length(v_times, 1), 0) <> 2
    or v_weekdays[1] not between 0 and 6
    or v_weekdays[2] not between 0 and 6
    or v_weekdays[1] = v_weekdays[2]
    or v_duration not between 15 and 480
    or length(btrim(v_timezone)) > 100
  then
    raise exception using errcode = '22023', message = 'invalid schedule';
  end if;

  v_date := v_starts_on;
  for v_lesson in
    select lt.id, lt.position, lt.title
    from logos_academy.lesson_templates lt
    join logos_academy.cycles c on c.tenant_id = lt.tenant_id and c.id = lt.cycle_id
    where lt.tenant_id = p_tenant_id
      and c.curriculum_id = p_curriculum_id
      and lt.deleted_at is null
      and c.deleted_at is null
    order by lt.position
  loop
    while extract(dow from v_date)::integer <> all(v_weekdays) loop
      v_date := v_date + 1;
    end loop;
    v_starts_at := ((v_date::text || ' ' || v_times[array_position(v_weekdays, extract(dow from v_date)::integer)]::text)::timestamp at time zone v_timezone);
    insert into logos_academy.sessions (tenant_id, class_id, enrollment_id, lesson_template_id, starts_at, ends_at, status)
    values (p_tenant_id, p_class_id, p_enrollment_id, v_lesson.id, v_starts_at, v_starts_at + make_interval(mins => v_duration), 'scheduled');
    v_count := v_count + 1;
    v_date := v_date + 1;
  end loop;

  if v_count <> 16 then
    raise exception using errcode = '23514', message = 'curriculum must have exactly sixteen lessons';
  end if;

  return (
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'lessonPosition', lt.position, 'lessonTitle', lt.title,
      'startsAt', s.starts_at, 'endsAt', s.ends_at, 'status', s.status
    ) order by lt.position)
    from logos_academy.sessions s
    join logos_academy.lesson_templates lt on lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
    where s.tenant_id = p_tenant_id
      and ((p_class_id is not null and s.class_id = p_class_id) or (p_enrollment_id is not null and s.enrollment_id = p_enrollment_id))
      and s.deleted_at is null
  );
end;
$$;

create or replace function logos_academy.register_guardian_consent(
  p_tenant_id uuid, p_actor_user_id uuid, p_student_profile_id uuid,
  p_guardian_name text, p_relationship text, p_guardian_email text, p_guardian_phone text,
  p_term_version text, p_signed_at date, p_physical_copy_archived boolean,
  p_encryption_key text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_guardian_id uuid; v_consent_id uuid; v_status text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_guardian_name)) not between 1 and 120
    or length(btrim(p_relationship)) not between 1 and 60
    or nullif(btrim(p_guardian_email), '') is null and nullif(btrim(p_guardian_phone), '') is null
    or length(btrim(p_term_version)) not between 1 and 40
    or p_signed_at is null
    or length(p_encryption_key) = 0
  then
    raise exception using errcode = '22023', message = 'invalid guardian or consent';
  end if;
  perform 1 from logos_academy.student_profiles sp where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'student profile not found'; end if;

  select gr.id into v_guardian_id from logos_academy.guardian_records gr
    where gr.tenant_id = p_tenant_id and gr.student_profile_id = p_student_profile_id and gr.deleted_at is null
    order by gr.created_at desc limit 1 for update;
  if v_guardian_id is null then
    insert into logos_academy.guardian_records (tenant_id, student_profile_id, name_encrypted, relationship, email_encrypted, phone_encrypted)
    values (p_tenant_id, p_student_profile_id, extensions.pgp_sym_encrypt(p_guardian_name, p_encryption_key), btrim(p_relationship),
      case when nullif(btrim(p_guardian_email), '') is null then null else extensions.pgp_sym_encrypt(btrim(p_guardian_email), p_encryption_key) end,
      case when nullif(btrim(p_guardian_phone), '') is null then null else extensions.pgp_sym_encrypt(btrim(p_guardian_phone), p_encryption_key) end)
    returning id into v_guardian_id;
  else
    update logos_academy.guardian_records set name_encrypted = extensions.pgp_sym_encrypt(p_guardian_name, p_encryption_key), relationship = btrim(p_relationship),
      email_encrypted = case when nullif(btrim(p_guardian_email), '') is null then null else extensions.pgp_sym_encrypt(btrim(p_guardian_email), p_encryption_key) end,
      phone_encrypted = case when nullif(btrim(p_guardian_phone), '') is null then null else extensions.pgp_sym_encrypt(btrim(p_guardian_phone), p_encryption_key) end
    where tenant_id = p_tenant_id and id = v_guardian_id;
  end if;

  v_status := case when p_physical_copy_archived then 'verified' else 'pending' end;
  insert into logos_academy.consent_records (tenant_id, student_profile_id, guardian_record_id, status, term_version, signed_at, physical_copy_archived, verified_by_user_id, verified_at)
  values (p_tenant_id, p_student_profile_id, v_guardian_id, v_status, btrim(p_term_version),
    case when p_physical_copy_archived then p_signed_at else null end, p_physical_copy_archived,
    case when p_physical_copy_archived then p_actor_user_id else null end, case when p_physical_copy_archived then now() else null end)
  on conflict (tenant_id, student_profile_id, deleted_at) do update set guardian_record_id = excluded.guardian_record_id, status = excluded.status,
    term_version = excluded.term_version, signed_at = excluded.signed_at, physical_copy_archived = excluded.physical_copy_archived,
    verified_by_user_id = excluded.verified_by_user_id, verified_at = excluded.verified_at, revoked_at = null, revocation_reason_encrypted = null
  returning id into v_consent_id;
  insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id)
  values (p_tenant_id, p_actor_user_id, 'consent.recorded', 'consent_record', v_consent_id, p_request_id);
  return jsonb_build_object('id', v_consent_id, 'status', v_status, 'guardianId', v_guardian_id);
end;
$$;

create or replace function logos_academy.create_class_with_sessions(
  p_tenant_id uuid, p_actor_user_id uuid, p_name text, p_curriculum_id uuid, p_schedule jsonb, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_class logos_academy.classes%rowtype; v_sessions jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'invalid class name'; end if;
  if not exists (select 1 from logos_academy.curricula c where c.tenant_id = p_tenant_id and c.id = p_curriculum_id and c.status = 'active' and c.deleted_at is null) then
    raise exception using errcode = 'P0002', message = 'active curriculum not found';
  end if;
  insert into logos_academy.classes (tenant_id, name, curriculum_id, starts_on, status)
  values (p_tenant_id, btrim(p_name), p_curriculum_id, (p_schedule->>'startsOn')::date, 'planned') returning * into v_class;
  v_sessions := private.schedule_sessions(p_tenant_id, p_curriculum_id, v_class.id, null, p_schedule);
  insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata)
  values (p_tenant_id, p_actor_user_id, 'class.created', 'class', v_class.id, p_request_id, jsonb_build_object('target_count', 16));
  return jsonb_build_object('classId', v_class.id, 'sessions', v_sessions);
end;
$$;

create or replace function logos_academy.create_admission_enrollment(
  p_tenant_id uuid, p_actor_user_id uuid, p_student_profile_id uuid, p_curriculum_id uuid,
  p_kind text, p_class_id uuid, p_individual_schedule jsonb, p_status text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_enrollment logos_academy.enrollments%rowtype; v_sessions jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if p_kind not in ('class', 'individual') or p_status not in ('invited', 'active', 'paused') then
    raise exception using errcode = '22023', message = 'invalid enrollment';
  end if;
  if not exists (select 1 from logos_academy.student_profiles sp where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null)
    or not exists (select 1 from logos_academy.curricula c where c.tenant_id = p_tenant_id and c.id = p_curriculum_id and c.status = 'active' and c.deleted_at is null)
  then raise exception using errcode = 'P0002', message = 'student or curriculum not found'; end if;
  if p_kind = 'class' then
    if p_class_id is null or p_individual_schedule is not null or not exists (
      select 1 from logos_academy.classes c where c.tenant_id = p_tenant_id and c.id = p_class_id and c.curriculum_id = p_curriculum_id and c.deleted_at is null
    ) then raise exception using errcode = '22023', message = 'invalid class placement'; end if;
    perform 1 from logos_academy.classes c where c.tenant_id = p_tenant_id and c.id = p_class_id for update;
    select e.* into v_enrollment from logos_academy.enrollments e where e.tenant_id = p_tenant_id and e.student_profile_id = p_student_profile_id
      and e.curriculum_id = p_curriculum_id and e.class_id = p_class_id and e.deleted_at is null and e.status in ('invited','active','paused') for update;
    if found then
      insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id)
      values (p_tenant_id, p_actor_user_id, 'enrollment.created', 'enrollment', v_enrollment.id, p_request_id);
      return jsonb_build_object('id', v_enrollment.id, 'studentId', v_enrollment.student_profile_id, 'kind', v_enrollment.kind,
        'classId', v_enrollment.class_id, 'status', v_enrollment.status, 'activatedAt', v_enrollment.activated_at, 'sessions', null);
    end if;
    if (select count(*) from logos_academy.enrollments e where e.tenant_id = p_tenant_id and e.class_id = p_class_id and e.deleted_at is null and e.status in ('invited','active','paused')) >= 6 then
      raise exception using errcode = '23514', message = 'class capacity of six enrollments exceeded';
    end if;
  elsif p_class_id is not null or p_individual_schedule is null then
    raise exception using errcode = '22023', message = 'invalid individual placement';
  end if;
  insert into logos_academy.enrollments (tenant_id, student_profile_id, curriculum_id, kind, class_id, status, invited_at, activated_at)
  values (p_tenant_id, p_student_profile_id, p_curriculum_id, p_kind, p_class_id, p_status, now(), case when p_status in ('active','paused') then now() else null end)
  on conflict do nothing returning * into v_enrollment;
  if v_enrollment.id is null then
    select e.* into v_enrollment from logos_academy.enrollments e where e.tenant_id = p_tenant_id and e.student_profile_id = p_student_profile_id
      and e.curriculum_id = p_curriculum_id and e.deleted_at is null and e.status in ('invited','active','paused')
      and ((p_kind = 'class' and e.class_id = p_class_id) or (p_kind = 'individual' and e.class_id is null)) for update;
    if not found then raise exception using errcode = '23505', message = 'enrollment already exists'; end if;
  elsif p_kind = 'individual' then
    v_sessions := private.schedule_sessions(p_tenant_id, p_curriculum_id, null, v_enrollment.id, p_individual_schedule);
  end if;
  insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id)
  values (p_tenant_id, p_actor_user_id, 'enrollment.created', 'enrollment', v_enrollment.id, p_request_id);
  return jsonb_build_object('id', v_enrollment.id, 'studentId', v_enrollment.student_profile_id, 'kind', v_enrollment.kind,
    'classId', v_enrollment.class_id, 'status', v_enrollment.status, 'activatedAt', v_enrollment.activated_at, 'sessions', v_sessions);
end;
$$;

create or replace function logos_academy.prepare_invited_student(
  p_tenant_id uuid, p_actor_user_id uuid, p_auth_user_id uuid, p_email text, p_display_name text, p_birth_date date,
  p_guardian_name text, p_relationship text, p_guardian_email text, p_guardian_phone text, p_term_version text,
  p_signed_at date, p_physical_copy_archived boolean, p_curriculum_id uuid, p_kind text, p_class_id uuid,
  p_individual_schedule jsonb, p_encryption_key text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid; v_student_id uuid; v_consent jsonb; v_enrollment jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if not p_physical_copy_archived then raise exception using errcode = '22023', message = 'physical consent is required before invitation'; end if;
  if p_auth_user_id is null or not exists (select 1 from auth.users au where au.id = p_auth_user_id) then
    raise exception using errcode = 'P0002', message = 'auth user not found';
  end if;
  if length(btrim(p_email)) = 0 or length(btrim(p_display_name)) not between 1 and 120 or p_birth_date is null or length(p_encryption_key) = 0 then
    raise exception using errcode = '22023', message = 'invalid invited student';
  end if;
  select u.id into v_user_id from logos_academy.users u where u.tenant_id = p_tenant_id and u.auth_user_id = p_auth_user_id and u.deleted_at is null for update;
  if v_user_id is null then
    insert into logos_academy.users (tenant_id, auth_user_id, email_encrypted, display_name, access_enabled)
    values (p_tenant_id, p_auth_user_id, extensions.pgp_sym_encrypt(btrim(p_email), p_encryption_key), btrim(p_display_name), true) returning id into v_user_id;
    insert into logos_academy.tenant_memberships (tenant_id, user_id, role) values (p_tenant_id, v_user_id, 'student');
  else
    update logos_academy.users set access_enabled = true where tenant_id = p_tenant_id and id = v_user_id;
  end if;
  select sp.id into v_student_id from logos_academy.student_profiles sp where sp.tenant_id = p_tenant_id and sp.user_id = v_user_id and sp.deleted_at is null for update;
  if v_student_id is null then
    insert into logos_academy.student_profiles (tenant_id, user_id, birth_date_encrypted)
    values (p_tenant_id, v_user_id, extensions.pgp_sym_encrypt(p_birth_date::text, p_encryption_key)) returning id into v_student_id;
  end if;
  v_consent := logos_academy.register_guardian_consent(p_tenant_id, p_actor_user_id, v_student_id, p_guardian_name, p_relationship,
    p_guardian_email, p_guardian_phone, p_term_version, p_signed_at, true, p_encryption_key, p_request_id);
  v_enrollment := logos_academy.create_admission_enrollment(p_tenant_id, p_actor_user_id, v_student_id, p_curriculum_id,
    p_kind, p_class_id, p_individual_schedule, 'invited', p_request_id);
  insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id)
  values (p_tenant_id, p_actor_user_id, 'student.invited', 'student_profile', v_student_id, p_request_id);
  return jsonb_build_object('studentId', v_student_id, 'enrollmentId', v_enrollment->>'id', 'consentId', v_consent->>'id');
end;
$$;

create or replace function logos_academy.revoke_admission_consent(
  p_tenant_id uuid, p_actor_user_id uuid, p_student_profile_id uuid, p_reason text, p_encryption_key text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_consent logos_academy.consent_records%rowtype; v_user_id uuid; v_paused_ids uuid[];
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_reason)) not between 1 and 500 or length(p_encryption_key) = 0 then raise exception using errcode = '22023', message = 'invalid revocation'; end if;
  select cr.* into v_consent from logos_academy.consent_records cr where cr.tenant_id = p_tenant_id and cr.student_profile_id = p_student_profile_id
    and cr.status = 'verified' and cr.deleted_at is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'verified consent not found'; end if;
  update logos_academy.consent_records set status = 'revoked', revoked_at = now(), revocation_reason_encrypted = extensions.pgp_sym_encrypt(btrim(p_reason), p_encryption_key)
    where tenant_id = p_tenant_id and id = v_consent.id;
  with paused as (
    update logos_academy.enrollments set status = 'paused', activated_at = coalesce(activated_at, now())
      where tenant_id = p_tenant_id and student_profile_id = p_student_profile_id and status in ('invited','active') and deleted_at is null returning id
  ) select coalesce(array_agg(id), '{}'::uuid[]) into v_paused_ids from paused;
  select sp.user_id into v_user_id from logos_academy.student_profiles sp where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null;
  update logos_academy.users set access_enabled = false where tenant_id = p_tenant_id and id = v_user_id;
  insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata)
  values (p_tenant_id, p_actor_user_id, 'consent.revoked', 'student_profile', p_student_profile_id, p_request_id, jsonb_build_object('paused_enrollment_ids', v_paused_ids));
  return jsonb_build_object('consentId', v_consent.id, 'pausedEnrollmentIds', v_paused_ids, 'accessDisabled', true);
end;
$$;

revoke all on function private.assert_tenant_admin(uuid, uuid), private.schedule_sessions(uuid, uuid, uuid, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function logos_academy.register_guardian_consent(uuid,uuid,uuid,text,text,text,text,text,date,boolean,text,uuid),
  logos_academy.create_class_with_sessions(uuid,uuid,text,uuid,jsonb,uuid),
  logos_academy.create_admission_enrollment(uuid,uuid,uuid,uuid,text,uuid,jsonb,text,uuid),
  logos_academy.prepare_invited_student(uuid,uuid,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,uuid),
  logos_academy.revoke_admission_consent(uuid,uuid,uuid,text,text,uuid)
  from public, anon, authenticated;
grant execute on function logos_academy.register_guardian_consent(uuid,uuid,uuid,text,text,text,text,text,date,boolean,text,uuid),
  logos_academy.create_class_with_sessions(uuid,uuid,text,uuid,jsonb,uuid),
  logos_academy.create_admission_enrollment(uuid,uuid,uuid,uuid,text,uuid,jsonb,text,uuid),
  logos_academy.prepare_invited_student(uuid,uuid,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,uuid),
  logos_academy.revoke_admission_consent(uuid,uuid,uuid,text,text,uuid)
  to service_role;

notify pgrst, 'reload schema';
commit;
