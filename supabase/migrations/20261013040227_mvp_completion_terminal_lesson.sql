begin;

-- Terminal curricular lesson is ordered by cycle and local lesson position.
create or replace function private.completion_snapshot(p_enrollment_id uuid)
returns table(tenant_id uuid,attendance_complete boolean,projects_complete boolean,reflection_complete boolean,
  presentation_complete boolean,no_pending_revisions boolean,eligible boolean,blockers text[])
language sql stable security definer set search_path='' as $$
  with target as (
    select e.tenant_id,e.id,e.class_id,e.curriculum_id from logos_academy.enrollments e where e.id=p_enrollment_id and e.deleted_at is null
  ), relevant_sessions as (
    select s.tenant_id,s.id from logos_academy.sessions s join target t on t.tenant_id=s.tenant_id
    join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id
    join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
    where s.deleted_at is null and s.status='completed' and c.curriculum_id=t.curriculum_id
      and (s.enrollment_id=t.id or (t.class_id is not null and s.class_id=t.class_id))
  ), facts as (
    select t.tenant_id,
      ((select count(*) from relevant_sessions)=16 and
       (select count(*) from relevant_sessions rs where exists (
         select 1 from logos_academy.attendance_records ar where ar.tenant_id=rs.tenant_id and ar.session_id=rs.id and ar.enrollment_id=t.id
           and ar.deleted_at is null and (ar.status='present' or exists (
             select 1 from logos_academy.makeup_records mr left join logos_academy.sessions ms on ms.tenant_id=mr.tenant_id and ms.id=mr.makeup_session_id
             where mr.tenant_id=ar.tenant_id and mr.attendance_record_id=ar.id and mr.deleted_at is null
               and mr.completed_at<=now() and (mr.makeup_session_id is null or (ms.status='completed' and ms.deleted_at is null))))))=16) attendance_complete,
      ((select count(*) from logos_academy.project_records pr join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id
        where pr.tenant_id=t.tenant_id and pr.enrollment_id=t.id and pr.status='approved' and pr.deleted_at is null and c.curriculum_id=t.curriculum_id)=4) projects_complete,
      exists(select 1 from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id
        join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
        join logos_academy.cycles c on c.tenant_id=lt.tenant_id and c.id=lt.cycle_id
        where aa.tenant_id=t.tenant_id and aa.enrollment_id=t.id and aa.status='approved' and aa.deleted_at is null
          and c.curriculum_id=t.curriculum_id and lt.deleted_at is null and c.deleted_at is null
          and lt.id=(select final_lt.id from logos_academy.lesson_templates final_lt
            join logos_academy.cycles final_c on final_c.tenant_id=final_lt.tenant_id and final_c.id=final_lt.cycle_id
            where final_lt.tenant_id=t.tenant_id and final_c.curriculum_id=t.curriculum_id
              and final_lt.deleted_at is null and final_c.deleted_at is null
            order by final_c.position desc,final_lt.position desc,final_lt.id desc limit 1)) reflection_complete,
      exists(select 1 from logos_academy.presentation_records pr where pr.tenant_id=t.tenant_id and pr.enrollment_id=t.id and pr.deleted_at is null) presentation_complete,
      not exists(select 1 from logos_academy.activity_assignments aa where aa.tenant_id=t.tenant_id and aa.enrollment_id=t.id and aa.status='revision_requested' and aa.deleted_at is null) no_pending_revisions
    from target t
  )
  select f.*,(f.attendance_complete and f.projects_complete and f.reflection_complete and f.presentation_complete and f.no_pending_revisions),
    array_remove(array[case when not f.attendance_complete then 'attendance_incomplete' end,case when not f.projects_complete then 'projects_incomplete' end,
      case when not f.reflection_complete then 'reflection_incomplete' end,case when not f.presentation_complete then 'presentation_incomplete' end,
      case when not f.no_pending_revisions then 'pending_revisions' end],null) from facts f;
$$;

notify pgrst,'reload schema';
commit;
