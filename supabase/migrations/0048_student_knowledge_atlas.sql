begin;

create function private.knowledge_content_blocks_valid(p_blocks jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; node jsonb;
begin
  if jsonb_typeof(p_blocks) <> 'array' then return false; end if;
  for item in select value from jsonb_array_elements(p_blocks) loop
    if item->>'type' in ('text','callout') then
      if jsonb_typeof(item->'heading') <> 'string' or jsonb_typeof(item->'body') <> 'string' then return false; end if;
    elsif item->>'type' = 'image' then
      if jsonb_typeof(item->'url') <> 'string' or item->>'url' !~ '^https://' or jsonb_typeof(item->'alt') <> 'string'
        or (item->'caption' <> 'null'::jsonb and jsonb_typeof(item->'caption') <> 'string') then return false; end if;
    elsif item->>'type' = 'diagram' then
      if jsonb_typeof(item->'heading') <> 'string' or jsonb_typeof(item->'nodes') <> 'array' then return false; end if;
      for node in select value from jsonb_array_elements(item->'nodes') loop
        if jsonb_typeof(node->'label') <> 'string' or jsonb_typeof(node->'detail') <> 'string' then return false; end if;
      end loop;
    else return false;
    end if;
  end loop;
  return true;
end;
$$;

create function private.library_artifact_valid(p_kind text, p_artifact jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(p_artifact) <> 'object' or p_artifact->>'type' <> p_kind then return false; end if;
  if p_kind = 'prompt' then
    if jsonb_typeof(p_artifact->'template') <> 'string' or jsonb_typeof(p_artifact->'variables') <> 'array'
      or not (jsonb_typeof(p_artifact->'exampleInput') in ('string','null'))
      or not (jsonb_typeof(p_artifact->'exampleOutput') in ('string','null')) then return false; end if;
    for item in select value from jsonb_array_elements(p_artifact->'variables') loop
      if jsonb_typeof(item->'token') <> 'string' or jsonb_typeof(item->'description') <> 'string' then return false; end if;
    end loop;
  elsif p_kind = 'design_system' then
    if jsonb_typeof(p_artifact->'palette') <> 'array' or jsonb_typeof(p_artifact->'typography') <> 'array'
      or jsonb_typeof(p_artifact->'principles') <> 'array' or jsonb_typeof(p_artifact->'components') <> 'array' then return false; end if;
    for item in select value from jsonb_array_elements(p_artifact->'palette') loop
      if jsonb_typeof(item->'name') <> 'string' or jsonb_typeof(item->'value') <> 'string' or jsonb_typeof(item->'role') <> 'string' then return false; end if;
    end loop;
    for item in select value from jsonb_array_elements(p_artifact->'typography') loop
      if jsonb_typeof(item->'name') <> 'string' or jsonb_typeof(item->'sample') <> 'string' or jsonb_typeof(item->'role') <> 'string' then return false; end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(p_artifact->'principles') value where jsonb_typeof(value) <> 'string') then return false; end if;
    for item in select value from jsonb_array_elements(p_artifact->'components') loop
      if jsonb_typeof(item->'name') <> 'string' or jsonb_typeof(item->'description') <> 'string' then return false; end if;
    end loop;
  else return false;
  end if;
  return true;
end;
$$;

alter table logos_academy.concepts
  add column video_url text,
  add column video_title text,
  add column video_duration_minutes smallint,
  add column reading_minutes smallint not null default 3,
  add column content_blocks jsonb not null default '[]'::jsonb,
  add constraint concepts_video_url_check check (video_url is null or video_url ~ '^https://'),
  add constraint concepts_video_metadata_check check ((video_url is null and video_title is null and video_duration_minutes is null) or (video_url is not null and length(btrim(video_title)) > 0 and video_duration_minutes > 0)),
  add constraint concepts_reading_minutes_check check (reading_minutes between 1 and 120),
  add constraint concepts_content_blocks_check check (private.knowledge_content_blocks_valid(content_blocks));

update logos_academy.concepts
set content_blocks = jsonb_build_array(jsonb_build_object('type','text','heading','Em resumo','body',body));

create table logos_academy.knowledge_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lesson_template_id uuid not null,
  kind text not null check (kind in ('prompt','design_system')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  summary text not null check (length(btrim(summary)) > 0),
  body text not null check (length(btrim(body)) > 0),
  reading_minutes smallint not null check (reading_minutes between 1 and 120),
  content_blocks jsonb not null default '[]'::jsonb check (private.knowledge_content_blocks_valid(content_blocks)),
  artifact jsonb not null check (private.library_artifact_valid(kind, artifact)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint knowledge_resources_tenant_id_id_key unique (tenant_id, id),
  constraint knowledge_resources_slug_key unique (tenant_id, kind, slug),
  constraint knowledge_resources_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint knowledge_resources_lesson_template_id_fkey foreign key (tenant_id, lesson_template_id) references logos_academy.lesson_templates(tenant_id, id) on delete restrict
);

create index knowledge_resources_lesson_idx on logos_academy.knowledge_resources (tenant_id, lesson_template_id) where deleted_at is null;
create index knowledge_resources_page_idx on logos_academy.knowledge_resources (tenant_id, kind, title, created_at, id) where deleted_at is null;
create trigger knowledge_resources_set_updated_at before update on logos_academy.knowledge_resources for each row execute function private.set_updated_at();
alter table logos_academy.knowledge_resources enable row level security;
alter table logos_academy.knowledge_resources force row level security;
revoke all on logos_academy.knowledge_resources from public, anon, authenticated;
grant select on logos_academy.knowledge_resources to service_role;

create function private.student_released_lessons(p_tenant_id uuid, p_actor_user_id uuid)
returns table (lesson_template_id uuid, released_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select at.lesson_template_id, min(aa.released_at)
  from logos_academy.student_profiles sp
  join logos_academy.enrollments e on e.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and e.deleted_at is null
  join logos_academy.activity_assignments aa on aa.tenant_id=e.tenant_id and aa.enrollment_id=e.id and aa.deleted_at is null
  join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id and at.deleted_at is null
  where sp.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and sp.deleted_at is null
    and aa.status <> 'locked' and aa.released_at is not null
  group by at.lesson_template_id;
$$;

create or replace function logos_academy.student_concept_detail(p_tenant_id uuid,p_actor_user_id uuid,p_concept_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'body',c.body,'releasedAt',min(rl.released_at),
    'videoUrl',c.video_url,'videoTitle',c.video_title,'videoDurationMinutes',c.video_duration_minutes,
    'readingMinutes',c.reading_minutes,'contentBlocks',c.content_blocks,
    'relatedConcepts',coalesce((
      select jsonb_agg(item order by item->>'title') from (
        select distinct jsonb_build_object('id',rc.id,'slug',rc.slug,'title',rc.title,'summary',rc.summary,'releasedAt',rrl.released_at) item
        from logos_academy.lesson_concepts source_lc
        join logos_academy.lesson_concepts related_lc on related_lc.tenant_id=source_lc.tenant_id and related_lc.lesson_template_id=source_lc.lesson_template_id and related_lc.deleted_at is null
        join logos_academy.concepts rc on rc.tenant_id=related_lc.tenant_id and rc.id=related_lc.concept_id and rc.deleted_at is null
        join private.student_released_lessons(p_tenant_id,p_actor_user_id) rrl on rrl.lesson_template_id=related_lc.lesson_template_id
        where source_lc.tenant_id=p_tenant_id and source_lc.concept_id=c.id and source_lc.deleted_at is null and rc.id<>c.id
        limit 4
      ) related
    ),'[]'::jsonb)
  ) into v
  from logos_academy.concepts c
  join logos_academy.lesson_concepts lc on lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null
  join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=lc.lesson_template_id
  where c.tenant_id=p_tenant_id and c.id=p_concept_id and c.deleted_at is null
  group by c.id;
  if v is null then raise exception using errcode='42501',message='concept not released'; end if;
  return v;
end;
$$;

create function logos_academy.student_library_page(p_tenant_id uuid,p_actor_user_id uuid,p_kind text,p_search text default null,p_cursor text default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cursor_value jsonb:=private.admissions_page(p_cursor,p_limit); result jsonb;
begin
  if p_kind not in ('prompt','design_system') then raise exception using errcode='22023',message='invalid library kind'; end if;
  with rows as (
    select kr.id,kr.kind,kr.slug,kr.title,kr.summary,kr.created_at,lt.position lesson_position,min(rl.released_at) released_at
    from logos_academy.knowledge_resources kr
    join logos_academy.lesson_templates lt on lt.tenant_id=kr.tenant_id and lt.id=kr.lesson_template_id and lt.deleted_at is null
    join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=kr.lesson_template_id
    where kr.tenant_id=p_tenant_id and kr.kind=p_kind and kr.deleted_at is null
      and (coalesce(btrim(p_search),'')='' or lower(kr.title||' '||kr.summary) like '%'||lower(btrim(p_search))||'%')
      and (cursor_value is null or (kr.title,kr.created_at,kr.id)>((cursor_value->>0),(cursor_value->>1)::timestamptz,(cursor_value->>2)::uuid))
    group by kr.id,lt.position order by kr.title,kr.created_at,kr.id limit p_limit+1
  ), page as (select * from rows limit p_limit), last_item as (select * from page order by title desc,created_at desc,id desc limit 1)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'slug',slug,'title',title,'summary',summary,'releasedAt',released_at,'lessonPosition',lesson_position) order by title,created_at,id) from page),'[]'::jsonb),
    'nextCursor',case when (select count(*) from rows)>p_limit then (select encode(convert_to(jsonb_build_array(title,created_at,id)::text,'utf8'),'base64') from last_item) else null end
  ) into result;
  return result;
