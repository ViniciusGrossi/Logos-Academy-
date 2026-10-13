begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(11);

create temporary table atlas_finalize_retry as
select md5('atlas-ready-retry')::uuid ready_id, md5('atlas-failed-retry')::uuid failed_id,
  md5('academy-a-concept-1')::uuid concept_id;

-- A ready row represents the committed result that a second concurrent
-- finalize sees after its SELECT FOR UPDATE acquires the first row's lock.
insert into logos_academy.knowledge_assets(id,tenant_id,concept_id,status,bucket_path,original_filename,content_type,byte_size,width,height,alt,caption)
select ready_id,'10000000-0000-0000-0000-000000000001',concept_id,'ready',
  '10000000-0000-0000-0000-000000000001/concept/'||concept_id::text||'/'||ready_id::text,
  'verified.png','image/png',100,10,10,'Alt original','Caption original'
from atlas_finalize_retry;
insert into logos_academy.knowledge_assets(id,tenant_id,concept_id,status,bucket_path,original_filename,content_type,byte_size)
select failed_id,'10000000-0000-0000-0000-000000000001',concept_id,'failed',
  '10000000-0000-0000-0000-000000000001/concept/'||concept_id::text||'/'||failed_id::text,
  'failed.png','image/png',100
from atlas_finalize_retry;
create temporary table atlas_retry_before as
select updated_at from logos_academy.knowledge_assets where id=(select ready_id from atlas_finalize_retry);

select is(logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select ready_id from atlas_finalize_retry),'Novo alt',null,'image/png',100,10,10)->>'status','ready','ready finalize retry returns terminal verified state');
select is(logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select ready_id from atlas_finalize_retry),'',null,null,null,null,null)->>'status','ready','stale failed verification cannot downgrade a committed ready asset');
select is((select status from logos_academy.knowledge_assets where id=(select ready_id from atlas_finalize_retry)),'ready','ready state stays verified after both retries');
select is((select alt from logos_academy.knowledge_assets where id=(select ready_id from atlas_finalize_retry)),'Alt original','retry cannot change verified alt');
select is((select updated_at from logos_academy.knowledge_assets where id=(select ready_id from atlas_finalize_retry)),(select updated_at from atlas_retry_before),'retry does not mutate timestamps');
select is((select count(*)::integer from logos_academy.audit_events where entity_id=(select ready_id from atlas_finalize_retry)),0,'retry does not append duplicate success/failure audit');
select is(logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',(select failed_id from atlas_finalize_retry),'Alt',null,'image/png',100,10,10)->>'status','failed','failed terminal state cannot become ready through retry');
select throws_ok($$select logos_academy.admin_atlas_asset_finalize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',(select ready_id from atlas_finalize_retry),'Alt',null,'image/png',100,10,10)$$,'42501',null,'tenant B admin cannot read terminal A asset');

set local role authenticated;
select throws_ok($$select logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('atlas-ready-retry')::uuid,'Alt',null,'image/png',100,10,10)$$,'42501',null,'authenticated cannot invoke finalize wrapper');
reset role;
set local role anon;
select throws_ok($$select logos_academy.admin_atlas_asset_finalize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',md5('atlas-ready-retry')::uuid,'Alt',null,'image/png',100,10,10)$$,'42501',null,'anon cannot invoke finalize wrapper');
reset role;
select ok(not has_function_privilege('authenticated','atlas_private.admin_atlas_asset_finalize(uuid,uuid,uuid,text,text,text,integer,integer,integer)','execute'),'private finalize grants remain service-only');

select * from finish();
rollback;
