begin;

create table logos_academy.classes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null check (length(btrim(name)) between 1 and 120),
  curriculum_id uuid not null, starts_on date not null,
  status text not null check (status in ('planned','active','completed','cancelled')),
  capacity smallint not null default 6 check (capacity = 6),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint classes_tenant_id_id_key unique (tenant_id, id),
  constraint classes_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint classes_curriculum_id_fkey foreign key (tenant_id, curriculum_id) references logos_academy.curricula(tenant_id, id) on delete restrict
);

create table logos_academy.enrollments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_profile_id uuid not null,
  curriculum_id uuid not null, kind text not null check (kind in ('class','individual')), class_id uuid,
  status text not null check (status in ('invited','active','paused','completed','cancelled')),
  invited_at timestamptz not null, activated_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint enrollments_tenant_id_id_key unique (tenant_id, id),
  constraint enrollments_placement_check check (
    (kind = 'class' and class_id is not null) or (kind = 'individual' and class_id is null)
  ),
  constraint enrollments_lifecycle_check check (
    (status = 'invited' and activated_at is null and completed_at is null)
    or (status in ('active','paused') and activated_at is not null and completed_at is null)
    or (status = 'cancelled' and completed_at is null)
    or (status = 'completed' and activated_at is not null and completed_at is not null)
  ),
  constraint enrollments_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint enrollments_student_profile_id_fkey foreign key (tenant_id, student_profile_id) references logos_academy.student_profiles(tenant_id, id) on delete restrict,
  constraint enrollments_curriculum_id_fkey foreign key (tenant_id, curriculum_id) references logos_academy.curricula(tenant_id, id) on delete restrict,
  constraint enrollments_class_id_fkey foreign key (tenant_id, class_id) references logos_academy.classes(tenant_id, id) on delete restrict
);

create unique index enrollments_active_class_offering_key
  on logos_academy.enrollments (tenant_id, student_profile_id, class_id)
  where deleted_at is null and class_id is not null and status in ('invited','active','paused');
create unique index enrollments_active_individual_offering_key
  on logos_academy.enrollments (tenant_id, student_profile_id, curriculum_id)
  where deleted_at is null and class_id is null and status in ('invited','active','paused');

