begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(8);
insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 (md5('read-admin-a-auth')::uuid,'authenticated','authenticated','read-admin-a@test','{}','{}'),(md5('read-admin-b-auth')::uuid,'authenticated','authenticated','read-admin-b@test','{}','{}'),(md5('read-student-1-auth')::uuid,'authenticated','authenticated','read-student-1@test','{}','{}'),(md5('read-student-2-auth')::uuid,'authenticated','authenticated','read-student-2@test','{}','{}');
insert into tenants(id,tenant_id,name,slug) values (md5('read-a')::uuid,md5('read-a')::uuid,'Read A','read-a'),(md5('read-b')::uuid,md5('read-b')::uuid,'Read B','read-b');
insert into users(id,tenant_id,auth_user_id,email_encrypted,display_name) values
 (md5('read-admin-a')::uuid,md5('read-a')::uuid,md5('read-admin-a-auth')::uuid,extensions.pgp_sym_encrypt('read-admin-a@test','test-key'),'Admin A'),(md5('read-admin-b')::uuid,md5('read-b')::uuid,md5('read-admin-b-auth')::uuid,extensions.pgp_sym_encrypt('read-admin-b@test','test-key'),'Admin B'),(md5('read-student-1')::uuid,md5('read-a')::uuid,md5('read-student-1-auth')::uuid,extensions.pgp_sym_encrypt('student.one@test','test-key'),'Student One'),(md5('read-student-2')::uuid,md5('read-a')::uuid,md5('read-student-2-auth')::uuid,extensions.pgp_sym_encrypt('student.two@test','test-key'),'Student Two');
insert into tenant_memberships(tenant_id,user_id,role) values (md5('read-a')::uuid,md5('read-admin-a')::uuid,'admin'),(md5('read-b')::uuid,md5('read-admin-b')::uuid,'admin'),(md5('read-a')::uuid,md5('read-student-1')::uuid,'student'),(md5('read-a')::uuid,md5('read-student-2')::uuid,'student');
insert into student_profiles(id,tenant_id,user_id,birth_date_encrypted) values (md5('read-profile-1')::uuid,md5('read-a')::uuid,md5('read-student-1')::uuid,extensions.pgp_sym_encrypt('2011-01-01','test-key')),(md5('read-profile-2')::uuid,md5('read-a')::uuid,md5('read-student-2')::uuid,extensions.pgp_sym_encrypt('2011-01-02','test-key'));
insert into guardian_records(tenant_id,student_profile_id,name_encrypted,relationship,email_encrypted) values (md5('read-a')::uuid,md5('read-profile-1')::uuid,extensions.pgp_sym_encrypt('Guardian One','test-key'),'parent',extensions.pgp_sym_encrypt('guardian.one@test','test-key'));
insert into curricula(id,tenant_id,name,version,status) values (md5('read-curriculum')::uuid,md5('read-a')::uuid,'Read curriculum','v1','active');
insert into classes(id,tenant_id,name,curriculum_id,starts_on,status) values (md5('read-class')::uuid,md5('read-a')::uuid,'Read Class',md5('read-curriculum')::uuid,'2026-09-07','planned');
insert into enrollments(id,tenant_id,student_profile_id,curriculum_id,kind,class_id,status,invited_at,activated_at) values (md5('read-enrollment')::uuid,md5('read-a')::uuid,md5('read-profile-1')::uuid,md5('read-curriculum')::uuid,'class',md5('read-class')::uuid,'active',now(),now());
select ok(has_function_privilege('service_role','logos_academy.admin_list_students(uuid,uuid,text,text,uuid,text,integer)','execute') and not has_function_privilege('authenticated','logos_academy.admin_list_students(uuid,uuid,text,text,uuid,text,integer)','execute'),'student read model is server-only');
select ok(not has_function_privilege('anon','logos_academy.admin_student_detail(uuid,uuid,uuid,text)','execute'),'anon cannot read decrypted detail');
set local role service_role;
select is((logos_academy.admin_list_students(md5('read-a')::uuid,md5('read-admin-a')::uuid,'test-key',null,null,null,1)->'items'->0->>'email'),'student.one@test','list decrypts email only in server result');
select ok((logos_academy.admin_list_students(md5('read-a')::uuid,md5('read-admin-a')::uuid,'test-key',null,null,null,1)->>'nextCursor') is not null,'student list returns opaque next cursor');
select is((logos_academy.admin_student_detail(md5('read-a')::uuid,md5('read-admin-a')::uuid,md5('read-profile-1')::uuid,'test-key')->'guardian'->>'email'),'guardian.one@test','detail decrypts guardian only in server result');
select throws_ok($$select logos_academy.admin_list_students(md5('read-a')::uuid,md5('read-admin-b')::uuid,'test-key',null,null,null,25)$$,'42501','tenant admin required','tenant B admin cannot list tenant A');
select lives_ok($$select logos_academy.admin_update_class(md5('read-a')::uuid,md5('read-admin-a')::uuid,md5('read-class')::uuid,'Renamed',null)$$,'admin updates class minimally');
select is((logos_academy.admin_update_enrollment(md5('read-a')::uuid,md5('read-admin-a')::uuid,md5('read-enrollment')::uuid,'paused')->>'status'),'paused','admin updates enrollment without completed state');
reset role; select * from finish(); rollback;
