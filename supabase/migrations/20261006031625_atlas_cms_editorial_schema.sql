begin;

alter table logos_academy.concepts
  add column status text not null default 'published',
  add column published_at timestamptz,
  add column archived_at timestamptz,
  add column tags text[] not null default '{}'::text[],
  add column updated_by_user_id uuid,
  add column video_transcript text,
  add column video_captions_reviewed boolean not null default false,
  add constraint concepts_status_check check (status in ('draft', 'published', 'archived')),
  add constraint concepts_editorial_dates_check check (
    (status = 'draft' and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  ) not valid,
  add constraint concepts_updated_by_user_id_fkey foreign key (tenant_id, updated_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict;

update logos_academy.concepts
set published_at = coalesce(published_at, created_at)
where status = 'published';

alter table logos_academy.concepts
  validate constraint concepts_editorial_dates_check;

alter table logos_academy.knowledge_resources
  alter column lesson_template_id drop not null,
  add column status text not null default 'published',
  add column published_at timestamptz,
  add column archived_at timestamptz,
  add column tags text[] not null default '{}'::text[],
  add column updated_by_user_id uuid,
  add constraint knowledge_resources_status_check check (status in ('draft', 'published', 'archived')),
  add constraint knowledge_resources_editorial_dates_check check (
    (status = 'draft' and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  ) not valid,
  add constraint knowledge_resources_updated_by_user_id_fkey foreign key (tenant_id, updated_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict;

update logos_academy.knowledge_resources
set published_at = coalesce(published_at, created_at)
where status = 'published';

alter table logos_academy.knowledge_resources
  validate constraint knowledge_resources_editorial_dates_check;

-- ponytail: a plain column DEFAULT can't express "published_at defaults to
-- now() only when status defaults to 'published'" -- the two defaults are
-- independent, so any bare insert that sets neither column (e.g. a fixture
-- insert that predates this CMS status field) violates
-- *_editorial_dates_check. admin_atlas_upsert's own insert always sets
-- status='draft' explicitly and never touches published_at, so defaulting
-- published_at itself would break *that* real path instead. A BEFORE INSERT
-- trigger is the minimal way to keep both defaults consistent without
-- touching the explicit-status insert path. Same function reused for both
-- tables -- identical column names, no tg_table_name branch needed.
create function private.atlas_default_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.atlas_default_published_at() from public, anon, authenticated;

create trigger concepts_default_published_at
before insert on logos_academy.concepts
for each row execute function private.atlas_default_published_at();

create trigger knowledge_resources_default_published_at
before insert on logos_academy.knowledge_resources
for each row execute function private.atlas_default_published_at();

create table logos_academy.knowledge_item_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  concept_id uuid,
  resource_id uuid,
  payload jsonb not null constraint knowledge_item_drafts_payload_object_check check (jsonb_typeof(payload) = 'object'),
  updated_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint knowledge_item_drafts_tenant_id_id_key unique (tenant_id, id),
  constraint knowledge_item_drafts_owner_check check (num_nonnulls(concept_id, resource_id) = 1),
  constraint knowledge_item_drafts_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint knowledge_item_drafts_concept_id_fkey foreign key (tenant_id, concept_id)
    references logos_academy.concepts(tenant_id, id) on delete restrict,
  constraint knowledge_item_drafts_resource_id_fkey foreign key (tenant_id, resource_id)
    references logos_academy.knowledge_resources(tenant_id, id) on delete restrict,
  constraint knowledge_item_drafts_updated_by_user_id_fkey foreign key (tenant_id, updated_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create unique index knowledge_item_drafts_active_concept_key
  on logos_academy.knowledge_item_drafts (tenant_id, concept_id)
  where concept_id is not null and deleted_at is null;
create unique index knowledge_item_drafts_active_resource_key
  on logos_academy.knowledge_item_drafts (tenant_id, resource_id)
  where resource_id is not null and deleted_at is null;
create index knowledge_item_drafts_updated_by_user_id_idx
  on logos_academy.knowledge_item_drafts (tenant_id, updated_by_user_id)
  where deleted_at is null;
create index knowledge_item_drafts_cursor_idx
  on logos_academy.knowledge_item_drafts (tenant_id, updated_at desc, id desc)
  where deleted_at is null;

create table logos_academy.knowledge_resource_lessons (
  tenant_id uuid not null,
  resource_id uuid not null,
  lesson_template_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (tenant_id, resource_id, lesson_template_id),
  constraint knowledge_resource_lessons_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint knowledge_resource_lessons_resource_id_fkey foreign key (tenant_id, resource_id)
    references logos_academy.knowledge_resources(tenant_id, id) on delete restrict,
  constraint knowledge_resource_lessons_lesson_template_id_fkey foreign key (tenant_id, lesson_template_id)
    references logos_academy.lesson_templates(tenant_id, id) on delete restrict
);

create index knowledge_resource_lessons_lesson_idx
  on logos_academy.knowledge_resource_lessons (tenant_id, lesson_template_id, resource_id)
  where deleted_at is null;
create index knowledge_resource_lessons_resource_idx
  on logos_academy.knowledge_resource_lessons (tenant_id, resource_id, lesson_template_id)
  where deleted_at is null;

insert into logos_academy.knowledge_resource_lessons (tenant_id, resource_id, lesson_template_id)
select tenant_id, id, lesson_template_id
from logos_academy.knowledge_resources
where deleted_at is null
on conflict do nothing;

create table logos_academy.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  concept_id uuid,
  resource_id uuid,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  bucket_path text not null check (length(bucket_path) between 1 and 1024),
  original_filename text not null check (length(btrim(original_filename)) between 1 and 255),
  alt text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  caption text,
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint knowledge_assets_tenant_id_id_key unique (tenant_id, id),
  constraint knowledge_assets_owner_check check (num_nonnulls(concept_id, resource_id) = 1),
  constraint knowledge_assets_ready_metadata_check check (
    status <> 'ready'
    or (length(btrim(alt)) > 0 and width is not null and height is not null)
  ),
  constraint knowledge_assets_bucket_path_key unique (bucket_path),
  constraint knowledge_assets_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint knowledge_assets_concept_id_fkey foreign key (tenant_id, concept_id)
    references logos_academy.concepts(tenant_id, id) on delete restrict,
  constraint knowledge_assets_resource_id_fkey foreign key (tenant_id, resource_id)
    references logos_academy.knowledge_resources(tenant_id, id) on delete restrict
);

create index knowledge_assets_concept_idx
  on logos_academy.knowledge_assets (tenant_id, concept_id, status, created_at, id)
  where concept_id is not null and deleted_at is null;
create index knowledge_assets_resource_idx
  on logos_academy.knowledge_assets (tenant_id, resource_id, status, created_at, id)
  where resource_id is not null and deleted_at is null;
create index knowledge_assets_status_idx
  on logos_academy.knowledge_assets (tenant_id, status, updated_at, id)
  where deleted_at is null;

create table logos_academy.knowledge_item_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  concept_id uuid,
  resource_id uuid,
  revision integer not null check (revision > 0),
  snapshot jsonb not null constraint knowledge_item_revisions_snapshot_object_check check (jsonb_typeof(snapshot) = 'object'),
  reason text not null check (reason in ('save', 'publish', 'archive', 'restore')),
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint knowledge_item_revisions_tenant_id_id_key unique (tenant_id, id),
  constraint knowledge_item_revisions_owner_check check (num_nonnulls(concept_id, resource_id) = 1),
  constraint knowledge_item_revisions_immutable_shape_check check (deleted_at is null and updated_at = created_at),
  constraint knowledge_item_revisions_tenant_id_fkey foreign key (tenant_id)
    references logos_academy.tenants(id) on delete restrict,
  constraint knowledge_item_revisions_concept_id_fkey foreign key (tenant_id, concept_id)
    references logos_academy.concepts(tenant_id, id) on delete restrict,
  constraint knowledge_item_revisions_resource_id_fkey foreign key (tenant_id, resource_id)
    references logos_academy.knowledge_resources(tenant_id, id) on delete restrict,
  constraint knowledge_item_revisions_created_by_user_id_fkey foreign key (tenant_id, created_by_user_id)
    references logos_academy.users(tenant_id, id) on delete restrict
);

create unique index knowledge_item_revisions_concept_revision_key
  on logos_academy.knowledge_item_revisions (tenant_id, concept_id, revision)
  where concept_id is not null;
create unique index knowledge_item_revisions_resource_revision_key
  on logos_academy.knowledge_item_revisions (tenant_id, resource_id, revision)
  where resource_id is not null;
create index knowledge_item_revisions_concept_cursor_idx
  on logos_academy.knowledge_item_revisions (tenant_id, concept_id, created_at desc, id desc)
  where concept_id is not null;
create index knowledge_item_revisions_resource_cursor_idx
  on logos_academy.knowledge_item_revisions (tenant_id, resource_id, created_at desc, id desc)
  where resource_id is not null;
create index knowledge_item_revisions_created_by_user_id_idx
  on logos_academy.knowledge_item_revisions (tenant_id, created_by_user_id);

create index concepts_admin_atlas_idx
  on logos_academy.concepts (tenant_id, status, updated_at desc, id desc)
  where deleted_at is null;
create index concepts_tags_idx
  on logos_academy.concepts using gin (tags)
  where deleted_at is null;
create index concepts_updated_by_user_id_idx
  on logos_academy.concepts (tenant_id, updated_by_user_id)
  where updated_by_user_id is not null and deleted_at is null;
create index knowledge_resources_admin_atlas_idx
  on logos_academy.knowledge_resources (tenant_id, kind, status, updated_at desc, id desc)
  where deleted_at is null;
create index knowledge_resources_tags_idx
  on logos_academy.knowledge_resources using gin (tags)
  where deleted_at is null;
create index knowledge_resources_updated_by_user_id_idx
  on logos_academy.knowledge_resources (tenant_id, updated_by_user_id)
  where updated_by_user_id is not null and deleted_at is null;

drop policy concepts_released_select on logos_academy.concepts;
create policy concepts_released_select on logos_academy.concepts
for select to authenticated
using (
  deleted_at is null
  and status = 'published'
  and exists (
    select 1 from logos_academy.lesson_concepts lc
    where lc.tenant_id = concepts.tenant_id
      and lc.concept_id = concepts.id
      and private.can_read_lesson(lc.tenant_id, lc.lesson_template_id)
  )
);

create trigger knowledge_item_drafts_set_updated_at
before update on logos_academy.knowledge_item_drafts
for each row execute function private.set_updated_at();
create trigger knowledge_resource_lessons_set_updated_at
before update on logos_academy.knowledge_resource_lessons
for each row execute function private.set_updated_at();
create trigger knowledge_assets_set_updated_at
before update on logos_academy.knowledge_assets
for each row execute function private.set_updated_at();
create trigger knowledge_item_revisions_set_updated_at
before update on logos_academy.knowledge_item_revisions
for each row execute function private.set_updated_at();
create trigger knowledge_item_revisions_immutable
before update or delete on logos_academy.knowledge_item_revisions
for each row execute function private.reject_mutation();

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'knowledge_item_drafts', 'knowledge_resource_lessons',
    'knowledge_assets', 'knowledge_item_revisions'
  ] loop
    execute format('alter table logos_academy.%I enable row level security', v_table);
    execute format('alter table logos_academy.%I force row level security', v_table);
    execute format('revoke all on logos_academy.%I from public, anon, authenticated, service_role', v_table);
  end loop;
end;
$$;

grant select, insert, update on logos_academy.knowledge_item_drafts to service_role;
grant select, insert, update on logos_academy.knowledge_resource_lessons to service_role;
grant select, insert, update on logos_academy.knowledge_assets to service_role;
grant select, insert on logos_academy.knowledge_item_revisions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-assets', 'knowledge-assets', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage is server-only. No client policy is intentionally created: the
-- service role issues short-lived signed URLs after the owner check in RPCs.

notify pgrst, 'reload schema';
commit;
