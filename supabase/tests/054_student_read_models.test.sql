begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
select ok(not has_function_privilege('authenticated','logos_academy.student_home(uuid,uuid)','execute'),'home is server-only');
select ok(not has_function_privilege('authenticated','logos_academy.student_journey(uuid,uuid,uuid)','execute'),'journey is server-only');
select ok(not has_function_privilege('authenticated','logos_academy.student_concepts_page(uuid,uuid,text,text,integer)','execute'),'concept list is server-only');
select ok(not has_function_privilege('authenticated','logos_academy.student_concept_detail(uuid,uuid,uuid)','execute'),'concept detail is server-only');
select ok(not has_function_privilege('authenticated','logos_academy.mark_review_seen(uuid,uuid,uuid)','execute'),'review receipt is server-only');
select * from finish(); rollback;
