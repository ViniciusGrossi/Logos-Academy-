begin;

create schema if not exists atlas_private;
revoke all on schema atlas_private from public,anon,authenticated;

-- ponytail: private.guard_explorer_v1_immutability() não é recriada aqui.
-- 0059_purge_explorer_v1_v2.sql já removeu a função, os 8 triggers e os dados
-- do curriculo Explorer v1 ("resíduo" explícito no comentário dessa migration).
-- Sem a linha do curriculo, a condição v_is_explorer nunca mais seria
-- verdadeira, e nenhuma migration Atlas cria um CREATE TRIGGER que a chame —
-- recriar a função seria código morto (e reintroduziria o bug de `return old`
-- incondicional em UPDATE que a 0058 já tinha corrigido). Nenhum finding da
-- revisão depende dela.

create function private.atlas_item_kind(p_tenant_id uuid, p_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select kind from (
    select 'concept'::text kind
    from logos_academy.concepts
    where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null
    union all
    select kind
    from logos_academy.knowledge_resources
    where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null
  ) item limit 1;
$$;

create function private.atlas_canonical_payload(p_tenant_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_payload jsonb;
begin
  select jsonb_build_object(
    'kind','concept','title',c.title,'slug',c.slug,'summary',c.summary,'tags',to_jsonb(c.tags),
    'lessonTemplateIds',coalesce((select jsonb_agg(lc.lesson_template_id order by lc.lesson_template_id) from logos_academy.lesson_concepts lc where lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null),'[]'::jsonb),
    'contentBlocks',c.content_blocks,'artifact',null,
    'video',case when c.video_url is null then null else jsonb_build_object(
      'youtubeId',coalesce(substring(c.video_url from '(?:v=|youtu[.]be/)([A-Za-z0-9_-]{6,})'),c.video_url),
      'title',c.video_title,'durationMinutes',c.video_duration_minutes,
      'transcript',c.video_transcript,'captionsReviewed',c.video_captions_reviewed) end
  ) into v_payload
  from logos_academy.concepts c
  where c.tenant_id=p_tenant_id and c.id=p_item_id and c.deleted_at is null;
  if found then return v_payload; end if;

  select jsonb_build_object(
    'kind',r.kind,'title',r.title,'slug',r.slug,'summary',r.summary,'tags',to_jsonb(r.tags),
    'lessonTemplateIds',coalesce((select jsonb_agg(rl.lesson_template_id order by rl.lesson_template_id) from logos_academy.knowledge_resource_lessons rl where rl.tenant_id=r.tenant_id and rl.resource_id=r.id and rl.deleted_at is null),'[]'::jsonb),
    'contentBlocks',r.content_blocks,'artifact',r.artifact,'video',null
  ) into v_payload
  from logos_academy.knowledge_resources r
  where r.tenant_id=p_tenant_id and r.id=p_item_id and r.deleted_at is null;
  return v_payload;
end;
$$;

create function private.atlas_assert_payload_relations(
  p_tenant_id uuid,
  p_item_id uuid,
  p_payload jsonb,
  p_require_ready_assets boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text := p_payload->>'kind'; v_lesson_count integer; v_asset_count integer; v_valid_asset_count integer;
begin
  select count(*) into v_lesson_count from jsonb_array_elements_text(p_payload->'lessonTemplateIds');
  if v_lesson_count <> (
    select count(*) from logos_academy.lesson_templates lt
    where lt.tenant_id=p_tenant_id and lt.deleted_at is null
      and lt.id in (select value::uuid from jsonb_array_elements_text(p_payload->'lessonTemplateIds'))
  ) then raise exception using errcode='23503', message='ATLAS_VALIDATION:lessonTemplateIds:CROSS_TENANT_OR_MISSING'; end if;

  with refs as (
    select distinct b->'source'->>'assetId' asset_id
    from jsonb_array_elements(p_payload->'contentBlocks') b
    where b->>'type'='image' and b->'source'->>'kind'='asset'
    union
    select distinct image->>'assetId'
    from jsonb_array_elements(p_payload->'contentBlocks') b
    cross join lateral jsonb_array_elements(case when b->>'type'='gallery' then b->'items' else '[]'::jsonb end) image
    where image->>'kind'='asset'
  ) select count(*) into v_asset_count from refs;

  with refs as (
    select distinct (b->'source'->>'assetId')::uuid asset_id
    from jsonb_array_elements(p_payload->'contentBlocks') b
    where b->>'type'='image' and b->'source'->>'kind'='asset'
    union
    select distinct (image->>'assetId')::uuid
    from jsonb_array_elements(p_payload->'contentBlocks') b
    cross join lateral jsonb_array_elements(case when b->>'type'='gallery' then b->'items' else '[]'::jsonb end) image
    where image->>'kind'='asset'
  )
  select count(*) into v_valid_asset_count
  from refs join logos_academy.knowledge_assets a on a.tenant_id=p_tenant_id and a.id=refs.asset_id and a.deleted_at is null
  where (not p_require_ready_assets or a.status='ready')
    and ((v_kind='concept' and a.concept_id=p_item_id and a.resource_id is null)
      or (v_kind in ('prompt','design_system') and a.resource_id=p_item_id and a.concept_id is null));
  if v_asset_count <> v_valid_asset_count then raise exception using errcode='23514', message='ATLAS_VALIDATION:contentBlocks.assetId:OWNER_OR_STATUS_INVALID'; end if;
end;
$$;

create function private.atlas_append_revision(
  p_tenant_id uuid,
  p_item_id uuid,
  p_actor_user_id uuid,
  p_snapshot jsonb,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text := private.atlas_item_kind(p_tenant_id,p_item_id); v_revision integer;
begin
  select coalesce(max(revision),0)+1 into v_revision
  from logos_academy.knowledge_item_revisions
  where tenant_id=p_tenant_id and (concept_id=p_item_id or resource_id=p_item_id);
  insert into logos_academy.knowledge_item_revisions(tenant_id,concept_id,resource_id,revision,snapshot,reason,created_by_user_id)
  values(p_tenant_id,case when v_kind='concept' then p_item_id end,case when v_kind<>'concept' then p_item_id end,v_revision,p_snapshot,p_reason,p_actor_user_id);
  return v_revision;
end;
$$;

create function private.atlas_sync_lessons(p_tenant_id uuid,p_item_id uuid,p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text := p_payload->>'kind'; v_lesson_id uuid;
begin
  perform set_config('app.atlas_cms_write','on',true);
  if v_kind='concept' then
    update logos_academy.lesson_concepts set deleted_at=now()
    where tenant_id=p_tenant_id and concept_id=p_item_id and deleted_at is null
      and lesson_template_id not in (select value::uuid from jsonb_array_elements_text(p_payload->'lessonTemplateIds'));
    for v_lesson_id in select value::uuid from jsonb_array_elements_text(p_payload->'lessonTemplateIds') loop
      insert into logos_academy.lesson_concepts(tenant_id,lesson_template_id,concept_id)
      values(p_tenant_id,v_lesson_id,p_item_id)
      on conflict (tenant_id,lesson_template_id,concept_id) do update set deleted_at=null,updated_at=now();
    end loop;
  else
    update logos_academy.knowledge_resource_lessons set deleted_at=now()
    where tenant_id=p_tenant_id and resource_id=p_item_id and deleted_at is null
      and lesson_template_id not in (select value::uuid from jsonb_array_elements_text(p_payload->'lessonTemplateIds'));
    for v_lesson_id in select value::uuid from jsonb_array_elements_text(p_payload->'lessonTemplateIds') loop
      insert into logos_academy.knowledge_resource_lessons(tenant_id,resource_id,lesson_template_id)
      values(p_tenant_id,p_item_id,v_lesson_id)
      on conflict (tenant_id,resource_id,lesson_template_id) do update set deleted_at=null,updated_at=now();
    end loop;
  end if;
end;
$$;

create function atlas_private.admin_atlas_list(
  p_tenant_id uuid,p_actor_user_id uuid,p_kind text default null,p_status text default null,
  p_curriculum_id uuid default null,p_cycle_id uuid default null,p_lesson_id uuid default null,
  p_tags text[] default null,p_search text default null,p_cursor text default null,p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_result jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if p_kind is not null and p_kind not in ('concept','prompt','design_system') then raise exception using errcode='22023',message='invalid atlas kind'; end if;
  if p_status is not null and p_status not in ('draft','published','archived') then raise exception using errcode='22023',message='invalid atlas status'; end if;
  with all_items as (
    select c.id,'concept'::text kind,c.title,c.summary,c.status,c.tags,c.updated_at,c.updated_by_user_id,
      (select count(*)::int from logos_academy.lesson_concepts lc where lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null) linked_count,
      exists(select 1 from logos_academy.knowledge_item_drafts d where d.tenant_id=c.tenant_id and d.concept_id=c.id and d.deleted_at is null) has_draft,
      (select d.updated_at from logos_academy.knowledge_item_drafts d where d.tenant_id=c.tenant_id and d.concept_id=c.id and d.deleted_at is null) draft_updated_at
    from logos_academy.concepts c where c.tenant_id=p_tenant_id and c.deleted_at is null
    union all
    select r.id,r.kind,r.title,r.summary,r.status,r.tags,r.updated_at,r.updated_by_user_id,
      (select count(*)::int from logos_academy.knowledge_resource_lessons rl where rl.tenant_id=r.tenant_id and rl.resource_id=r.id and rl.deleted_at is null),
      exists(select 1 from logos_academy.knowledge_item_drafts d where d.tenant_id=r.tenant_id and d.resource_id=r.id and d.deleted_at is null),
      (select d.updated_at from logos_academy.knowledge_item_drafts d where d.tenant_id=r.tenant_id and d.resource_id=r.id and d.deleted_at is null)
    from logos_academy.knowledge_resources r where r.tenant_id=p_tenant_id and r.deleted_at is null
  ), filtered as (
    select * from all_items i where (p_kind is null or i.kind=p_kind) and (p_status is null or i.status=p_status)
      and (p_tags is null or i.tags @> p_tags)
      and (coalesce(btrim(p_search),'')='' or lower(i.title||' '||i.summary) like '%'||lower(btrim(p_search))||'%')
      and (p_lesson_id is null or exists(select 1 from logos_academy.lesson_concepts lc where i.kind='concept' and lc.tenant_id=p_tenant_id and lc.concept_id=i.id and lc.lesson_template_id=p_lesson_id and lc.deleted_at is null)
        or exists(select 1 from logos_academy.knowledge_resource_lessons rl where i.kind<>'concept' and rl.tenant_id=p_tenant_id and rl.resource_id=i.id and rl.lesson_template_id=p_lesson_id and rl.deleted_at is null))
      and (p_cycle_id is null or exists(select 1 from logos_academy.lesson_concepts lc join logos_academy.lesson_templates lt on lt.tenant_id=lc.tenant_id and lt.id=lc.lesson_template_id where i.kind='concept' and lc.tenant_id=p_tenant_id and lc.concept_id=i.id and lt.cycle_id=p_cycle_id and lc.deleted_at is null)
        or exists(select 1 from logos_academy.knowledge_resource_lessons rl join logos_academy.lesson_templates lt on lt.tenant_id=rl.tenant_id and lt.id=rl.lesson_template_id where i.kind<>'concept' and rl.tenant_id=p_tenant_id and rl.resource_id=i.id and lt.cycle_id=p_cycle_id and rl.deleted_at is null))
      and (p_curriculum_id is null or exists(select 1 from logos_academy.lesson_concepts lc join logos_academy.lesson_templates lt on lt.tenant_id=lc.tenant_id and lt.id=lc.lesson_template_id join logos_academy.cycles cy on cy.tenant_id=lt.tenant_id and cy.id=lt.cycle_id where i.kind='concept' and lc.tenant_id=p_tenant_id and lc.concept_id=i.id and cy.curriculum_id=p_curriculum_id and lc.deleted_at is null)
        or exists(select 1 from logos_academy.knowledge_resource_lessons rl join logos_academy.lesson_templates lt on lt.tenant_id=rl.tenant_id and lt.id=rl.lesson_template_id join logos_academy.cycles cy on cy.tenant_id=lt.tenant_id and cy.id=lt.cycle_id where i.kind<>'concept' and rl.tenant_id=p_tenant_id and rl.resource_id=i.id and cy.curriculum_id=p_curriculum_id and rl.deleted_at is null))
      and (v_cursor is null or (i.updated_at,i.id,i.kind)<((v_cursor->>0)::timestamptz,(v_cursor->>1)::uuid,v_cursor->>2))
    order by i.updated_at desc,i.id desc,i.kind desc limit p_limit+1
  ), page as (select * from filtered limit p_limit), tail as (select * from filtered offset p_limit limit 1), last_item as (select * from page order by updated_at,id,kind limit 1)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'title',title,'summary',summary,'status',status,'tags',tags,'linkedLessonCount',linked_count,'hasWorkingDraft',has_draft,'itemUpdatedAt',updated_at,'draftUpdatedAt',draft_updated_at,'updatedByUserId',updated_by_user_id) order by updated_at desc,id desc,kind desc) from page),'[]'::jsonb),
    'nextCursor',case when exists(select 1 from tail) then (select encode(convert_to(jsonb_build_array(updated_at,id,kind)::text,'utf8'),'base64') from last_item) end
  ) into v_result;
  return v_result;
end;
$$;

create function atlas_private.admin_atlas_detail(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text; v_status text; v_updated_at timestamptz; v_published_at timestamptz; v_archived_at timestamptz; v_canonical jsonb; v_draft jsonb; v_draft_updated_at timestamptz; v_result jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  v_kind:=private.atlas_item_kind(p_tenant_id,p_item_id);
  if v_kind is null then raise exception using errcode='P0002',message='atlas item not found'; end if;
  if v_kind='concept' then select status,updated_at,published_at,archived_at into v_status,v_updated_at,v_published_at,v_archived_at from logos_academy.concepts where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null;
  else select status,updated_at,published_at,archived_at into v_status,v_updated_at,v_published_at,v_archived_at from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null; end if;
  v_canonical:=private.atlas_canonical_payload(p_tenant_id,p_item_id);
  select payload,updated_at into v_draft,v_draft_updated_at from logos_academy.knowledge_item_drafts where tenant_id=p_tenant_id and (concept_id=p_item_id or resource_id=p_item_id) and deleted_at is null;
  select jsonb_build_object(
    'id',p_item_id,'kind',v_kind,'status',v_status,'itemUpdatedAt',v_updated_at,'publishedAt',v_published_at,'archivedAt',v_archived_at,
    'hasWorkingDraft',v_draft is not null,'draftUpdatedAt',v_draft_updated_at,'draft',coalesce(v_draft,v_canonical),
    'published',case when v_status in ('published','archived') then v_canonical end,
    'assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'ownerKind',case when a.concept_id is not null then 'concept' else 'resource' end,'ownerId',coalesce(a.concept_id,a.resource_id),'status',a.status,'bucket','knowledge-assets','bucketPath',a.bucket_path,'filename',a.original_filename,'contentType',a.content_type,'sizeBytes',a.byte_size,'width',a.width,'height',a.height,'alt',a.alt,'caption',a.caption,'createdAt',a.created_at,'updatedAt',a.updated_at) order by a.created_at,a.id) from logos_academy.knowledge_assets a where a.tenant_id=p_tenant_id and (a.concept_id=p_item_id or a.resource_id=p_item_id) and a.deleted_at is null),'[]'::jsonb),
    'revisionCount',(select count(*)::int from logos_academy.knowledge_item_revisions r where r.tenant_id=p_tenant_id and (r.concept_id=p_item_id or r.resource_id=p_item_id))
  ) into v_result;
  return v_result;
end;
$$;

create function atlas_private.admin_atlas_upsert(
  p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_payload jsonb,p_expected_draft_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_item_id uuid:=p_item_id; v_kind text:=p_payload->>'kind'; v_draft logos_academy.knowledge_item_drafts%rowtype; v_title text:=btrim(p_payload->>'title');
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if not private.atlas_draft_payload_valid(p_payload) then raise exception using errcode='22023',message='invalid atlas draft'; end if;
  if v_item_id is null then
    v_item_id:=gen_random_uuid();
    if v_kind='concept' then
      perform set_config('app.atlas_cms_write','on',true);
      insert into logos_academy.concepts(id,tenant_id,slug,title,summary,body,status,tags,content_blocks,updated_by_user_id)
      values(v_item_id,p_tenant_id,p_payload->>'slug',v_title,p_payload->>'summary',coalesce(nullif(p_payload->>'summary',''),'Rascunho'),
        'draft',array(select jsonb_array_elements_text(p_payload->'tags')),'[]'::jsonb,p_actor_user_id);
    else
      insert into logos_academy.knowledge_resources(id,tenant_id,lesson_template_id,kind,slug,title,summary,body,reading_minutes,content_blocks,artifact,status,tags,updated_by_user_id)
      values(v_item_id,p_tenant_id,null,v_kind,p_payload->>'slug',v_title,p_payload->>'summary',coalesce(nullif(p_payload->>'summary',''),'Rascunho'),3,
        '[]'::jsonb,p_payload->'artifact','draft',array(select jsonb_array_elements_text(p_payload->'tags')),p_actor_user_id);
    end if;
  elsif private.atlas_item_kind(p_tenant_id,v_item_id) is distinct from v_kind then
    raise exception using errcode='42501',message='atlas item not available';
  end if;

  perform 1 from logos_academy.concepts where tenant_id=p_tenant_id and id=v_item_id for update;
  if not found then perform 1 from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=v_item_id for update; end if;
  select * into v_draft from logos_academy.knowledge_item_drafts
  where tenant_id=p_tenant_id and (concept_id=v_item_id or resource_id=v_item_id) and deleted_at is null for update;
  if v_draft.id is null and p_expected_draft_updated_at is not null
    or v_draft.id is not null and p_expected_draft_updated_at is distinct from v_draft.updated_at
  then raise exception using errcode='40001',message='ATLAS_CONFLICT:draftUpdatedAt:STALE'; end if;
  perform private.atlas_assert_payload_relations(p_tenant_id,v_item_id,p_payload,false);
  if v_draft.id is not null and v_draft.payload=p_payload then return atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,v_item_id); end if;

  if v_draft.id is null then
    insert into logos_academy.knowledge_item_drafts(tenant_id,concept_id,resource_id,payload,updated_by_user_id)
    values(p_tenant_id,case when v_kind='concept' then v_item_id end,case when v_kind<>'concept' then v_item_id end,p_payload,p_actor_user_id);
  else
    update logos_academy.knowledge_item_drafts set payload=p_payload,updated_by_user_id=p_actor_user_id
    where id=v_draft.id;
  end if;
  perform private.atlas_append_revision(p_tenant_id,v_item_id,p_actor_user_id,p_payload,'save');
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.draft_saved','atlas_item',v_item_id,gen_random_uuid(),jsonb_build_object('kind',v_kind));
  return atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,v_item_id);
end;
$$;

create function atlas_private.admin_atlas_publish(
  p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_expected_draft_updated_at timestamptz,p_expected_item_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text; v_item_updated_at timestamptz; v_draft logos_academy.knowledge_item_drafts%rowtype; v_payload jsonb; v_blocks jsonb; v_first_lesson uuid; v_video jsonb; v_validation_error text;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  v_kind:=private.atlas_item_kind(p_tenant_id,p_item_id);
  if v_kind='concept' then select updated_at into v_item_updated_at from logos_academy.concepts where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null for update;
  elsif v_kind is not null then select updated_at into v_item_updated_at from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null for update;
  else raise exception using errcode='42501',message='atlas item not available'; end if;
  if v_item_updated_at is distinct from p_expected_item_updated_at then raise exception using errcode='40001',message='ATLAS_CONFLICT:itemUpdatedAt:STALE'; end if;
  select * into v_draft from logos_academy.knowledge_item_drafts where tenant_id=p_tenant_id and (concept_id=p_item_id or resource_id=p_item_id) and deleted_at is null for update;
  if v_draft.id is null or v_draft.updated_at is distinct from p_expected_draft_updated_at then raise exception using errcode='40001',message='ATLAS_CONFLICT:draftUpdatedAt:STALE'; end if;
  v_payload:=v_draft.payload;
  v_validation_error:=private.atlas_publication_error(v_payload);
  if v_validation_error is not null then raise exception using errcode='23514',message='ATLAS_VALIDATION:'||v_validation_error; end if;
  perform private.atlas_assert_payload_relations(p_tenant_id,p_item_id,v_payload,true);
  if exists (
    select 1 from logos_academy.knowledge_assets a where a.tenant_id=p_tenant_id and (a.concept_id=p_item_id or a.resource_id=p_item_id)
      and a.deleted_at is null and a.status<>'ready' and v_payload::text like '%'||a.id::text||'%'
  ) then raise exception using errcode='23514',message='atlas asset is not ready'; end if;
  select coalesce(jsonb_agg(b order by ordinality),'[]'::jsonb) into v_blocks
  from jsonb_array_elements(v_payload->'contentBlocks') with ordinality item(b,ordinality)
  where (b->>'isVisible')::boolean;
  select value::uuid into v_first_lesson from jsonb_array_elements_text(v_payload->'lessonTemplateIds') limit 1;
  perform set_config('app.atlas_cms_write','on',true);
  if v_kind='concept' then
    v_video:=v_payload->'video';
    update logos_academy.concepts set slug=v_payload->>'slug',title=v_payload->>'title',summary=v_payload->>'summary',body=v_payload->>'summary',
      tags=array(select jsonb_array_elements_text(v_payload->'tags')),content_blocks=v_blocks,status='published',published_at=now(),archived_at=null,
      video_url=case when v_video='null'::jsonb then null else 'https://www.youtube.com/watch?v='||(v_video->>'youtubeId') end,
      video_title=case when v_video='null'::jsonb then null else v_video->>'title' end,
      video_duration_minutes=case when v_video='null'::jsonb then null else (v_video->>'durationMinutes')::smallint end,
      video_transcript=case when v_video='null'::jsonb then null else v_video->>'transcript' end,
      video_captions_reviewed=case when v_video='null'::jsonb then false else (v_video->>'captionsReviewed')::boolean end,
      updated_by_user_id=p_actor_user_id
    where tenant_id=p_tenant_id and id=p_item_id;
  else
    update logos_academy.knowledge_resources set lesson_template_id=v_first_lesson,slug=v_payload->>'slug',title=v_payload->>'title',summary=v_payload->>'summary',body=v_payload->>'summary',
      tags=array(select jsonb_array_elements_text(v_payload->'tags')),content_blocks=v_blocks,artifact=v_payload->'artifact',status='published',published_at=now(),archived_at=null,updated_by_user_id=p_actor_user_id
    where tenant_id=p_tenant_id and id=p_item_id;
  end if;
  perform private.atlas_sync_lessons(p_tenant_id,p_item_id,v_payload);
  perform private.atlas_append_revision(p_tenant_id,p_item_id,p_actor_user_id,v_payload,'publish');
  update logos_academy.knowledge_item_drafts set deleted_at=now(),updated_by_user_id=p_actor_user_id where id=v_draft.id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.published','atlas_item',p_item_id,gen_random_uuid(),jsonb_build_object('kind',v_kind,'status','published'));
  return atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,p_item_id);
end;
$$;

create function atlas_private.admin_atlas_archive(
  p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_expected_item_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text; v_updated_at timestamptz; v_snapshot jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  v_kind:=private.atlas_item_kind(p_tenant_id,p_item_id);
  if v_kind='concept' then select updated_at into v_updated_at from logos_academy.concepts where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null for update;
  elsif v_kind is not null then select updated_at into v_updated_at from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=p_item_id and deleted_at is null for update;
  else raise exception using errcode='42501',message='atlas item not available'; end if;
  if v_updated_at is distinct from p_expected_item_updated_at then raise exception using errcode='40001',message='ATLAS_CONFLICT:itemUpdatedAt:STALE'; end if;
  if (v_kind='concept' and not exists(select 1 from logos_academy.concepts where tenant_id=p_tenant_id and id=p_item_id and status='published'))
    or (v_kind<>'concept' and not exists(select 1 from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=p_item_id and status='published'))
  then raise exception using errcode='23514',message='ATLAS_STATE:status:ARCHIVE_REQUIRES_PUBLISHED'; end if;
  v_snapshot:=private.atlas_canonical_payload(p_tenant_id,p_item_id);
  perform set_config('app.atlas_cms_write','on',true);
  if v_kind='concept' then update logos_academy.concepts set status='archived',archived_at=now(),updated_by_user_id=p_actor_user_id where tenant_id=p_tenant_id and id=p_item_id;
  else update logos_academy.knowledge_resources set status='archived',archived_at=now(),updated_by_user_id=p_actor_user_id where tenant_id=p_tenant_id and id=p_item_id; end if;
  perform private.atlas_append_revision(p_tenant_id,p_item_id,p_actor_user_id,v_snapshot,'archive');
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.archived','atlas_item',p_item_id,gen_random_uuid(),jsonb_build_object('kind',v_kind,'status','archived'));
  return atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,p_item_id);
end;
$$;

create function atlas_private.admin_atlas_revisions(
  p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_cursor text default null,p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_result jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if private.atlas_item_kind(p_tenant_id,p_item_id) is null then raise exception using errcode='42501',message='atlas item not available'; end if;
  with rows as (
    select r.revision,r.reason,r.snapshot->>'title' title,r.created_by_user_id,r.created_at,r.id
    from logos_academy.knowledge_item_revisions r
    where r.tenant_id=p_tenant_id and (r.concept_id=p_item_id or r.resource_id=p_item_id)
      and (v_cursor is null or (r.created_at,r.id,r.revision)<((v_cursor->>0)::timestamptz,(v_cursor->>1)::uuid,(v_cursor->>2)::integer))
    order by r.created_at desc,r.id desc,r.revision desc limit p_limit+1
  ), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), last_item as(select * from page order by created_at,id,revision limit 1)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('revision',revision,'reason',reason,'title',title,'createdByUserId',created_by_user_id,'createdAt',created_at) order by created_at desc,id desc) from page),'[]'::jsonb),
    'nextCursor',case when exists(select 1 from tail) then (select encode(convert_to(jsonb_build_array(created_at,id,revision)::text,'utf8'),'base64') from last_item) end
  ) into v_result;
  return v_result;
