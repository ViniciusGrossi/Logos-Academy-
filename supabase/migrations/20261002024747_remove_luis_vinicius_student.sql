begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table target_users on commit drop as
select u.tenant_id, u.id, u.auth_user_id
from logos_academy.users u
join logos_academy.tenant_memberships tm
  on tm.tenant_id = u.tenant_id and tm.user_id = u.id
where u.deleted_at is null
  and tm.deleted_at is null
  and tm.role = 'student'
  and lower(u.display_name) like 'luis vinicius sabino%';

create temp table target_auth_users on commit drop as
select distinct auth_user_id as id
from target_users;

do $$
begin
  if (select count(*) from target_users) <> 1 then
    raise exception 'expected exactly one matching Academy student';
  end if;

  if exists (
    select 1 from storage.objects o join target_auth_users t on t.id::text = o.owner_id
  ) or exists (
    select 1 from public.profiles p join target_auth_users t on t.id = p.id
  ) or exists (
    select 1 from delphi.tenants d join target_auth_users t on t.id = d.auth_user_id
  ) or exists (
    select 1 from iris.tenant_members m join target_auth_users t on t.id = m.user_id
  ) then
    raise exception 'refusing to delete student with external references';
  end if;
end;
$$;

create temp table target_students on commit drop as
select sp.tenant_id, sp.id
from logos_academy.student_profiles sp
join target_users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id;

create temp table target_guardians on commit drop as
select gr.tenant_id, gr.id
from logos_academy.guardian_records gr
join target_students sp on sp.tenant_id = gr.tenant_id and sp.id = gr.student_profile_id;

create temp table target_enrollments on commit drop as
select e.tenant_id, e.id
from logos_academy.enrollments e
join target_students sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id;

create temp table target_assignments on commit drop as
select aa.tenant_id, aa.id
from logos_academy.activity_assignments aa
join target_enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id;

create temp table target_submissions on commit drop as
select s.tenant_id, s.id
from logos_academy.submissions s
join target_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id;

create temp table target_reviews on commit drop as
select r.tenant_id, r.id
from logos_academy.reviews r
where exists (select 1 from target_submissions s where s.tenant_id = r.tenant_id and s.id = r.submission_id)
   or exists (select 1 from target_users u where u.tenant_id = r.tenant_id and u.id = r.reviewer_user_id);

create temp table target_attendance on commit drop as
select ar.tenant_id, ar.id
from logos_academy.attendance_records ar
where exists (select 1 from target_enrollments e where e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id)
   or exists (select 1 from target_users u where u.tenant_id = ar.tenant_id and u.id = ar.recorded_by_user_id);

alter table logos_academy.reviews disable trigger reviews_immutable;
alter table logos_academy.criterion_reviews disable trigger criterion_reviews_immutable;
alter table logos_academy.feedback_receipts disable trigger feedback_receipts_immutable;
alter table logos_academy.presentation_records disable trigger presentation_records_immutable;
alter table logos_academy.completion_records disable trigger completion_records_immutable;
alter table logos_academy.submission_items disable trigger submission_items_immutable;
alter table logos_academy.submissions disable trigger submissions_immutable;

delete from logos_academy.attendance_private_notes apn
where exists (select 1 from target_attendance ar where ar.tenant_id = apn.tenant_id and ar.id = apn.attendance_record_id)
   or exists (select 1 from target_users u where u.tenant_id = apn.tenant_id and u.id = apn.recorded_by_user_id);

delete from logos_academy.makeup_records mr
where exists (select 1 from target_attendance ar where ar.tenant_id = mr.tenant_id and ar.id = mr.attendance_record_id)
   or exists (select 1 from target_users u where u.tenant_id = mr.tenant_id and u.id = mr.recorded_by_user_id);

delete from logos_academy.attendance_records ar
using target_attendance ta
where ar.tenant_id = ta.tenant_id and ar.id = ta.id;

delete from logos_academy.feedback_receipts fr
where exists (select 1 from target_reviews r where r.tenant_id = fr.tenant_id and r.id = fr.review_id)
   or exists (select 1 from target_students sp where sp.tenant_id = fr.tenant_id and sp.id = fr.student_profile_id);

