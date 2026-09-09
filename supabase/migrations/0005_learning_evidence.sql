begin;

create table logos_academy.activity_assignments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, enrollment_id uuid not null, session_id uuid not null,
  activity_template_id uuid not null,
  status text not null check (status in ('locked','available','draft','submitted','revision_requested','approved')),
  released_at timestamptz, due_at timestamptz, supplemental_instructions text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint activity_assignments_tenant_id_id_key unique (tenant_id, id),
  constraint activity_assignments_active_key unique nulls not distinct (tenant_id, enrollment_id, activity_template_id, deleted_at),
  constraint activity_assignments_release_check check (
    (status = 'locked' and released_at is null) or (status <> 'locked' and released_at is not null)
  ),
  constraint activity_assignments_due_check check (due_at is null or released_at is null or due_at > released_at),
  constraint activity_assignments_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint activity_assignments_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict,
  constraint activity_assignments_session_id_fkey foreign key (tenant_id, session_id) references logos_academy.sessions(tenant_id, id) on delete restrict,
  constraint activity_assignments_activity_template_id_fkey foreign key (tenant_id, activity_template_id) references logos_academy.activity_templates(tenant_id, id) on delete restrict
);

create table logos_academy.submissions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, activity_assignment_id uuid not null,
  version integer not null check (version >= 1), is_draft boolean not null, submitted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint submissions_tenant_id_id_key unique (tenant_id, id),
  constraint submissions_version_key unique (tenant_id, activity_assignment_id, version),
  constraint submissions_state_check check ((is_draft and submitted_at is null) or (not is_draft and submitted_at is not null)),
  constraint submissions_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint submissions_activity_assignment_id_fkey foreign key (tenant_id, activity_assignment_id) references logos_academy.activity_assignments(tenant_id, id) on delete restrict
);
create unique index submissions_single_draft_key on logos_academy.submissions (tenant_id, activity_assignment_id)
  where deleted_at is null and is_draft;

