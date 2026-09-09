begin;

alter table logos_academy.reviews
  add column if not exists supersedes_review_id uuid;

alter table logos_academy.reviews
  drop constraint if exists reviews_supersedes_review_id_fkey;

alter table logos_academy.reviews
  add constraint reviews_supersedes_review_id_fkey
  foreign key (tenant_id, supersedes_review_id)
  references logos_academy.reviews(tenant_id, id)
  on delete restrict;

create or replace function private.admin_review_detail(
  p_tenant_id uuid,
  p_review_id uuid,
  p_encryption_key text
) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id', r.id,
    'decision', r.decision,
    'feedback', extensions.pgp_sym_decrypt(r.feedback_encrypted, p_encryption_key),
    'reviewerName', u.display_name,
    'reviewedAt', r.reviewed_at,
    'seenAt', (
      select fr.seen_at
      from logos_academy.feedback_receipts fr
      where fr.tenant_id = r.tenant_id and fr.review_id = r.id and fr.deleted_at is null
      order by fr.seen_at desc, fr.id desc
      limit 1
    ),
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object(
        'criterionId', cr.activity_criterion_id,
        'result', cr.result,
        'comment', case when cr.comment_encrypted is null then null else extensions.pgp_sym_decrypt(cr.comment_encrypted, p_encryption_key) end
      ) order by ac.position, cr.id)
      from logos_academy.criterion_reviews cr
      join logos_academy.activity_criteria ac on ac.tenant_id = cr.tenant_id and ac.id = cr.activity_criterion_id and ac.deleted_at is null
      where cr.tenant_id = r.tenant_id and cr.review_id = r.id and cr.deleted_at is null
    ), '[]'::jsonb)
  )
  from logos_academy.reviews r
  join logos_academy.users u on u.tenant_id = r.tenant_id and u.id = r.reviewer_user_id and u.deleted_at is null
  where r.tenant_id = p_tenant_id and r.id = p_review_id and r.deleted_at is null;
$$;

create or replace function private.admin_submission_detail(
  p_tenant_id uuid,
  p_submission_id uuid,
  p_encryption_key text
) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id', s.id,
    'assignmentId', s.activity_assignment_id,
    'version', s.version,
    'isDraft', s.is_draft,
    'submittedAt', s.submitted_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', si.id,
        'requirementId', si.activity_requirement_id,
        'kind', si.kind,
        'textValue', case when si.text_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.text_value_encrypted, p_encryption_key) end,
        'urlValue', case when si.url_value_encrypted is null then null else extensions.pgp_sym_decrypt(si.url_value_encrypted, p_encryption_key) end,
        'fileId', si.uploaded_file_id
      ) order by si.created_at, si.id)
      from logos_academy.submission_items si
      where si.tenant_id = s.tenant_id and si.submission_id = s.id and si.deleted_at is null
    ), '[]'::jsonb),
    'review', (
      select private.admin_review_detail(s.tenant_id, r.id, p_encryption_key)
      from logos_academy.reviews r
      where r.tenant_id = s.tenant_id and r.submission_id = s.id and r.deleted_at is null
      order by r.reviewed_at desc, r.id desc
      limit 1
    )
  )
  from logos_academy.submissions s
  where s.tenant_id = p_tenant_id and s.id = p_submission_id and s.deleted_at is null;
$$;