delete from logos_academy.criterion_reviews cr
using target_reviews r
where cr.tenant_id = r.tenant_id and cr.review_id = r.id;

delete from logos_academy.project_records pr
where exists (select 1 from target_enrollments e where e.tenant_id = pr.tenant_id and e.id = pr.enrollment_id)
   or exists (select 1 from target_submissions s where s.tenant_id = pr.tenant_id and s.id = pr.approved_submission_id);

delete from logos_academy.reviews r
using target_reviews tr
where r.tenant_id = tr.tenant_id and r.id = tr.id;

delete from logos_academy.submission_items si
using target_submissions s
where si.tenant_id = s.tenant_id and si.submission_id = s.id;

delete from logos_academy.uploaded_files uf
where exists (select 1 from target_assignments aa where aa.tenant_id = uf.tenant_id and aa.id = uf.activity_assignment_id)
   or exists (select 1 from target_students sp where sp.tenant_id = uf.tenant_id and sp.id = uf.student_profile_id)
   or exists (select 1 from target_users u where u.tenant_id = uf.tenant_id and u.id = uf.uploaded_by_user_id);

delete from logos_academy.submissions s
using target_submissions ts
where s.tenant_id = ts.tenant_id and s.id = ts.id;

delete from logos_academy.activity_assignments aa
using target_assignments ta
where aa.tenant_id = ta.tenant_id and aa.id = ta.id;

delete from logos_academy.sessions s
using target_enrollments e
where s.tenant_id = e.tenant_id and s.enrollment_id = e.id;

delete from logos_academy.completion_records cr
using target_enrollments e
where cr.tenant_id = e.tenant_id and cr.enrollment_id = e.id;

delete from logos_academy.presentation_records pr
where exists (select 1 from target_enrollments e where e.tenant_id = pr.tenant_id and e.id = pr.enrollment_id)
   or exists (select 1 from target_users u where u.tenant_id = pr.tenant_id and u.id = pr.recorded_by_user_id);

delete from logos_academy.enrollments e
using target_enrollments te
where e.tenant_id = te.tenant_id and e.id = te.id;

delete from logos_academy.consent_records cr
where exists (select 1 from target_students sp where sp.tenant_id = cr.tenant_id and sp.id = cr.student_profile_id)
   or exists (select 1 from target_guardians gr where gr.tenant_id = cr.tenant_id and gr.id = cr.guardian_record_id)
   or exists (select 1 from target_users u where u.tenant_id = cr.tenant_id and u.id = cr.verified_by_user_id);

delete from logos_academy.guardian_records gr
using target_guardians tg
where gr.tenant_id = tg.tenant_id and gr.id = tg.id;

delete from logos_academy.student_profiles sp
using target_students ts
where sp.tenant_id = ts.tenant_id and sp.id = ts.id;

delete from logos_academy.audit_events ae
using target_users u
where ae.tenant_id = u.tenant_id and ae.actor_user_id = u.id;

delete from logos_academy.idempotency_keys ik
using target_auth_users t
where ik.auth_user_id = t.id;

delete from logos_academy.tenant_memberships tm
using target_users u
where tm.tenant_id = u.tenant_id and tm.user_id = u.id;

delete from logos_academy.users u
using target_users tu
where u.tenant_id = tu.tenant_id and u.id = tu.id;

delete from auth.sessions s
using target_auth_users t
where s.user_id = t.id;

delete from auth.users u
using target_auth_users t
where u.id = t.id;

alter table logos_academy.submissions enable trigger submissions_immutable;
alter table logos_academy.submission_items enable trigger submission_items_immutable;
alter table logos_academy.completion_records enable trigger completion_records_immutable;
alter table logos_academy.presentation_records enable trigger presentation_records_immutable;
alter table logos_academy.feedback_receipts enable trigger feedback_receipts_immutable;
alter table logos_academy.criterion_reviews enable trigger criterion_reviews_immutable;
alter table logos_academy.reviews enable trigger reviews_immutable;

notify pgrst, 'reload schema';

commit;
