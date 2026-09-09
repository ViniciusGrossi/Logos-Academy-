begin;

create or replace function logos_academy.student_attendance_page(
  p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid default null,p_cursor text default null,p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment uuid; v_cursor jsonb := private.admissions_page(p_cursor,p_limit); v_items jsonb; v_next text;
begin
  select e.id into v_enrollment
  from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id
  where e.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and e.deleted_at is null and sp.deleted_at is null
    and (p_enrollment_id is null or e.id=p_enrollment_id)
  order by e.created_at desc limit 1;
  if v_enrollment is null then raise exception using errcode='42501',message='student enrollment required'; end if;

  with rows as (
    select ar.id attendance_id, ar.created_at attendance_created_at, ar.status, s.id session_id, s.starts_at, s.ends_at, s.status session_status, lt.title,
      (select count(*)::integer from logos_academy.lesson_templates all_lt join logos_academy.cycles all_c on all_c.tenant_id=all_lt.tenant_id and all_c.id=all_lt.cycle_id where all_lt.tenant_id=lt.tenant_id and all_c.curriculum_id=c.curriculum_id and all_lt.deleted_at is null and all_c.deleted_at is null and (all_c.position,all_lt.position) <= (c.position,lt.position)) lesson_position,
      mr.completed_at, mr.makeup_session_id
    from logos_academy.attendance_records ar
    join logos_academy.sessions s on s.tenant_id=ar.tenant_id and s.id=ar.session_id
    join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id
    join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
    left join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null
    where ar.tenant_id=p_tenant_id and ar.enrollment_id=v_enrollment and ar.deleted_at is null and s.deleted_at is null
      and (v_cursor is null or (s.starts_at,ar.created_at,ar.id) > ((v_cursor->>0)::timestamptz,(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid))
    order by s.starts_at,ar.created_at,ar.id limit p_limit+1
  ), page as (select * from rows limit p_limit), tail as (select * from rows offset p_limit limit 1)
  select coalesce(jsonb_agg(jsonb_build_object(
      'session',jsonb_build_object('id',session_id,'lessonPosition',lesson_position,'lessonTitle',title,'startsAt',starts_at,'endsAt',ends_at,'status',session_status),
      'status',status,
      'makeup',case when completed_at is null then null else jsonb_build_object('completedAt',completed_at,'makeupSessionId',makeup_session_id) end
    ) order by starts_at,attendance_created_at,attendance_id),'[]'::jsonb),
    (select encode(convert_to(jsonb_build_array(starts_at,attendance_created_at,attendance_id)::text,'utf8'),'base64') from tail)
  into v_items,v_next from page;
  return jsonb_build_object('items',v_items,'nextCursor',v_next);
end; $$;

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
  select coalesce(jsonb_agg(jsonb_build_object('enrollmentId',ar.enrollment_id,'studentName',u.display_name,'status',ar.status,'privateNote',case when pn.id is null then null else extensions.pgp_sym_decrypt(pn.note_encrypted,p_encryption_key) end,'makeup',case when mr.id is null then null else jsonb_build_object('completedAt',mr.completed_at,'makeupSessionId',mr.makeup_session_id) end) order by u.display_name),'[]'::jsonb)
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
  select jsonb_build_object('enrollmentId',ar.enrollment_id,'studentName',u.display_name,'status',ar.status,'privateNote',case when pn.id is null then null else extensions.pgp_sym_decrypt(pn.note_encrypted,p_encryption_key) end,'makeup',jsonb_build_object('completedAt',mr.completed_at,'makeupSessionId',mr.makeup_session_id))
  into result from logos_academy.attendance_records ar join logos_academy.enrollments e on e.tenant_id=ar.tenant_id and e.id=ar.enrollment_id join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id left join logos_academy.attendance_private_notes pn on pn.tenant_id=ar.tenant_id and pn.attendance_record_id=ar.id and pn.deleted_at is null join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.id=makeup_id and mr.deleted_at is null where ar.tenant_id=attendance_row.tenant_id and ar.id=attendance_row.id;
  return result;
end; $$;

revoke all on function logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer),logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid),logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer),logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid),logos_academy.record_makeup(uuid,uuid,uuid,timestamptz,text,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
