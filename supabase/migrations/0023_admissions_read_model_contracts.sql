begin;

-- Keep the read RPCs aligned with the public DTOs while preserving the
-- service-role-only boundary established in 0019.
create or replace function logos_academy.admin_student_detail(p_tenant_id uuid,p_actor_user_id uuid,p_student_profile_id uuid,p_encryption_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if length(p_encryption_key)=0 then raise exception using errcode='22023',message='encryption key required'; end if;
  select jsonb_build_object(
    'student',jsonb_build_object(
      'id',sp.id,'displayName',u.display_name,'email',extensions.pgp_sym_decrypt(u.email_encrypted,p_encryption_key),'githubUsername',sp.github_username,
      'activeEnrollmentCount',(select count(*) from logos_academy.enrollments e where e.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and e.status='active' and e.deleted_at is null),
      'pendingAssignmentCount',(select count(*) from logos_academy.activity_assignments aa join logos_academy.enrollments e on e.tenant_id=aa.tenant_id and e.id=aa.enrollment_id where aa.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and aa.status in ('available','draft','submitted','revision_requested') and aa.deleted_at is null and e.deleted_at is null),
      'pendingMakeupCount',(select count(*) from logos_academy.attendance_records ar join logos_academy.enrollments e on e.tenant_id=ar.tenant_id and e.id=ar.enrollment_id left join logos_academy.makeup_records mr on mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null where ar.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and ar.status in ('absent','excused_absence') and ar.deleted_at is null and e.deleted_at is null and mr.id is null)
    ),
    'guardian',(select jsonb_build_object('id',g.id,'name',extensions.pgp_sym_decrypt(g.name_encrypted,p_encryption_key),'relationship',g.relationship,'email',case when g.email_encrypted is null then null else extensions.pgp_sym_decrypt(g.email_encrypted,p_encryption_key) end,'phone',case when g.phone_encrypted is null then null else extensions.pgp_sym_decrypt(g.phone_encrypted,p_encryption_key) end) from logos_academy.guardian_records g where g.tenant_id=sp.tenant_id and g.student_profile_id=sp.id and g.deleted_at is null order by g.created_at desc limit 1),
    'consent',(select jsonb_build_object('id',c.id,'status',c.status,'termVersion',c.term_version,'signedAt',c.signed_at,'physicalCopyArchived',c.physical_copy_archived,'verifiedAt',c.verified_at,'revokedAt',c.revoked_at,'revocationReason',case when c.revocation_reason_encrypted is null then null else extensions.pgp_sym_decrypt(c.revocation_reason_encrypted,p_encryption_key) end) from logos_academy.consent_records c where c.tenant_id=sp.tenant_id and c.student_profile_id=sp.id and c.deleted_at is null),
    'enrollments',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',e.student_profile_id,'studentName',u.display_name,'curriculumName',cu.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at) order by e.created_at desc),'[]'::jsonb) from logos_academy.enrollments e join logos_academy.curricula cu on cu.tenant_id=e.tenant_id and cu.id=e.curriculum_id where e.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and e.deleted_at is null),
    'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',pr.id,'cyclePosition',cy.position,'title',cy.project_title,'status',pr.status,'approvedAt',pr.approved_at,'completedActivityCount',(select count(*) from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.status='approved' and aa.deleted_at is null and at.deleted_at is null and lt.deleted_at is null),'activityCount',(select count(*) from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null and at.deleted_at is null and lt.deleted_at is null)) order by cy.position),'[]'::jsonb) from logos_academy.project_records pr join logos_academy.cycles cy on cy.tenant_id=pr.tenant_id and cy.id=pr.cycle_id join logos_academy.enrollments e on e.tenant_id=pr.tenant_id and e.id=pr.enrollment_id where pr.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and pr.deleted_at is null)
  ) into v
  from logos_academy.student_profiles sp join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id
  where sp.tenant_id=p_tenant_id and sp.id=p_student_profile_id and sp.deleted_at is null;
  if v is null then raise exception using errcode='P0002',message='student profile not found'; end if;
  return v;
end; $$;

create or replace function logos_academy.admin_class_detail(p_tenant_id uuid,p_actor_user_id uuid,p_class_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select jsonb_build_object('class',jsonb_build_object('id',c.id,'name',c.name,'curriculumName',cu.name,'startsOn',c.starts_on,'status',c.status,'activeStudentCount',(select count(*) from logos_academy.enrollments e where e.tenant_id=c.tenant_id and e.class_id=c.id and e.status in ('invited','active','paused') and e.deleted_at is null)),'enrollments',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',e.student_profile_id,'studentName',u.display_name,'curriculumName',cu2.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at) order by u.display_name),'[]'::jsonb) from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id join logos_academy.curricula cu2 on cu2.tenant_id=e.tenant_id and cu2.id=e.curriculum_id where e.tenant_id=c.tenant_id and e.class_id=c.id and e.deleted_at is null),'sessions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lessonPosition',q.global_position,'lessonTitle',q.title,'startsAt',q.starts_at,'endsAt',q.ends_at,'status',q.status) order by q.starts_at),'[]'::jsonb) from (select s.id,s.starts_at,s.ends_at,s.status,lt.title,row_number() over(order by cy.position,lt.position)::integer global_position from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles cy on cy.tenant_id=lt.tenant_id and cy.id=lt.cycle_id where s.tenant_id=c.tenant_id and s.class_id=c.id and s.deleted_at is null) q)) into v from logos_academy.classes c join logos_academy.curricula cu on cu.tenant_id=c.tenant_id and cu.id=c.curriculum_id where c.tenant_id=p_tenant_id and c.id=p_class_id and c.deleted_at is null;
  if v is null then raise exception using errcode='P0002',message='class not found'; end if;
  return v;
end; $$;

create or replace function logos_academy.student_calendar(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_from date default null,p_to date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  if not exists(select 1 from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and sp.user_id=p_actor_user_id and e.deleted_at is null and sp.deleted_at is null) then raise exception using errcode='42501',message='student enrollment required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lessonPosition',q.global_position,'lessonTitle',q.title,'startsAt',q.starts_at,'endsAt',q.ends_at,'status',q.status) order by q.starts_at),'[]'::jsonb) into v from (select s.id,s.starts_at,s.ends_at,s.status,lt.title,row_number() over(order by cy.position,lt.position)::integer global_position from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.cycles cy on cy.tenant_id=lt.tenant_id and cy.id=lt.cycle_id join logos_academy.enrollments e on e.tenant_id=s.tenant_id and e.id=p_enrollment_id where s.tenant_id=p_tenant_id and s.deleted_at is null and ((e.class_id is not null and s.class_id=e.class_id) or s.enrollment_id=e.id) and (p_from is null or s.starts_at>=p_from) and (p_to is null or s.starts_at<p_to+1)) q;
  return v;
end; $$;

revoke all on function logos_academy.admin_student_detail(uuid,uuid,uuid,text),logos_academy.admin_class_detail(uuid,uuid,uuid),logos_academy.student_calendar(uuid,uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function logos_academy.admin_student_detail(uuid,uuid,uuid,text),logos_academy.admin_class_detail(uuid,uuid,uuid),logos_academy.student_calendar(uuid,uuid,uuid,date,date) to service_role;
notify pgrst,'reload schema';
commit;
