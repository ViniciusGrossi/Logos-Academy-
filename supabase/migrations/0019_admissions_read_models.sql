begin;

create or replace function private.admissions_page(p_cursor text, p_limit integer)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v jsonb;
begin
  if p_limit not between 1 and 100 then raise exception using errcode='22023', message='invalid page limit'; end if;
  if p_cursor is null then return null; end if;
  begin v := convert_from(decode(p_cursor, 'base64'), 'utf8')::jsonb; exception when others then raise exception using errcode='22023', message='invalid cursor'; end;
  if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 3 then raise exception using errcode='22023', message='invalid cursor'; end if;
  return v;
end;
$$;

create or replace function logos_academy.admin_list_students(p_tenant_id uuid,p_actor_user_id uuid,p_encryption_key text,p_search text default null,p_class_id uuid default null,p_cursor text default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb := private.admissions_page(p_cursor,p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if length(p_encryption_key)=0 then raise exception using errcode='22023',message='encryption key required'; end if;
  with rows as (
    select sp.id,u.display_name,u.email_encrypted,u.created_at,
      count(distinct e.id) filter(where e.status in ('invited','active','paused'))::int active_count,
      count(distinct aa.id) filter(where aa.status in ('available','draft','submitted','revision_requested'))::int pending_count
    from logos_academy.student_profiles sp join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id
    left join logos_academy.enrollments e on e.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and e.deleted_at is null
    left join logos_academy.activity_assignments aa on aa.tenant_id=e.tenant_id and aa.enrollment_id=e.id and aa.deleted_at is null
    where sp.tenant_id=p_tenant_id and sp.deleted_at is null and u.deleted_at is null
      and (p_class_id is null or exists(select 1 from logos_academy.enrollments ce where ce.tenant_id=sp.tenant_id and ce.student_profile_id=sp.id and ce.class_id=p_class_id and ce.deleted_at is null))
      and (coalesce(btrim(p_search),'')='' or u.display_name ilike '%'||btrim(p_search)||'%' or extensions.pgp_sym_decrypt(u.email_encrypted,p_encryption_key) ilike '%'||btrim(p_search)||'%')
      and (v_cursor is null or (u.display_name,u.created_at,sp.id) > (v_cursor->>0,(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid))
    group by sp.id,u.display_name,u.email_encrypted,u.created_at order by u.display_name,u.created_at,sp.id limit p_limit+1
  ), page as (select * from rows limit p_limit), tail as (select * from rows offset p_limit limit 1)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'displayName',display_name,'email',extensions.pgp_sym_decrypt(email_encrypted,p_encryption_key),'githubUsername',null,'activeEnrollmentCount',active_count,'pendingAssignmentCount',pending_count,'pendingMakeupCount',0) order by display_name,created_at,id),'[]'::jsonb),
    (select encode(convert_to(jsonb_build_array(display_name,created_at,id)::text,'utf8'),'base64') from tail) into v_items,v_next from page;
  return jsonb_build_object('items',v_items,'nextCursor',v_next);
end; $$;

