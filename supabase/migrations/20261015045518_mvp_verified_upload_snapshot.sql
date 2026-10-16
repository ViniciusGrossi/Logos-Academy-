begin;

-- Existing historical files keep their base path. Only ready snapshots may use
-- a verified suffix; no pending row can authorize a client write to that suffix.
alter table logos_academy.uploaded_files drop constraint uploaded_files_storage_path_check;
alter table logos_academy.uploaded_files add constraint uploaded_files_storage_path_check check (
  storage_path=tenant_id::text||'/'||student_profile_id::text||'/'||activity_assignment_id::text||'/'||id::text
  or (status='ready' and storage_path ~ ('^'||tenant_id::text||'/'||student_profile_id::text||'/'||
    activity_assignment_id::text||'/'||id::text||'/verified/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
);

create or replace function private.validate_file_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.student_profile_id is distinct from old.student_profile_id or new.activity_assignment_id is distinct from old.activity_assignment_id or
    new.uploaded_by_user_id is distinct from old.uploaded_by_user_id or
    new.filename_encrypted is distinct from old.filename_encrypted or new.content_type is distinct from old.content_type or
    new.size_bytes is distinct from old.size_bytes or new.created_at is distinct from old.created_at or new.deleted_at is distinct from old.deleted_at
  ) then raise exception using errcode = '42501', message = 'uploaded file identity and metadata are immutable'; end if;
  if tg_op='UPDATE' and new.storage_path is distinct from old.storage_path and not (
    old.status='pending' and new.status='ready'
    and current_setting('app.verified_upload_file',true) is not distinct from new.id::text
    and new.storage_path ~ ('^'||new.tenant_id::text||'/'||new.student_profile_id::text||'/'||
      new.activity_assignment_id::text||'/'||new.id::text||'/verified/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  ) then raise exception using errcode='42501',message='verified file path transition required'; end if;
  if tg_op='UPDATE' and old.storage_path like '%/verified/%' and old.status='ready' and new.status<>'ready' then
    raise exception using errcode='42501',message='verified file is immutable';
  end if;
  if not private.enrollment_accepts_mutation(new.tenant_id, new.activity_assignment_id) then
    raise exception using errcode = '42501', message = 'active enrollment required for file mutation';
  end if;
  if not exists (
    select 1 from logos_academy.activity_assignments aa join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
    where aa.tenant_id = new.tenant_id and aa.id = new.activity_assignment_id
      and e.student_profile_id = new.student_profile_id and aa.deleted_at is null and e.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'file student must own assignment'; end if;
  return new;
end;
$$;

create function logos_academy.student_finalize_verified_upload(
  p_tenant_id uuid,p_actor_user_id uuid,p_file_id uuid,p_verified_storage_path text,p_encryption_key text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare f logos_academy.uploaded_files; m jsonb; v_prefix text;
begin
  select uf.* into f from logos_academy.uploaded_files uf
  join logos_academy.student_profiles sp on sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id and sp.deleted_at is null
  join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id and u.deleted_at is null and u.access_enabled
  join logos_academy.tenants t on t.id=uf.tenant_id and t.deleted_at is null
  join logos_academy.tenant_memberships tm on tm.tenant_id=u.tenant_id and tm.user_id=u.id and tm.role='student' and tm.deleted_at is null
  where uf.tenant_id=p_tenant_id and uf.id=p_file_id and uf.deleted_at is null
    and sp.user_id=p_actor_user_id and uf.uploaded_by_user_id=p_actor_user_id
  for update of uf;
  if f.id is null then raise exception using errcode='42501',message='file not available'; end if;
  v_prefix:=f.tenant_id::text||'/'||f.student_profile_id::text||'/'||f.activity_assignment_id::text||'/'||f.id::text||'/verified/';
  if p_verified_storage_path is null or p_verified_storage_path !~ (
    '^'||v_prefix||'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then raise exception using errcode='22023',message='invalid verified storage path'; end if;
  perform private.student_actor_assignment(p_tenant_id,p_actor_user_id,f.activity_assignment_id,f.status<>'ready');
  if f.status='ready' then
    if f.storage_path is distinct from p_verified_storage_path then
      raise exception using errcode='23505',message='file already finalized to another path';
    end if;
    return private.student_uploaded_file_json(f,p_encryption_key);
  end if;
  if f.status<>'pending' then raise exception using errcode='42501',message='pending file required'; end if;
  select metadata into m from storage.objects where bucket_id='submissions' and name=p_verified_storage_path;
  if m is null or m->>'size' is distinct from f.size_bytes::text or m->>'mimetype' is distinct from f.content_type then
    raise exception using errcode='23514',message='verified uploaded object mismatch';
  end if;
  perform set_config('app.verified_upload_file',f.id::text,true);
  update logos_academy.uploaded_files set storage_path=p_verified_storage_path,status='ready' where id=f.id returning * into f;
  perform set_config('app.verified_upload_file','',true);
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'file.finalized','uploaded_file',f.id,gen_random_uuid(),jsonb_build_object('assignment_id',f.activity_assignment_id,'verified_snapshot',true));
  return private.student_uploaded_file_json(f,p_encryption_key);
end;
$$;
revoke all on function logos_academy.student_finalize_verified_upload(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function logos_academy.student_finalize_verified_upload(uuid,uuid,uuid,text,text) to service_role;
comment on function logos_academy.student_finalize_verified_upload(uuid,uuid,uuid,text,text) is
  'Backend-only: first inspect bytes and upload those same bytes to a fresh verified path with upsert=false. Never sign a client write to a verified path.';

notify pgrst,'reload schema';
commit;
