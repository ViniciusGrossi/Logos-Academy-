begin;

do $$
begin
  update logos_academy.activity_requirements
  set is_required = false,
      updated_at = now()
  where tenant_id = (
      select id
      from logos_academy.tenants
      where slug = 'logos-academy' and deleted_at is null
    )
    and id = md5('logos-academy-explorer-v3-requirement-1-4')::uuid
    and activity_template_id = md5('logos-academy-explorer-v3-activity-1')::uuid
    and kind = 'github_repository'
    and deleted_at is null;

  if not found then
    raise exception 'Explorer v3 initial GitHub requirement not found';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
