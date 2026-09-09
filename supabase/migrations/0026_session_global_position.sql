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
  return (
    with session_curriculum as (
      select c.curriculum_id from logos_academy.lesson_templates target_lt
      join logos_academy.cycles c on c.tenant_id=target_lt.tenant_id and c.id=target_lt.cycle_id
      where target_lt.tenant_id=v.tenant_id and target_lt.id=v.lesson_template_id
    ), lessons as (
      select lt.id,lt.title,row_number() over(order by c.position,lt.position)::integer global_position
      from logos_academy.lesson_templates lt
      join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
      join session_curriculum sc on sc.curriculum_id=c.curriculum_id
      where lt.tenant_id=v.tenant_id and lt.deleted_at is null and c.deleted_at is null
    )
    select jsonb_build_object('id',v.id,'lessonPosition',global_position,'lessonTitle',title,'startsAt',v.starts_at,'endsAt',v.ends_at,'status',v.status)
    from lessons where id=v.lesson_template_id
  );
end; $$;

revoke all on function logos_academy.admin_update_session(uuid,uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function logos_academy.admin_update_session(uuid,uuid,uuid,timestamptz,timestamptz,text) to service_role;
notify pgrst,'reload schema';
commit;
