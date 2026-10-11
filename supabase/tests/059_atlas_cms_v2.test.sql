begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(86);

select has_table('logos_academy','knowledge_item_drafts','working drafts table exists');
select has_table('logos_academy','knowledge_resource_lessons','resource lesson links table exists');
select has_table('logos_academy','knowledge_assets','knowledge assets table exists');
select has_table('logos_academy','knowledge_item_revisions','atlas revisions table exists');

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='logos_academy.knowledge_item_drafts'::regclass),'drafts have enabled and forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='logos_academy.knowledge_resource_lessons'::regclass),'lesson links have enabled and forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='logos_academy.knowledge_assets'::regclass),'assets have enabled and forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='logos_academy.knowledge_item_revisions'::regclass),'revisions have enabled and forced RLS');

select ok(not has_table_privilege('anon','logos_academy.knowledge_item_drafts','select'),'anon cannot read drafts');
select ok(not has_table_privilege('authenticated','logos_academy.knowledge_item_drafts','select'),'authenticated cannot read drafts');
select ok(not has_table_privilege('authenticated','logos_academy.knowledge_assets','insert'),'authenticated cannot insert assets');
select ok(not has_table_privilege('authenticated','logos_academy.knowledge_item_revisions','update'),'authenticated cannot update revisions');
select ok(has_table_privilege('service_role','logos_academy.knowledge_item_drafts','select,insert,update'),'service role has explicit draft lifecycle grants');
select ok(not has_table_privilege('service_role','logos_academy.knowledge_item_drafts','delete'),'service role cannot hard delete drafts');
select ok(has_table_privilege('service_role','logos_academy.knowledge_assets','select,insert,update'),'service role has minimal asset grants');
select ok(not has_table_privilege('service_role','logos_academy.knowledge_assets','delete'),'service role cannot hard delete assets');
select ok(not has_table_privilege('service_role','logos_academy.knowledge_item_revisions','update,delete'),'service role cannot mutate revision history');
select ok((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='atlas_private' and p.proname like 'admin_atlas_%'),'privileged admin Atlas implementations are SECURITY DEFINER in non-exposed schema');
select ok((select bool_and(not p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='logos_academy' and p.proname like 'admin_atlas_%'),'exposed admin Atlas entrypoints are SECURITY INVOKER only');

select ok((select not public and file_size_limit=5242880 and allowed_mime_types @> array['image/png','image/jpeg','image/webp']::text[] from storage.buckets where id='knowledge-assets'),'knowledge-assets bucket is private and constrained');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
select throws_ok($$select * from logos_academy.knowledge_item_drafts$$,'42501',null,'authenticated cannot bypass table grants');
select throws_ok($$select logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001')$$,'42501',null,'authenticated cannot execute admin list RPC');
reset role;

set local role anon;
select throws_ok($$select * from logos_academy.knowledge_assets$$,'42501',null,'anon cannot read asset rows');
select throws_ok($$select logos_academy.admin_atlas_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid)$$,'42501',null,'anon cannot execute admin detail RPC');
reset role;

select throws_ok(
  $$select logos_academy.admin_atlas_list('20000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001')$$,
  '42501','tenant admin required','tenant A actor cannot operate tenant B'
);

-- ponytail: tests 53/78 below need a real tenant-A knowledge_resources row.
-- 0048's own library seed depends on pre-existing out-of-scope tenant/lesson
-- data that never actually lands (confirmed empty in the harness -- see DBA
-- report), so seed one fixture row directly here instead of relying on that
-- migration's data. lesson_template_id is nullable since the Atlas
-- editorial schema migration, so no FK dependency is needed.
insert into logos_academy.knowledge_resources
  (tenant_id,kind,slug,title,summary,body,reading_minutes,artifact,content_blocks)
values (
  '10000000-0000-0000-0000-000000000001','design_system','fixture-design-system-059',
  'Fixture Design System','Sistema de design fixture para teste 059','Corpo fixture para validação de blocos.',5,
  jsonb_build_object(
    'type','design_system',
    'palette',jsonb_build_array(jsonb_build_object('name','Primária','value','#1a2b3c','role','ação')),
    'typography',jsonb_build_array(jsonb_build_object('name','Corpo','sample','Aa','role','texto')),
    'principles',jsonb_build_array('Clareza'),
    'components',jsonb_build_array(jsonb_build_object('name','Botão','description','Ação primária'))
  ),
  jsonb_build_array(
    jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','palette','heading','Paleta','colors',jsonb_build_array(jsonb_build_object('name','Primária','value','#1a2b3c','usage','ação'),jsonb_build_object('name','Secundária','value','#4d5e6f','usage','apoio'))),
    jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','specimen','heading','Botão em contexto','component','button','props',jsonb_build_object('label','Continuar','variant','primary','disabled',false))
  )
);

-- ponytail: seed.sql's fixture concept is inserted AFTER the Atlas backfill
-- migration already ran, so it never gets the backfill's auto-injected
-- visual block and starts with zero content blocks -- failing both
-- TEXT_REQUIRED and VISUAL_REQUIRED on publish. Append one valid text block
-- and one valid comparison block here so the publish lifecycle below (which
-- several later assertions depend on) can actually succeed.
create temporary table atlas_test_state as
select c.id item_id,c.title published_title,c.updated_at item_updated_at,
  private.atlas_canonical_payload(c.tenant_id,c.id)
    || jsonb_build_object(
      'title',c.title||' — rascunho',
      'contentBlocks',
        coalesce(private.atlas_canonical_payload(c.tenant_id,c.id)->'contentBlocks','[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','text','heading','Resumo','body','Texto de verificação do fluxo de publicação.'),
          jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','comparison','heading','Antes e depois','left',jsonb_build_object('title','Sem decompor','body','O problema permanece grande demais para atacar.'),'right',jsonb_build_object('title','Decompondo','body','Cada parte fica pequena o suficiente para resolver.'),'emphasis','right')
        )
    ) payload
