begin;

create or replace function logos_academy.admin_dashboard(p_tenant_id uuid,p_actor_user_id uuid,p_encryption_key text,p_class_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if length(coalesce(p_encryption_key,''))=0 then raise exception using errcode='22023',message='encryption key required'; end if;
  if p_class_id is not null and not exists(select 1 from logos_academy.classes c where c.tenant_id=p_tenant_id and c.id=p_class_id and c.deleted_at is null) then raise exception using errcode='42501',message='class unavailable'; end if;
  with scope as (select e.id,e.student_profile_id from logos_academy.enrollments e where e.tenant_id=p_tenant_id and e.deleted_at is null and (p_class_id is null or e.class_id=p_class_id)), rates as (select count(*) filter(where r.decision='approved') approved,count(*) total from logos_academy.reviews r join logos_academy.submissions s on s.tenant_id=r.tenant_id and s.id=r.submission_id join logos_academy.activity_assignments aa on aa.tenant_id=s.tenant_id and aa.id=s.activity_assignment_id join scope sc on sc.id=aa.enrollment_id where r.tenant_id=p_tenant_id and r.deleted_at is null and s.deleted_at is null)
  select jsonb_build_object(
    'awaitingReviewCount',(select count(*) from logos_academy.activity_assignments aa join scope sc on sc.id=aa.enrollment_id where aa.tenant_id=p_tenant_id and aa.status='submitted' and aa.deleted_at is null),
    'feedbackDueSoonCount',(select count(*) from logos_academy.submissions s join logos_academy.activity_assignments aa on aa.tenant_id=s.tenant_id and aa.id=s.activity_assignment_id join scope sc on sc.id=aa.enrollment_id where s.tenant_id=p_tenant_id and not s.is_draft and aa.status='submitted' and s.submitted_at<=now()-interval '46 hours' and s.deleted_at is null),
    'overdueAssignmentCount',(select count(*) from logos_academy.activity_assignments aa join scope sc on sc.id=aa.enrollment_id where aa.tenant_id=p_tenant_id and aa.due_at<now() and aa.status in ('available','draft','revision_requested') and aa.deleted_at is null),
    'pendingMakeupCount',(select count(*) from logos_academy.attendance_records ar join scope sc on sc.id=ar.enrollment_id where ar.tenant_id=p_tenant_id and ar.status='absent' and ar.deleted_at is null and not exists(select 1 from logos_academy.makeup_records mr where mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null and mr.completed_at<=now())),
    'deliveryApprovalRate',case when rates.total=0 then 0 else round((rates.approved::numeric/rates.total)*100,2) end,
    'upcomingSessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'lessonPosition',lt.position,'lessonTitle',lt.title,'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status) order by s.starts_at) from (select s.* from logos_academy.sessions s where s.tenant_id=p_tenant_id and s.deleted_at is null and s.status='scheduled' and s.starts_at>=now() and (p_class_id is null or s.class_id=p_class_id) order by s.starts_at limit 5) s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id),'[]'::jsonb),
    'studentsAtRisk',coalesce((select jsonb_agg(jsonb_build_object('id',sp.id,'displayName',u.display_name,'email',extensions.pgp_sym_decrypt(u.email_encrypted,p_encryption_key),'githubUsername',sp.github_username,'activeEnrollmentCount',x.active,'pendingAssignmentCount',x.pending,'pendingMakeupCount',x.makeups) order by u.display_name) from (select sc.student_profile_id,count(*) filter(where e.status='active') active,count(aa.id) filter(where aa.due_at<now() and aa.status in ('available','draft','revision_requested')) pending,count(ar.id) filter(where ar.status='absent' and not exists(select 1 from logos_academy.makeup_records mr where mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null and mr.completed_at<=now())) makeups from scope sc join logos_academy.enrollments e on e.tenant_id=p_tenant_id and e.student_profile_id=sc.student_profile_id and e.deleted_at is null left join logos_academy.activity_assignments aa on aa.tenant_id=e.tenant_id and aa.enrollment_id=e.id and aa.deleted_at is null left join logos_academy.attendance_records ar on ar.tenant_id=e.tenant_id and ar.enrollment_id=e.id and ar.deleted_at is null group by sc.student_profile_id) x join logos_academy.student_profiles sp on sp.tenant_id=p_tenant_id and sp.id=x.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id where x.pending>0 or x.makeups>0 limit 10),'[]'::jsonb)
  ) into v from rates;
  return v;
end;
$$;
revoke all on function logos_academy.admin_dashboard(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function logos_academy.admin_dashboard(uuid,uuid,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
