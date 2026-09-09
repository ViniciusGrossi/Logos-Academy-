begin;

create table logos_academy.curricula (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  version text not null check (length(btrim(version)) > 0),
  status text not null check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint curricula_tenant_id_id_key unique (tenant_id, id),
  constraint curricula_version_key unique (tenant_id, name, version),
  constraint curricula_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict
);

create table logos_academy.cycles (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, curriculum_id uuid not null,
  position smallint not null check (position between 1 and 4),
  title text not null check (length(btrim(title)) > 0), project_title text not null check (length(btrim(project_title)) > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint cycles_tenant_id_id_key unique (tenant_id, id),
  constraint cycles_position_key unique (tenant_id, curriculum_id, position),
  constraint cycles_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint cycles_curriculum_id_fkey foreign key (tenant_id, curriculum_id) references logos_academy.curricula(tenant_id, id) on delete restrict
);

create table logos_academy.lesson_templates (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, cycle_id uuid not null,
  position smallint not null check (position between 1 and 16),
  title text not null check (length(btrim(title)) > 0), objective text not null check (length(btrim(objective)) > 0),
  reference_content text not null check (length(btrim(reference_content)) > 0),
  estimated_activity_minutes smallint not null check (estimated_activity_minutes between 5 and 45),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint lesson_templates_tenant_id_id_key unique (tenant_id, id),
  constraint lesson_templates_cycle_position_key unique (tenant_id, cycle_id, position),
  constraint lesson_templates_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint lesson_templates_cycle_id_fkey foreign key (tenant_id, cycle_id) references logos_academy.cycles(tenant_id, id) on delete restrict
);

create table logos_academy.concepts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0), summary text not null check (length(btrim(summary)) > 0),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint concepts_tenant_id_id_key unique (tenant_id, id),
  constraint concepts_slug_key unique (tenant_id, slug),
  constraint concepts_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict
);

create table logos_academy.lesson_concepts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, lesson_template_id uuid not null, concept_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint lesson_concepts_tenant_id_id_key unique (tenant_id, id),
  constraint lesson_concepts_pair_key unique (tenant_id, lesson_template_id, concept_id),
  constraint lesson_concepts_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint lesson_concepts_lesson_template_id_fkey foreign key (tenant_id, lesson_template_id) references logos_academy.lesson_templates(tenant_id, id) on delete restrict,
  constraint lesson_concepts_concept_id_fkey foreign key (tenant_id, concept_id) references logos_academy.concepts(tenant_id, id) on delete restrict
);

create table logos_academy.activity_templates (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, lesson_template_id uuid not null,
  title text not null check (length(btrim(title)) > 0), objective text not null check (length(btrim(objective)) > 0),
  instructions text not null check (length(btrim(instructions)) > 0), continuity_guidance text not null check (length(btrim(continuity_guidance)) > 0),
  estimated_minutes smallint not null check (estimated_minutes between 5 and 45),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint activity_templates_tenant_id_id_key unique (tenant_id, id),
  constraint activity_templates_lesson_key unique (tenant_id, lesson_template_id),
  constraint activity_templates_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint activity_templates_lesson_template_id_fkey foreign key (tenant_id, lesson_template_id) references logos_academy.lesson_templates(tenant_id, id) on delete restrict
);

create table logos_academy.activity_requirements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, activity_template_id uuid not null,
  kind text not null check (kind in ('text','file','external_link','github_repository')),
  label text not null check (length(btrim(label)) > 0), is_required boolean not null, position smallint not null check (position >= 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint activity_requirements_tenant_id_id_key unique (tenant_id, id),
  constraint activity_requirements_position_key unique (tenant_id, activity_template_id, position),
  constraint activity_requirements_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint activity_requirements_activity_template_id_fkey foreign key (tenant_id, activity_template_id) references logos_academy.activity_templates(tenant_id, id) on delete restrict
);

create table logos_academy.activity_criteria (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, activity_template_id uuid not null,
  label text not null check (length(btrim(label)) > 0), description text not null check (length(btrim(description)) > 0),
  position smallint not null check (position >= 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint activity_criteria_tenant_id_id_key unique (tenant_id, id),
  constraint activity_criteria_position_key unique (tenant_id, activity_template_id, position),
  constraint activity_criteria_tenant_id_fkey foreign key (tenant_id) references logos_academy.tenants(id) on delete restrict,
  constraint activity_criteria_activity_template_id_fkey foreign key (tenant_id, activity_template_id) references logos_academy.activity_templates(tenant_id, id) on delete restrict
);

create index cycles_curriculum_id_idx on logos_academy.cycles (tenant_id, curriculum_id) where deleted_at is null;
create index lesson_templates_cycle_id_idx on logos_academy.lesson_templates (tenant_id, cycle_id, position) where deleted_at is null;
create index concepts_search_cursor_idx on logos_academy.concepts (tenant_id, slug, created_at, id) where deleted_at is null;
create index lesson_concepts_concept_id_idx on logos_academy.lesson_concepts (tenant_id, concept_id) where deleted_at is null;
create index activity_templates_lesson_template_id_idx on logos_academy.activity_templates (tenant_id, lesson_template_id) where deleted_at is null;
create index activity_requirements_template_idx on logos_academy.activity_requirements (tenant_id, activity_template_id, position) where deleted_at is null;
create index activity_criteria_template_idx on logos_academy.activity_criteria (tenant_id, activity_template_id, position) where deleted_at is null;

do $$
declare table_name text;
begin
  foreach table_name in array array['curricula','cycles','lesson_templates','concepts','lesson_concepts','activity_templates','activity_requirements','activity_criteria'] loop
    execute format('create trigger %I_set_updated_at before update on logos_academy.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table logos_academy.%I enable row level security', table_name);
    execute format('alter table logos_academy.%I force row level security', table_name);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
