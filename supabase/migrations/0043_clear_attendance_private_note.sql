begin;

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

revoke all on function logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function logos_academy.record_attendance(uuid,uuid,jsonb,text,uuid) to service_role;
notify pgrst,'reload schema';

commit;
