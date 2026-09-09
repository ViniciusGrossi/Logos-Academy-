begin;

create function private.is_student(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from logos_academy.users u
    join logos_academy.tenant_memberships tm on tm.tenant_id = u.tenant_id and tm.user_id = u.id
    where u.auth_user_id = (select auth.uid()) and u.tenant_id = p_tenant_id
      and u.access_enabled and u.deleted_at is null and tm.role = 'student' and tm.deleted_at is null
  );
$$;

create function private.owns_enrollment(p_tenant_id uuid, p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.enrollments e
    where e.tenant_id = p_tenant_id and e.id = p_enrollment_id and e.deleted_at is null
      and private.is_student_profile(e.tenant_id, e.student_profile_id)
  );
$$;

create function private.owns_session(p_tenant_id uuid, p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.sessions s
    where s.tenant_id = p_tenant_id and s.id = p_session_id and s.deleted_at is null and (
      (s.enrollment_id is not null and private.owns_enrollment(s.tenant_id, s.enrollment_id))
      or (s.class_id is not null and exists (
        select 1 from logos_academy.enrollments e where e.tenant_id = s.tenant_id and e.class_id = s.class_id
          and e.deleted_at is null and private.is_student_profile(e.tenant_id, e.student_profile_id)
      ))
    )
  );
$$;

create function private.owns_assignment(p_tenant_id uuid, p_activity_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.activity_assignments aa
    where aa.tenant_id = p_tenant_id and aa.id = p_activity_assignment_id and aa.deleted_at is null
      and private.owns_enrollment(aa.tenant_id, aa.enrollment_id)
  );
$$;

create function private.owns_submission(p_tenant_id uuid, p_submission_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.submissions s
    where s.tenant_id = p_tenant_id and s.id = p_submission_id and s.deleted_at is null
      and private.owns_assignment(s.tenant_id, s.activity_assignment_id)
  );
$$;

create function private.owns_review(p_tenant_id uuid, p_review_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.reviews r
    where r.tenant_id = p_tenant_id and r.id = p_review_id and r.deleted_at is null
      and private.owns_submission(r.tenant_id, r.submission_id)
  );
$$;

create function private.can_read_lesson(p_tenant_id uuid, p_lesson_template_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.activity_templates at
    join logos_academy.activity_assignments aa on aa.tenant_id = at.tenant_id and aa.activity_template_id = at.id
    where at.tenant_id = p_tenant_id and at.lesson_template_id = p_lesson_template_id
      and at.deleted_at is null and aa.deleted_at is null and aa.status <> 'locked' and aa.released_at is not null
      and private.owns_enrollment(aa.tenant_id, aa.enrollment_id)
  );
$$;

create function private.owns_file(p_tenant_id uuid, p_uploaded_file_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from logos_academy.uploaded_files uf
    where uf.tenant_id = p_tenant_id and uf.id = p_uploaded_file_id and uf.deleted_at is null
      and private.is_student_profile(uf.tenant_id, uf.student_profile_id)
      and private.is_user(uf.tenant_id, uf.uploaded_by_user_id)
  );
$$;

create function private.guard_self_service_updates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_admin(old.tenant_id) then return new; end if;
  if tg_table_name = 'users' and (
    new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.auth_user_id is distinct from old.auth_user_id or new.email_encrypted is distinct from old.email_encrypted or
    new.access_enabled is distinct from old.access_enabled or new.deleted_at is distinct from old.deleted_at or
    new.created_at is distinct from old.created_at
  ) then raise exception using errcode = '42501', message = 'only display_name is self-service editable'; end if;
  if tg_table_name = 'student_profiles' and (
    new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.user_id is distinct from old.user_id or new.birth_date_encrypted is distinct from old.birth_date_encrypted or
    new.deleted_at is distinct from old.deleted_at or new.created_at is distinct from old.created_at
  ) then raise exception using errcode = '42501', message = 'only github_username is self-service editable'; end if;
  return new;
end;
$$;

create function private.guard_draft_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or
    new.activity_assignment_id is distinct from old.activity_assignment_id or new.version is distinct from old.version or
    new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'draft identity is immutable';
  end if;
  return new;
end;
$$;

create trigger users_self_service_guard before update on logos_academy.users
for each row execute function private.guard_self_service_updates();
create trigger student_profiles_self_service_guard before update on logos_academy.student_profiles
for each row execute function private.guard_self_service_updates();
create trigger submissions_draft_identity_guard before update on logos_academy.submissions
for each row execute function private.guard_draft_identity();