end;
$$;

create function logos_academy.student_library_detail(p_tenant_id uuid,p_actor_user_id uuid,p_resource_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id',kr.id,'kind',kr.kind,'slug',kr.slug,'title',kr.title,'summary',kr.summary,'releasedAt',rl.released_at,
    'lessonPosition',lt.position,'body',kr.body,'readingMinutes',kr.reading_minutes,'contentBlocks',kr.content_blocks,'artifact',kr.artifact,
    'relatedResources',coalesce((
      select jsonb_agg(jsonb_build_object('id',related.id,'kind',related.kind,'slug',related.slug,'title',related.title,'summary',related.summary,'releasedAt',rrl.released_at,'lessonPosition',rlt.position) order by related.title)
      from logos_academy.knowledge_resources related
      join logos_academy.lesson_templates rlt on rlt.tenant_id=related.tenant_id and rlt.id=related.lesson_template_id and rlt.deleted_at is null
      join private.student_released_lessons(p_tenant_id,p_actor_user_id) rrl on rrl.lesson_template_id=related.lesson_template_id
      where related.tenant_id=kr.tenant_id and related.lesson_template_id=kr.lesson_template_id and related.id<>kr.id and related.deleted_at is null
    ),'[]'::jsonb)
  ) into v
  from logos_academy.knowledge_resources kr
  join logos_academy.lesson_templates lt on lt.tenant_id=kr.tenant_id and lt.id=kr.lesson_template_id and lt.deleted_at is null
  join private.student_released_lessons(p_tenant_id,p_actor_user_id) rl on rl.lesson_template_id=kr.lesson_template_id
  where kr.tenant_id=p_tenant_id and kr.id=p_resource_id and kr.deleted_at is null;
  if v is null then raise exception using errcode='42501',message='library resource not released'; end if;
  return v;
