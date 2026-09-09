begin;

create or replace function private.student_enrollment(
  p_tenant_id uuid, p_actor_user_id uuid, p_enrollment_id uuid
) returns logos_academy.enrollments language plpgsql security definer set search_path='' as $$
declare v logos_academy.enrollments%rowtype;
begin
  select e.* into v
  from logos_academy.enrollments e
  join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id and sp.deleted_at is null
  where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and e.deleted_at is null and sp.user_id=p_actor_user_id;
  if v.id is null then raise exception using errcode='42501', message='student enrollment required'; end if;
  return v;
end;
$$;

create or replace function private.ensure_enrollment_projects(p_tenant_id uuid, p_enrollment_id uuid)
returns void language sql security definer set search_path='' as $$
  insert into logos_academy.project_records(tenant_id,enrollment_id,cycle_id,status)
  select p_tenant_id,p_enrollment_id,c.id,'locked'
  from logos_academy.enrollments e
  join logos_academy.cycles c on c.tenant_id=e.tenant_id and c.curriculum_id=e.curriculum_id and c.deleted_at is null
  where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and e.deleted_at is null
  on conflict on constraint project_records_active_key do nothing;
$$;

create or replace function private.enrollment_projects_after_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.ensure_enrollment_projects(new.tenant_id,new.id);
  return new;
end;
$$;
drop trigger if exists enrollments_create_projects on logos_academy.enrollments;
create trigger enrollments_create_projects after insert on logos_academy.enrollments
for each row execute function private.enrollment_projects_after_insert();
select private.ensure_enrollment_projects(e.tenant_id,e.id) from logos_academy.enrollments e where e.deleted_at is null;

create or replace function private.sync_project_record_from_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_cycle_id uuid; v_is_project_day boolean; v_submission_id uuid;
begin
  if new.status is not distinct from old.status then return new; end if;
  select lt.cycle_id, lt.position=(select max(x.position) from logos_academy.lesson_templates x where x.tenant_id=lt.tenant_id and x.cycle_id=lt.cycle_id and x.deleted_at is null)
    into v_cycle_id,v_is_project_day
  from logos_academy.activity_templates at
  join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
  where at.tenant_id=new.tenant_id and at.id=new.activity_template_id;
  if v_cycle_id is null then return new; end if;
  perform private.ensure_enrollment_projects(new.tenant_id,new.enrollment_id);
  if new.status in ('available','draft','submitted','revision_requested','approved') then
    update logos_academy.project_records set status='in_progress'
    where tenant_id=new.tenant_id and enrollment_id=new.enrollment_id and cycle_id=v_cycle_id and status='locked' and deleted_at is null;
  end if;
  if new.status='approved' and v_is_project_day then
    select s.id into v_submission_id from logos_academy.submissions s
    where s.tenant_id=new.tenant_id and s.activity_assignment_id=new.id and not s.is_draft and s.deleted_at is null
    order by s.submitted_at desc, s.id desc limit 1;
    if v_submission_id is not null then
      perform set_config('app.project_evidence','on',true);
      update logos_academy.project_records set status='approved',approved_submission_id=v_submission_id,approved_at=now()
      where tenant_id=new.tenant_id and enrollment_id=new.enrollment_id and cycle_id=v_cycle_id and deleted_at is null and status<>'approved';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists activity_assignments_sync_project on logos_academy.activity_assignments;
create trigger activity_assignments_sync_project after update of status on logos_academy.activity_assignments
for each row execute function private.sync_project_record_from_assignment();

create or replace function private.project_summary_json(p_tenant_id uuid,p_enrollment_id uuid,p_cycle_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',pr.id,'cyclePosition',c.position,'title',c.project_title,'status',pr.status,'approvedAt',pr.approved_at,
    'completedActivityCount',(select count(*) from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.status='approved' and aa.deleted_at is null),
    'activityCount',(select count(*) from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null)
  ) from logos_academy.project_records pr join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id
  where pr.tenant_id=p_tenant_id and pr.enrollment_id=p_enrollment_id and pr.cycle_id=p_cycle_id and pr.deleted_at is null;
$$;