revoke all on function private.is_student(uuid), private.owns_enrollment(uuid, uuid),
  private.owns_session(uuid, uuid), private.owns_assignment(uuid, uuid),
  private.owns_submission(uuid, uuid), private.owns_review(uuid, uuid),
  private.can_read_lesson(uuid, uuid), private.owns_file(uuid, uuid) from public, anon;
revoke all on function private.guard_self_service_updates(), private.guard_draft_identity() from public, anon, authenticated;
grant execute on function private.is_student(uuid), private.owns_enrollment(uuid, uuid),
  private.owns_session(uuid, uuid), private.owns_assignment(uuid, uuid),
  private.owns_submission(uuid, uuid), private.owns_review(uuid, uuid),
  private.can_read_lesson(uuid, uuid), private.owns_file(uuid, uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tenants','users','tenant_memberships','student_profiles','guardian_records','consent_records',
    'curricula','cycles','lesson_templates','concepts','lesson_concepts','activity_templates','activity_requirements','activity_criteria',
    'classes','enrollments','sessions','attendance_records','attendance_private_notes','makeup_records',
    'activity_assignments','submissions','submission_items','uploaded_files','reviews','criterion_reviews','feedback_receipts',
    'project_records','presentation_records','completion_records','audit_events','idempotency_keys'
  ] loop
    execute format('create policy %I on logos_academy.%I for select to authenticated using (deleted_at is null and (select private.is_admin(tenant_id)))', table_name || '_admin_select', table_name);
    execute format('create policy %I on logos_academy.%I for insert to authenticated with check (false)', table_name || '_insert_denied', table_name);
    execute format('create policy %I on logos_academy.%I for update to authenticated using (false) with check (false)', table_name || '_update_denied', table_name);
    execute format('create policy %I on logos_academy.%I for delete to authenticated using (false)', table_name || '_delete_denied', table_name);
  end loop;

  foreach table_name in array array[
    'users','tenant_memberships','student_profiles','guardian_records','consent_records','classes','enrollments','sessions',
    'attendance_records','attendance_private_notes','makeup_records','activity_assignments','submissions','submission_items',
    'uploaded_files','reviews','criterion_reviews','feedback_receipts','project_records','presentation_records','audit_events','idempotency_keys'
  ] loop
    execute format('create policy %I on logos_academy.%I for insert to authenticated with check (deleted_at is null and (select private.is_admin(tenant_id)))', table_name || '_admin_insert', table_name);
  end loop;

  foreach table_name in array array[
    'users','tenant_memberships','student_profiles','guardian_records','consent_records','classes','enrollments','sessions',
    'attendance_records','attendance_private_notes','makeup_records','activity_assignments','submissions','submission_items',
    'uploaded_files','feedback_receipts','project_records','idempotency_keys'
  ] loop
    execute format('create policy %I on logos_academy.%I for update to authenticated using (deleted_at is null and (select private.is_admin(tenant_id))) with check ((select private.is_admin(tenant_id)))', table_name || '_admin_update', table_name);
  end loop;
end;
$$;

create policy tenants_member_select on logos_academy.tenants for select to authenticated
  using (deleted_at is null and (select private.is_member(tenant_id)));
create policy users_self_select on logos_academy.users for select to authenticated
  using (deleted_at is null and (select private.is_user(tenant_id, id)));
create policy users_self_update on logos_academy.users for update to authenticated
  using (deleted_at is null and (select private.is_user(tenant_id, id)))
  with check ((select private.is_user(tenant_id, id)) and access_enabled);
create policy tenant_memberships_self_select on logos_academy.tenant_memberships for select to authenticated
  using (deleted_at is null and (select private.is_user(tenant_id, user_id)));
create policy student_profiles_self_select on logos_academy.student_profiles for select to authenticated
  using (deleted_at is null and (select private.is_student_profile(tenant_id, id)));
create policy student_profiles_self_update on logos_academy.student_profiles for update to authenticated
  using (deleted_at is null and (select private.is_student_profile(tenant_id, id)))
  with check ((select private.is_student_profile(tenant_id, id)));

create policy curricula_released_select on logos_academy.curricula for select to authenticated using (
  deleted_at is null and exists (
    select 1 from logos_academy.cycles c join logos_academy.lesson_templates lt on lt.tenant_id = c.tenant_id and lt.cycle_id = c.id
    where c.tenant_id = curricula.tenant_id and c.curriculum_id = curricula.id and private.can_read_lesson(lt.tenant_id, lt.id)
  )
);
create policy cycles_released_select on logos_academy.cycles for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.lesson_templates lt where lt.tenant_id = cycles.tenant_id and lt.cycle_id = cycles.id and private.can_read_lesson(lt.tenant_id, lt.id))
);
create policy lesson_templates_released_select on logos_academy.lesson_templates for select to authenticated
  using (deleted_at is null and (select private.can_read_lesson(tenant_id, id)));