end;
$$;

with t as (select id from logos_academy.tenants where slug='logos-academy' and deleted_at is null), resources(kind,position,slug,title,summary,body,artifact) as (
  values
    ('prompt',3,'prompt-com-contexto','Prompt com contexto','Estruture pedidos claros com contexto, objetivo e formato.','Use o template como ponto de partida e adapte as variáveis ao seu problema.',jsonb_build_object('type','prompt','template','Contexto: {{contexto}}. Objetivo: {{objetivo}}. Responda em {{formato}}.','variables',jsonb_build_array(jsonb_build_object('token','{{contexto}}','description','Informações necessárias para entender a situação.'),jsonb_build_object('token','{{objetivo}}','description','Resultado que você deseja alcançar.'),jsonb_build_object('token','{{formato}}','description','Estrutura esperada da resposta.')),'exampleInput','Criar um plano de estudos semanal.','exampleOutput','Plano organizado por dia e prioridade.')),
    ('prompt',9,'mapear-automacao','Mapear uma automação','Transforme um processo em gatilho, etapas e saída.','Antes de abrir uma ferramenta, descreva o fluxo que precisa ser repetido.',jsonb_build_object('type','prompt','template','Mapeie o processo {{processo}} em gatilho, etapas, decisões e saída.','variables',jsonb_build_array(jsonb_build_object('token','{{processo}}','description','Processo repetível a mapear.')),'exampleInput',null,'exampleOutput',null)),
    ('design_system',6,'hierarquia-editorial','Hierarquia editorial','Um sistema visual para comunicar prioridade e sequência.','A hierarquia conecta tipografia, contraste e componentes a uma decisão de leitura.',jsonb_build_object('type','design_system','palette',jsonb_build_array(jsonb_build_object('name','Ink','value','#171717','role','Texto principal'),jsonb_build_object('name','Signal','value','#F97316','role','Ação e foco')),'typography',jsonb_build_array(jsonb_build_object('name','Display','sample','Uma ideia forte','role','Títulos'),jsonb_build_object('name','Body','sample','Leitura confortável','role','Texto longo')),'principles',jsonb_build_array('Uma ação principal por superfície','Contraste indica prioridade'),'components',jsonb_build_array(jsonb_build_object('name','Callout','description','Destaca uma decisão ou alerta.'),jsonb_build_object('name','Card','description','Agrupa conteúdo relacionado.')))),
    ('design_system',14,'produto-claro','Produto claro','Referência visual para interfaces de produto legíveis.','Cada escolha visual deve explicar estado, prioridade ou próxima ação.',jsonb_build_object('type','design_system','palette',jsonb_build_array(jsonb_build_object('name','Canvas','value','#FAFAF9','role','Superfície'),jsonb_build_object('name','Accent','value','#EA580C','role','Seleção')),'typography',jsonb_build_array(jsonb_build_object('name','Interface','sample','Próxima ação','role','Controles')),'principles',jsonb_build_array('Estado sempre visível','Conteúdo antes da decoração'),'components',jsonb_build_array(jsonb_build_object('name','Status badge','description','Comunica o estado atual sem depender apenas de cor.'))))
)
insert into logos_academy.knowledge_resources(id,tenant_id,lesson_template_id,kind,slug,title,summary,body,reading_minutes,content_blocks,artifact)
select md5('logos-academy-library-'||r.kind||'-'||r.position)::uuid,t.id,md5('logos-academy-explorer-v1-lesson-'||r.position)::uuid,r.kind,r.slug,r.title,r.summary,r.body,4,
  jsonb_build_array(jsonb_build_object('type','text','heading','Como usar','body',r.body)),r.artifact
from t cross join resources r on conflict do nothing;

revoke all on function private.knowledge_content_blocks_valid(jsonb),private.library_artifact_valid(text,jsonb),private.student_released_lessons(uuid,uuid),logos_academy.student_library_page(uuid,uuid,text,text,text,integer),logos_academy.student_library_detail(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_library_page(uuid,uuid,text,text,text,integer),logos_academy.student_library_detail(uuid,uuid,uuid) to service_role;
revoke all on function logos_academy.student_concept_detail(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_concept_detail(uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