end;
$$;

create function atlas_private.admin_atlas_restore(
  p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_revision integer,p_expected_draft_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_kind text; v_snapshot jsonb; v_draft logos_academy.knowledge_item_drafts%rowtype;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  v_kind:=private.atlas_item_kind(p_tenant_id,p_item_id);
  if v_kind is null then raise exception using errcode='42501',message='atlas item not available'; end if;
  perform 1 from logos_academy.concepts where tenant_id=p_tenant_id and id=p_item_id for update;
  if not found then perform 1 from logos_academy.knowledge_resources where tenant_id=p_tenant_id and id=p_item_id for update; end if;
  select snapshot into v_snapshot from logos_academy.knowledge_item_revisions
  where tenant_id=p_tenant_id and (concept_id=p_item_id or resource_id=p_item_id) and revision=p_revision;
  if v_snapshot is null then raise exception using errcode='P0002',message='atlas revision not found'; end if;
  select * into v_draft from logos_academy.knowledge_item_drafts where tenant_id=p_tenant_id and (concept_id=p_item_id or resource_id=p_item_id) and deleted_at is null for update;
  if v_draft.id is null and p_expected_draft_updated_at is not null
    or v_draft.id is not null and v_draft.updated_at is distinct from p_expected_draft_updated_at
  then raise exception using errcode='40001',message='ATLAS_CONFLICT:draftUpdatedAt:STALE'; end if;
  perform private.atlas_assert_payload_relations(p_tenant_id,p_item_id,v_snapshot,false);
  if v_draft.id is null then
    insert into logos_academy.knowledge_item_drafts(tenant_id,concept_id,resource_id,payload,updated_by_user_id)
    values(p_tenant_id,case when v_kind='concept' then p_item_id end,case when v_kind<>'concept' then p_item_id end,v_snapshot,p_actor_user_id);
  else update logos_academy.knowledge_item_drafts set payload=v_snapshot,updated_by_user_id=p_actor_user_id where id=v_draft.id; end if;
  perform private.atlas_append_revision(p_tenant_id,p_item_id,p_actor_user_id,v_snapshot,'restore');
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.restored','atlas_item',p_item_id,gen_random_uuid(),jsonb_build_object('kind',v_kind,'revision',p_revision));
  return atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,p_item_id);
