begin;

create or replace function private.is_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenants tenant_guard on tenant_guard.id=u.tenant_id and tenant_guard.deleted_at is null
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.auth_user_id = (select auth.uid())
      and u.tenant_id = p_tenant_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.deleted_at is null
  );
$$;

create or replace function private.is_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenants tenant_guard on tenant_guard.id=u.tenant_id and tenant_guard.deleted_at is null
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

create or replace function private.is_user(p_tenant_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from logos_academy.users u
    join logos_academy.tenants tenant_guard on tenant_guard.id=u.tenant_id and tenant_guard.deleted_at is null
    where u.tenant_id = p_tenant_id
      and u.id = p_user_id
      and u.auth_user_id = (select auth.uid())
      and u.access_enabled
      and u.deleted_at is null
  );
$$;

create or replace function private.assert_tenant_admin(p_tenant_id uuid, p_actor_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from logos_academy.users u
    join logos_academy.tenants tenant_guard on tenant_guard.id=u.tenant_id and tenant_guard.deleted_at is null
    join logos_academy.tenant_memberships tm
      on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.tenant_id = p_tenant_id
      and u.id = p_actor_user_id
      and u.access_enabled
      and u.deleted_at is null
      and tm.role = 'admin'
      and tm.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'tenant admin required';
  end if;
end;
$$;

create or replace function private.current_user_id(p_tenant_id uuid, p_role text default null)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id
  from logos_academy.users u
  join logos_academy.tenants tenant_guard on tenant_guard.id=u.tenant_id and tenant_guard.deleted_at is null
  join logos_academy.tenant_memberships tm on tm.tenant_id = u.tenant_id and tm.user_id = u.id
  where u.tenant_id = p_tenant_id and u.auth_user_id = (select auth.uid())
    and u.access_enabled and u.deleted_at is null and tm.deleted_at is null
    and (p_role is null or tm.role = p_role)
  limit 1;
$$;

-- CREATE OR REPLACE preserves the existing least-privilege ACLs.
notify pgrst,'reload schema';
commit;