create or replace function private.project_detail_json(p_tenant_id uuid,p_project_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.project_summary_json(pr.tenant_id,pr.enrollment_id,pr.cycle_id) || jsonb_build_object('activities',coalesce((
    select jsonb_agg(jsonb_build_object('assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'status',aa.status,'latestVersion',(select max(s.version) from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null)) order by lt.position)
    from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
    where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null
  ),'[]'::jsonb))
  from logos_academy.project_records pr where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
$$;

create or replace function logos_academy.student_projects(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment logos_academy.enrollments%rowtype;
begin
  if p_enrollment_id is null then
    select e.* into v_enrollment from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id where e.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and e.deleted_at is null and sp.deleted_at is null order by (e.status='active') desc,e.created_at desc limit 1;
    if v_enrollment.id is null then raise exception using errcode='42501',message='student enrollment required'; end if;
  else v_enrollment:=private.student_enrollment(p_tenant_id,p_actor_user_id,p_enrollment_id); end if;
  perform private.ensure_enrollment_projects(p_tenant_id,v_enrollment.id);
  return coalesce((select jsonb_agg(private.project_summary_json(p_tenant_id,pr.enrollment_id,pr.cycle_id) order by c.position) from logos_academy.project_records pr join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id where pr.tenant_id=p_tenant_id and pr.enrollment_id=v_enrollment.id and pr.deleted_at is null),'[]'::jsonb);
end;
$$;

create or replace function logos_academy.student_project_detail(p_tenant_id uuid,p_actor_user_id uuid,p_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment uuid; v jsonb;
begin
  select pr.enrollment_id into v_enrollment from logos_academy.project_records pr where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
  perform private.student_enrollment(p_tenant_id,p_actor_user_id,v_enrollment);
  select private.project_detail_json(p_tenant_id,p_project_id) into v;
  if v is null then raise exception using errcode='42501',message='project unavailable'; end if;
  return v;
end;
$$;

create or replace function logos_academy.student_portfolio_page(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid default null,p_cursor text default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_items jsonb; v_next text;
begin
  if p_enrollment_id is not null then perform private.student_enrollment(p_tenant_id,p_actor_user_id,p_enrollment_id); end if;
  with rows as (select pr.id,pr.approved_at from logos_academy.project_records pr join logos_academy.enrollments e on e.tenant_id=pr.tenant_id and e.id=pr.enrollment_id join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id where pr.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and pr.status='approved' and pr.deleted_at is null and e.deleted_at is null and sp.deleted_at is null and (p_enrollment_id is null or pr.enrollment_id=p_enrollment_id) and (v_cursor is null or (pr.approved_at,pr.id)<((v_cursor->>0)::timestamptz,(v_cursor->>1)::uuid)) order by pr.approved_at desc,pr.id desc limit p_limit+1), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), page_tail as(select * from page offset greatest(p_limit-1,0) limit 1)
  select coalesce(jsonb_agg(private.project_detail_json(p_tenant_id,id) order by approved_at desc,id desc),'[]'::jsonb),(select case when exists(select 1 from tail) then encode(convert_to(jsonb_build_array(approved_at,id)::text,'utf8'),'base64') end from page_tail) into v_items,v_next from page;
  return jsonb_build_object('items',v_items,'nextCursor',v_next);
end;
$$;

create or replace function logos_academy.admin_completion_check(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v record;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v from private.completion_snapshot(p_enrollment_id) where tenant_id=p_tenant_id;
  if not found then raise exception using errcode='P0002',message='enrollment not found'; end if;
  return jsonb_build_object('enrollmentId',p_enrollment_id,'attendanceComplete',v.attendance_complete,'projectsComplete',v.projects_complete,'reflectionComplete',v.reflection_complete,'presentationComplete',v.presentation_complete,'noPendingRevisions',v.no_pending_revisions,'eligible',v.eligible,'blockers',to_jsonb(v.blockers));
end;
$$;

create or replace function logos_academy.admin_record_presentation(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_kind text,p_performed_at timestamptz,p_contextual_note text,p_encryption_key text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if not exists(select 1 from logos_academy.enrollments e where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and e.deleted_at is null) then raise exception using errcode='P0002',message='enrollment not found'; end if;
  return logos_academy.record_presentation(p_actor_user_id,p_enrollment_id,p_kind,p_performed_at,p_contextual_note,p_encryption_key,p_request_id);
end;
$$;

create or replace function logos_academy.admin_complete_enrollment(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v record;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v from private.completion_snapshot(p_enrollment_id) where tenant_id=p_tenant_id;
  if not found then raise exception using errcode='P0002',message='enrollment not found'; end if;
  if not v.eligible then return logos_academy.admin_completion_check(p_tenant_id,p_actor_user_id,p_enrollment_id); end if;
  if not exists(select 1 from logos_academy.enrollments e where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and e.status='active' and e.deleted_at is null) then raise exception using errcode='23505',message='enrollment is not active'; end if;
  perform set_config('app.complete_enrollment','on',true);
  insert into logos_academy.completion_records(tenant_id,enrollment_id,status,attendance_complete,projects_complete,reflection_complete,presentation_complete,no_pending_revisions,completed_at) values(p_tenant_id,p_enrollment_id,'completed',true,true,true,true,true,now()) on conflict on constraint completion_records_active_key do update set status='completed',attendance_complete=true,projects_complete=true,reflection_complete=true,presentation_complete=true,no_pending_revisions=true,completed_at=coalesce(logos_academy.completion_records.completed_at,excluded.completed_at);
  update logos_academy.enrollments set status='completed',completed_at=coalesce(completed_at,now()) where tenant_id=p_tenant_id and id=p_enrollment_id;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata) values(p_tenant_id,p_actor_user_id,'enrollment.completed','enrollment',p_enrollment_id,p_request_id,'{}');
  return logos_academy.admin_completion_check(p_tenant_id,p_actor_user_id,p_enrollment_id);
end;
$$;

revoke all on function private.student_enrollment(uuid,uuid,uuid),private.ensure_enrollment_projects(uuid,uuid),private.enrollment_projects_after_insert(),private.sync_project_record_from_assignment(),private.project_summary_json(uuid,uuid,uuid),private.project_detail_json(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function logos_academy.student_projects(uuid,uuid,uuid),logos_academy.student_project_detail(uuid,uuid,uuid),logos_academy.student_portfolio_page(uuid,uuid,uuid,text,integer),logos_academy.admin_completion_check(uuid,uuid,uuid),logos_academy.admin_record_presentation(uuid,uuid,uuid,text,timestamptz,text,text,uuid),logos_academy.admin_complete_enrollment(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_projects(uuid,uuid,uuid),logos_academy.student_project_detail(uuid,uuid,uuid),logos_academy.student_portfolio_page(uuid,uuid,uuid,text,integer),logos_academy.admin_completion_check(uuid,uuid,uuid),logos_academy.admin_record_presentation(uuid,uuid,uuid,text,timestamptz,text,text,uuid),logos_academy.admin_complete_enrollment(uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