create table logos_academy.uploaded_files (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_profile_id uuid not null,
  activity_assignment_id uuid not null, uploaded_by_user_id uuid not null, storage_path text not null,
  filename_encrypted bytea not null, content_type text not null check (content_type in (
    'application/pdf','text/plain','text/markdown','image/png','image/jpeg','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )),
  size_bytes integer not null check (size_bytes between 1 and 20971520),
  status text not null check (status in ('pending','ready','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint uploaded_files_tenant_id_id_key unique (tenant_id, id),
  constraint uploaded_files_storage_path_key unique (storage_path),
  constraint uploaded_files_storage_path_check check (
    storage_path = tenant_id::text || '/' || student_profile_id::text || '/' || activity_assignment_id::text || '/' || id::text
  ),
  constraint uploaded_files_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint uploaded_files_student_profile_id_fkey foreign key (tenant_id, student_profile_id) references logos_academy.student_profiles(tenant_id, id) on delete restrict,
  constraint uploaded_files_activity_assignment_id_fkey foreign key (tenant_id, activity_assignment_id) references logos_academy.activity_assignments(tenant_id, id) on delete restrict,
  constraint uploaded_files_uploaded_by_user_id_fkey foreign key (tenant_id, uploaded_by_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.submission_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_id uuid not null,
  activity_requirement_id uuid not null, kind text not null check (kind in ('text','file','external_link','github_repository')),
  text_value_encrypted bytea, url_value_encrypted bytea, uploaded_file_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint submission_items_tenant_id_id_key unique (tenant_id, id),
  constraint submission_items_active_key unique nulls not distinct (tenant_id, submission_id, activity_requirement_id, deleted_at),
  constraint submission_items_value_check check (
    (kind = 'text' and text_value_encrypted is not null and url_value_encrypted is null and uploaded_file_id is null)
    or (kind = 'file' and text_value_encrypted is null and url_value_encrypted is null and uploaded_file_id is not null)
    or (kind in ('external_link','github_repository') and text_value_encrypted is null and url_value_encrypted is not null and uploaded_file_id is null)
  ),
  constraint submission_items_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint submission_items_submission_id_fkey foreign key (tenant_id, submission_id) references logos_academy.submissions(tenant_id, id) on delete restrict,
  constraint submission_items_activity_requirement_id_fkey foreign key (tenant_id, activity_requirement_id) references logos_academy.activity_requirements(tenant_id, id) on delete restrict,
  constraint submission_items_uploaded_file_id_fkey foreign key (tenant_id, uploaded_file_id) references logos_academy.uploaded_files(tenant_id, id) on delete restrict
);

create table logos_academy.reviews (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_id uuid not null,
  reviewer_user_id uuid not null, decision text not null check (decision in ('approved','revision_requested')),
  feedback_encrypted bytea not null, reviewed_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint reviews_tenant_id_id_key unique (tenant_id, id),
  constraint reviews_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint reviews_submission_id_fkey foreign key (tenant_id, submission_id) references logos_academy.submissions(tenant_id, id) on delete restrict,
  constraint reviews_reviewer_user_id_fkey foreign key (tenant_id, reviewer_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.criterion_reviews (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, review_id uuid not null, activity_criterion_id uuid not null,
  result text not null check (result in ('met','needs_adjustment')), comment_encrypted bytea,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint criterion_reviews_tenant_id_id_key unique (tenant_id, id),
  constraint criterion_reviews_active_key unique nulls not distinct (tenant_id, review_id, activity_criterion_id, deleted_at),
  constraint criterion_reviews_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint criterion_reviews_review_id_fkey foreign key (tenant_id, review_id) references logos_academy.reviews(tenant_id, id) on delete restrict,
  constraint criterion_reviews_activity_criterion_id_fkey foreign key (tenant_id, activity_criterion_id) references logos_academy.activity_criteria(tenant_id, id) on delete restrict
);

create table logos_academy.feedback_receipts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, review_id uuid not null, student_profile_id uuid not null,
  seen_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint feedback_receipts_tenant_id_id_key unique (tenant_id, id),
  constraint feedback_receipts_active_key unique nulls not distinct (tenant_id, review_id, student_profile_id, deleted_at),
  constraint feedback_receipts_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint feedback_receipts_review_id_fkey foreign key (tenant_id, review_id) references logos_academy.reviews(tenant_id, id) on delete restrict,
  constraint feedback_receipts_student_profile_id_fkey foreign key (tenant_id, student_profile_id) references logos_academy.student_profiles(tenant_id, id) on delete restrict
);

create table logos_academy.project_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, enrollment_id uuid not null, cycle_id uuid not null,
  status text not null check (status in ('locked','in_progress','approved')), approved_submission_id uuid, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint project_records_tenant_id_id_key unique (tenant_id, id),
  constraint project_records_active_key unique nulls not distinct (tenant_id, enrollment_id, cycle_id, deleted_at),
  constraint project_records_state_check check (
    (status <> 'approved' and approved_submission_id is null and approved_at is null)
    or (status = 'approved' and approved_submission_id is not null and approved_at is not null)
  ),
  constraint project_records_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint project_records_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict,
  constraint project_records_cycle_id_fkey foreign key (tenant_id, cycle_id) references logos_academy.cycles(tenant_id, id) on delete restrict,
  constraint project_records_approved_submission_id_fkey foreign key (tenant_id, approved_submission_id) references logos_academy.submissions(tenant_id, id) on delete restrict
);

create table logos_academy.presentation_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, enrollment_id uuid not null,
  kind text not null check (kind in ('demo_day','substitute')), performed_at timestamptz not null,
  contextual_note_encrypted bytea, recorded_by_user_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint presentation_records_tenant_id_id_key unique (tenant_id, id),
  constraint presentation_records_active_key unique nulls not distinct (tenant_id, enrollment_id, deleted_at),
  constraint presentation_records_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint presentation_records_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict,
  constraint presentation_records_recorded_by_user_id_fkey foreign key (tenant_id, recorded_by_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.completion_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, enrollment_id uuid not null,
  status text not null check (status in ('in_progress','eligible','completed')),
  attendance_complete boolean not null, projects_complete boolean not null, reflection_complete boolean not null,
  presentation_complete boolean not null, no_pending_revisions boolean not null, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint completion_records_tenant_id_id_key unique (tenant_id, id),
  constraint completion_records_active_key unique nulls not distinct (tenant_id, enrollment_id, deleted_at),
  constraint completion_records_state_check check (
    (status = 'completed' and attendance_complete and projects_complete and reflection_complete and presentation_complete and no_pending_revisions and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint completion_records_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint completion_records_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict
);

create function private.validate_assignment_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.enrollments e
    join logos_academy.sessions s on s.tenant_id = e.tenant_id
    join logos_academy.activity_templates at on at.tenant_id = e.tenant_id and at.id = new.activity_template_id
    where e.tenant_id = new.tenant_id and e.id = new.enrollment_id and s.id = new.session_id
      and e.deleted_at is null and s.deleted_at is null and at.deleted_at is null
      and ((s.class_id is not null and s.class_id = e.class_id) or s.enrollment_id = e.id)
      and s.lesson_template_id = at.lesson_template_id
  ) then raise exception using errcode = '23514', message = 'assignment scope mismatch'; end if;
  return new;
end;
$$;

create function private.validate_submission_item_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id
    join logos_academy.activity_requirements ar on ar.tenant_id = aa.tenant_id and ar.activity_template_id = aa.activity_template_id
    where s.tenant_id = new.tenant_id and s.id = new.submission_id and ar.id = new.activity_requirement_id
      and ar.kind = new.kind and s.deleted_at is null and aa.deleted_at is null and ar.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'submission requirement mismatch'; end if;
  if new.uploaded_file_id is not null and not exists (
    select 1 from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id
    join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
    join logos_academy.uploaded_files uf on uf.tenant_id = aa.tenant_id and uf.id = new.uploaded_file_id
    where s.tenant_id = new.tenant_id and s.id = new.submission_id
      and uf.activity_assignment_id = aa.id and uf.student_profile_id = e.student_profile_id and uf.status = 'ready'
      and uf.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'file does not belong to submission owner and assignment'; end if;
  return new;
end;
$$;

create function private.guard_submission_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not old.is_draft then raise exception using errcode = '42501', message = 'submitted versions are immutable'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger activity_assignments_scope before insert or update of enrollment_id, session_id, activity_template_id
on logos_academy.activity_assignments for each row execute function private.validate_assignment_scope();
create trigger submission_items_scope before insert or update of submission_id, activity_requirement_id, kind, uploaded_file_id
on logos_academy.submission_items for each row execute function private.validate_submission_item_scope();
create trigger submissions_immutable before update or delete on logos_academy.submissions
for each row execute function private.guard_submission_mutation();

create index activity_assignments_student_queue_idx on logos_academy.activity_assignments (tenant_id, enrollment_id, status, due_at, id) where deleted_at is null;
create index activity_assignments_review_queue_idx on logos_academy.activity_assignments (tenant_id, status, due_at, created_at, id) where deleted_at is null and status in ('submitted','revision_requested');
create index activity_assignments_session_id_idx on logos_academy.activity_assignments (tenant_id, session_id) where deleted_at is null;
create index activity_assignments_template_id_idx on logos_academy.activity_assignments (tenant_id, activity_template_id) where deleted_at is null;
create index submissions_assignment_cursor_idx on logos_academy.submissions (tenant_id, activity_assignment_id, created_at, id) where deleted_at is null;
create index uploaded_files_student_idx on logos_academy.uploaded_files (tenant_id, student_profile_id, created_at, id) where deleted_at is null;
create index uploaded_files_assignment_idx on logos_academy.uploaded_files (tenant_id, activity_assignment_id, status) where deleted_at is null;
create index uploaded_files_user_idx on logos_academy.uploaded_files (tenant_id, uploaded_by_user_id) where deleted_at is null;
create index submission_items_submission_idx on logos_academy.submission_items (tenant_id, submission_id) where deleted_at is null;
create index submission_items_requirement_idx on logos_academy.submission_items (tenant_id, activity_requirement_id) where deleted_at is null;
create index submission_items_file_idx on logos_academy.submission_items (tenant_id, uploaded_file_id) where uploaded_file_id is not null and deleted_at is null;
create index reviews_queue_cursor_idx on logos_academy.reviews (tenant_id, reviewed_at, id) where deleted_at is null;
create index reviews_submission_idx on logos_academy.reviews (tenant_id, submission_id, reviewed_at, id) where deleted_at is null;
create index reviews_reviewer_idx on logos_academy.reviews (tenant_id, reviewer_user_id) where deleted_at is null;
create index criterion_reviews_review_idx on logos_academy.criterion_reviews (tenant_id, review_id) where deleted_at is null;
create index criterion_reviews_criterion_idx on logos_academy.criterion_reviews (tenant_id, activity_criterion_id) where deleted_at is null;
create index feedback_receipts_review_idx on logos_academy.feedback_receipts (tenant_id, review_id) where deleted_at is null;
create index feedback_receipts_student_idx on logos_academy.feedback_receipts (tenant_id, student_profile_id, seen_at, id) where deleted_at is null;
create index project_records_enrollment_idx on logos_academy.project_records (tenant_id, enrollment_id, created_at, id) where deleted_at is null;
create index project_records_cycle_idx on logos_academy.project_records (tenant_id, cycle_id) where deleted_at is null;
create index project_records_submission_idx on logos_academy.project_records (tenant_id, approved_submission_id) where approved_submission_id is not null;
create index presentation_records_enrollment_idx on logos_academy.presentation_records (tenant_id, enrollment_id) where deleted_at is null;
create index presentation_records_user_idx on logos_academy.presentation_records (tenant_id, recorded_by_user_id);
create index completion_records_enrollment_idx on logos_academy.completion_records (tenant_id, enrollment_id) where deleted_at is null;

do $$
declare table_name text;
begin
  foreach table_name in array array['activity_assignments','submissions','uploaded_files','submission_items','reviews','criterion_reviews','feedback_receipts','project_records','presentation_records','completion_records'] loop
    execute format('create trigger %I_set_updated_at before update on logos_academy.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table logos_academy.%I enable row level security', table_name);
    execute format('alter table logos_academy.%I force row level security', table_name);
  end loop;
  foreach table_name in array array['reviews','criterion_reviews','feedback_receipts','presentation_records','completion_records'] loop
    execute format('create trigger %I_immutable before update or delete on logos_academy.%I for each row execute function private.reject_mutation()', table_name, table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
