begin;

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

revoke all on function logos_academy.admin_session_attendance(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function logos_academy.admin_session_attendance(uuid, uuid, uuid, text) to service_role;

comment on function logos_academy.admin_session_attendance(uuid, uuid, uuid, text)
is 'Backend-only: returns saved attendance for one tenant-scoped session after validating the admin actor.';

notify pgrst, 'reload schema';
commit;
