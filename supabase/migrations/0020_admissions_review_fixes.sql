begin;

create or replace function private.schedule_sessions(p_tenant_id uuid,p_curriculum_id uuid,p_class_id uuid,p_enrollment_id uuid,p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d date; wd int[]; tm time[]; dur int; tz text; l record; st timestamptz; n int:=0;
begin
  if jsonb_typeof(p_schedule)<>'object' or exists(select 1 from jsonb_object_keys(p_schedule) k where k not in ('startsOn','weekdays','startsAtLocal','durationMinutes','timezone')) then raise exception using errcode='22023',message='invalid schedule'; end if;
  begin d:=(p_schedule->>'startsOn')::date; wd:=array(select jsonb_array_elements_text(p_schedule->'weekdays')::int); tm:=array(select jsonb_array_elements_text(p_schedule->'startsAtLocal')::time); dur:=(p_schedule->>'durationMinutes')::int; tz:=p_schedule->>'timezone'; perform now() at time zone tz; exception when others then raise exception using errcode='22023',message='invalid schedule'; end;
  if array_length(wd,1)<>2 or array_length(tm,1)<>2 or wd[1] not between 0 and 6 or wd[2] not between 0 and 6 or wd[1]=wd[2] or dur not between 15 and 480 then raise exception using errcode='22023',message='invalid schedule'; end if;
  for l in select lt.id from logos_academy.lesson_templates lt join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id where lt.tenant_id=p_tenant_id and c.curriculum_id=p_curriculum_id and lt.deleted_at is null and c.deleted_at is null order by c.position,lt.position loop
    while extract(dow from d)::int<>all(wd) loop d:=d+1; end loop; st:=((d::text||' '||tm[array_position(wd,extract(dow from d)::int)]::text)::timestamp at time zone tz); insert into logos_academy.sessions(tenant_id,class_id,enrollment_id,lesson_template_id,starts_at,ends_at,status) values(p_tenant_id,p_class_id,p_enrollment_id,l.id,st,st+make_interval(mins=>dur),'scheduled'); n:=n+1; d:=d+1;
  end loop;
  if n<>16 then raise exception using errcode='23514',message='curriculum must have exactly sixteen lessons'; end if;
  return (select jsonb_agg(jsonb_build_object('id',x.id,'lessonPosition',x.global_position,'lessonTitle',x.title,'startsAt',x.starts_at,'endsAt',x.ends_at,'status',x.status) order by x.global_position) from (select s.*,lt.title,row_number() over(order by c.position,lt.position)::int global_position from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id where s.tenant_id=p_tenant_id and ((p_class_id is not null and s.class_id=p_class_id)or(p_enrollment_id is not null and s.enrollment_id=p_enrollment_id)) and s.deleted_at is null)x);
end; $$;

create or replace function logos_academy.clear_student_invitation_auth(p_tenant_id uuid,p_actor_user_id uuid,p_idempotency_key text,p_payload_hash bytea,p_auth_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare h bytea; r jsonb; a uuid;
begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id); select payload_hash,result,auth_user_id into h,r,a from logos_academy.idempotency_keys where tenant_id=p_tenant_id and actor_user_id=p_actor_user_id and route='admin.students.invite' and key=btrim(p_idempotency_key) and deleted_at is null for update; if not found then raise exception using errcode='P0002',message='invitation claim not found'; end if; if h<>p_payload_hash then raise exception using errcode='23505',message='idempotency key payload mismatch'; end if; if r is not null then raise exception using errcode='23514',message='completed invitation cannot be cleared'; end if; if a is distinct from p_auth_user_id then raise exception using errcode='23505',message='invitation auth binding mismatch'; end if; update logos_academy.idempotency_keys set auth_user_id=null,invitation_sent_at=null where tenant_id=p_tenant_id and actor_user_id=p_actor_user_id and route='admin.students.invite' and key=btrim(p_idempotency_key) and deleted_at is null; return jsonb_build_object('state','claimed','cleared',true); end; $$;

create or replace function logos_academy.activate_invited_student(p_tenant_id uuid,p_auth_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; ids uuid[];
begin if not exists(select 1 from auth.users where id=p_auth_user_id) then raise exception using errcode='P0002',message='auth user not found'; end if; select id into u from logos_academy.users where tenant_id=p_tenant_id and auth_user_id=p_auth_user_id and access_enabled and deleted_at is null for update; if not found then raise exception using errcode='42501',message='tenant identity required'; end if; with changed as(update logos_academy.enrollments e set status='active',activated_at=coalesce(activated_at,now()) from logos_academy.student_profiles sp where e.tenant_id=p_tenant_id and e.student_profile_id=sp.id and sp.tenant_id=e.tenant_id and sp.user_id=u and e.status='invited' and e.deleted_at is null returning e.id) select coalesce(array_agg(id),'{}'::uuid[]) into ids from changed; return jsonb_build_object('userId',u,'activatedEnrollmentIds',ids); end; $$;

revoke all on function logos_academy.clear_student_invitation_auth(uuid,uuid,text,bytea,uuid),logos_academy.activate_invited_student(uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.clear_student_invitation_auth(uuid,uuid,text,bytea,uuid),logos_academy.activate_invited_student(uuid,uuid) to service_role;
notify pgrst,'reload schema'; commit;
