begin;

-- A repeated request waits for the row lock held by the first finalize.
-- Once that transaction commits, terminal state is returned unchanged: a
-- concurrent retry can never downgrade an already verified asset to failed.
create or replace function atlas_private.admin_atlas_asset_finalize(
  p_tenant_id uuid,p_actor_user_id uuid,p_asset_id uuid,p_alt text,p_caption text,
  p_backend_derived_content_type text,p_backend_derived_byte_size integer,
  p_backend_derived_width integer,p_backend_derived_height integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_asset logos_academy.knowledge_assets%rowtype; v_metadata jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v_asset from logos_academy.knowledge_assets
  where tenant_id=p_tenant_id and id=p_asset_id and deleted_at is null for update;
  if v_asset.id is null then raise exception using errcode='42501',message='atlas asset not available'; end if;

  if v_asset.status='ready' then
    return jsonb_build_object('id',v_asset.id,'ownerKind',case when v_asset.concept_id is not null then 'concept' else 'resource' end,'ownerId',coalesce(v_asset.concept_id,v_asset.resource_id),'status',v_asset.status,'filename',v_asset.original_filename,'contentType',v_asset.content_type,'sizeBytes',v_asset.byte_size,'width',v_asset.width,'height',v_asset.height,'alt',v_asset.alt,'caption',v_asset.caption,'createdAt',v_asset.created_at,'updatedAt',v_asset.updated_at);
  end if;
  if v_asset.status='failed' then return jsonb_build_object('id',v_asset.id,'status','failed'); end if;

  -- Only pending objects may transition. Derived values are supplied solely
  -- by the server adapter after file-type and sharp decode the actual object.
  if coalesce(length(btrim(p_alt)),0)=0
    or coalesce(p_backend_derived_width,0)<=0 or coalesce(p_backend_derived_height,0)<=0
    or p_backend_derived_content_type is distinct from v_asset.content_type
    or p_backend_derived_byte_size is distinct from v_asset.byte_size
  then
    update logos_academy.knowledge_assets set status='failed'
    where tenant_id=p_tenant_id and id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','verified_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  select metadata into v_metadata from storage.objects where bucket_id='knowledge-assets' and name=v_asset.bucket_path;
  if v_metadata is null or coalesce(v_metadata->>'size','') !~ '^[0-9]+$'
    or (v_metadata->>'size')::integer<>v_asset.byte_size or v_metadata->>'mimetype' is distinct from v_asset.content_type
  then
    update logos_academy.knowledge_assets set status='failed'
    where tenant_id=p_tenant_id and id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','storage_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  update logos_academy.knowledge_assets set status='ready',alt=btrim(p_alt),caption=nullif(btrim(p_caption),''),width=p_backend_derived_width,height=p_backend_derived_height
  where tenant_id=p_tenant_id and id=v_asset.id returning * into v_asset;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.asset_finalized','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'status','ready'));
  return jsonb_build_object('id',v_asset.id,'ownerKind',case when v_asset.concept_id is not null then 'concept' else 'resource' end,'ownerId',coalesce(v_asset.concept_id,v_asset.resource_id),'status',v_asset.status,'filename',v_asset.original_filename,'contentType',v_asset.content_type,'sizeBytes',v_asset.byte_size,'width',v_asset.width,'height',v_asset.height,'alt',v_asset.alt,'caption',v_asset.caption,'createdAt',v_asset.created_at,'updatedAt',v_asset.updated_at);
end;
$$;

-- CREATE OR REPLACE preserves the existing ACL. Repeat the precise grants
-- so this migration is also auditable without consulting previous history.
revoke all on function atlas_private.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function atlas_private.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer) to service_role;
notify pgrst,'reload schema';
commit;
