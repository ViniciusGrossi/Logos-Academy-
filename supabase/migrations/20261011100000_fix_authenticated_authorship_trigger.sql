begin;

-- NEW is a polymorphic trigger record. Accessing table-specific fields directly
-- makes PL/pgSQL validate fields that do not exist on audit_events and the
-- other tables that share this trigger. Reading the row as JSONB preserves the
-- actor check without coupling it to one physical table shape.
create or replace function private.guard_authenticated_authorship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare claimed_user_id uuid;
begin
  if (select auth.uid()) is null then return new; end if;

  claimed_user_id := case tg_table_name
    when 'reviews' then (to_jsonb(new)->>'reviewer_user_id')::uuid
    when 'uploaded_files' then (to_jsonb(new)->>'uploaded_by_user_id')::uuid
    when 'audit_events' then (to_jsonb(new)->>'actor_user_id')::uuid
    else (to_jsonb(new)->>'recorded_by_user_id')::uuid
  end;

  if claimed_user_id is distinct from private.current_user_id(new.tenant_id, null) then
    raise exception using errcode = '42501', message = 'actor must match authenticated user';
  end if;

  return new;
end;
$$;

commit;