create or replace function logos_academy.admin_student_detail(p_tenant_id uuid,p_actor_user_id uuid,p_student_profile_id uuid,p_encryption_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
 perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id); if length(p_encryption_key)=0 then raise exception using errcode='22023',message='encryption key required'; end if;
 select jsonb_build_object(
  'student',jsonb_build_object('id',sp.id,'displayName',u.display_name,'email',extensions.pgp_sym_decrypt(u.email_encrypted,p_encryption_key),'githubUsername',sp.github_username),
  'guardian',(select jsonb_build_object('id',g.id,'name',extensions.pgp_sym_decrypt(g.name_encrypted,p_encryption_key),'relationship',g.relationship,'email',case when g.email_encrypted is null then null else extensions.pgp_sym_decrypt(g.email_encrypted,p_encryption_key) end,'phone',case when g.phone_encrypted is null then null else extensions.pgp_sym_decrypt(g.phone_encrypted,p_encryption_key) end) from logos_academy.guardian_records g where g.tenant_id=sp.tenant_id and g.student_profile_id=sp.id and g.deleted_at is null order by g.created_at desc limit 1),
  'consent',(select jsonb_build_object('id',c.id,'status',c.status,'termVersion',c.term_version,'signedAt',c.signed_at,'physicalCopyArchived',c.physical_copy_archived,'verifiedAt',c.verified_at,'revokedAt',c.revoked_at,'revocationReason',case when c.revocation_reason_encrypted is null then null else extensions.pgp_sym_decrypt(c.revocation_reason_encrypted,p_encryption_key) end) from logos_academy.consent_records c where c.tenant_id=sp.tenant_id and c.student_profile_id=sp.id and c.deleted_at is null),
  'enrollments',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',e.student_profile_id,'studentName',u.display_name,'curriculumName',cu.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at) order by e.created_at desc),'[]'::jsonb) from logos_academy.enrollments e join logos_academy.curricula cu on cu.tenant_id=e.tenant_id and cu.id=e.curriculum_id where e.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and e.deleted_at is null),
  'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',pr.id,'cyclePosition',cy.position,'title',cy.project_title,'status',pr.status,'approvedAt',pr.approved_at) order by cy.position),'[]'::jsonb) from logos_academy.project_records pr join logos_academy.cycles cy on cy.tenant_id=pr.tenant_id and cy.id=pr.cycle_id join logos_academy.enrollments e on e.tenant_id=pr.tenant_id and e.id=pr.enrollment_id where pr.tenant_id=sp.tenant_id and e.student_profile_id=sp.id and pr.deleted_at is null)
 ) into v from logos_academy.student_profiles sp join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id where sp.tenant_id=p_tenant_id and sp.id=p_student_profile_id and sp.deleted_at is null;
 if v is null then raise exception using errcode='P0002',message='student profile not found'; end if; return v;
end; $$;

create or replace function logos_academy.admin_list_classes(p_tenant_id uuid,p_actor_user_id uuid,p_status text default null,p_cursor text default null,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb:=private.admissions_page(p_cursor,p_limit); v_items jsonb; v_next text;
begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
 with rows as (select c.id,c.name,c.starts_on,c.status,c.created_at,cu.name curriculum_name,count(e.id) filter(where e.status in ('invited','active','paused'))::int student_count from logos_academy.classes c join logos_academy.curricula cu on cu.tenant_id=c.tenant_id and cu.id=c.curriculum_id left join logos_academy.enrollments e on e.tenant_id=c.tenant_id and e.class_id=c.id and e.deleted_at is null where c.tenant_id=p_tenant_id and c.deleted_at is null and (p_status is null or c.status=p_status) and (v_cursor is null or (c.name,c.created_at,c.id)>(v_cursor->>0,(v_cursor->>1)::timestamptz,(v_cursor->>2)::uuid)) group by c.id,cu.name order by c.name,c.created_at,c.id limit p_limit+1), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'curriculumName',curriculum_name,'startsOn',starts_on,'status',status,'activeStudentCount',student_count) order by name,created_at,id),'[]'::jsonb),(select encode(convert_to(jsonb_build_array(name,created_at,id)::text,'utf8'),'base64') from tail) into v_items,v_next from page;
 return jsonb_build_object('items',v_items,'nextCursor',v_next); end; $$;

create or replace function logos_academy.admin_class_detail(p_tenant_id uuid,p_actor_user_id uuid,p_class_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
 select jsonb_build_object('class',jsonb_build_object('id',c.id,'name',c.name,'curriculumName',cu.name,'startsOn',c.starts_on,'status',c.status,'activeStudentCount',(select count(*) from logos_academy.enrollments e where e.tenant_id=c.tenant_id and e.class_id=c.id and e.status in ('invited','active','paused') and e.deleted_at is null)),'enrollments',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'studentId',e.student_profile_id,'studentName',u.display_name,'curriculumName',cu2.name,'kind',e.kind,'classId',e.class_id,'status',e.status,'activatedAt',e.activated_at,'completedAt',e.completed_at) order by u.display_name),'[]'::jsonb) from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id join logos_academy.users u on u.tenant_id=sp.tenant_id and u.id=sp.user_id join logos_academy.curricula cu2 on cu2.tenant_id=e.tenant_id and cu2.id=e.curriculum_id where e.tenant_id=c.tenant_id and e.class_id=c.id and e.deleted_at is null),'sessions',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'lessonPosition',lt.position,'lessonTitle',lt.title,'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status) order by s.starts_at),'[]'::jsonb) from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id where s.tenant_id=c.tenant_id and s.class_id=c.id and s.deleted_at is null)) into v from logos_academy.classes c join logos_academy.curricula cu on cu.tenant_id=c.tenant_id and cu.id=c.curriculum_id where c.tenant_id=p_tenant_id and c.id=p_class_id and c.deleted_at is null; if v is null then raise exception using errcode='P0002',message='class not found'; end if; return v; end; $$;

