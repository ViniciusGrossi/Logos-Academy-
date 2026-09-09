begin;

create or replace function private.reject_review_mutation() returns trigger language plpgsql set search_path='' as $$
begin
  raise exception using errcode='42501', message='reviews is append-only';
end;
$$;

revoke all on function private.reject_review_mutation() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
