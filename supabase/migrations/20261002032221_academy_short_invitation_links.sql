begin;

create table logos_academy.invitation_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null check (code ~ '^[A-Za-z0-9_-]{22}$'),
  target_url_encrypted bytea not null,
  expires_at timestamptz not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint invitation_links_tenant_id_id_key unique (tenant_id, id),
  constraint invitation_links_code_key unique (code),
  constraint invitation_links_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint invitation_links_created_by_user_id_fkey foreign key (tenant_id, created_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict,
  constraint invitation_links_expiry_check check (expires_at > created_at)
);

create index invitation_links_expiry_idx
  on logos_academy.invitation_links (expires_at)
  where deleted_at is null;

create index invitation_links_created_by_idx
  on logos_academy.invitation_links (tenant_id, created_by_user_id);

create trigger invitation_links_set_updated_at
before update on logos_academy.invitation_links
for each row execute function private.set_updated_at();

alter table logos_academy.invitation_links enable row level security;
alter table logos_academy.invitation_links force row level security;

revoke all on logos_academy.invitation_links from public, anon, authenticated;

create or replace function logos_academy.create_invitation_link(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_code text,
  p_target_url text,
  p_expires_at timestamptz,
  p_encryption_key text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);

  if p_code !~ '^[A-Za-z0-9_-]{22}$'
    or p_target_url not like 'https://nqubjiosnlaatxxamiut.supabase.co/auth/v1/verify?%'
    or (
      position('redirect_to=https://logos-academy-three.vercel.app/ativar' in p_target_url) = 0
      and position('redirect_to=https%3A%2F%2Flogos-academy-three.vercel.app%2Fativar' in p_target_url) = 0
    )
    or p_expires_at <= now()
    or p_expires_at > now() + interval '25 hours'
  then
    raise exception using errcode = '22023', message = 'invalid invitation link';
  end if;

  insert into logos_academy.invitation_links (
    tenant_id, code, target_url_encrypted, expires_at, created_by_user_id
  ) values (
    p_tenant_id,
    p_code,
    extensions.pgp_sym_encrypt(p_target_url, p_encryption_key),
    p_expires_at,
    p_actor_user_id
  )
  returning id into v_id;

  insert into logos_academy.audit_events (
    tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'student.invitation_link.created',
    'invitation_link',
    v_id,
    p_request_id,
    jsonb_build_object('expiresAt', p_expires_at)
  );

  return jsonb_build_object('code', p_code, 'expiresAt', p_expires_at);
end;
$$;

create or replace function logos_academy.resolve_invitation_link(
  p_code text,
  p_encryption_key text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'targetUrl',
    extensions.pgp_sym_decrypt(il.target_url_encrypted, p_encryption_key)
  )
  from logos_academy.invitation_links il
  where il.code = p_code
    and il.expires_at > now()
    and il.deleted_at is null;
$$;

revoke all on function logos_academy.create_invitation_link(uuid, uuid, text, text, timestamptz, text, uuid)
  from public, anon, authenticated;
revoke all on function logos_academy.resolve_invitation_link(text, text)
  from public, anon, authenticated;
grant execute on function logos_academy.create_invitation_link(uuid, uuid, text, text, timestamptz, text, uuid)
  to service_role;
grant execute on function logos_academy.resolve_invitation_link(text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