end;
$$;

create function atlas_private.admin_atlas_asset_authorize(
  p_tenant_id uuid,p_actor_user_id uuid,p_owner jsonb,p_original_filename text,p_content_type text,p_byte_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner_kind text:=p_owner->>'kind'; v_owner_id uuid; v_asset_id uuid:=gen_random_uuid(); v_path text;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  begin v_owner_id:=(p_owner->>'id')::uuid; exception when others then raise exception using errcode='22023',message='invalid asset owner'; end;
  if v_owner_kind not in ('concept','resource')
    or (v_owner_kind='concept' and private.atlas_item_kind(p_tenant_id,v_owner_id)<>'concept')
    or (v_owner_kind='resource' and private.atlas_item_kind(p_tenant_id,v_owner_id) not in ('prompt','design_system'))
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

create function atlas_private.admin_atlas_asset_finalize(
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
  select * into v_asset from logos_academy.knowledge_assets where tenant_id=p_tenant_id and id=p_asset_id and deleted_at is null for update;
  if v_asset.id is null then raise exception using errcode='42501',message='atlas asset not available'; end if;
  -- Os valores backend_derived_* só podem vir do adapter server-only depois
  -- de file-type + sharp validarem magic bytes, MIME, tamanho e dimensões.
  if v_asset.status<>'pending' or coalesce(length(btrim(p_alt)),0)=0
    or coalesce(p_backend_derived_width,0)<=0 or coalesce(p_backend_derived_height,0)<=0
    or p_backend_derived_content_type is distinct from v_asset.content_type
    or p_backend_derived_byte_size is distinct from v_asset.byte_size
  then
    update logos_academy.knowledge_assets set status='failed' where id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','verified_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  select metadata into v_metadata from storage.objects where bucket_id='knowledge-assets' and name=v_asset.bucket_path;
  if v_metadata is null or coalesce(v_metadata->>'size','') !~ '^[0-9]+$'
    or (v_metadata->>'size')::integer<>v_asset.byte_size or v_metadata->>'mimetype' is distinct from v_asset.content_type
  then
    update logos_academy.knowledge_assets set status='failed' where id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','storage_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  update logos_academy.knowledge_assets set status='ready',alt=btrim(p_alt),caption=nullif(btrim(p_caption),''),width=p_backend_derived_width,height=p_backend_derived_height
  where id=v_asset.id returning * into v_asset;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.asset_finalized','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'status','ready'));
  return jsonb_build_object('id',v_asset.id,'ownerKind',case when v_asset.concept_id is not null then 'concept' else 'resource' end,'ownerId',coalesce(v_asset.concept_id,v_asset.resource_id),'status',v_asset.status,'filename',v_asset.original_filename,'contentType',v_asset.content_type,'sizeBytes',v_asset.byte_size,'width',v_asset.width,'height',v_asset.height,'alt',v_asset.alt,'caption',v_asset.caption,'createdAt',v_asset.created_at,'updatedAt',v_asset.updated_at);
