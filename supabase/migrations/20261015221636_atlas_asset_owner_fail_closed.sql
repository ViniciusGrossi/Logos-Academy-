begin;

-- A missing tenant-scoped owner resolves to SQL NULL. Never let three-valued
-- boolean logic turn a missing/cross-tenant owner into a later foreign-key error.
create or replace function atlas_private.admin_atlas_asset_authorize(
  p_tenant_id uuid,p_actor_user_id uuid,p_owner jsonb,p_original_filename text,p_content_type text,p_byte_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner_kind text:=p_owner->>'kind'; v_owner_id uuid; v_item_kind text;
  v_asset_id uuid:=gen_random_uuid(); v_path text;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if v_owner_kind is null or v_owner_kind not in ('concept','resource') then
    raise exception using errcode='42501',message='asset owner not available';
  end if;
  begin v_owner_id:=(p_owner->>'id')::uuid;
  exception when others then raise exception using errcode='22023',message='invalid asset owner'; end;
  v_item_kind:=private.atlas_item_kind(p_tenant_id,v_owner_id);
  if v_owner_id is null or v_item_kind is null
    or (v_owner_kind='concept' and v_item_kind is distinct from 'concept')
    or (v_owner_kind='resource' and v_item_kind not in ('prompt','design_system'))
  then raise exception using errcode='42501',message='asset owner not available'; end if;
  if length(btrim(p_original_filename)) not between 1 and 255 or p_content_type not in ('image/png','image/jpeg','image/webp') or p_byte_size not between 1 and 5242880
  then raise exception using errcode='22023',message='invalid atlas asset'; end if;
  v_path:=p_tenant_id::text||'/'||v_owner_kind||'/'||v_owner_id::text||'/'||v_asset_id::text;
  insert into logos_academy.knowledge_assets(id,tenant_id,concept_id,resource_id,status,bucket_path,original_filename,content_type,byte_size)
  values(v_asset_id,p_tenant_id,case when v_owner_kind='concept' then v_owner_id end,case when v_owner_kind='resource' then v_owner_id end,'pending',v_path,btrim(p_original_filename),p_content_type,p_byte_size);
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.asset_authorized','knowledge_asset',v_asset_id,gen_random_uuid(),jsonb_build_object('owner_kind',v_owner_kind,'owner_id',v_owner_id));
  return jsonb_build_object('id',v_asset_id,'bucket','knowledge-assets','bucketPath',v_path,'status','pending','contentType',p_content_type,'sizeBytes',p_byte_size);
end;
$$;
revoke all on function atlas_private.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer) from public,anon,authenticated;
grant execute on function atlas_private.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
