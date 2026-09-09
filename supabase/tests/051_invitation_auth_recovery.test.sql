begin;
create extension if not exists pgtap with schema extensions;
set local search_path = logos_academy, extensions;
select plan(9);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
  (md5('recovery-admin-a-auth')::uuid, 'authenticated', 'authenticated', 'recovery-admin-a@example.test', '{}', '{}'),
  (md5('recovery-admin-b-auth')::uuid, 'authenticated', 'authenticated', 'recovery-admin-b@example.test', '{}', '{}'),
  (md5('recovery-student-auth')::uuid, 'authenticated', 'authenticated', 'recovery-student@example.test', '{}', '{}'),
  (md5('recovery-other-auth')::uuid, 'authenticated', 'authenticated', 'recovery-other@example.test', '{}', '{}');
insert into tenants (id, tenant_id, name, slug) values
  (md5('recovery-tenant-a')::uuid, md5('recovery-tenant-a')::uuid, 'Recovery tenant A', 'recovery-tenant-a'),
  (md5('recovery-tenant-b')::uuid, md5('recovery-tenant-b')::uuid, 'Recovery tenant B', 'recovery-tenant-b');
insert into users (id, tenant_id, auth_user_id, email_encrypted, display_name) values
  (md5('recovery-admin-a')::uuid, md5('recovery-tenant-a')::uuid, md5('recovery-admin-a-auth')::uuid, extensions.pgp_sym_encrypt('recovery-admin-a@example.test','test-key'), 'Admin A'),
  (md5('recovery-admin-b')::uuid, md5('recovery-tenant-b')::uuid, md5('recovery-admin-b-auth')::uuid, extensions.pgp_sym_encrypt('recovery-admin-b@example.test','test-key'), 'Admin B');
insert into tenant_memberships (tenant_id, user_id, role) values
  (md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'admin'),
  (md5('recovery-tenant-b')::uuid, md5('recovery-admin-b')::uuid, 'admin');

select ok(has_function_privilege('service_role', 'logos_academy.bind_student_invitation_auth(uuid,uuid,text,bytea,uuid,timestamp with time zone)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.bind_student_invitation_auth(uuid,uuid,text,bytea,uuid,timestamp with time zone)', 'execute'),
  'binding RPC is service-role only');
select ok(not has_function_privilege('anon', 'logos_academy.claim_student_invitation(uuid,uuid,text,bytea)', 'execute'), 'anon cannot claim invitations');

set local role service_role;
select is((logos_academy.claim_student_invitation(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('recovery-payload','sha256'))->>'state'),
  'claimed', 'initial claim has no Auth recovery state');
select is((logos_academy.bind_student_invitation_auth(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('recovery-payload','sha256'),
  md5('recovery-student-auth')::uuid, '2026-09-06 00:00:00+00'::timestamptz)->>'authUserId'), md5('recovery-student-auth')::uuid::text,
  'service adapter binds the Auth user to its claimed key');
select is((logos_academy.claim_student_invitation(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('recovery-payload','sha256'))->>'invitationSentAt'),
  '2026-09-06T00:00:00+00:00', 'retry retrieves the original sent timestamp before resending');
select lives_ok($$select logos_academy.bind_student_invitation_auth(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('recovery-payload','sha256'),
  md5('recovery-student-auth')::uuid, '2026-09-06 00:00:00+00'::timestamptz)$$, 'same binding is idempotent');
select throws_ok($$select logos_academy.bind_student_invitation_auth(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('recovery-payload','sha256'),
  md5('recovery-other-auth')::uuid, '2026-09-06 00:01:00+00'::timestamptz)$$,
  '23505', 'invitation auth binding mismatch', 'retry cannot replace Auth recovery state');
select throws_ok($$select logos_academy.claim_student_invitation(md5('recovery-tenant-a')::uuid, md5('recovery-admin-b')::uuid, 'recover-1', digest('recovery-payload','sha256'))$$,
  '42501', 'tenant admin required', 'tenant B actor is denied');
select throws_ok($$select logos_academy.bind_student_invitation_auth(md5('recovery-tenant-a')::uuid, md5('recovery-admin-a')::uuid, 'recover-1', digest('other-payload','sha256'),
  md5('recovery-student-auth')::uuid, '2026-09-06 00:00:00+00'::timestamptz)$$,
  '23505', 'idempotency key payload mismatch', 'different payload is denied');

reset role;
select * from finish();
rollback;