create policy concepts_released_select on logos_academy.concepts for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.lesson_concepts lc where lc.tenant_id = concepts.tenant_id and lc.concept_id = concepts.id and private.can_read_lesson(lc.tenant_id, lc.lesson_template_id))
);
create policy lesson_concepts_released_select on logos_academy.lesson_concepts for select to authenticated
  using (deleted_at is null and (select private.can_read_lesson(tenant_id, lesson_template_id)));
create policy activity_templates_released_select on logos_academy.activity_templates for select to authenticated
  using (deleted_at is null and (select private.can_read_lesson(tenant_id, lesson_template_id)));
create policy activity_requirements_released_select on logos_academy.activity_requirements for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.activity_templates at where at.tenant_id = activity_requirements.tenant_id and at.id = activity_requirements.activity_template_id and private.can_read_lesson(at.tenant_id, at.lesson_template_id))
);
create policy activity_criteria_released_select on logos_academy.activity_criteria for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.activity_templates at where at.tenant_id = activity_criteria.tenant_id and at.id = activity_criteria.activity_template_id and private.can_read_lesson(at.tenant_id, at.lesson_template_id))
);

create policy classes_own_select on logos_academy.classes for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.enrollments e where e.tenant_id = classes.tenant_id and e.class_id = classes.id and private.owns_enrollment(e.tenant_id, e.id))
);
create policy enrollments_own_select on logos_academy.enrollments for select to authenticated
  using (deleted_at is null and (select private.owns_enrollment(tenant_id, id)));
create policy sessions_own_select on logos_academy.sessions for select to authenticated
  using (deleted_at is null and (select private.owns_session(tenant_id, id)));
create policy attendance_records_own_select on logos_academy.attendance_records for select to authenticated
  using (deleted_at is null and (select private.owns_enrollment(tenant_id, enrollment_id)));
create policy makeup_records_own_select on logos_academy.makeup_records for select to authenticated using (
  deleted_at is null and exists (select 1 from logos_academy.attendance_records ar where ar.tenant_id = makeup_records.tenant_id and ar.id = makeup_records.attendance_record_id and private.owns_enrollment(ar.tenant_id, ar.enrollment_id))
);
create policy activity_assignments_own_select on logos_academy.activity_assignments for select to authenticated
  using (deleted_at is null and status <> 'locked' and released_at is not null and (select private.owns_enrollment(tenant_id, enrollment_id)));
create policy submissions_own_select on logos_academy.submissions for select to authenticated
  using (deleted_at is null and (select private.owns_submission(tenant_id, id)));
create policy submission_items_own_select on logos_academy.submission_items for select to authenticated
  using (deleted_at is null and (select private.owns_submission(tenant_id, submission_id)));
create policy uploaded_files_own_select on logos_academy.uploaded_files for select to authenticated
  using (deleted_at is null and (select private.owns_file(tenant_id, id)));
create policy reviews_own_select on logos_academy.reviews for select to authenticated
  using (deleted_at is null and (select private.owns_review(tenant_id, id)));
create policy criterion_reviews_own_select on logos_academy.criterion_reviews for select to authenticated using (
  deleted_at is null and (select private.owns_review(tenant_id, review_id))
);
create policy feedback_receipts_own_select on logos_academy.feedback_receipts for select to authenticated
  using (deleted_at is null and (select private.is_student_profile(tenant_id, student_profile_id)) and (select private.owns_review(tenant_id, review_id)));
create policy project_records_own_select on logos_academy.project_records for select to authenticated
  using (deleted_at is null and (select private.owns_enrollment(tenant_id, enrollment_id)));
create policy presentation_records_own_select on logos_academy.presentation_records for select to authenticated
  using (deleted_at is null and (select private.owns_enrollment(tenant_id, enrollment_id)));
create policy completion_records_own_select on logos_academy.completion_records for select to authenticated
  using (deleted_at is null and (select private.owns_enrollment(tenant_id, enrollment_id)));

create policy submissions_draft_insert on logos_academy.submissions for insert to authenticated with check (
  deleted_at is null and is_draft and submitted_at is null and (select private.owns_assignment(tenant_id, activity_assignment_id))
  and exists (select 1 from logos_academy.activity_assignments aa join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
    where aa.tenant_id = submissions.tenant_id and aa.id = submissions.activity_assignment_id and aa.status in ('available','draft','revision_requested') and e.status = 'active' and e.deleted_at is null)
);
create policy submissions_draft_update on logos_academy.submissions for update to authenticated
  using (deleted_at is null and is_draft and (select private.owns_submission(tenant_id, id)))
  with check (deleted_at is null and is_draft and submitted_at is null and (select private.owns_assignment(tenant_id, activity_assignment_id)));
