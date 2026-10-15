begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(12);
insert into concepts(id,tenant_id,slug,title,summary,body,tags,status,published_at,archived_at)
select md5('mvp067-concept-'||n)::uuid,'10000000-0000-0000-0000-000000000001','mvp067-concept-'||n,'Saídas prováveis mvp067','Resumo editorial exclusivo','Corpo de teste',array['SóTagMvp067'],
case n when 2 then 'draft' when 3 then 'archived' else 'published' end,
case when n<>2 then now() end,case when n=3 then now() end from generate_series(1,4)n;
insert into lesson_concepts(tenant_id,lesson_template_id,concept_id)
select '10000000-0000-0000-0000-000000000001',md5('academy-a-lesson-'||case when n=4 then 2 else 1 end)::uuid,md5('mvp067-concept-'||n)::uuid from generate_series(1,4)n;
insert into knowledge_resources(id,tenant_id,kind,slug,title,summary,body,reading_minutes,artifact,tags,status,published_at,archived_at)
select md5('mvp067-resource-'||n)::uuid,'10000000-0000-0000-0000-000000000001','prompt','mvp067-resource-'||n,'Criação responsável mvp067','Resumo editorial exclusivo','Corpo de teste',2,
'{"type":"prompt","template":"Explique","variables":[],"exampleInput":null,"exampleOutput":null}'::jsonb,array['SóTagMvp067'],
case n when 2 then 'draft' when 3 then 'archived' else 'published' end,
case when n<>2 then now() end,case when n=3 then now() end from generate_series(1,4)n;
insert into knowledge_resource_lessons(tenant_id,resource_id,lesson_template_id)
select '10000000-0000-0000-0000-000000000001',md5('mvp067-resource-'||n)::uuid,md5('academy-a-lesson-'||case when n=4 then 2 else 1 end)::uuid from generate_series(1,4)n;
set local role service_role;
select is(jsonb_array_length(logos_academy.student_concepts_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',p_search=>'saidas provaveis mvp067')->'items'),1,'concept title matches without Portuguese accents');
select is(jsonb_array_length(logos_academy.student_concepts_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',p_search=>'sotagmvp067')->'items'),1,'concept tag matches case-insensitively without accents');
select is(logos_academy.student_concepts_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',p_search=>'sotagmvp067')->'items'->0->>'id',md5('mvp067-concept-1')::uuid::text,'only published released concept is disclosed');
select is(jsonb_array_length(logos_academy.student_library_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','prompt',p_search=>'criacao responsavel mvp067')->'items'),1,'library title matches without accents');
select is(jsonb_array_length(logos_academy.student_library_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','prompt',p_search=>'sotagmvp067')->'items'),1,'library tag matches without accents');
select is(logos_academy.student_library_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','prompt',p_search=>'sotagmvp067')->'items'->0->>'id',md5('mvp067-resource-1')::uuid::text,'draft archived and future resources remain private');
select is(jsonb_array_length(logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',p_kind=>'concept',p_search=>'saidas provaveis mvp067')->'items'),4,'admin title search normalizes accents and retains editorial statuses');
select is(jsonb_array_length(logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',p_kind=>'prompt',p_search=>'sotagmvp067')->'items'),4,'admin tag search includes all authorized editorial items');
select is(jsonb_array_length(logos_academy.student_concepts_page('10000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002',p_search=>'sotagmvp067')->'items'),0,'foreign student cannot use normalized search to disclose content');
select is(jsonb_array_length(logos_academy.student_library_page('10000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','prompt',p_search=>'sotagmvp067')->'items'),0,'foreign student cannot use library search to disclose content');
select is(jsonb_array_length(logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',p_kind=>'concept',p_status=>'published',p_search=>'sotagmvp067',p_limit=>1)->'items'),1,'normalized admin search respects page limit');
select ok(logos_academy.admin_atlas_list('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',p_kind=>'concept',p_status=>'published',p_search=>'sotagmvp067',p_limit=>1)->>'nextCursor' is not null,'normalized search preserves continuation cursor');
reset role;
select * from finish();
rollback;
