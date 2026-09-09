begin;

-- Recovery state contains only the Auth UUID and the already-issued timestamp.
-- It intentionally contains no email, phone, or invitation payload.
alter table logos_academy.idempotency_keys
  add column auth_user_id uuid,
  add column invitation_sent_at timestamptz,
  add constraint idempotency_keys_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete restrict;

create or replace function logos_academy.claim_student_invitation(
  p_tenant_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_payload_hash bytea
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_hash bytea; v_result jsonb; v_auth_user_id uuid; v_invitation_sent_at timestamptz;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_idempotency_key)) not between 1 and 200 or octet_length(p_payload_hash) <> 32 then
    raise exception using errcode = '22023', message = 'invalid invitation idempotency key';
  end if;
  insert into logos_academy.idempotency_keys (tenant_id, actor_user_id, route, key, payload_hash)
  values (p_tenant_id, p_actor_user_id, 'admin.students.invite', btrim(p_idempotency_key), p_payload_hash)
  on conflict (tenant_id, actor_user_id, route, key, deleted_at) do nothing;
  select ik.payload_hash, ik.result, ik.auth_user_id, ik.invitation_sent_at
    into v_hash, v_result, v_auth_user_id, v_invitation_sent_at
  from logos_academy.idempotency_keys ik
  where ik.tenant_id = p_tenant_id and ik.actor_user_id = p_actor_user_id
    and ik.route = 'admin.students.invite' and ik.key = btrim(p_idempotency_key) and ik.deleted_at is null
  for update;
  if v_hash <> p_payload_hash then raise exception using errcode = '23505', message = 'idempotency key payload mismatch'; end if;
  return coalesce(v_result, jsonb_build_object('state', 'claimed', 'authUserId', v_auth_user_id, 'invitationSentAt', v_invitation_sent_at));
end;
$$;

create or replace function logos_academy.bind_student_invitation_auth(
  p_tenant_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_payload_hash bytea,
  p_auth_user_id uuid, p_invitation_sent_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_hash bytea; v_result jsonb; v_auth_user_id uuid; v_invitation_sent_at timestamptz;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_idempotency_key)) not between 1 and 200 or octet_length(p_payload_hash) <> 32
    or p_auth_user_id is null or p_invitation_sent_at is null
  then raise exception using errcode = '22023', message = 'invalid invitation auth binding'; end if;
  if not exists (select 1 from auth.users au where au.id = p_auth_user_id) then
    raise exception using errcode = 'P0002', message = 'auth user not found';
  end if;
  select ik.payload_hash, ik.result, ik.auth_user_id, ik.invitation_sent_at
    into v_hash, v_result, v_auth_user_id, v_invitation_sent_at
  from logos_academy.idempotency_keys ik
  where ik.tenant_id = p_tenant_id and ik.actor_user_id = p_actor_user_id
    and ik.route = 'admin.students.invite' and ik.key = btrim(p_idempotency_key) and ik.deleted_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'invitation claim not found'; end if;
  if v_hash <> p_payload_hash then raise exception using errcode = '23505', message = 'idempotency key payload mismatch'; end if;
  if v_result is not null then return v_result; end if;
  if v_auth_user_id is not null and (v_auth_user_id <> p_auth_user_id or v_invitation_sent_at <> p_invitation_sent_at) then
    raise exception using errcode = '23505', message = 'invitation auth binding mismatch';
  end if;
  update logos_academy.idempotency_keys
  set auth_user_id = p_auth_user_id, invitation_sent_at = p_invitation_sent_at
  where tenant_id = p_tenant_id and actor_user_id = p_actor_user_id
    and route = 'admin.students.invite' and key = btrim(p_idempotency_key) and deleted_at is null;
  return jsonb_build_object('state', 'claimed', 'authUserId', p_auth_user_id, 'invitationSentAt', p_invitation_sent_at);
end;
$$;

revoke all on function logos_academy.claim_student_invitation(uuid,uuid,text,bytea),
  logos_academy.bind_student_invitation_auth(uuid,uuid,text,bytea,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function logos_academy.claim_student_invitation(uuid,uuid,text,bytea),
  logos_academy.bind_student_invitation_auth(uuid,uuid,text,bytea,uuid,timestamptz)
  to service_role;

notify pgrst, 'reload schema';
commit;
