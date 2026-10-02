begin;

-- `[.]` evita a dupla interpretação de barras entre SQL e o mecanismo regex.
-- A forma anterior `\\.` chegava ao Postgres como barra literal e rejeitava
-- URLs legítimas de github.com tanto no rascunho quanto no envio.
create or replace function logos_academy.student_save_draft(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_items jsonb,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; draft_id uuid; item jsonb; requirement_kind text;
begin
  if jsonb_typeof(p_items)<>'array' then raise exception using errcode='22023',message='items must be array'; end if;
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,true);
  insert into logos_academy.submissions(tenant_id,activity_assignment_id,version,is_draft) select p_tenant_id,aa.id,coalesce(max(version),0)+1,true from logos_academy.submissions where tenant_id=p_tenant_id and activity_assignment_id=aa.id on conflict do nothing returning id into draft_id;
  if draft_id is null then select id into draft_id from logos_academy.submissions where tenant_id=p_tenant_id and activity_assignment_id=aa.id and is_draft and deleted_at is null; end if;
  delete from logos_academy.submission_items where tenant_id=p_tenant_id and submission_id=draft_id;
  for item in select value from jsonb_array_elements(p_items) loop
    select ar.kind into requirement_kind from logos_academy.activity_requirements ar where ar.tenant_id=p_tenant_id and ar.id=(item->>'requirementId')::uuid and ar.activity_template_id=aa.activity_template_id and ar.deleted_at is null;
    if requirement_kind is null then raise exception using errcode='22023',message='invalid requirement'; end if;
    if item->>'kind' is distinct from requirement_kind then raise exception using errcode='22023',message='requirement kind mismatch'; end if;
    if item->>'kind' in ('external_link','github_repository') and (item->>'urlValue') !~ '^https://' then raise exception using errcode='22023',message='HTTPS URL required'; end if;
    if item->>'kind'='github_repository' and lower(item->>'urlValue') !~ '^https://github[.]com(?:/|$)' then raise exception using errcode='22023',message='GitHub URL required'; end if;
    if item->>'kind'='file' and not exists(select 1 from logos_academy.uploaded_files uf join logos_academy.student_profiles sp on sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id where uf.tenant_id=p_tenant_id and uf.id=(item->>'fileId')::uuid and uf.activity_assignment_id=aa.id and uf.status='ready' and uf.deleted_at is null and sp.user_id=p_actor_user_id and sp.deleted_at is null) then raise exception using errcode='22023',message='file not available'; end if;
    insert into logos_academy.submission_items(tenant_id,submission_id,activity_requirement_id,kind,text_value_encrypted,url_value_encrypted,uploaded_file_id) values(p_tenant_id,draft_id,(item->>'requirementId')::uuid,item->>'kind',case when item->>'kind'='text' then extensions.pgp_sym_encrypt(item->>'textValue',p_encryption_key) end,case when item->>'kind' in ('external_link','github_repository') then extensions.pgp_sym_encrypt(item->>'urlValue',p_encryption_key) end,case when item->>'kind'='file' then (item->>'fileId')::uuid end);
  end loop;
  update logos_academy.activity_assignments set status='draft' where id=aa.id and status='available';
  return private.student_submission_detail(p_tenant_id,draft_id,p_encryption_key);
end; $$;

create or replace function logos_academy.student_submit_activity(p_tenant_id uuid,p_actor_user_id uuid,p_assignment_id uuid,p_expected_draft_id uuid,p_request_id uuid,p_encryption_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare aa logos_academy.activity_assignments%rowtype; draft logos_academy.submissions%rowtype;
begin
  aa:=private.student_actor_assignment(p_tenant_id,p_actor_user_id,p_assignment_id,true); select * into draft from logos_academy.submissions where tenant_id=p_tenant_id and id=p_expected_draft_id and activity_assignment_id=aa.id and is_draft and deleted_at is null for update;
  if draft.id is null then raise exception using errcode='40001',message='draft stale'; end if;
  if exists(select 1 from logos_academy.activity_requirements ar where ar.tenant_id=p_tenant_id and ar.activity_template_id=aa.activity_template_id and ar.is_required and ar.deleted_at is null and not exists(select 1 from logos_academy.submission_items si where si.tenant_id=p_tenant_id and si.submission_id=draft.id and si.activity_requirement_id=ar.id and si.deleted_at is null)) then raise exception using errcode='23514',message='required items missing'; end if;
  if exists(select 1 from logos_academy.submission_items si left join logos_academy.activity_requirements ar on ar.tenant_id=si.tenant_id and ar.id=si.activity_requirement_id and ar.activity_template_id=aa.activity_template_id and ar.deleted_at is null where si.tenant_id=p_tenant_id and si.submission_id=draft.id and si.deleted_at is null and (ar.id is null or ar.kind is distinct from si.kind)) then raise exception using errcode='23514',message='invalid submission item'; end if;
  if exists(select 1 from logos_academy.submission_items si left join logos_academy.uploaded_files uf on uf.tenant_id=si.tenant_id and uf.id=si.uploaded_file_id left join logos_academy.student_profiles sp on sp.tenant_id=uf.tenant_id and sp.id=uf.student_profile_id where si.tenant_id=p_tenant_id and si.submission_id=draft.id and si.kind='file' and si.deleted_at is null and (uf.id is null or uf.activity_assignment_id<>aa.id or uf.status<>'ready' or uf.deleted_at is not null or sp.user_id<>p_actor_user_id or sp.deleted_at is not null)) then raise exception using errcode='23514',message='file not available'; end if;
  if exists(select 1 from logos_academy.submission_items si where si.tenant_id=p_tenant_id and si.submission_id=draft.id and si.kind='github_repository' and si.deleted_at is null and lower(extensions.pgp_sym_decrypt(si.url_value_encrypted,p_encryption_key)) !~ '^https://github[.]com(?:/|$)') then raise exception using errcode='23514',message='GitHub URL required'; end if;
  update logos_academy.submissions set is_draft=false,submitted_at=now() where id=draft.id; update logos_academy.activity_assignments set status='submitted' where id=aa.id;
  return private.student_submission_detail(p_tenant_id,draft.id,p_encryption_key);
end; $$;

revoke all on function logos_academy.student_save_draft(uuid,uuid,uuid,jsonb,text),logos_academy.student_submit_activity(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function logos_academy.student_save_draft(uuid,uuid,uuid,jsonb,text),logos_academy.student_submit_activity(uuid,uuid,uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
