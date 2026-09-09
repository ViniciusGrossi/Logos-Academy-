begin;

create table logos_academy.student_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  birth_date_encrypted bytea not null,
  github_username text check (
    github_username is null or
    github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint student_profiles_tenant_id_id_key unique (tenant_id, id),
  constraint student_profiles_user_key unique (tenant_id, user_id),
  constraint student_profiles_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint student_profiles_user_id_fkey foreign key (tenant_id, user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.guardian_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  student_profile_id uuid not null,
  name_encrypted bytea not null,
  relationship text not null check (length(btrim(relationship)) between 1 and 60),
  email_encrypted bytea,
  phone_encrypted bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guardian_records_tenant_id_id_key unique (tenant_id, id),
  constraint guardian_records_contact_check check (email_encrypted is not null or phone_encrypted is not null),
  constraint guardian_records_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint guardian_records_student_profile_id_fkey foreign key (tenant_id, student_profile_id)
    references logos_academy.student_profiles(tenant_id, id) on delete restrict
);

create table logos_academy.consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  student_profile_id uuid not null,
  guardian_record_id uuid not null,
  status text not null check (status in ('pending', 'verified', 'revoked')),
  term_version text not null check (length(btrim(term_version)) between 1 and 40),
  signed_at date,
  physical_copy_archived boolean not null default false,
  verified_by_user_id uuid,
  verified_at timestamptz,
  revoked_at timestamptz,
  revocation_reason_encrypted bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint consent_records_tenant_id_id_key unique (tenant_id, id),
  constraint consent_records_active_student_key unique nulls not distinct
    (tenant_id, student_profile_id, deleted_at),
  constraint consent_records_state_check check (
    (status = 'pending' and verified_at is null and revoked_at is null and revocation_reason_encrypted is null)
    or
    (status = 'verified' and signed_at is not null and physical_copy_archived and verified_by_user_id is not null and verified_at is not null and revoked_at is null and revocation_reason_encrypted is null)
    or
    (status = 'revoked' and signed_at is not null and physical_copy_archived and verified_by_user_id is not null and verified_at is not null and revoked_at is not null and revocation_reason_encrypted is not null)
  ),
  constraint consent_records_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint consent_records_student_profile_id_fkey foreign key (tenant_id, student_profile_id)
    references logos_academy.student_profiles(tenant_id, id) on delete restrict,
  constraint consent_records_guardian_record_id_fkey foreign key (tenant_id, guardian_record_id)
    references logos_academy.guardian_records(tenant_id, id) on delete restrict,
  constraint consent_records_verified_by_user_id_fkey foreign key (tenant_id, verified_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create index student_profiles_user_id_idx on logos_academy.student_profiles (tenant_id, user_id) where deleted_at is null;
create index guardian_records_student_profile_id_idx on logos_academy.guardian_records (tenant_id, student_profile_id) where deleted_at is null;
create index consent_records_student_profile_id_idx on logos_academy.consent_records (tenant_id, student_profile_id, created_at, id) where deleted_at is null;
create index consent_records_guardian_record_id_idx on logos_academy.consent_records (tenant_id, guardian_record_id) where deleted_at is null;
create index consent_records_verified_by_user_id_idx on logos_academy.consent_records (tenant_id, verified_by_user_id) where verified_by_user_id is not null;

create function private.is_student_profile(p_tenant_id uuid, p_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from logos_academy.student_profiles sp
    join logos_academy.users u
      on u.tenant_id = sp.tenant_id and u.id = sp.user_id
    where sp.tenant_id = p_tenant_id
      and sp.id = p_student_profile_id
      and sp.deleted_at is null
      and u.auth_user_id = (select auth.uid())
      and u.access_enabled
      and u.deleted_at is null
  );
$$;

create function private.decrypt_pii(p_tenant_id uuid, p_ciphertext bytea, p_key text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin(p_tenant_id) then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;
  return extensions.pgp_sym_decrypt(p_ciphertext, p_key);
end;
$$;

revoke all on function private.is_student_profile(uuid, uuid) from public, anon;
revoke all on function private.decrypt_pii(uuid, bytea, text) from public, anon;
grant execute on function private.is_student_profile(uuid, uuid), private.decrypt_pii(uuid, bytea, text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['student_profiles','guardian_records','consent_records'] loop
    execute format('create trigger %I_set_updated_at before update on logos_academy.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table logos_academy.%I enable row level security', table_name);
    execute format('alter table logos_academy.%I force row level security', table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