create or replace function logos_academy.admin_reviews_page(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_encryption_key text,
  p_class_id uuid default null,
  p_overdue_only boolean default false,
  p_cursor text default null,
  p_limit integer default 25
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;
  with rows as (
    select s.id, s.submitted_at
    from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id and aa.deleted_at is null
    join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id and e.deleted_at is null
    where s.tenant_id = p_tenant_id and s.deleted_at is null and not s.is_draft
      and aa.status = 'submitted'
      and (p_class_id is null or e.class_id = p_class_id)
      and (not p_overdue_only or s.submitted_at <= now() - interval '48 hours')
      and (v_cursor is null or (s.submitted_at, s.id) > ((v_cursor->>0)::timestamptz, (v_cursor->>1)::uuid))
    order by s.submitted_at, s.id
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(jsonb_agg(private.admin_submission_detail(p_tenant_id, id, p_encryption_key) order by submitted_at, id), '[]'::jsonb),
    (select encode(convert_to(jsonb_build_array(submitted_at, id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;
  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$$;

create or replace function logos_academy.admin_publish_review(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_feedback text,
  p_criteria jsonb,
  p_encryption_key text,
  p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_submission logos_academy.submissions%rowtype; v_assignment logos_academy.activity_assignments%rowtype;
  v_review_id uuid := gen_random_uuid(); v_prior_review_id uuid; v_item jsonb; v_criteria_count integer;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if p_decision not in ('approved', 'revision_requested') or length(btrim(coalesce(p_feedback, ''))) = 0
    or jsonb_typeof(p_criteria) <> 'array' or length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'invalid review payload';
  end if;
  select s.* into v_submission from logos_academy.submissions s
  where s.tenant_id = p_tenant_id and s.id = p_submission_id and not s.is_draft and s.deleted_at is null for update;
  if v_submission.id is null then raise exception using errcode = 'P0002', message = 'submission not found'; end if;
  select aa.* into v_assignment from logos_academy.activity_assignments aa
  where aa.tenant_id = p_tenant_id and aa.id = v_submission.activity_assignment_id and aa.status = 'submitted' and aa.deleted_at is null for update;
  if v_assignment.id is null then raise exception using errcode = '23505', message = 'submission is not awaiting review'; end if;
  select count(*) into v_criteria_count from logos_academy.activity_criteria ac
  where ac.tenant_id = p_tenant_id and ac.activity_template_id = v_assignment.activity_template_id and ac.deleted_at is null;
  if jsonb_array_length(p_criteria) <> v_criteria_count
    or (select count(distinct value->>'criterionId') from jsonb_array_elements(p_criteria)) <> v_criteria_count
    or exists (
      select 1 from jsonb_array_elements(p_criteria) j(value)
      where value->>'result' not in ('met', 'needs_adjustment')
        or not exists (
          select 1 from logos_academy.activity_criteria ac
          where ac.tenant_id = p_tenant_id and ac.activity_template_id = v_assignment.activity_template_id
            and ac.id = (value->>'criterionId')::uuid and ac.deleted_at is null
        )
    ) then
    raise exception using errcode = '22023', message = 'review criteria must exactly match the activity';
  end if;
  select r.id into v_prior_review_id
  from logos_academy.reviews r
  join logos_academy.submissions prior_submission on prior_submission.tenant_id = r.tenant_id and prior_submission.id = r.submission_id
  where r.tenant_id = p_tenant_id and prior_submission.activity_assignment_id = v_assignment.id and r.deleted_at is null
  order by r.reviewed_at desc, r.id desc limit 1;
  insert into logos_academy.reviews(id, tenant_id, submission_id, reviewer_user_id, decision, feedback_encrypted, reviewed_at, supersedes_review_id)
  values(v_review_id, p_tenant_id, v_submission.id, p_actor_user_id, p_decision, extensions.pgp_sym_encrypt(btrim(p_feedback), p_encryption_key), now(), v_prior_review_id);
  for v_item in select value from jsonb_array_elements(p_criteria) loop
    insert into logos_academy.criterion_reviews(tenant_id, review_id, activity_criterion_id, result, comment_encrypted)
    values(p_tenant_id, v_review_id, (v_item->>'criterionId')::uuid, v_item->>'result',
      case when nullif(btrim(v_item->>'comment'), '') is null then null else extensions.pgp_sym_encrypt(btrim(v_item->>'comment'), p_encryption_key) end);
  end loop;
  update logos_academy.activity_assignments set status = p_decision where tenant_id = p_tenant_id and id = v_assignment.id;
  if p_decision = 'revision_requested' then
    insert into logos_academy.submissions(tenant_id, activity_assignment_id, version, is_draft)
    select p_tenant_id, v_assignment.id, coalesce(max(s.version), 0) + 1, true
    from logos_academy.submissions s where s.tenant_id = p_tenant_id and s.activity_assignment_id = v_assignment.id;
  end if;
  if v_prior_review_id is not null then
    insert into logos_academy.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata)
    values(p_tenant_id, p_actor_user_id, 'review.superseded', 'review', v_prior_review_id, p_request_id, jsonb_build_object('superseded_by_review_id', v_review_id));
  end if;
  insert into logos_academy.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, request_id, metadata)
  values(p_tenant_id, p_actor_user_id, 'review.published', 'review', v_review_id, p_request_id,
    jsonb_build_object('submission_id', v_submission.id, 'decision', p_decision, 'supersedes_review_id', v_prior_review_id));
  return private.admin_review_detail(p_tenant_id, v_review_id, p_encryption_key);
end;
$$;

create or replace function private.reject_review_mutation() returns trigger language plpgsql set search_path='' as $$
begin
  raise exception using errcode = '42501', message = 'published reviews are append-only';
end;
$$;

drop trigger if exists reviews_append_only on logos_academy.reviews;
create trigger reviews_append_only before update or delete on logos_academy.reviews
for each row execute function private.reject_review_mutation();

drop trigger if exists criterion_reviews_append_only on logos_academy.criterion_reviews;
create trigger criterion_reviews_append_only before update or delete on logos_academy.criterion_reviews
for each row execute function private.reject_review_mutation();

create index if not exists submissions_review_sla_cursor_idx
  on logos_academy.submissions (tenant_id, submitted_at, id)
  where deleted_at is null and not is_draft;
create index if not exists reviews_assignment_supersession_idx
  on logos_academy.reviews (tenant_id, supersedes_review_id)
  where deleted_at is null and supersedes_review_id is not null;

revoke all on function private.admin_review_detail(uuid,uuid,text), private.admin_submission_detail(uuid,uuid,text), private.reject_review_mutation() from public, anon, authenticated, service_role;
revoke all on function logos_academy.admin_reviews_page(uuid,uuid,text,uuid,boolean,text,integer), logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid) from public, anon, authenticated;
grant execute on function logos_academy.admin_reviews_page(uuid,uuid,text,uuid,boolean,text,integer), logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
