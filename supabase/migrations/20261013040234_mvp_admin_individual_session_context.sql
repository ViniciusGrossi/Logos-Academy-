begin;

create function logos_academy.admin_session_context(p_tenant_id uuid,p_actor_user_id uuid,p_session_id uuid,p_encryption_key text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_session logos_academy.sessions; v_position integer; v_title text; v_enrollments jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v_session from logos_academy.sessions where tenant_id=p_tenant_id and id=p_session_id and deleted_at is null;
  if not found then raise exception using errcode='P0002',message='session not found'; end if;
  with ordered as (
    select lt.id,lt.title,row_number() over(partition by c.curriculum_id order by c.position,lt.position,lt.id)::integer position
    from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
    where lt.tenant_id=p_tenant_id and lt.deleted_at is null and c.deleted_at is null
  ) select position,title into v_position,v_title from ordered where id=v_session.lesson_template_id;
  if v_position is null then raise exception using errcode='P0002',message='session curriculum not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',sp.id,'studentName',u.display_name,
    'curriculumName',cu.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at)
    order by u.display_name,e.id),'[]'::jsonb) into v_enrollments
  from logos_academy.enrollments e
  join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id and sp.deleted_at is null
  join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id and u.deleted_at is null
  join logos_academy.curricula cu on cu.tenant_id=e.tenant_id and cu.id=e.curriculum_id and cu.deleted_at is null
  where e.tenant_id=p_tenant_id and e.deleted_at is null
    and ((v_session.class_id is not null and e.class_id=v_session.class_id) or e.id=v_session.enrollment_id);
  return jsonb_build_object('session',jsonb_build_object('id',v_session.id,'lessonPosition',v_position,'lessonTitle',v_title,
    'startsAt',v_session.starts_at,'endsAt',v_session.ends_at,'status',v_session.status),
    'classId',v_session.class_id,'enrollmentId',v_session.enrollment_id,
    'studentId',case when v_session.enrollment_id is not null then (select e.student_profile_id from logos_academy.enrollments e where e.tenant_id=p_tenant_id and e.id=v_session.enrollment_id and e.deleted_at is null) end,
    'enrollments',v_enrollments);
end;
$$;

create function logos_academy.admin_enrollment_calendar(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_enrollment logos_academy.enrollments; v_result jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v_enrollment from logos_academy.enrollments where tenant_id=p_tenant_id and id=p_enrollment_id and deleted_at is null;
  if not found then raise exception using errcode='P0002',message='enrollment not found'; end if;
  with ordered as (
    select lt.id,lt.title,row_number() over(order by c.position,lt.position,lt.id)::integer position
    from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
    where lt.tenant_id=p_tenant_id and c.curriculum_id=v_enrollment.curriculum_id and lt.deleted_at is null and c.deleted_at is null
  ) select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',s.id,'lessonPosition',o.position,
    'lessonTitle',o.title,'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status) order by o.position,s.id),'[]'::jsonb)) into v_result
  from logos_academy.sessions s join ordered o on o.id=s.lesson_template_id
  where s.tenant_id=p_tenant_id and s.deleted_at is null
    and (s.enrollment_id=v_enrollment.id or (v_enrollment.class_id is not null and s.class_id=v_enrollment.class_id));
  return v_result;
end;
$$;
revoke all on function logos_academy.admin_session_context(uuid,uuid,uuid,text),logos_academy.admin_enrollment_calendar(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.admin_session_context(uuid,uuid,uuid,text),logos_academy.admin_enrollment_calendar(uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
