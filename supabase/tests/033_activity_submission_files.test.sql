begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
select ok(has_function_privilege('service_role','logos_academy.student_activity_detail(uuid,uuid,uuid,text)','execute'),'activity detail projection is service-role callable');
select ok(not has_function_privilege('authenticated','logos_academy.student_activity_detail(uuid,uuid,uuid,text)','execute'),'authenticated cannot decrypt activity detail');
select ok(not has_function_privilege('authenticated','logos_academy.student_file_metadata(uuid,uuid,uuid,text)','execute'),'authenticated cannot resolve storage paths');
select ok(not has_function_privilege('authenticated','private.student_submission_detail(uuid,uuid,text)','execute'),'submission projection helper stays private');
select * from finish();
rollback;