create table logos_academy.sessions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, class_id uuid, enrollment_id uuid,
  lesson_template_id uuid not null, starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null check (status in ('scheduled','completed','rescheduled','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint sessions_tenant_id_id_key unique (tenant_id, id),
  constraint sessions_owner_check check ((class_id is not null) <> (enrollment_id is not null)),
  constraint sessions_time_check check (ends_at > starts_at),
  constraint sessions_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint sessions_class_id_fkey foreign key (tenant_id, class_id) references logos_academy.classes(tenant_id, id) on delete restrict,
  constraint sessions_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict,
  constraint sessions_lesson_template_id_fkey foreign key (tenant_id, lesson_template_id) references logos_academy.lesson_templates(tenant_id, id) on delete restrict
);

create unique index sessions_class_lesson_key on logos_academy.sessions (tenant_id, class_id, lesson_template_id)
  where deleted_at is null and class_id is not null;
create unique index sessions_enrollment_lesson_key on logos_academy.sessions (tenant_id, enrollment_id, lesson_template_id)
  where deleted_at is null and enrollment_id is not null;

create table logos_academy.attendance_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null, enrollment_id uuid not null,
  status text not null check (status in ('present','absent','excused_absence')), recorded_by_user_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint attendance_records_tenant_id_id_key unique (tenant_id, id),
  constraint attendance_records_active_key unique nulls not distinct (tenant_id, session_id, enrollment_id, deleted_at),
  constraint attendance_records_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint attendance_records_session_id_fkey foreign key (tenant_id, session_id) references logos_academy.sessions(tenant_id, id) on delete restrict,
  constraint attendance_records_enrollment_id_fkey foreign key (tenant_id, enrollment_id) references logos_academy.enrollments(tenant_id, id) on delete restrict,
  constraint attendance_records_recorded_by_user_id_fkey foreign key (tenant_id, recorded_by_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.attendance_private_notes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, attendance_record_id uuid not null,
  note_encrypted bytea not null, recorded_by_user_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint attendance_private_notes_tenant_id_id_key unique (tenant_id, id),
  constraint attendance_private_notes_active_key unique nulls not distinct (tenant_id, attendance_record_id, deleted_at),
  constraint attendance_private_notes_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint attendance_private_notes_attendance_record_id_fkey foreign key (tenant_id, attendance_record_id) references logos_academy.attendance_records(tenant_id, id) on delete restrict,
  constraint attendance_private_notes_recorded_by_user_id_fkey foreign key (tenant_id, recorded_by_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create table logos_academy.makeup_records (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, attendance_record_id uuid not null,
  makeup_session_id uuid, completed_at timestamptz not null, recorded_by_user_id uuid not null, note_encrypted bytea,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint makeup_records_tenant_id_id_key unique (tenant_id, id),
  constraint makeup_records_active_key unique nulls not distinct (tenant_id, attendance_record_id, deleted_at),
  constraint makeup_records_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint makeup_records_attendance_record_id_fkey foreign key (tenant_id, attendance_record_id) references logos_academy.attendance_records(tenant_id, id) on delete restrict,
  constraint makeup_records_makeup_session_id_fkey foreign key (tenant_id, makeup_session_id) references logos_academy.sessions(tenant_id, id) on delete restrict,
  constraint makeup_records_recorded_by_user_id_fkey foreign key (tenant_id, recorded_by_user_id) references logos_academy.users(tenant_id, id) on delete restrict
);

create function private.enforce_class_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare active_count integer;
begin
  if new.class_id is null or new.status <> 'active' or new.deleted_at is not null then return new; end if;
  perform 1 from logos_academy.classes c where c.tenant_id = new.tenant_id and c.id = new.class_id for update;
  select count(*) into active_count from logos_academy.enrollments e
  where e.tenant_id = new.tenant_id and e.class_id = new.class_id and e.status = 'active'
    and e.deleted_at is null and e.id <> new.id;
  if active_count >= 6 then raise exception using errcode = '23514', message = 'class capacity of six active enrollments exceeded'; end if;
  return new;
end;
$$;

create function private.validate_attendance_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.sessions s join logos_academy.enrollments e on e.tenant_id = s.tenant_id
    where s.tenant_id = new.tenant_id and s.id = new.session_id and e.id = new.enrollment_id
      and e.deleted_at is null and s.deleted_at is null
      and ((s.class_id is not null and e.class_id = s.class_id) or s.enrollment_id = e.id)
  ) then raise exception using errcode = '23514', message = 'session does not belong to enrollment'; end if;
  return new;
end;
$$;

create function private.validate_makeup_absence()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from logos_academy.attendance_records ar
    where ar.tenant_id = new.tenant_id and ar.id = new.attendance_record_id
      and ar.status in ('absent','excused_absence') and ar.deleted_at is null
  ) then raise exception using errcode = '23514', message = 'makeup requires an active absence'; end if;
  return new;
end;
$$;

create trigger enrollments_capacity before insert or update of class_id, status, deleted_at on logos_academy.enrollments
for each row execute function private.enforce_class_capacity();
create trigger attendance_records_scope before insert or update of session_id, enrollment_id on logos_academy.attendance_records
for each row execute function private.validate_attendance_scope();
create trigger makeup_records_absence before insert or update of attendance_record_id on logos_academy.makeup_records
for each row execute function private.validate_makeup_absence();

create index classes_curriculum_id_idx on logos_academy.classes (tenant_id, curriculum_id) where deleted_at is null;
create index classes_status_cursor_idx on logos_academy.classes (tenant_id, status, created_at, id) where deleted_at is null;
create index enrollments_student_cursor_idx on logos_academy.enrollments (tenant_id, student_profile_id, created_at, id) where deleted_at is null;
create index enrollments_class_status_idx on logos_academy.enrollments (tenant_id, class_id, status) where deleted_at is null and class_id is not null;
create index enrollments_curriculum_id_idx on logos_academy.enrollments (tenant_id, curriculum_id) where deleted_at is null;
create index sessions_class_calendar_idx on logos_academy.sessions (tenant_id, class_id, starts_at, id) where deleted_at is null and class_id is not null;
create index sessions_enrollment_calendar_idx on logos_academy.sessions (tenant_id, enrollment_id, starts_at, id) where deleted_at is null and enrollment_id is not null;
create index sessions_lesson_template_id_idx on logos_academy.sessions (tenant_id, lesson_template_id) where deleted_at is null;
create index attendance_records_enrollment_cursor_idx on logos_academy.attendance_records (tenant_id, enrollment_id, created_at, id) where deleted_at is null;
create index attendance_records_session_id_idx on logos_academy.attendance_records (tenant_id, session_id) where deleted_at is null;
create index attendance_records_recorded_by_user_id_idx on logos_academy.attendance_records (tenant_id, recorded_by_user_id);
create index attendance_private_notes_record_id_idx on logos_academy.attendance_private_notes (tenant_id, attendance_record_id) where deleted_at is null;
create index attendance_private_notes_user_id_idx on logos_academy.attendance_private_notes (tenant_id, recorded_by_user_id);
create index makeup_records_attendance_id_idx on logos_academy.makeup_records (tenant_id, attendance_record_id) where deleted_at is null;
create index makeup_records_session_id_idx on logos_academy.makeup_records (tenant_id, makeup_session_id) where makeup_session_id is not null;
create index makeup_records_user_id_idx on logos_academy.makeup_records (tenant_id, recorded_by_user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['classes','enrollments','sessions','attendance_records','attendance_private_notes','makeup_records'] loop
    execute format('create trigger %I_set_updated_at before update on logos_academy.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table logos_academy.%I enable row level security', table_name);
    execute format('alter table logos_academy.%I force row level security', table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
