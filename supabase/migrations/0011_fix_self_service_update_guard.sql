begin;

create or replace function private.guard_self_service_updates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_admin(old.tenant_id) then
    return new;
  end if;

  if tg_table_name = 'users' then
    if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
      new.auth_user_id is distinct from old.auth_user_id or new.email_encrypted is distinct from old.email_encrypted or
      new.access_enabled is distinct from old.access_enabled or new.deleted_at is distinct from old.deleted_at or
      new.created_at is distinct from old.created_at then
      raise exception using errcode = '42501', message = 'only display_name is self-service editable';
    end if;
  elsif tg_table_name = 'student_profiles' then
    if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
      new.user_id is distinct from old.user_id or new.birth_date_encrypted is distinct from old.birth_date_encrypted or
      new.deleted_at is distinct from old.deleted_at or new.created_at is distinct from old.created_at then
      raise exception using errcode = '42501', message = 'only github_username is self-service editable';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
