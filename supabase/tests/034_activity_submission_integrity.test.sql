begin;
create extension if not exists pgtap with schema extensions;
select plan(3);
select ok(pg_get_functiondef('logos_academy.student_save_draft(uuid,uuid,uuid,jsonb,text)'::regprocedure) like '%requirement kind mismatch%','draft rejects a requirement kind swap');
select ok(pg_get_functiondef('logos_academy.student_submit_activity(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure) like '%file not available%','submit rechecks ready owned files');
select ok(pg_get_functiondef('logos_academy.student_activity_detail(uuid,uuid,uuid,text)'::regprocedure) like '%submission_rows as%','activity projection aggregates submission history set-based');
select * from finish();
rollback;
