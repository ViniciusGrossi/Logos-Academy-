begin;

create or replace function private.atlas_nonempty_string(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(p_value) = 'string' and length(btrim(p_value #>> '{}')) > 0,false);
$$;

create or replace function private.atlas_object_keys_exact(p_value jsonb,p_allowed text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(p_value)='object'
    and not exists(select 1 from jsonb_object_keys(p_value) key where not (key=any(p_allowed))),false);
$$;

create or replace function private.atlas_string_array_valid(
  p_value jsonb,
  p_min integer default 0,
  p_max integer default 100
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) between p_min and p_max
    and not exists (
      select 1
      from jsonb_array_elements(p_value) entry
      where not private.atlas_nonempty_string(entry)
    ),false);
$$;

create or replace function private.atlas_image_source_valid(p_source jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(p_source) = 'object'
    and private.atlas_nonempty_string(p_source->'alt')
    and (not (p_source ? 'caption') or jsonb_typeof(p_source->'caption') = 'string')
    and (
      (
        p_source->>'kind' = 'asset'
        and private.atlas_object_keys_exact(p_source,array['kind','assetId','alt','caption'])
        and coalesce(p_source->>'assetId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and not (p_source ? 'url')
      )
      or (
        p_source->>'kind' = 'external'
        and private.atlas_object_keys_exact(p_source,array['kind','url','alt','caption'])
        and coalesce(p_source->>'url', '') ~ '^https://[^[:space:]]+$'
        and not (p_source ? 'assetId')
      )
    ),false);
$$;

create or replace function private.atlas_specimen_valid(p_item jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare v_props jsonb := p_item->'props';
begin
  if jsonb_typeof(v_props) <> 'object' then return false; end if;
  case p_item->>'component'
    when 'button' then
      return private.atlas_object_keys_exact(v_props,array['label','variant','disabled']) and private.atlas_nonempty_string(v_props->'label')
        and v_props->>'variant' in ('primary', 'secondary', 'outline')
        and jsonb_typeof(v_props->'disabled') = 'boolean';
    when 'field' then
      return private.atlas_object_keys_exact(v_props,array['label','placeholder','helpText','state']) and private.atlas_nonempty_string(v_props->'label')
        and jsonb_typeof(v_props->'placeholder') = 'string'
        and (not (v_props ? 'helpText') or jsonb_typeof(v_props->'helpText') = 'string')
        and v_props->>'state' in ('default', 'error', 'success');
    when 'card' then
      return private.atlas_object_keys_exact(v_props,array['eyebrow','title','body','actionLabel']) and private.atlas_nonempty_string(v_props->'title')
        and private.atlas_nonempty_string(v_props->'body')
        and (not (v_props ? 'eyebrow') or jsonb_typeof(v_props->'eyebrow') = 'string')
        and (not (v_props ? 'actionLabel') or jsonb_typeof(v_props->'actionLabel') = 'string');
    when 'badge' then
      return private.atlas_object_keys_exact(v_props,array['label','tone']) and private.atlas_nonempty_string(v_props->'label')
        and v_props->>'tone' in ('neutral', 'accent', 'success', 'warning');
    when 'callout' then
      return private.atlas_object_keys_exact(v_props,array['title','body','tone']) and private.atlas_nonempty_string(v_props->'title')
        and private.atlas_nonempty_string(v_props->'body')
        and v_props->>'tone' in ('info', 'warning', 'success');
    when 'navigation' then
      return private.atlas_object_keys_exact(v_props,array['items','activeIndex']) and private.atlas_string_array_valid(v_props->'items', 1, 12)
        and jsonb_typeof(v_props->'activeIndex') = 'number'
        and (v_props->>'activeIndex')::integer between 0 and jsonb_array_length(v_props->'items') - 1;
    when 'editorial' then
      return private.atlas_object_keys_exact(v_props,array['eyebrow','title','summary']) and private.atlas_nonempty_string(v_props->'title')
        and private.atlas_nonempty_string(v_props->'summary')
        and (not (v_props ? 'eyebrow') or jsonb_typeof(v_props->'eyebrow') = 'string');
    else return false;
  end case;
exception when others then
  return false;
end;
$$;

create or replace function private.knowledge_content_blocks_valid(p_blocks jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  nested jsonb;
begin
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 100 then return false; end if;
  if exists (
    select 1 from jsonb_array_elements(p_blocks) a
    group by a->>'id' having count(*) > 1
  ) then return false; end if;

  for item in select value from jsonb_array_elements(p_blocks) loop
    if coalesce(item->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'isVisible') is distinct from 'boolean'
    then return false; end if;

    case item->>'type'
      when 'text', 'callout' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','body']) or not private.atlas_nonempty_string(item->'heading') or not private.atlas_nonempty_string(item->'body') then return false; end if;
      when 'image' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','source']) or private.atlas_image_source_valid(item->'source') is not true then return false; end if;
      when 'diagram' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','nodes']) or not private.atlas_nonempty_string(item->'heading') or jsonb_typeof(item->'nodes') <> 'array'
          or jsonb_array_length(item->'nodes') not between 1 and 12 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'nodes') loop
          if not private.atlas_nonempty_string(nested->'label') or not private.atlas_nonempty_string(nested->'detail') then return false; end if;
        end loop;
      when 'section' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading']) or not private.atlas_nonempty_string(item->'heading') then return false; end if;
      when 'list' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','ordered','items']) or jsonb_typeof(item->'ordered') <> 'boolean' or not private.atlas_string_array_valid(item->'items', 1, 30) then return false; end if;
      when 'gallery' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','items']) or jsonb_typeof(item->'items') <> 'array' or jsonb_array_length(item->'items') not between 1 and 6 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'items') loop
          if private.atlas_image_source_valid(nested) is not true then return false; end if;
        end loop;
      when 'code' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','language','code']) or not private.atlas_nonempty_string(item->'language') or not private.atlas_nonempty_string(item->'code') then return false; end if;
      when 'quote' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','body','attribution']) or not private.atlas_nonempty_string(item->'body')
          or (item ? 'attribution' and jsonb_typeof(item->'attribution') <> 'string') then return false; end if;
      when 'comparison' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','left','right','emphasis']) or not private.atlas_nonempty_string(item->'heading')
          or item->>'emphasis' not in ('left', 'right', 'balanced') then return false; end if;
        for nested in select value from jsonb_array_elements(jsonb_build_array(item->'left', item->'right')) loop
          if jsonb_typeof(nested) <> 'object' or not private.atlas_nonempty_string(nested->'title')
            or not private.atlas_nonempty_string(nested->'body')
            or (nested ? 'eyebrow' and jsonb_typeof(nested->'eyebrow') <> 'string') then return false; end if;
        end loop;
      when 'steps' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','items']) or not private.atlas_nonempty_string(item->'heading') or jsonb_typeof(item->'items') <> 'array'
          or jsonb_array_length(item->'items') not between 2 and 6 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'items') loop
          if not private.atlas_nonempty_string(nested->'title')
            or (nested ? 'body' and jsonb_typeof(nested->'body') <> 'string') then return false; end if;
        end loop;
      when 'checklist' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','items']) or not private.atlas_nonempty_string(item->'heading') or jsonb_typeof(item->'items') <> 'array'
          or jsonb_array_length(item->'items') not between 2 and 8 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'items') loop
          if not private.atlas_nonempty_string(nested->'label')
            or (nested ? 'detail' and jsonb_typeof(nested->'detail') <> 'string') then return false; end if;
        end loop;
      when 'do_dont' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','do','dont']) or not private.atlas_nonempty_string(item->'heading')
          or not private.atlas_string_array_valid(item->'do', 1, 12)
          or not private.atlas_string_array_valid(item->'dont', 1, 12) then return false; end if;
      when 'palette' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','colors']) or not private.atlas_nonempty_string(item->'heading') or jsonb_typeof(item->'colors') <> 'array'
          or jsonb_array_length(item->'colors') not between 2 and 8 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'colors') loop
          if not private.atlas_nonempty_string(nested->'name') or coalesce(nested->>'value', '') !~* '^#[0-9a-f]{6}$'
            or (nested ? 'usage' and jsonb_typeof(nested->'usage') <> 'string') then return false; end if;
        end loop;
      when 'typography' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','samples']) or not private.atlas_nonempty_string(item->'heading') or jsonb_typeof(item->'samples') <> 'array'
          or jsonb_array_length(item->'samples') not between 1 and 12 then return false; end if;
        for nested in select value from jsonb_array_elements(item->'samples') loop
          if not private.atlas_nonempty_string(nested->'role') or not private.atlas_nonempty_string(nested->'family')
            or not private.atlas_nonempty_string(nested->'weight') or not private.atlas_nonempty_string(nested->'sample') then return false; end if;
        end loop;
      when 'specimen' then
        if not private.atlas_object_keys_exact(item,array['id','isVisible','type','heading','component','props']) or not private.atlas_nonempty_string(item->'heading') or private.atlas_specimen_valid(item) is not true then return false; end if;
      else return false;
    end case;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.atlas_draft_payload_valid(p_payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare v_kind text := p_payload->>'kind';
begin
  if jsonb_typeof(p_payload) is distinct from 'object'
    or not (p_payload ?& array['kind','title','slug','summary','tags','lessonTemplateIds','contentBlocks','video','artifact'])
    or v_kind not in ('concept', 'prompt', 'design_system')
    or jsonb_typeof(p_payload->'title') <> 'string'
    or jsonb_typeof(p_payload->'slug') <> 'string'
    or jsonb_typeof(p_payload->'summary') <> 'string'
    or coalesce(p_payload->>'slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or not private.atlas_string_array_valid(p_payload->'tags', 0, 30)
    or jsonb_typeof(p_payload->'lessonTemplateIds') <> 'array'
    or exists (
      select 1 from jsonb_array_elements_text(p_payload->'lessonTemplateIds') value
      where value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    or not private.knowledge_content_blocks_valid(p_payload->'contentBlocks')
  then return false; end if;

  if v_kind = 'concept' then
    return coalesce((p_payload->'artifact' = 'null'::jsonb)
      and (
        p_payload->'video' = 'null'::jsonb
        or (
          jsonb_typeof(p_payload->'video') = 'object'
          and p_payload->'video' ?& array['youtubeId','title','durationMinutes','transcript','captionsReviewed']
          and private.atlas_nonempty_string(p_payload->'video'->'youtubeId')
          and private.atlas_nonempty_string(p_payload->'video'->'title')
          and (p_payload->'video'->>'durationMinutes')::integer > 0
          and jsonb_typeof(p_payload->'video'->'captionsReviewed') = 'boolean'
          and jsonb_typeof(p_payload->'video'->'transcript') in ('string', 'null')
        )
      ),false);
  end if;
  return coalesce(p_payload->'video' = 'null'::jsonb
    and private.library_artifact_valid(v_kind, p_payload->'artifact'),false);
exception when others then
  return false;
end;
$$;

-- A recursive text check catches the stable signatures that motivated the
-- Atlas repair migration without persisting or logging the rejected content.
create or replace function private.atlas_has_mojibake(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value::text ~ '(Ãƒ|Ã‚|Ã¢â‚¬|Ã¢â€ )';
$$;

create or replace function private.atlas_publication_payload_valid(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.atlas_draft_payload_valid(p_payload)
    and length(btrim(p_payload->>'title')) > 0
    and length(btrim(p_payload->>'summary')) > 0
    and jsonb_array_length(p_payload->'lessonTemplateIds') > 0
    and not private.atlas_has_mojibake(p_payload)
    and (
      (p_payload->>'kind' = 'concept'
        and exists (select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' in ('text','callout','list','code','quote'))
        and exists (select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' in ('image','diagram','gallery','comparison','steps','checklist','do_dont','palette','typography','specimen'))
        and (p_payload->'video' = 'null'::jsonb or (length(btrim(p_payload->'video'->>'transcript')) > 0 and (p_payload->'video'->>'captionsReviewed')::boolean)))
      or (p_payload->>'kind' = 'prompt'
        and length(btrim(p_payload->'artifact'->>'template')) > 0
        and (jsonb_array_length(p_payload->'artifact'->'variables') > 0
          or exists (select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' in ('image','diagram','gallery','comparison','steps','checklist','do_dont','palette','typography','specimen'))))
      or (p_payload->>'kind' = 'design_system'
        and exists (select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' = 'palette')
        and exists (select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' = 'specimen'))
    );
$$;

create or replace function private.atlas_publication_error(p_payload jsonb)
returns text
language plpgsql
immutable
set search_path=''
as $$
begin
  if not private.atlas_draft_payload_valid(p_payload) then return 'contentBlocks:INVALID_STRUCTURE'; end if;
  if length(btrim(p_payload->>'title'))=0 then return 'title:REQUIRED'; end if;
  if length(btrim(p_payload->>'summary'))=0 then return 'summary:REQUIRED'; end if;
  if jsonb_array_length(p_payload->'lessonTemplateIds')=0 then return 'lessonTemplateIds:REQUIRED'; end if;
  if private.atlas_has_mojibake(p_payload) then return 'content:MOJIBAKE'; end if;
  if p_payload->>'kind'='concept' and not exists(select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' in ('text','callout','list','code','quote')) then return 'contentBlocks:TEXT_REQUIRED'; end if;
  if p_payload->>'kind'='concept' and not exists(select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type' in ('image','diagram','gallery','comparison','steps','checklist','do_dont','palette','typography','specimen')) then return 'contentBlocks:VISUAL_REQUIRED'; end if;
  if p_payload->>'kind'='concept' and p_payload->'video'<>'null'::jsonb and length(btrim(p_payload->'video'->>'transcript'))=0 then return 'video.transcript:REQUIRED'; end if;
  if p_payload->>'kind'='concept' and p_payload->'video'<>'null'::jsonb and not (p_payload->'video'->>'captionsReviewed')::boolean then return 'video.captionsReviewed:REQUIRED'; end if;
  if p_payload->>'kind'='design_system' and not exists(select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type'='palette') then return 'contentBlocks.palette:REQUIRED'; end if;
  if p_payload->>'kind'='design_system' and not exists(select 1 from jsonb_array_elements(p_payload->'contentBlocks') b where (b->>'isVisible')::boolean and b->>'type'='specimen') then return 'contentBlocks.specimen:REQUIRED'; end if;
  return null;
end;
$$;

with normalized as (
  select c.id, c.tenant_id,
    coalesce(jsonb_agg(
      case
        when block.value->>'type' = 'image' and not (block.value ? 'source') then
          (block.value - 'url' - 'alt' - 'caption') || jsonb_build_object(
            'id', md5(c.tenant_id::text || c.id::text || block.ordinality::text || 'image')::uuid,
            'isVisible', true,
            'source', jsonb_strip_nulls(jsonb_build_object(
              'kind', 'external', 'url', block.value->>'url', 'alt', block.value->>'alt', 'caption', block.value->>'caption'
            ))
          )
        else block.value || jsonb_build_object(
          'id', coalesce(block.value->>'id', (md5(c.tenant_id::text || c.id::text || block.ordinality::text || coalesce(block.value->>'type','block'))::uuid)::text),
          'isVisible', coalesce((block.value->>'isVisible')::boolean, true)
        )
      end order by block.ordinality
    ) filter (where block.value is not null), '[]'::jsonb) blocks
  from logos_academy.concepts c
  left join lateral jsonb_array_elements(c.content_blocks) with ordinality block(value, ordinality) on true
  group by c.id, c.tenant_id
)
update logos_academy.concepts c
set content_blocks = n.blocks || jsonb_build_array(
  case
    when c.slug = 'rag' then jsonb_build_object(
      'id', md5(c.tenant_id::text || c.id::text || 'atlas-rag-reference')::uuid,
      'isVisible', true, 'type', 'comparison', 'heading', 'Onde o contexto entra na resposta',
      'left', jsonb_build_object('eyebrow','Sem RAG','title','Pergunta → Modelo','body','O modelo depende apenas do que já sabe e do texto da conversa.'),
      'right', jsonb_build_object('eyebrow','Com RAG','title','Pergunta → Busca → Fontes','body','A resposta recebe evidências recuperadas antes de ser escrita.'),
      'emphasis', 'right'
    )
    when c.slug in ('hierarquia-visual', 'storytelling') then jsonb_build_object(
      'id', md5(c.tenant_id::text || c.id::text || 'atlas-hierarchy-reference')::uuid,
      'isVisible', true, 'type', 'comparison', 'heading', 'A mesma informação, duas leituras',
      'left', jsonb_build_object('eyebrow','Sem direção','title','Oficina criativa','body','Muitos elementos disputam atenção sem indicar uma próxima ação.'),
      'right', jsonb_build_object('eyebrow','Com hierarquia','title','Oficina criativa','body','Escala, espaço e contraste conduzem da mensagem para a ação.'),
      'emphasis', 'right'
    )
    else jsonb_build_object(
      'id', md5(c.tenant_id::text || c.id::text || 'atlas-contrast-reference')::uuid,
      'isVisible', true, 'type', 'comparison', 'heading', 'Diferença decorativa × diferença funcional',
      'left', jsonb_build_object('eyebrow','Baixo contraste','title','Continuar leitura','body','A ação desaparece na superfície.'),
      'right', jsonb_build_object('eyebrow','Contraste funcional','title','Continuar leitura','body','A ação se separa sem depender só da cor.'),
      'emphasis', 'right'
    )
  end
), updated_at = now()
from normalized n
where c.id = n.id and c.tenant_id = n.tenant_id and c.deleted_at is null
  and not exists (
    select 1 from jsonb_array_elements(n.blocks) b
    where b->>'id' = (
      case
        when c.slug='rag' then md5(c.tenant_id::text||c.id::text||'atlas-rag-reference')::uuid
        when c.slug in ('hierarquia-visual','storytelling') then md5(c.tenant_id::text||c.id::text||'atlas-hierarchy-reference')::uuid
        else md5(c.tenant_id::text||c.id::text||'atlas-contrast-reference')::uuid
      end
    )::text
  );

with normalized as (
  select c.id, c.tenant_id,
    coalesce(jsonb_agg(block.value || jsonb_build_object(
      'id', coalesce(block.value->>'id', (md5(c.tenant_id::text || c.id::text || block.ordinality::text || coalesce(block.value->>'type','block'))::uuid)::text),
      'isVisible', coalesce((block.value->>'isVisible')::boolean, true)
    ) order by block.ordinality) filter (where block.value is not null), '[]'::jsonb) blocks
  from logos_academy.concepts c
  left join lateral jsonb_array_elements(c.content_blocks) with ordinality block(value, ordinality) on true
  group by c.id, c.tenant_id
)
update logos_academy.concepts c
set content_blocks = n.blocks, updated_at = now()
from normalized n
where c.id = n.id and c.tenant_id = n.tenant_id and c.deleted_at is null
  and c.content_blocks is distinct from n.blocks;

with normalized as (
  select r.id, r.tenant_id,
    coalesce(jsonb_agg(block.value || jsonb_build_object(
      'id', coalesce(block.value->>'id', (md5(r.tenant_id::text || r.id::text || block.ordinality::text || coalesce(block.value->>'type','block'))::uuid)::text),
      'isVisible', coalesce((block.value->>'isVisible')::boolean, true)
    ) order by block.ordinality) filter (where block.value is not null), '[]'::jsonb) blocks
  from logos_academy.knowledge_resources r
  left join lateral jsonb_array_elements(r.content_blocks) with ordinality block(value, ordinality) on true
  group by r.id, r.tenant_id
)
update logos_academy.knowledge_resources r
set content_blocks = n.blocks, updated_at = now()
from normalized n
where r.id = n.id and r.tenant_id = n.tenant_id and r.deleted_at is null
  and r.content_blocks is distinct from n.blocks;

-- Recursos publicados legados passam a satisfazer o checklist atual sem
-- perder os blocos existentes. IDs determinísticos tornam o backfill seguro.
update logos_academy.knowledge_resources r
set content_blocks = r.content_blocks || jsonb_build_array(
  jsonb_build_object(
    'id',md5(r.tenant_id::text||r.id::text||'atlas-design-palette')::uuid,
    'isVisible',true,'type','palette','heading','Paleta do sistema',
    'colors',coalesce((select jsonb_agg(jsonb_build_object('name',p->>'name','value',p->>'value','usage',p->>'role')) from jsonb_array_elements(r.artifact->'palette') p),'[]'::jsonb)
  ),
  jsonb_build_object(
    'id',md5(r.tenant_id::text||r.id::text||'atlas-design-specimen')::uuid,
    'isVisible',true,'type','specimen','heading','Componente em contexto','component','card',
    'props',jsonb_build_object('title',r.title,'body',r.summary)
  )
),updated_at=now()
where r.kind='design_system' and r.status='published' and r.deleted_at is null
  and not exists(select 1 from jsonb_array_elements(r.content_blocks) b where b->>'type'='palette')
  and not exists(select 1 from jsonb_array_elements(r.content_blocks) b where b->>'type'='specimen');

update logos_academy.knowledge_resources r
set content_blocks = r.content_blocks || jsonb_build_array(jsonb_build_object(
  'id',md5(r.tenant_id::text||r.id::text||'atlas-prompt-functional')::uuid,
  'isVisible',true,'type','checklist','heading','Bancada funcional do prompt',
  'items',jsonb_build_array(
    jsonb_build_object('label','Objetivo explícito','detail',r.summary),
    jsonb_build_object('label','Template pronto para copiar','detail','Revise as variáveis antes de usar.')
  )
)),updated_at=now()
where r.kind='prompt' and r.status='published' and r.deleted_at is null
  and jsonb_array_length(r.artifact->'variables')=0
  and not exists(select 1 from jsonb_array_elements(r.content_blocks) b where b->>'id'=(md5(r.tenant_id::text||r.id::text||'atlas-prompt-functional')::uuid)::text);

-- ponytail: bare ADD CONSTRAINT has no IF NOT EXISTS in Postgres (unlike ADD
-- COLUMN); drop-if-exists first so this migration can be re-applied without
-- erroring on "constraint already exists" (idempotency requirement).
alter table logos_academy.knowledge_item_drafts drop constraint if exists knowledge_item_drafts_payload_check;
alter table logos_academy.knowledge_item_drafts
  add constraint knowledge_item_drafts_payload_check check (private.atlas_draft_payload_valid(payload));
alter table logos_academy.knowledge_item_revisions drop constraint if exists knowledge_item_revisions_snapshot_check;
alter table logos_academy.knowledge_item_revisions
  add constraint knowledge_item_revisions_snapshot_check check (private.atlas_draft_payload_valid(snapshot));

alter table logos_academy.concepts validate constraint concepts_content_blocks_check;
alter table logos_academy.knowledge_resources validate constraint knowledge_resources_content_blocks_check;

revoke all on function private.atlas_nonempty_string(jsonb),
  private.atlas_object_keys_exact(jsonb,text[]),
  private.atlas_string_array_valid(jsonb,integer,integer),
  private.atlas_image_source_valid(jsonb), private.atlas_specimen_valid(jsonb),
  private.knowledge_content_blocks_valid(jsonb), private.atlas_draft_payload_valid(jsonb),
  private.atlas_publication_payload_valid(jsonb),private.atlas_publication_error(jsonb),private.atlas_has_mojibake(jsonb)
  from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
