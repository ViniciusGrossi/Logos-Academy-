begin;

create or replace function logos_academy.admin_update_session(
  p_tenant_id uuid, p_actor_user_id uuid, p_session_id uuid,
  p_starts_at timestamptz default null, p_ends_at timestamptz default null, p_status text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v logos_academy.sessions%rowtype;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if p_starts_at is null and p_ends_at is null and p_status is null then raise exception using errcode='22023',message='empty session update'; end if;
  if p_status is not null and p_status not in ('scheduled','completed','rescheduled','cancelled') then raise exception using errcode='22023',message='invalid session status'; end if;
  update logos_academy.sessions set starts_at=coalesce(p_starts_at,starts_at),ends_at=coalesce(p_ends_at,ends_at),status=coalesce(p_status,status)
  where tenant_id=p_tenant_id and id=p_session_id and deleted_at is null returning * into v;
  if not found or v.ends_at<=v.starts_at then raise exception using errcode='22023',message='invalid session update'; end if;
  return (select jsonb_build_object('id',v.id,'lessonPosition',row_number() over(order by c.position,lt.position),'lessonTitle',lt.title,'startsAt',v.starts_at,'endsAt',v.ends_at,'status',v.status)
    from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id where lt.tenant_id=v.tenant_id and lt.id=v.lesson_template_id);
end; $$;

create or replace function logos_academy.student_attendance_page(
  p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid default null,p_cursor text default null,p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment uuid; v_items jsonb;
begin
  if p_limit not between 1 and 100 then raise exception using errcode='22023',message='invalid page limit'; end if;
  select e.id into v_enrollment from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id
    where e.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and e.deleted_at is null and sp.deleted_at is null and (p_enrollment_id is null or e.id=p_enrollment_id) order by e.created_at desc limit 1;
  if v_enrollment is null then raise exception using errcode='42501',message='student enrollment required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('session',jsonb_build_object('id',s.id,'lessonPosition',row_number() over(order by c.position,lt.position),'lessonTitle',lt.title,'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status),'status',ar.status,'makeup',case when mr.id is null then null else jsonb_build_object('id',mr.id,'completedAt',mr.completed_at,'makeupSessionId',mr.makeup_session_id) end) order by s.starts_at),'[]'::jsonb)
  into v_items from logos_academy.attendance_records ar join logos_academy.sessions s on s.tenant_id=ar.tenant_id and s.id=ar.session_id join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id left join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null
  where ar.tenant_id=p_tenant_id and ar.enrollment_id=v_enrollment and ar.deleted_at is null;
  return jsonb_build_object('items',v_items,'nextCursor',null);
end; $$;

revoke all on function logos_academy.admin_update_session(uuid,uuid,uuid,timestamptz,timestamptz,text),logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function logos_academy.admin_update_session(uuid,uuid,uuid,timestamptz,timestamptz,text),logos_academy.student_attendance_page(uuid,uuid,uuid,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