create policy submission_items_draft_insert on logos_academy.submission_items for insert to authenticated with check (
  deleted_at is null and (select private.owns_submission(tenant_id, submission_id))
  and exists (select 1 from logos_academy.submissions s where s.tenant_id = submission_items.tenant_id and s.id = submission_items.submission_id and s.is_draft and s.deleted_at is null)
);
create policy submission_items_draft_update on logos_academy.submission_items for update to authenticated
  using (deleted_at is null and (select private.owns_submission(tenant_id, submission_id)) and exists (select 1 from logos_academy.submissions s where s.tenant_id = submission_items.tenant_id and s.id = submission_items.submission_id and s.is_draft and s.deleted_at is null))
  with check ((select private.owns_submission(tenant_id, submission_id)));
create policy uploaded_files_pending_insert on logos_academy.uploaded_files for insert to authenticated with check (
  deleted_at is null and status = 'pending' and (select private.is_student_profile(tenant_id, student_profile_id))
  and (select private.is_user(tenant_id, uploaded_by_user_id)) and (select private.owns_assignment(tenant_id, activity_assignment_id))
);
create policy feedback_receipts_own_insert on logos_academy.feedback_receipts for insert to authenticated with check (
  deleted_at is null and (select private.is_student_profile(tenant_id, student_profile_id)) and (select private.owns_review(tenant_id, review_id))
);

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update on logos_academy.users, logos_academy.student_profiles, logos_academy.submissions, logos_academy.submission_items to authenticated;
grant insert on logos_academy.uploaded_files, logos_academy.feedback_receipts to authenticated;
grant insert, update on logos_academy.tenant_memberships, logos_academy.guardian_records, logos_academy.consent_records, logos_academy.classes,
  logos_academy.enrollments, logos_academy.sessions, logos_academy.attendance_records, logos_academy.attendance_private_notes, logos_academy.makeup_records,
  logos_academy.activity_assignments, logos_academy.project_records, logos_academy.idempotency_keys to authenticated;
grant insert on logos_academy.reviews, logos_academy.criterion_reviews, logos_academy.presentation_records, logos_academy.audit_events to authenticated;

create function private.completion_snapshot(p_enrollment_id uuid)
returns table (
  tenant_id uuid, attendance_complete boolean, projects_complete boolean, reflection_complete boolean,
  presentation_complete boolean, no_pending_revisions boolean, eligible boolean, blockers text[]
)
language sql stable security definer set search_path = '' as $$
  with target as (
    select e.tenant_id, e.id, e.class_id from logos_academy.enrollments e where e.id = p_enrollment_id and e.deleted_at is null
  ), relevant_sessions as (
    select s.tenant_id, s.id from logos_academy.sessions s join target t on t.tenant_id = s.tenant_id
    where s.deleted_at is null and s.status <> 'cancelled' and (s.enrollment_id = t.id or (t.class_id is not null and s.class_id = t.class_id))
  ), facts as (
    select t.tenant_id,
      (select count(*) = 16 and count(*) filter (where exists (
        select 1 from logos_academy.attendance_records ar where ar.tenant_id = rs.tenant_id and ar.session_id = rs.id and ar.enrollment_id = t.id
          and ar.deleted_at is null and (ar.status = 'present' or exists (
            select 1 from logos_academy.makeup_records mr where mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
          ))
      )) = 16 from relevant_sessions rs) as attendance_complete,
      ((select count(*) from logos_academy.project_records pr where pr.tenant_id = t.tenant_id and pr.enrollment_id = t.id and pr.status = 'approved' and pr.deleted_at is null) = 4) as projects_complete,
      exists (select 1 from logos_academy.activity_assignments aa join logos_academy.activity_templates at on at.tenant_id = aa.tenant_id and at.id = aa.activity_template_id
        join logos_academy.lesson_templates lt on lt.tenant_id = at.tenant_id and lt.id = at.lesson_template_id
        where aa.tenant_id = t.tenant_id and aa.enrollment_id = t.id and aa.status = 'approved' and aa.deleted_at is null and lt.position = 16 and lt.deleted_at is null) as reflection_complete,
      exists (select 1 from logos_academy.presentation_records pr where pr.tenant_id = t.tenant_id and pr.enrollment_id = t.id and pr.deleted_at is null) as presentation_complete,
      not exists (select 1 from logos_academy.activity_assignments aa where aa.tenant_id = t.tenant_id and aa.enrollment_id = t.id and aa.status = 'revision_requested' and aa.deleted_at is null) as no_pending_revisions
    from target t
  )
  select f.tenant_id, f.attendance_complete, f.projects_complete, f.reflection_complete, f.presentation_complete, f.no_pending_revisions,
    (f.attendance_complete and f.projects_complete and f.reflection_complete and f.presentation_complete and f.no_pending_revisions),
    array_remove(array[
      case when not f.attendance_complete then 'attendance_incomplete' end,
      case when not f.projects_complete then 'projects_incomplete' end,
      case when not f.reflection_complete then 'reflection_incomplete' end,
      case when not f.presentation_complete then 'presentation_incomplete' end,
      case when not f.no_pending_revisions then 'pending_revisions' end
    ], null)
  from facts f;