end;
$$;

create or replace function logos_academy.student_concepts_page(
  p_tenant_id uuid,p_actor_user_id uuid,p_search text default null,p_cursor text default null,p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_result jsonb;
begin
  with rows as (
    select c.id,c.slug,c.title,c.summary,c.tags,c.video_url is not null video_available,c.created_at,min(rl.released_at) released_at
    from logos_academy.concepts c
    join logos_academy.lesson_concepts lc on lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null
    join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=lc.lesson_template_id
    where c.tenant_id=p_tenant_id and c.status='published' and c.deleted_at is null
      and (coalesce(btrim(p_search),'')='' or lower(c.title||' '||c.summary) like '%'||lower(btrim(p_search))||'%')
      and (v_cursor is null or (c.title,c.created_at,c.id)>((v_cursor->>0),(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid))
    group by c.id order by c.title,c.created_at,c.id limit p_limit+1
  ), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), last_item as(select * from page order by title desc,created_at desc,id desc limit 1)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'summary',summary,'releasedAt',released_at,'videoAvailable',video_available,'tags',tags) order by title,created_at,id) from page),'[]'::jsonb),
    'nextCursor',case when exists(select 1 from tail) then (select encode(convert_to(jsonb_build_array(title,created_at,id)::text,'utf8'),'base64') from last_item) end
  ) into v_result;
  return v_result;
