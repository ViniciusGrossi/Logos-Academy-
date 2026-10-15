begin;

-- Built-in transliteration avoids installing extensions in a shared database.
-- Portuguese accents are normalized identically for titles, summaries and tags.
create function private.atlas_search_text(p_value text)
returns text language sql immutable parallel safe set search_path='' as $$
  select translate(lower(coalesce(p_value,'')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
    'aaaaaaeeeeiiiiooooouuuucnyy');
$$;
revoke all on function private.atlas_search_text(text) from public,anon,authenticated,service_role;

create or replace function atlas_private.admin_atlas_list(
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
      and (coalesce(btrim(p_search),'')='' or private.atlas_search_text(i.title||' '||i.summary||' '||array_to_string(i.tags,' ')) like '%'||private.atlas_search_text(btrim(p_search))||'%')
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
      and (coalesce(btrim(p_search),'')='' or private.atlas_search_text(c.title||' '||c.summary||' '||array_to_string(c.tags,' ')) like '%'||private.atlas_search_text(btrim(p_search))||'%')
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
      and (coalesce(btrim(p_search),'')='' or private.atlas_search_text(r.title||' '||r.summary||' '||array_to_string(r.tags,' ')) like '%'||private.atlas_search_text(btrim(p_search))||'%')
      and (v_cursor is null or (r.title,r.created_at,r.id)>((v_cursor->>0),(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid))
    group by r.id order by r.title,r.created_at,r.id limit p_limit+1
  ), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), last_item as(select * from page order by title desc,created_at desc,id desc limit 1)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'slug',slug,'title',title,'summary',summary,'releasedAt',released_at,'lessonPosition',lesson_position,'tags',tags) order by title,created_at,id) from page),'[]'::jsonb),
    'nextCursor',case when exists(select 1 from tail) then (select encode(convert_to(jsonb_build_array(title,created_at,id)::text,'utf8'),'base64') from last_item) end) into v_result;
  return v_result;
end;
$$;

notify pgrst,'reload schema';
commit;