from logos_academy.concepts c
where c.tenant_id='10000000-0000-0000-0000-000000000001' and c.slug='pensamento-computacional' and c.deleted_at is null;

select lives_ok(
  $$select logos_academy.admin_atlas_upsert('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload from atlas_test_state),null)$$,
  'admin saves a separate working draft'
);
select is((select c.title from logos_academy.concepts c join atlas_test_state s on s.item_id=c.id),(select published_title from atlas_test_state),'save does not change published canonical title');
select is((select count(*)::integer from logos_academy.knowledge_item_drafts d join atlas_test_state s on s.item_id=d.concept_id where d.deleted_at is null),1,'one active working draft per item');
select is((select count(*)::integer from logos_academy.knowledge_item_revisions r join atlas_test_state s on s.item_id=r.concept_id where r.reason='save'),1,'save appends one revision');
select throws_ok(
  $$insert into logos_academy.knowledge_item_drafts(tenant_id,concept_id,payload,updated_by_user_id) values('10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload from atlas_test_state),'11000000-0000-0000-0000-000000000001')$$,
  '23505',null,'active working draft uniqueness rejects a second draft'
);

select lives_ok(
  $$select logos_academy.admin_atlas_upsert('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload from atlas_test_state),(select updated_at from logos_academy.knowledge_item_drafts where concept_id=(select item_id from atlas_test_state) and deleted_at is null))$$,
  'semantic no-op save succeeds'
);
select is((select count(*)::integer from logos_academy.knowledge_item_revisions r join atlas_test_state s on s.item_id=r.concept_id where r.reason='save'),1,'semantic no-op does not append revision');

select throws_ok(
  $$select logos_academy.admin_atlas_publish('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),clock_timestamp(),(select item_updated_at from atlas_test_state))$$,
  '40001','ATLAS_CONFLICT:draftUpdatedAt:STALE','publish rejects stale draft clock'
);

select lives_ok(
  $$select logos_academy.admin_atlas_publish('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select updated_at from logos_academy.knowledge_item_drafts where concept_id=(select item_id from atlas_test_state) and deleted_at is null),(select item_updated_at from atlas_test_state))$$,
  'publish atomically promotes working draft'
);
select is((select c.title from logos_academy.concepts c join atlas_test_state s on s.item_id=c.id),(select payload->>'title' from atlas_test_state),'published row receives draft content');
select is((select count(*)::integer from logos_academy.knowledge_item_drafts d join atlas_test_state s on s.item_id=d.concept_id where d.deleted_at is null),0,'publish closes working draft by soft delete');
select is((select count(*)::integer from logos_academy.knowledge_item_drafts d join atlas_test_state s on s.item_id=d.concept_id where d.deleted_at is not null),1,'published working draft remains as soft-deleted history');
select is((select count(*)::integer from logos_academy.knowledge_item_revisions r join atlas_test_state s on s.item_id=r.concept_id where r.reason='publish'),1,'publish appends one revision');

select lives_ok(
  $$select logos_academy.admin_atlas_archive('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select updated_at from logos_academy.concepts where id=(select item_id from atlas_test_state)))$$,
  'archive preserves the canonical item'
);
select is((select status from logos_academy.concepts where id=(select item_id from atlas_test_state)),'archived','archive changes only canonical status');
select throws_ok(
  $$select logos_academy.student_concept_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',(select item_id from atlas_test_state))$$,
  '42501','concept not released','archived item is hidden from student detail'
);
select lives_ok(
  $$select logos_academy.admin_atlas_restore('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),1,null)$$,
  'restore creates a new working draft'
);
select is((select status from logos_academy.concepts where id=(select item_id from atlas_test_state)),'archived','restore does not overwrite archived canonical state');

select throws_ok($$update logos_academy.knowledge_item_revisions set reason='archive' where concept_id=(select item_id from atlas_test_state)$$,'42501','knowledge_item_revisions is append-only','revision update is rejected');
select throws_ok($$delete from logos_academy.knowledge_item_revisions where concept_id=(select item_id from atlas_test_state)$$,'42501','knowledge_item_revisions is append-only','revision delete is rejected');

select throws_ok(
  $$insert into logos_academy.knowledge_assets(tenant_id,concept_id,status,bucket_path,original_filename,content_type,byte_size) values('20000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),'pending','cross-tenant/test','test.png','image/png',100)$$,
  '23503',null,'asset owner FK rejects cross-tenant concept'
);
select throws_ok(
  $$insert into logos_academy.knowledge_assets(tenant_id,concept_id,status,bucket_path,original_filename,content_type,byte_size) values('10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),'ready','invalid-ready/test','test.png','image/png',100)$$,
  '23514',null,'ready asset requires verified alt and dimensions'
);

select ok((select bool_and(private.knowledge_content_blocks_valid(content_blocks)) from logos_academy.concepts where status='published' and deleted_at is null),'all published concepts use typed valid blocks');
select ok((select bool_and(exists(select 1 from jsonb_array_elements(c.content_blocks) b where b->>'type' in ('image','diagram','gallery','comparison','steps','checklist','do_dont','palette','typography','specimen'))) from logos_academy.concepts c where c.status='published' and c.deleted_at is null),'all published concepts persist a visual block');

select ok(not private.knowledge_content_blocks_valid(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','text','heading','X','body','Y','html','<script>'))),'closed block union rejects HTML/extra keys');
select ok(not private.knowledge_content_blocks_valid(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','image','source',jsonb_build_object('kind','external','url','https://example.test/a.png','alt','A','css','display:none')))),'closed image source rejects CSS/extra keys');
select ok(not private.knowledge_content_blocks_valid(jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','specimen','heading','Botão','component','button','props',jsonb_build_object('label','Abrir','variant','primary','disabled',false,'onClick','javascript:alert(1)')))),'closed specimen props reject JS/extra props');
select ok((select bool_and(exists(select 1 from jsonb_array_elements(r.content_blocks) b where b->>'type'='palette') and exists(select 1 from jsonb_array_elements(r.content_blocks) b where b->>'type'='specimen')) from logos_academy.knowledge_resources r where r.kind='design_system' and r.status='published' and r.deleted_at is null),'legacy published design systems satisfy palette and specimen checklist');
select ok(not (logos_academy.admin_atlas_detail('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state)) ? 'resolvedAssets'),'raw admin RPC leaves resolvedAssets enrichment to repository');

select ok(not has_table_privilege('anon','logos_academy.knowledge_resource_lessons','select,insert,update,delete'),'anon has no lesson-link CRUD');
select ok(not has_table_privilege('anon','logos_academy.knowledge_item_revisions','select,insert,update,delete'),'anon has no revision CRUD');
select ok(not has_table_privilege('authenticated','logos_academy.knowledge_resource_lessons','select,insert,update,delete'),'authenticated has no lesson-link CRUD');
select ok(not has_table_privilege('authenticated','logos_academy.knowledge_assets','select,insert,update,delete'),'authenticated has no asset CRUD');

set local role authenticated;
select throws_ok($$select logos_academy.admin_atlas_revisions('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid)$$,'42501',null,'authenticated cannot execute revisions RPC');
select throws_ok($$select logos_academy.admin_atlas_restore('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,1,null)$$,'42501',null,'authenticated cannot execute restore RPC');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'x.png','image/png',100)$$,'42501',null,'authenticated cannot execute upload authorization RPC');
select throws_ok($$select logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',gen_random_uuid(),'Alt',null,'image/png',100,10,10)$$,'42501',null,'authenticated cannot pass backend-derived finalize metadata');
select throws_ok($$select logos_academy.admin_atlas_upsert('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,'{}'::jsonb,null)$$,'42501',null,'authenticated cannot execute upsert RPC');
select throws_ok($$select logos_academy.admin_atlas_publish('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,clock_timestamp(),clock_timestamp())$$,'42501',null,'authenticated cannot execute publish RPC');
select throws_ok($$select logos_academy.admin_atlas_archive('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,clock_timestamp())$$,'42501',null,'authenticated cannot execute archive RPC');
select throws_ok($$select * from logos_academy.knowledge_resource_lessons$$,'42501',null,'authenticated cannot read lesson-link rows directly');
reset role;

set local role anon;
select throws_ok($$select logos_academy.admin_atlas_revisions('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid)$$,'42501',null,'anon cannot execute revisions RPC');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'x.png','image/png',100)$$,'42501',null,'anon cannot execute upload authorization RPC');
select throws_ok($$select logos_academy.admin_atlas_restore('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,1,null)$$,'42501',null,'anon cannot execute restore RPC');
select throws_ok($$select logos_academy.admin_atlas_upsert('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,'{}'::jsonb,null)$$,'42501',null,'anon cannot execute upsert RPC');
select throws_ok($$select logos_academy.admin_atlas_publish('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,clock_timestamp(),clock_timestamp())$$,'42501',null,'anon cannot execute publish RPC');
select throws_ok($$select logos_academy.admin_atlas_archive('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('academy-a-concept-1')::uuid,clock_timestamp())$$,'42501',null,'anon cannot execute archive RPC');
select throws_ok($$select logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',gen_random_uuid(),'Alt',null,'image/png',100,10,10)$$,'42501',null,'anon cannot pass backend-derived finalize metadata');
select throws_ok($$select * from logos_academy.knowledge_resource_lessons$$,'42501',null,'anon cannot read lesson-link rows directly');
reset role;

set local role service_role;
select lives_ok($$select logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001')$$,'service role executes admin list with valid tenant admin');
select throws_ok($$select logos_academy.admin_atlas_list('20000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001')$$,'42501','tenant admin required','service role still fails cross-tenant actor');
reset role;

select throws_ok($$insert into logos_academy.knowledge_assets(tenant_id,status,bucket_path,original_filename,content_type,byte_size) values('10000000-0000-0000-0000-000000000001','pending','missing-owner/test','x.png','image/png',100)$$,'23514',null,'asset requires exactly one owner');
select throws_ok($$insert into logos_academy.knowledge_assets(tenant_id,concept_id,resource_id,status,bucket_path,original_filename,content_type,byte_size) values('10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select id from logos_academy.knowledge_resources where tenant_id='10000000-0000-0000-0000-000000000001' limit 1),'pending','double-owner/test','x.png','image/png',100)$$,'23514',null,'asset rejects divergent double owner');

select throws_ok($$select logos_academy.admin_atlas_upsert('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload from logos_academy.knowledge_item_drafts where concept_id=(select item_id from atlas_test_state) and deleted_at is null),clock_timestamp())$$,'40001','ATLAS_CONFLICT:draftUpdatedAt:STALE','save rejects stale draft clock');
select throws_ok($$select logos_academy.admin_atlas_restore('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),1,clock_timestamp())$$,'40001','ATLAS_CONFLICT:draftUpdatedAt:STALE','restore rejects stale draft clock');
select throws_ok($$select logos_academy.admin_atlas_archive('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),clock_timestamp())$$,'40001','ATLAS_CONFLICT:itemUpdatedAt:STALE','archive rejects stale item clock');

insert into logos_academy.knowledge_assets(id,tenant_id,concept_id,status,bucket_path,original_filename,content_type,byte_size)
values(md5('atlas-pending-test')::uuid,'10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),'pending','pending/test','x.png','image/png',100);
select throws_ok($$select private.atlas_assert_payload_relations('10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload||jsonb_build_object('contentBlocks',(payload->'contentBlocks')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','image','source',jsonb_build_object('kind','asset','assetId',md5('atlas-pending-test')::uuid,'alt','Teste')))) from logos_academy.knowledge_item_drafts where concept_id=(select item_id from atlas_test_state) and deleted_at is null),true)$$,'23514','ATLAS_VALIDATION:contentBlocks.assetId:OWNER_OR_STATUS_INVALID','pending asset blocks publication');
update logos_academy.knowledge_assets set status='failed' where id=md5('atlas-pending-test')::uuid;
select throws_ok($$select private.atlas_assert_payload_relations('10000000-0000-0000-0000-000000000001',(select item_id from atlas_test_state),(select payload||jsonb_build_object('contentBlocks',(payload->'contentBlocks')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'isVisible',true,'type','image','source',jsonb_build_object('kind','asset','assetId',md5('atlas-pending-test')::uuid,'alt','Teste')))) from logos_academy.knowledge_item_drafts where concept_id=(select item_id from atlas_test_state) and deleted_at is null),true)$$,'23514','ATLAS_VALIDATION:contentBlocks.assetId:OWNER_OR_STATUS_INVALID','failed asset blocks publication');

create temporary table atlas_finalize_state as
select (logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',(select item_id from atlas_test_state)),'verify.png','image/png',100)->>'id')::uuid asset_id;
select is(logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select asset_id from atlas_finalize_state),'Alt',null,'image/png',100,10,10)->>'status','failed','service finalize fails closed when storage object is absent');

create temporary table atlas_finalize_mismatch_state as
select (logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',(select item_id from atlas_test_state)),'mismatch.png','image/png',100)->>'id')::uuid asset_id;
select is(logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select asset_id from atlas_finalize_mismatch_state),'Alt',null,'image/jpeg',100,10,10)->>'status','failed','finalize fails closed when backend-derived content type diverges from declared upload');
select is((select status from logos_academy.knowledge_assets where id=(select asset_id from atlas_finalize_mismatch_state)),'failed','mismatched asset is persisted as failed, not left pending');

select * from finish();
rollback;
