begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(23);
insert into concepts(id,tenant_id,slug,title,summary,body)
values(md5('070-concept-b')::uuid,'20000000-0000-0000-0000-000000000001','070-concept-b','Concept B','Fixture summary','Fixture body');
insert into knowledge_resources(id,tenant_id,kind,slug,title,summary,body,reading_minutes,artifact)
values(md5('070-resource-a')::uuid,'10000000-0000-0000-0000-000000000001','prompt','070-resource-a','Resource A','Fixture summary','Fixture body',2,
'{"type":"prompt","template":"Explain","variables":[],"exampleInput":null,"exampleOutput":null}'),
(md5('070-resource-b')::uuid,'20000000-0000-0000-0000-000000000001','design_system','070-resource-b','Resource B','Fixture summary','Fixture body',2,
'{"type":"design_system","palette":[],"typography":[],"principles":[],"components":[]}');
set local role service_role;
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','tenant B cannot authorize tenant A concept asset');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-resource-a')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','tenant B cannot authorize tenant A resource asset');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('070-concept-b')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','tenant A cannot authorize tenant B concept asset');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-resource-b')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','tenant A cannot authorize tenant B resource asset');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('070-missing')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','missing concept is denied before INSERT');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-missing')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','missing resource is denied before INSERT');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind',null,'id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','null owner kind is denied');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','unexpected','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','invalid owner kind is denied');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','{}'::jsonb,'070-denied.png','image/png',100)$$,'42501','asset owner not available','missing owner fields are denied');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',null),'070-denied.png','image/png',100)$$,'42501','asset owner not available','null owner ID is denied');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('070-resource-a')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','resource cannot masquerade as concept');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','concept cannot masquerade as resource');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501','tenant admin required','actor authorization still precedes owner lookup');
select is((select count(*)::integer from knowledge_assets where original_filename='070-denied.png'),0,'all rejected owners leave zero new assets');
select is(logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-valid-concept.png','image/png',100)->>'status','pending','valid concept owner authorizes an asset');
select is(logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-resource-a')::uuid),'070-valid-resource.png','image/png',100)->>'bucket','knowledge-assets','valid prompt resource preserves response bucket');
select is(logos_academy.admin_atlas_asset_authorize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-resource-b')::uuid),'070-valid-design.png','image/png',100)->>'status','pending','valid design-system owner authorizes an asset');
select is((select count(*)::integer from knowledge_assets where original_filename like '070-valid-%'),3,'valid owners create exactly three assets');
reset role;
update concepts set deleted_at=now() where id=md5('070-concept-b')::uuid;
update knowledge_resources set deleted_at=now() where id=md5('070-resource-b')::uuid;
set local role service_role;
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('070-concept-b')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','deleted concept owner is denied');
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('20000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',jsonb_build_object('kind','resource','id',md5('070-resource-b')::uuid),'070-denied.png','image/png',100)$$,'42501','asset owner not available','deleted resource owner is denied');
reset role;
set local role authenticated;
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501',null,'authenticated cannot invoke asset authorization wrapper');
select throws_ok($$select atlas_private.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501',null,'authenticated cannot invoke private implementation');
reset role;
set local role anon;
select throws_ok($$select logos_academy.admin_atlas_asset_authorize('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',jsonb_build_object('kind','concept','id',md5('academy-a-concept-1')::uuid),'070-denied.png','image/png',100)$$,'42501',null,'anon cannot invoke asset authorization wrapper');
reset role;
select * from finish();
rollback;
