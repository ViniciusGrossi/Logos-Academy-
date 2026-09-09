begin;

create function logos_academy.write_audit_event(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.tenant_id = p_tenant_id
      and u.id = p_actor_user_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'active tenant actor required';
  end if;

  if jsonb_typeof(p_metadata) <> 'object' or exists (
    select 1
    from jsonb_object_keys(p_metadata) as metadata_key
    where metadata_key not in (
      'assignment_id', 'decision', 'entries', 'makeup_id',
      'paused_enrollment_ids', 'submission_id', 'target_count', 'version'
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid audit metadata';
  end if;

  insert into logos_academy.audit_events(
    tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata
  ) values (
    p_tenant_id, p_actor_user_id, p_action, p_entity_type, p_entity_id, p_request_id, p_metadata
  );
end;
$$;

revoke all on function logos_academy.write_audit_event(uuid,uuid,text,text,uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function logos_academy.write_audit_event(uuid,uuid,text,text,uuid,uuid,jsonb) to service_role;
comment on function logos_academy.write_audit_event(uuid,uuid,text,text,uuid,uuid,jsonb)
  is 'Backend-only audit writer: validates active tenant actor and allows only technical metadata keys.';

notify pgrst, 'reload schema';
commit;
