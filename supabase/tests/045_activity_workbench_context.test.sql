begin;
select plan(3);
select ok(pg_get_functiondef('logos_academy.student_activity_detail(uuid,uuid,uuid,text)'::regprocedure) like '%student_actor_assignment%', 'activity context keeps student assignment authorization');
select ok(pg_get_functiondef('logos_academy.student_activity_detail(uuid,uuid,uuid,text)'::regprocedure) like '%project_dossier_json%', 'activity context reuses the tenant-scoped project dossier');
select ok(not has_function_privilege('authenticated','logos_academy.student_activity_detail(uuid,uuid,uuid,text)','execute'), 'authenticated cannot call the decrypting projection directly');
select * from finish();
rollback;
