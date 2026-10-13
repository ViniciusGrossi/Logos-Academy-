-- Rollback manual: snapshot de definições remotas ANTES da publicação.
-- Restaurar somente estas funções; não executar migrations históricas completas.
begin;
CREATE OR REPLACE FUNCTION atlas_private.admin_atlas_asset_finalize(p_tenant_id uuid, p_actor_user_id uuid, p_asset_id uuid, p_alt text, p_caption text, p_backend_derived_content_type text, p_backend_derived_byte_size integer, p_backend_derived_width integer, p_backend_derived_height integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_asset logos_academy.knowledge_assets%rowtype; v_metadata jsonb;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  select * into v_asset from logos_academy.knowledge_assets where tenant_id=p_tenant_id and id=p_asset_id and deleted_at is null for update;
  if v_asset.id is null then raise exception using errcode='42501',message='atlas asset not available'; end if;
  -- Os valores backend_derived_* sÃ³ podem vir do adapter server-only depois
  -- de file-type + sharp validarem magic bytes, MIME, tamanho e dimensÃµes.
  if v_asset.status<>'pending' or coalesce(length(btrim(p_alt)),0)=0
    or coalesce(p_backend_derived_width,0)<=0 or coalesce(p_backend_derived_height,0)<=0
    or p_backend_derived_content_type is distinct from v_asset.content_type
    or p_backend_derived_byte_size is distinct from v_asset.byte_size
  then
    update logos_academy.knowledge_assets set status='failed' where id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','verified_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  select metadata into v_metadata from storage.objects where bucket_id='knowledge-assets' and name=v_asset.bucket_path;
  if v_metadata is null or coalesce(v_metadata->>'size','') !~ '^[0-9]+$'
    or (v_metadata->>'size')::integer<>v_asset.byte_size or v_metadata->>'mimetype' is distinct from v_asset.content_type
  then
    update logos_academy.knowledge_assets set status='failed' where id=v_asset.id returning * into v_asset;
    insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
    values(p_tenant_id,p_actor_user_id,'atlas.asset_failed','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'reason','storage_metadata'));
    return jsonb_build_object('id',v_asset.id,'status','failed');
  end if;
  update logos_academy.knowledge_assets set status='ready',alt=btrim(p_alt),caption=nullif(btrim(p_caption),''),width=p_backend_derived_width,height=p_backend_derived_height
  where id=v_asset.id returning * into v_asset;
  insert into logos_academy.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,request_id,metadata)
  values(p_tenant_id,p_actor_user_id,'atlas.asset_finalized','knowledge_asset',p_asset_id,gen_random_uuid(),jsonb_build_object('owner_id',coalesce(v_asset.concept_id,v_asset.resource_id),'status','ready'));
  return jsonb_build_object('id',v_asset.id,'ownerKind',case when v_asset.concept_id is not null then 'concept' else 'resource' end,'ownerId',coalesce(v_asset.concept_id,v_asset.resource_id),'status',v_asset.status,'filename',v_asset.original_filename,'contentType',v_asset.content_type,'sizeBytes',v_asset.byte_size,'width',v_asset.width,'height',v_asset.height,'alt',v_asset.alt,'caption',v_asset.caption,'createdAt',v_asset.created_at,'updatedAt',v_asset.updated_at);
end;
$function$


CREATE OR REPLACE FUNCTION logos_academy.admin_pending_makeups_page(p_tenant_id uuid, p_actor_user_id uuid, p_class_id uuid DEFAULT NULL::uuid, p_student_profile_id uuid DEFAULT NULL::uuid, p_cursor text DEFAULT NULL::text, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);

  with rows as (
    select
      ar.id attendance_id, ar.enrollment_id, ar.status,
      s.id session_id, s.starts_at, s.ends_at, s.status session_status,
      lt.position lesson_position, lt.title lesson_title,
      sp.id student_profile_id, u.display_name student_name,
      e.class_id, c.name class_name
    from logos_academy.attendance_records ar
    join logos_academy.sessions s on s.tenant_id = ar.tenant_id and s.id = ar.session_id and s.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
    join logos_academy.enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id and e.deleted_at is null
    join logos_academy.student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id and sp.deleted_at is null
    join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id and u.deleted_at is null
    left join logos_academy.classes c on c.tenant_id = e.tenant_id and c.id = e.class_id
    where ar.tenant_id = p_tenant_id
      and ar.status in ('absent', 'excused_absence')
      and ar.deleted_at is null
      and not exists (
        select 1 from logos_academy.makeup_records mr
        where mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
      )
      and (p_class_id is null or e.class_id = p_class_id)
      and (p_student_profile_id is null or sp.id = p_student_profile_id)
      and (v_cursor is null or (s.starts_at, ar.id) > ((v_cursor->>0)::timestamptz, (v_cursor->>1)::uuid))
    order by s.starts_at, ar.id
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(
      jsonb_agg(jsonb_build_object(
        'attendanceId', attendance_id,
        'enrollmentId', enrollment_id,
        'studentId', student_profile_id,
        'studentName', student_name,
        'classId', class_id,
        'className', class_name,
        'session', jsonb_build_object('id', session_id, 'lessonPosition', lesson_position, 'lessonTitle', lesson_title, 'startsAt', starts_at, 'endsAt', ends_at, 'status', session_status),
        'status', status
      ) order by starts_at, attendance_id),
      '[]'::jsonb
    ),
    -- terceiro elemento Ã© padding: private.admissions_page exige cursor de comprimento 3;
    -- a ordenaÃ§Ã£o e a comparaÃ§Ã£o usam apenas starts_at e attendance_id (Ã­ndices 0 e 1).
    (select encode(convert_to(jsonb_build_array(starts_at, attendance_id, attendance_id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$function$


CREATE OR REPLACE FUNCTION logos_academy.admin_student_attendance_page(p_tenant_id uuid, p_actor_user_id uuid, p_student_profile_id uuid, p_enrollment_id uuid DEFAULT NULL::uuid, p_encryption_key text DEFAULT NULL::text, p_cursor text DEFAULT NULL::text, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text; v_student_name text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;

  select u.display_name into v_student_name
  from logos_academy.student_profiles sp
  join logos_academy.users u on u.tenant_id = sp.tenant_id and u.id = sp.user_id
  where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null;
  if v_student_name is null then
    raise exception using errcode = 'P0002', message = 'student profile not found';
  end if;

  with rows as (
    select
      ar.id attendance_id, ar.created_at attendance_created_at, ar.enrollment_id, ar.status,
      s.id session_id, s.starts_at, s.ends_at, s.status session_status, lt.position lesson_position, lt.title lesson_title,
      pn.note_encrypted, mr.completed_at, mr.makeup_session_id
    from logos_academy.attendance_records ar
    join logos_academy.enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id and e.deleted_at is null
    join logos_academy.sessions s on s.tenant_id = ar.tenant_id and s.id = ar.session_id and s.deleted_at is null
    join logos_academy.lesson_templates lt on lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
    left join logos_academy.attendance_private_notes pn on pn.tenant_id = ar.tenant_id and pn.attendance_record_id = ar.id and pn.deleted_at is null
    left join logos_academy.makeup_records mr on mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id and mr.deleted_at is null
    where ar.tenant_id = p_tenant_id
      and e.student_profile_id = p_student_profile_id
      and ar.deleted_at is null
      and (p_enrollment_id is null or ar.enrollment_id = p_enrollment_id)
      and (v_cursor is null or (s.starts_at, ar.created_at, ar.id) > ((v_cursor->>0)::timestamptz, (v_cursor->>1)::timestamptz, (v_cursor->>2)::uuid))
    order by s.starts_at, ar.created_at, ar.id
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(
      jsonb_agg(jsonb_build_object(
        'attendanceId', attendance_id,
        'enrollmentId', enrollment_id,
        'studentName', v_student_name,
        'status', status,
        'privateNote', case when note_encrypted is null then null else extensions.pgp_sym_decrypt(note_encrypted, p_encryption_key) end,
        'makeup', case when completed_at is null then null else jsonb_build_object('completedAt', completed_at, 'makeupSessionId', makeup_session_id) end,
        'session', jsonb_build_object('id', session_id, 'lessonPosition', lesson_position, 'lessonTitle', lesson_title, 'startsAt', starts_at, 'endsAt', ends_at, 'status', session_status)
      ) order by starts_at, attendance_created_at, attendance_id),
      '[]'::jsonb
    ),
    (select encode(convert_to(jsonb_build_array(starts_at, attendance_created_at, attendance_id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$function$


CREATE OR REPLACE FUNCTION logos_academy.admin_student_submissions_page(p_tenant_id uuid, p_actor_user_id uuid, p_student_profile_id uuid, p_encryption_key text, p_cursor text DEFAULT NULL::text, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cursor jsonb := private.admissions_page(p_cursor, p_limit); v_items jsonb; v_next text;
begin
  perform private.assert_tenant_admin(p_tenant_id, p_actor_user_id);
  if length(coalesce(p_encryption_key, '')) = 0 then
    raise exception using errcode = '22023', message = 'encryption key required';
  end if;
  if not exists (
    select 1 from logos_academy.student_profiles sp
    where sp.tenant_id = p_tenant_id and sp.id = p_student_profile_id and sp.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'student profile not found';
  end if;

  with rows as (
    select s.id, s.submitted_at
    from logos_academy.submissions s
    join logos_academy.activity_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id and aa.deleted_at is null
    join logos_academy.enrollments e on e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id and e.deleted_at is null
    where s.tenant_id = p_tenant_id
      and e.student_profile_id = p_student_profile_id
      and not s.is_draft
      and s.deleted_at is null
      and (v_cursor is null or (s.submitted_at, s.id) < ((v_cursor->>0)::timestamptz, (v_cursor->>1)::uuid))
    order by s.submitted_at desc, s.id desc
    limit p_limit + 1
  ), page as (
    select * from rows limit p_limit
  ), tail as (
    select * from rows offset p_limit limit 1
  )
  select coalesce(jsonb_agg(private.admin_submission_detail(p_tenant_id, id, p_encryption_key) order by submitted_at desc, id desc), '[]'::jsonb),
    -- terceiro elemento Ã© padding (ver admin_pending_makeups_page acima).
    (select encode(convert_to(jsonb_build_array(submitted_at, id, id)::text, 'utf8'), 'base64') from tail)
  into v_items, v_next from page;

  return jsonb_build_object('items', v_items, 'nextCursor', v_next);
end;
$function$

notify pgrst,'reload schema';
commit;
