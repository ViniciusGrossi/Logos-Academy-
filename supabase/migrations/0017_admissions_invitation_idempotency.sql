begin;

-- The result contains IDs and timestamps only; PII stays encrypted in its
-- domain records and is never copied to the idempotency ledger.
alter table logos_academy.idempotency_keys
  add column result jsonb check (result is null or jsonb_typeof(result) = 'object');

create or replace function logos_academy.claim_student_invitation(
  p_tenant_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_payload_hash bytea
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_hash bytea; v_result jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_idempotency_key)) not between 1 and 200 or octet_length(p_payload_hash) <> 32 then
    raise exception using errcode = '22023', message = 'invalid invitation idempotency key';
  end if;
  insert into logos_academy.idempotency_keys (tenant_id, actor_user_id, route, key, payload_hash)
  values (p_tenant_id, p_actor_user_id, 'admin.students.invite', btrim(p_idempotency_key), p_payload_hash)
  on conflict (tenant_id, actor_user_id, route, key, deleted_at) do nothing;
  select ik.payload_hash, ik.result into v_hash, v_result
  from logos_academy.idempotency_keys ik
  where ik.tenant_id = p_tenant_id and ik.actor_user_id = p_actor_user_id
    and ik.route = 'admin.students.invite' and ik.key = btrim(p_idempotency_key) and ik.deleted_at is null
  for update;
  if v_hash <> p_payload_hash then raise exception using errcode = '23505', message = 'idempotency key payload mismatch'; end if;
  return coalesce(v_result, jsonb_build_object('state', 'claimed'));
end;
$$;

create or replace function logos_academy.finalize_invited_student(
  p_tenant_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_payload_hash bytea,
  p_auth_user_id uuid, p_email text, p_display_name text, p_birth_date date,
  p_guardian_name text, p_relationship text, p_guardian_email text, p_guardian_phone text, p_term_version text,
  p_signed_at date, p_physical_copy_archived boolean, p_curriculum_id uuid, p_kind text, p_class_id uuid,
  p_individual_schedule jsonb, p_encryption_key text, p_invitation_sent_at timestamptz, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_hash bytea; v_result jsonb; v_domain jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(btrim(p_idempotency_key)) not between 1 and 200 or octet_length(p_payload_hash) <> 32 or p_invitation_sent_at is null then
    raise exception using errcode = '22023', message = 'invalid invitation finalization';
  end if;
  select ik.payload_hash, ik.result into v_hash, v_result
  from logos_academy.idempotency_keys ik
  where ik.tenant_id = p_tenant_id and ik.actor_user_id = p_actor_user_id
    and ik.route = 'admin.students.invite' and ik.key = btrim(p_idempotency_key) and ik.deleted_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'invitation claim not found'; end if;
  if v_hash <> p_payload_hash then raise exception using errcode = '23505', message = 'idempotency key payload mismatch'; end if;
  if v_result is not null then return v_result; end if;
  v_domain := logos_academy.prepare_invited_student(p_tenant_id, p_actor_user_id, p_auth_user_id, p_email, p_display_name,
    p_birth_date, p_guardian_name, p_relationship, p_guardian_email, p_guardian_phone, p_term_version, p_signed_at,
    p_physical_copy_archived, p_curriculum_id, p_kind, p_class_id, p_individual_schedule, p_encryption_key, p_request_id);
  v_result := jsonb_build_object('studentId', v_domain->>'studentId', 'enrollmentId', v_domain->>'enrollmentId',
    'invitationSentAt', p_invitation_sent_at, 'created', true);
  update logos_academy.idempotency_keys set result = v_result
  where tenant_id = p_tenant_id and actor_user_id = p_actor_user_id
    and route = 'admin.students.invite' and key = btrim(p_idempotency_key) and deleted_at is null;
  return v_result;
end;
$$;

-- All invite writes now have to pass through the claim/finalize pair.
revoke all on function logos_academy.prepare_invited_student(uuid,uuid,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,uuid)
  from public, anon, authenticated, service_role;
revoke all on function logos_academy.claim_student_invitation(uuid,uuid,text,bytea),
  logos_academy.finalize_invited_student(uuid,uuid,text,bytea,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,timestamptz,uuid)
  from public, anon, authenticated;
grant execute on function logos_academy.claim_student_invitation(uuid,uuid,text,bytea),
  logos_academy.finalize_invited_student(uuid,uuid,text,bytea,uuid,text,text,date,text,text,text,text,text,date,boolean,uuid,text,uuid,jsonb,text,timestamptz,uuid)
  to service_role;

notify pgrst, 'reload schema';
commit;