end;
$$;

create or replace function logos_academy.student_concept_detail(p_tenant_id uuid,p_actor_user_id uuid,p_concept_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'body',c.body,'releasedAt',min(rl.released_at),
    'videoUrl',c.video_url,'videoTitle',c.video_title,'videoDurationMinutes',c.video_duration_minutes,
    'video',case when c.video_url is null then null else jsonb_build_object('youtubeId',coalesce(substring(c.video_url from '(?:v=|youtu[.]be/)([A-Za-z0-9_-]{6,})'),c.video_url),'title',c.video_title,'durationMinutes',c.video_duration_minutes,'transcript',c.video_transcript,'captionsReviewed',c.video_captions_reviewed) end,
    'videoAvailable',c.video_url is not null,'tags',c.tags,'readingMinutes',c.reading_minutes,
    'contentBlocks',coalesce((select jsonb_agg(b order by ordinality) from jsonb_array_elements(c.content_blocks) with ordinality item(b,ordinality) where (b->>'isVisible')::boolean),'[]'::jsonb),
    'relatedConcepts',coalesce((select jsonb_agg(item order by item->>'title') from (
      select distinct jsonb_build_object('id',rc.id,'slug',rc.slug,'title',rc.title,'summary',rc.summary,'releasedAt',rrl.released_at,'videoAvailable',rc.video_url is not null,'tags',rc.tags) item
      from logos_academy.lesson_concepts source_lc
      join logos_academy.lesson_concepts related_lc on related_lc.tenant_id=source_lc.tenant_id and related_lc.lesson_template_id=source_lc.lesson_template_id and related_lc.deleted_at is null
      join logos_academy.concepts rc on rc.tenant_id=related_lc.tenant_id and rc.id=related_lc.concept_id and rc.status='published' and rc.deleted_at is null
      join private.student_released_lessons(p_tenant_id,p_actor_user_id) rrl on rrl.lesson_template_id=related_lc.lesson_template_id
      where source_lc.tenant_id=p_tenant_id and source_lc.concept_id=c.id and source_lc.deleted_at is null and rc.id<>c.id limit 4
    ) related),'[]'::jsonb)
  ) into v
  from logos_academy.concepts c
  join logos_academy.lesson_concepts lc on lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null
  join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=lc.lesson_template_id
  where c.tenant_id=p_tenant_id and c.id=p_concept_id and c.status='published' and c.deleted_at is null group by c.id;
  if v is null then raise exception using errcode='42501',message='concept not released'; end if;
  return v;
