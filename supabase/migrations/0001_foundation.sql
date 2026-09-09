begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists logos_academy;
create schema if not exists private;
revoke all on schema private from public, anon;

create table logos_academy.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenants_tenant_id_id_key unique (tenant_id, id),
  constraint tenants_slug_key unique (slug),
  constraint tenants_self_tenant_check check (tenant_id = id)
);

alter table logos_academy.tenants
  add constraint tenants_tenant_id_fkey foreign key (tenant_id)
  references logos_academy.tenants(id) on delete restrict
  deferrable initially deferred;

create table logos_academy.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  email_encrypted bytea not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  access_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint users_tenant_id_id_key unique (tenant_id, id),
  constraint users_tenant_auth_user_key unique (tenant_id, auth_user_id),
  constraint users_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict
);

create table logos_academy.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('admin', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_memberships_tenant_id_id_key unique (tenant_id, id),
  constraint tenant_memberships_user_key unique (tenant_id, user_id),
  constraint tenant_memberships_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint tenant_memberships_user_id_fkey foreign key (tenant_id, user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_user_id uuid,
  action text not null check (length(btrim(action)) > 0),
  entity_type text not null check (length(btrim(entity_type)) > 0),
  entity_id uuid,
  request_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint audit_events_tenant_id_id_key unique (tenant_id, id),
  constraint audit_events_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint audit_events_actor_user_id_fkey foreign key (tenant_id, actor_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_user_id uuid not null,
  route text not null check (length(btrim(route)) > 0),
  key text not null check (length(btrim(key)) between 1 and 200),
  payload_hash bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint idempotency_keys_tenant_id_id_key unique (tenant_id, id),
  constraint idempotency_keys_active_key unique nulls not distinct
    (tenant_id, actor_user_id, route, key, deleted_at),
  constraint idempotency_keys_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint idempotency_keys_actor_user_id_fkey foreign key (tenant_id, actor_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create index users_auth_user_id_idx on logos_academy.users (auth_user_id) where deleted_at is null;
create index users_display_name_cursor_idx on logos_academy.users (tenant_id, display_name, created_at, id) where deleted_at is null;
create index tenant_memberships_user_id_idx on logos_academy.tenant_memberships (user_id, tenant_id, role) where deleted_at is null;
create index audit_events_target_cursor_idx on logos_academy.audit_events (tenant_id, entity_type, entity_id, created_at, id) where deleted_at is null;
create index audit_events_actor_user_id_idx on logos_academy.audit_events (tenant_id, actor_user_id) where actor_user_id is not null;
create index idempotency_keys_actor_user_id_idx on logos_academy.idempotency_keys (tenant_id, actor_user_id) where deleted_at is null;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = format('%s is append-only', tg_table_name);
end;
$$;

create function private.is_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.auth_user_id = (select auth.uid())
      and u.tenant_id = p_tenant_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.deleted_at is null
  );
$$;

create function private.is_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.auth_user_id = (select auth.uid())
      and u.tenant_id = p_tenant_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.role = 'admin'
      and tm.deleted_at is null
  );
$$;

create function private.is_user(p_tenant_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from logos_academy.users u
    where u.tenant_id = p_tenant_id
      and u.id = p_user_id
      and u.auth_user_id = (select auth.uid())
      and u.access_enabled
      and u.deleted_at is null
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.reject_mutation() from public, anon, authenticated;
revoke all on function private.is_member(uuid) from public, anon;
revoke all on function private.is_admin(uuid) from public, anon;
revoke all on function private.is_user(uuid, uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid), private.is_admin(uuid), private.is_user(uuid, uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['tenants','users','tenant_memberships','audit_events','idempotency_keys'] loop
    execute format('create trigger %I_set_updated_at before update on logos_academy.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table logos_academy.%I enable row level security', table_name);
    execute format('alter table logos_academy.%I force row level security', table_name);
  end loop;
end;
$$;

create trigger audit_events_immutable
before update or delete on logos_academy.audit_events
for each row execute function private.reject_mutation();

notify pgrst, 'reload schema';
commit;
