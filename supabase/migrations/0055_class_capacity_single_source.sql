-- Capacidade de turma: fonte única passa a ser classes.capacity.
-- O literal 6 estava duplicado no trigger, na RPC de matrícula e na rota de
-- opções de convite. O constraint capacity = 6 continua intacto (fixo por decisão
-- de produto); só a leitura do valor deixa de ser hardcoded em 3 lugares.
begin;

create or replace function private.enforce_class_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare active_count integer; v_capacity smallint;
begin
  if new.class_id is null or new.status <> 'active' or new.deleted_at is not null then return new; end if;
  select c.capacity into v_capacity from logos_academy.classes c where c.tenant_id = new.tenant_id and c.id = new.class_id for update;
  select count(*) into active_count from logos_academy.enrollments e
  where e.tenant_id = new.tenant_id and e.class_id = new.class_id and e.status = 'active'
    and e.deleted_at is null and e.id <> new.id;
  if active_count >= v_capacity then raise exception using errcode = '23514', message = 'class capacity of six active enrollments exceeded'; end if;
  return new;
end;
$$;

create or replace function logos_academy.create_admission_enrollment(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_student_profile_id uuid,
  p_curriculum_id uuid,
  p_kind text,
  p_class_id uuid,
  p_individual_schedule jsonb,
  p_status text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment logos_academy.enrollments%rowtype;
  v_sessions jsonb;
  v_capacity smallint;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);

  if p_kind not in ('class', 'individual') or p_status not in ('invited', 'active', 'paused') then
    raise exception using errcode = '22023', message = 'invalid enrollment';
  end if;

  if not exists (select 1 from logos_academy.student_profiles sp where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null)
    or not exists (select 1 from logos_academy.curricula c where c.tenant_id = p_tenant_id and c.id = p_curriculum_id and c.status = 'active' and c.deleted_at is null)
  then
    raise exception using errcode = 'P0002', message = 'student or curriculum not found';
  end if;

  if p_kind = 'class' then
    if p_class_id is null or p_individual_schedule is not null or not exists (
      select 1 from logos_academy.classes c where c.tenant_id = p_tenant_id and c.id = p_class_id and c.curriculum_id = p_curriculum_id and c.deleted_at is null
    ) then
      raise exception using errcode = '22023', message = 'invalid class placement';
    end if;

    select c.capacity into v_capacity from logos_academy.classes c where c.tenant_id = p_tenant_id and c.id = p_class_id for update;

    select e.* into v_enrollment from logos_academy.enrollments e where e.tenant_id = p_tenant_id and e.student_profile_id = p_student_profile_id
      and e.curriculum_id = p_curriculum_id and e.class_id = p_class_id and e.deleted_at is null and e.status in ('invited','active','paused') for update;
    if found then
      insert into logos_academy.audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, request_id)
      values (p_tenant_id, p_actor_user_id, 'enrollment.created', 'enrollment', v_enrollment.id, p_request_id);
      return jsonb_build_object('id', v_enrollment.id, 'studentId', v_enrollment.student_profile_id, 'kind', v_enrollment.kind,
        'classId', v_enrollment.class_id, 'status', v_enrollment.status, 'activatedAt', v_enrollment.activated_at, 'sessions', null);
    end if;

    if (select count(*) from logos_academy.enrollments e where e.tenant_id = p_tenant_id and e.class_id = p_class_id and e.deleted_at is null and e.status in ('invited','active','paused')) >= v_capacity then
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

revoke all on function logos_academy.create_admission_enrollment(uuid,uuid,uuid,uuid,text,uuid,jsonb,text,uuid) from public, anon, authenticated;
grant execute on function logos_academy.create_admission_enrollment(uuid,uuid,uuid,uuid,text,uuid,jsonb,text,uuid) to service_role;

create or replace function logos_academy.admin_list_classes(p_tenant_id uuid,p_actor_user_id uuid,p_status text default null,p_cursor text default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_items jsonb; v_next text;
begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
 with rows as (select c.id,c.name,c.starts_on,c.status,c.capacity,c.created_at,cu.name curriculum_name,count(e.id) filter(where e.status in ('invited','active','paused'))::int student_count from logos_academy.classes c join logos_academy.curricula cu on cu.tenant_id=c.tenant_id and cu.id=c.curriculum_id left join logos_academy.enrollments e on e.tenant_id=c.tenant_id and e.class_id=c.id and e.deleted_at is null where c.tenant_id=p_tenant_id and c.deleted_at is null and (p_status is null or c.status=p_status) and (v_cursor is null or (c.name,c.created_at,c.id)>(v_cursor->>0,(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid)) group by c.id,cu.name order by c.name,c.created_at,c.id limit p_limit+1), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'curriculumName',curriculum_name,'startsOn',starts_on,'status',status,'capacity',capacity,'activeStudentCount',student_count) order by name,created_at,id),'[]'::jsonb),(select encode(convert_to(jsonb_build_array(name,created_at,id)::text,'utf8'),'base64') from tail) into v_items,v_next from page;
 return jsonb_build_object('items',v_items,'nextCursor',v_next); end; $$;

revoke all on function logos_academy.admin_list_classes(uuid,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function logos_academy.admin_list_classes(uuid,uuid,text,text,integer) to service_role;

create or replace function logos_academy.admin_class_detail(p_tenant_id uuid,p_actor_user_id uuid,p_class_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select jsonb_build_object('class',jsonb_build_object('id',c.id,'name',c.name,'curriculumName',cu.name,'startsOn',c.starts_on,'status',c.status,'capacity',c.capacity,'activeStudentCount',(select count(*) from logos_academy.enrollments e where e.tenant_id=c.tenant_id and e.class_id=c.id and e.status in ('invited','active','paused') and e.deleted_at is null)),'enrollments',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',e.student_profile_id,'studentName',u.display_name,'curriculumName',cu2.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at) order by u.display_name),'[]'::jsonb) from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id join logos_academy.curricula cu2 on cu2.tenant_id=e.tenant_id and cu2.id=e.curriculum_id where e.tenant_id=c.tenant_id and e.class_id=c.id and e.deleted_at is null),'sessions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lessonPosition',q.global_position,'lessonTitle',q.title,'startsAt',q.starts_at,'endsAt',q.ends_at,'status',q.status) order by q.starts_at),'[]'::jsonb) from (select s.id,s.starts_at,s.ends_at,s.status,lt.title,row_number() over(order by cy.position,lt.position)::integer global_position from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles cy on cy.tenant_id=lt.tenant_id and cy.id=lt.cycle_id where s.tenant_id=c.tenant_id and s.class_id=c.id and s.deleted_at is null) q)) into v from logos_academy.classes c join logos_academy.curricula cu on cu.tenant_id=c.tenant_id and cu.id=c.curriculum_id where c.tenant_id=p_tenant_id and c.id=p_class_id and c.deleted_at is null;
  if v is null then raise exception using errcode='P0002',message='class not found'; end if;
  return v;
end; $$;

revoke all on function logos_academy.admin_class_detail(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function logos_academy.admin_class_detail(uuid,uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