end;
$$;

create or replace function logos_academy.student_library_page(
  p_tenant_id uuid,p_actor_user_id uuid,p_kind text,p_search text default null,p_cursor text default null,p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_result jsonb;
begin
  if p_kind not in ('prompt','design_system') then raise exception using errcode='22023',message='invalid library kind'; end if;
  with rows as (
    select r.id,r.kind,r.slug,r.title,r.summary,r.tags,r.created_at,min(lt.position) lesson_position,min(rl.released_at) released_at
    from logos_academy.knowledge_resources r
    join logos_academy.knowledge_resource_lessons link on link.tenant_id=r.tenant_id and link.resource_id=r.id and link.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id=link.tenant_id and lt.id=link.lesson_template_id and lt.deleted_at is null
    join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=link.lesson_template_id
    where r.tenant_id=p_tenant_id and r.kind=p_kind and r.status='published' and r.deleted_at is null
      and (coalesce(btrim(p_search),'')='' or lower(r.title||' '||r.summary) like '%'||lower(btrim(p_search))||'%')
      and (v_cursor is null or (r.title,r.created_at,r.id)>((v_cursor->>0),(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid))
    group by r.id order by r.title,r.created_at,r.id limit p_limit+1
  ), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), last_item as(select * from page order by title desc,created_at desc,id desc limit 1)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'slug',slug,'title',title,'summary',summary,'releasedAt',released_at,'lessonPosition',lesson_position,'tags',tags) order by title,created_at,id) from page),'[]'::jsonb),
    'nextCursor',case when exists(select 1 from tail) then (select encode(convert_to(jsonb_build_array(title,created_at,id)::text,'utf8'),'base64') from last_item) end) into v_result;
  return v_result;
