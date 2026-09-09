begin;

-- The original scheduler ordered lesson positions inside each cycle only.
-- Replacing it here also repairs all future class and individual calendars.
create or replace function private.schedule_sessions(p_tenant_id uuid,p_curriculum_id uuid,p_class_id uuid,p_enrollment_id uuid,p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_starts_on date; v_weekdays integer[]; v_times time[]; v_duration integer; v_timezone text; v_lesson record; v_date date; v_starts_at timestamptz; v_count integer:=0;
begin
  if jsonb_typeof(p_schedule)<>'object' or p_schedule ?| array['startsOn','weekdays','startsAtLocal','durationMinutes','timezone'] is false or exists(select 1 from jsonb_object_keys(p_schedule) k where k not in ('startsOn','weekdays','startsAtLocal','durationMinutes','timezone')) then raise exception using errcode='22023',message='invalid schedule'; end if;
  begin v_starts_on:=(p_schedule->>'startsOn')::date; v_weekdays:=array(select jsonb_array_elements_text(p_schedule->'weekdays')::integer); v_times:=array(select jsonb_array_elements_text(p_schedule->'startsAtLocal')::time); v_duration:=(p_schedule->>'durationMinutes')::integer; v_timezone:=p_schedule->>'timezone'; perform now() at time zone v_timezone; exception when others then raise exception using errcode='22023',message='invalid schedule'; end;
  if coalesce(array_length(v_weekdays,1),0)<>2 or coalesce(array_length(v_times,1),0)<>2 or v_weekdays[1] not between 0 and 6 or v_weekdays[2] not between 0 and 6 or v_weekdays[1]=v_weekdays[2] or v_duration not between 15 and 480 or length(btrim(v_timezone))>100 then raise exception using errcode='22023',message='invalid schedule'; end if;
  v_date:=v_starts_on;
  for v_lesson in select lt.id,lt.title,row_number() over(order by c.position,lt.position)::integer as global_position from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id where lt.tenant_id=p_tenant_id and c.curriculum_id=p_curriculum_id and lt.deleted_at is null and c.deleted_at is null order by c.position,lt.position loop
    while extract(dow from v_date)::integer<>all(v_weekdays) loop v_date:=v_date+1; end loop;
    v_starts_at:=((v_date::text||' '||v_times[array_position(v_weekdays,extract(dow from v_date)::integer)]::text)::timestamp at time zone v_timezone);
    insert into logos_academy.sessions(tenant_id,class_id,enrollment_id,lesson_template_id,starts_at,ends_at,status) values(p_tenant_id,p_class_id,p_enrollment_id,v_lesson.id,v_starts_at,v_starts_at+make_interval(mins=>v_duration),'scheduled'); v_count:=v_count+1; v_date:=v_date+1;
  end loop;
  if v_count<>16 then raise exception using errcode='23514',message='curriculum must have exactly sixteen lessons'; end if;
  return (select jsonb_agg(jsonb_build_object('id',q.id,'lessonPosition',q.global_position,'lessonTitle',q.title,'startsAt',q.starts_at,'endsAt',q.ends_at,'status',q.status) order by q.global_position) from (select s.id,s.starts_at,s.ends_at,s.status,lt.title,row_number() over(order by c.position,lt.position)::integer global_position from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id where s.tenant_id=p_tenant_id and ((p_class_id is not null and s.class_id=p_class_id) or (p_enrollment_id is not null and s.enrollment_id=p_enrollment_id)) and s.deleted_at is null) q);
end; $$;

create or replace function logos_academy.clear_student_invitation_auth(p_tenant_id uuid,p_actor_user_id uuid,p_idempotency_key text,p_payload_hash bytea,p_auth_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  update logos_academy.idempotency_keys set auth_user_id=null, invitation_sent_at=null
  where tenant_id=p_tenant_id and actor_user_id=p_actor_user_id and route='admin.students.invite' and key=btrim(p_idempotency_key) and payload_hash=p_payload_hash and auth_user_id=p_auth_user_id and result is null and deleted_at is null;
  if not found then raise exception using errcode='P0002',message='pending invitation binding not found'; end if;
end; $$;

create or replace function logos_academy.activate_invited_student(p_tenant_id uuid,p_auth_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_student_id uuid; v_enrollment_id uuid;
begin
  select sp.id into v_student_id from logos_academy.student_profiles sp join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id where u.tenant_id=p_tenant_id and u.auth_user_id=p_auth_user_id and u.deleted_at is null and sp.deleted_at is null for update;
  if v_student_id is null then raise exception using errcode='P0002',message='student not found'; end if;
  update logos_academy.enrollments set status='active',activated_at=coalesce(activated_at,now()) where tenant_id=p_tenant_id and student_profile_id=v_student_id and status='invited' and deleted_at is null returning id into v_enrollment_id;
  return jsonb_build_object('studentId',v_student_id,'enrollmentId',v_enrollment_id,'active',true);
end; $$;

revoke all on function logos_academy.clear_student_invitation_auth(uuid,uuid,text,bytea,uuid),logos_academy.activate_invited_student(uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.clear_student_invitation_auth(uuid,uuid,text,bytea,uuid),logos_academy.activate_invited_student(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