create or replace function logos_academy.admin_update_class(p_tenant_id uuid,p_actor_user_id uuid,p_class_id uuid,p_name text default null,p_status text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v logos_academy.classes%rowtype; begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id); if p_name is null and p_status is null then raise exception using errcode='22023',message='empty class update'; end if; if p_name is not null and length(btrim(p_name)) not between 1 and 120 then raise exception using errcode='22023',message='invalid class name'; end if; if p_status is not null and p_status not in ('planned','active','completed','cancelled') then raise exception using errcode='22023',message='invalid class status'; end if; update logos_academy.classes set name=coalesce(btrim(p_name),name),status=coalesce(p_status,status) where tenant_id=p_tenant_id and id=p_class_id and deleted_at is null returning * into v; if not found then raise exception using errcode='P0002',message='class not found'; end if; return jsonb_build_object('id',v.id,'name',v.name,'startsOn',v.starts_on,'status',v.status); end; $$;

create or replace function logos_academy.admin_update_enrollment(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v logos_academy.enrollments%rowtype; begin perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id); if p_status not in ('invited','active','paused','cancelled') then raise exception using errcode='22023',message='invalid enrollment status'; end if; update logos_academy.enrollments set status=p_status,activated_at=case when p_status in ('active','paused') then coalesce(activated_at,now()) else activated_at end where tenant_id=p_tenant_id and id=p_enrollment_id and deleted_at is null returning * into v; if not found then raise exception using errcode='P0002',message='enrollment not found'; end if; return jsonb_build_object('id',v.id,'status',v.status,'activatedAt',v.activated_at,'completedAt',v.completed_at); end; $$;

create or replace function logos_academy.student_calendar(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_from date default null,p_to date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; begin if not exists(select 1 from logos_academy.enrollments e join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id where e.tenant_id=p_tenant_id and e.id=p_enrollment_id and sp.user_id=p_actor_user_id and e.deleted_at is null and sp.deleted_at is null) then raise exception using errcode='42501',message='student enrollment required'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'lessonPosition',lt.position,'lessonTitle',lt.title,'startsAt',s.starts_at,'endsAt',s.ends_at,'status',s.status) order by s.starts_at),'[]'::jsonb) into v from logos_academy.sessions s join logos_academy.lesson_templates lt on lt.tenant_id=s.tenant_id and lt.id=s.lesson_template_id join logos_academy.enrollments e on e.tenant_id=s.tenant_id and e.id=p_enrollment_id where s.tenant_id=p_tenant_id and s.deleted_at is null and ((e.class_id is not null and s.class_id=e.class_id) or s.enrollment_id=e.id) and (p_from is null or s.starts_at>=p_from) and (p_to is null or s.starts_at<p_to+1); return v; end; $$;

revoke all on function private.admissions_page(text,integer) from public,anon,authenticated,service_role;
revoke all on function logos_academy.admin_list_students(uuid,uuid,text,text,uuid,text,integer),logos_academy.admin_student_detail(uuid,uuid,uuid,text),logos_academy.admin_list_classes(uuid,uuid,text,text,integer),logos_academy.admin_class_detail(uuid,uuid,uuid),logos_academy.admin_update_class(uuid,uuid,uuid,text,text),logos_academy.admin_update_enrollment(uuid,uuid,uuid,text),logos_academy.student_calendar(uuid,uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function logos_academy.admin_list_students(uuid,uuid,text,text,uuid,text,integer),logos_academy.admin_student_detail(uuid,uuid,uuid,text),logos_academy.admin_list_classes(uuid,uuid,text,text,integer),logos_academy.admin_class_detail(uuid,uuid,uuid),logos_academy.admin_update_class(uuid,uuid,uuid,text,text),logos_academy.admin_update_enrollment(uuid,uuid,uuid,text),logos_academy.student_calendar(uuid,uuid,uuid,date,date) to service_role;
notify pgrst,'reload schema'; commit;