end;
$$;

create or replace function logos_academy.student_library_detail(p_tenant_id uuid,p_actor_user_id uuid,p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  select jsonb_build_object('id',r.id,'kind',r.kind,'slug',r.slug,'title',r.title,'summary',r.summary,'releasedAt',min(rl.released_at),
    'lessonPosition',min(lt.position),'body',r.body,'readingMinutes',r.reading_minutes,'tags',r.tags,
    'contentBlocks',coalesce((select jsonb_agg(b order by ordinality) from jsonb_array_elements(r.content_blocks) with ordinality item(b,ordinality) where (b->>'isVisible')::boolean),'[]'::jsonb),
    'artifact',r.artifact,'relatedResources','[]'::jsonb) into v
  from logos_academy.knowledge_resources r
  join logos_academy.knowledge_resource_lessons link on link.tenant_id=r.tenant_id and link.resource_id=r.id and link.deleted_at is null
  join logos_academy.lesson_templates lt on lt.tenant_id=link.tenant_id and lt.id=link.lesson_template_id and lt.deleted_at is null
  join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=link.lesson_template_id
  where r.tenant_id=p_tenant_id and r.id=p_resource_id and r.status='published' and r.deleted_at is null group by r.id;
  if v is null then raise exception using errcode='42501',message='library resource not released'; end if;
  return v;
end;
$$;

-- Exposed RPC entrypoints are invoker-only and contain no privileged logic.
-- The SECURITY DEFINER implementations remain in the non-exposed private
-- schema and repeat both tenant and active-admin authorization.
create function logos_academy.admin_atlas_list(
  p_tenant_id uuid,p_actor_user_id uuid,p_kind text default null,p_status text default null,
  p_curriculum_id uuid default null,p_cycle_id uuid default null,p_lesson_id uuid default null,
  p_tags text[] default null,p_search text default null,p_cursor text default null,p_limit integer default 25
)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_list(p_tenant_id,p_actor_user_id,p_kind,p_status,p_curriculum_id,p_cycle_id,p_lesson_id,p_tags,p_search,p_cursor,p_limit); $$;

create function logos_academy.admin_atlas_detail(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_detail(p_tenant_id,p_actor_user_id,p_item_id); $$;

create function logos_academy.admin_atlas_upsert(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_payload jsonb,p_expected_draft_updated_at timestamptz)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_upsert(p_tenant_id,p_actor_user_id,p_item_id,p_payload,p_expected_draft_updated_at); $$;

create function logos_academy.admin_atlas_publish(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_expected_draft_updated_at timestamptz,p_expected_item_updated_at timestamptz)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_publish(p_tenant_id,p_actor_user_id,p_item_id,p_expected_draft_updated_at,p_expected_item_updated_at); $$;

create function logos_academy.admin_atlas_archive(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_expected_item_updated_at timestamptz)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_archive(p_tenant_id,p_actor_user_id,p_item_id,p_expected_item_updated_at); $$;

create function logos_academy.admin_atlas_revisions(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_cursor text default null,p_limit integer default 25)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_revisions(p_tenant_id,p_actor_user_id,p_item_id,p_cursor,p_limit); $$;

create function logos_academy.admin_atlas_restore(p_tenant_id uuid,p_actor_user_id uuid,p_item_id uuid,p_revision integer,p_expected_draft_updated_at timestamptz)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_restore(p_tenant_id,p_actor_user_id,p_item_id,p_revision,p_expected_draft_updated_at); $$;

create function logos_academy.admin_atlas_asset_authorize(p_tenant_id uuid,p_actor_user_id uuid,p_owner jsonb,p_original_filename text,p_content_type text,p_byte_size integer)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_asset_authorize(p_tenant_id,p_actor_user_id,p_owner,p_original_filename,p_content_type,p_byte_size); $$;

create function logos_academy.admin_atlas_asset_finalize(p_tenant_id uuid,p_actor_user_id uuid,p_asset_id uuid,p_alt text,p_caption text,p_backend_derived_content_type text,p_backend_derived_byte_size integer,p_backend_derived_width integer,p_backend_derived_height integer)
returns jsonb language sql security invoker set search_path=''
as $$ select atlas_private.admin_atlas_asset_finalize(p_tenant_id,p_actor_user_id,p_asset_id,p_alt,p_caption,p_backend_derived_content_type,p_backend_derived_byte_size,p_backend_derived_width,p_backend_derived_height); $$;

revoke all on function private.atlas_item_kind(uuid,uuid),
  private.atlas_canonical_payload(uuid,uuid),private.atlas_assert_payload_relations(uuid,uuid,jsonb,boolean),
  private.atlas_append_revision(uuid,uuid,uuid,jsonb,text),private.atlas_sync_lessons(uuid,uuid,jsonb),
  atlas_private.admin_atlas_list(uuid,uuid,text,text,uuid,uuid,uuid,text[],text,text,integer),
  atlas_private.admin_atlas_detail(uuid,uuid,uuid),atlas_private.admin_atlas_upsert(uuid,uuid,uuid,jsonb,timestamptz),
  atlas_private.admin_atlas_publish(uuid,uuid,uuid,timestamptz,timestamptz),atlas_private.admin_atlas_archive(uuid,uuid,uuid,timestamptz),
  atlas_private.admin_atlas_revisions(uuid,uuid,uuid,text,integer),atlas_private.admin_atlas_restore(uuid,uuid,uuid,integer,timestamptz),
  atlas_private.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer),
  atlas_private.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer)
  from public,anon,authenticated,service_role;