$$;

create function logos_academy.completion_check(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare snapshot record;
begin
  select * into snapshot from private.completion_snapshot(p_enrollment_id);
  if not found then raise exception using errcode = 'P0002', message = 'enrollment not found'; end if;
  if not (private.is_admin(snapshot.tenant_id) or private.owns_enrollment(snapshot.tenant_id, p_enrollment_id)) then
    raise exception using errcode = '42501', message = 'access denied';
  end if;
  return jsonb_build_object('enrollmentId', p_enrollment_id, 'attendanceComplete', snapshot.attendance_complete,
    'projectsComplete', snapshot.projects_complete, 'reflectionComplete', snapshot.reflection_complete,
    'presentationComplete', snapshot.presentation_complete, 'noPendingRevisions', snapshot.no_pending_revisions,
    'eligible', snapshot.eligible, 'blockers', snapshot.blockers);
end;
$$;

create function logos_academy.complete_enrollment(p_enrollment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare snapshot record;
begin
  select * into snapshot from private.completion_snapshot(p_enrollment_id);
  if not found then raise exception using errcode = 'P0002', message = 'enrollment not found'; end if;
  if not private.is_admin(snapshot.tenant_id) then raise exception using errcode = '42501', message = 'admin access required'; end if;
  if not snapshot.eligible then return logos_academy.completion_check(p_enrollment_id); end if;
  insert into logos_academy.completion_records (tenant_id, enrollment_id, status, attendance_complete, projects_complete,
    reflection_complete, presentation_complete, no_pending_revisions, completed_at)
  values (snapshot.tenant_id, p_enrollment_id, 'completed', true, true, true, true, true, now())
  on conflict on constraint completion_records_active_key do nothing;
  update logos_academy.enrollments set status = 'completed', completed_at = now() where tenant_id = snapshot.tenant_id and id = p_enrollment_id;
  return logos_academy.completion_check(p_enrollment_id);
end;
$$;

revoke all on function private.completion_snapshot(uuid) from public, anon, authenticated;
revoke all on function logos_academy.completion_check(uuid), logos_academy.complete_enrollment(uuid) from public, anon;
grant execute on function logos_academy.completion_check(uuid), logos_academy.complete_enrollment(uuid) to authenticated;

create policy submissions_objects_select on storage.objects for select to authenticated using (
  bucket_id = 'submissions' and exists (
    select 1 from logos_academy.uploaded_files uf where uf.storage_path = storage.objects.name and uf.deleted_at is null
      and (private.is_admin(uf.tenant_id) or private.owns_file(uf.tenant_id, uf.id))
  )
);
create policy submissions_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'submissions' and exists (
    select 1 from logos_academy.uploaded_files uf where uf.storage_path = storage.objects.name and uf.status = 'pending' and uf.deleted_at is null
      and (private.is_admin(uf.tenant_id) or private.owns_file(uf.tenant_id, uf.id))
  )
);
create policy submissions_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'submissions' and exists (select 1 from logos_academy.uploaded_files uf where uf.storage_path = storage.objects.name and uf.deleted_at is null and (private.is_admin(uf.tenant_id) or private.owns_file(uf.tenant_id, uf.id))))
  with check (bucket_id = 'submissions' and exists (select 1 from logos_academy.uploaded_files uf where uf.storage_path = storage.objects.name and uf.status = 'pending' and uf.deleted_at is null and (private.is_admin(uf.tenant_id) or private.owns_file(uf.tenant_id, uf.id))));
create policy submissions_objects_delete_denied on storage.objects for delete to authenticated using (false);

notify pgrst, 'reload schema';
commit;