grant usage on schema atlas_private to service_role;
grant execute on function atlas_private.admin_atlas_list(uuid,uuid,text,text,uuid,uuid,uuid,text[],text,text,integer),
  atlas_private.admin_atlas_detail(uuid,uuid,uuid),atlas_private.admin_atlas_upsert(uuid,uuid,uuid,jsonb,timestamptz),
  atlas_private.admin_atlas_publish(uuid,uuid,uuid,timestamptz,timestamptz),atlas_private.admin_atlas_archive(uuid,uuid,uuid,timestamptz),
  atlas_private.admin_atlas_revisions(uuid,uuid,uuid,text,integer),atlas_private.admin_atlas_restore(uuid,uuid,uuid,integer,timestamptz),
  atlas_private.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer),
  atlas_private.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer)
  to service_role;

revoke all on function logos_academy.admin_atlas_list(uuid,uuid,text,text,uuid,uuid,uuid,text[],text,text,integer),
  logos_academy.admin_atlas_detail(uuid,uuid,uuid),logos_academy.admin_atlas_upsert(uuid,uuid,uuid,jsonb,timestamptz),
  logos_academy.admin_atlas_publish(uuid,uuid,uuid,timestamptz,timestamptz),logos_academy.admin_atlas_archive(uuid,uuid,uuid,timestamptz),
  logos_academy.admin_atlas_revisions(uuid,uuid,uuid,text,integer),logos_academy.admin_atlas_restore(uuid,uuid,uuid,integer,timestamptz),
  logos_academy.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer),
  logos_academy.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer)
  from public,anon,authenticated;

grant execute on function logos_academy.admin_atlas_list(uuid,uuid,text,text,uuid,uuid,uuid,text[],text,text,integer),
  logos_academy.admin_atlas_detail(uuid,uuid,uuid),logos_academy.admin_atlas_upsert(uuid,uuid,uuid,jsonb,timestamptz),
  logos_academy.admin_atlas_publish(uuid,uuid,uuid,timestamptz,timestamptz),logos_academy.admin_atlas_archive(uuid,uuid,uuid,timestamptz),
  logos_academy.admin_atlas_revisions(uuid,uuid,uuid,text,integer),logos_academy.admin_atlas_restore(uuid,uuid,uuid,integer,timestamptz),
  logos_academy.admin_atlas_asset_authorize(uuid,uuid,jsonb,text,text,integer),
  logos_academy.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer)
  to service_role;

revoke all on function logos_academy.student_concepts_page(uuid,uuid,text,text,integer),
  logos_academy.student_concept_detail(uuid,uuid,uuid),logos_academy.student_library_page(uuid,uuid,text,text,text,integer),
  logos_academy.student_library_detail(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_concepts_page(uuid,uuid,text,text,integer),
  logos_academy.student_concept_detail(uuid,uuid,uuid),logos_academy.student_library_page(uuid,uuid,text,text,text,integer),
  logos_academy.student_library_detail(uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
