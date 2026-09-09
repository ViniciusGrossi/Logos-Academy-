begin;

create or replace function logos_academy.student_concepts_page(p_tenant_id uuid,p_actor_user_id uuid,p_search text default null,p_cursor text default null,p_limit integer default 25) returns jsonb language plpgsql security definer set search_path='' as $$
declare cursor_value jsonb:=private.admissions_page(p_cursor,p_limit); items jsonb; next_cursor text;
begin
  if not exists(select 1 from logos_academy.student_profiles sp where sp.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and sp.deleted_at is null) then raise exception using errcode='42501',message='student required'; end if;
  with rows as (select c.id,c.slug,c.title,c.summary,c.created_at,min(aa.released_at) released_at from logos_academy.concepts c join logos_academy.lesson_concepts lc on lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null join logos_academy.activity_templates at on at.tenant_id=lc.tenant_id and at.lesson_template_id=lc.lesson_template_id and at.deleted_at is null join logos_academy.activity_assignments aa on aa.tenant_id=at.tenant_id and aa.activity_template_id=at.id and aa.deleted_at is null join logos_academy.enrollments e on e.tenant_id=aa.tenant_id and e.id=aa.enrollment_id and e.deleted_at is null join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id and sp.deleted_at is null where c.tenant_id=p_tenant_id and c.deleted_at is null and sp.user_id=p_actor_user_id and aa.status<>'locked' and aa.released_at is not null and (coalesce(btrim(p_search),'')='' or translate(lower(c.title||' '||c.summary),'áàãâéêíóôõúç','aaaaeeiooouc') like '%'||translate(lower(btrim(p_search)),'áàãâéêíóôõúç','aaaaeeiooouc')||'%') and (cursor_value is null or (c.title,c.created_at,c.id)>((cursor_value->>0),(cursor_value->>1)::timestamptz,(cursor_value->>2)::uuid)) group by c.id,c.slug,c.title,c.summary,c.created_at order by c.title,c.created_at,c.id limit p_limit+1), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1) select coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'summary',summary,'releasedAt',released_at) order by title,created_at,id),'[]'::jsonb),(select encode(convert_to(jsonb_build_array(title,created_at,id)::text,'utf8'),'base64') from tail) into items,next_cursor from page;
  return jsonb_build_object('items',items,'nextCursor',next_cursor);
end; $$;

create or replace function logos_academy.student_concept_detail(p_tenant_id uuid,p_actor_user_id uuid,p_concept_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
  select jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'body',c.body,'releasedAt',min(aa.released_at),'relatedConcepts','[]'::jsonb) into v from logos_academy.concepts c join logos_academy.lesson_concepts lc on lc.tenant_id=c.tenant_id and lc.concept_id=c.id and lc.deleted_at is null join logos_academy.activity_templates at on at.tenant_id=lc.tenant_id and at.lesson_template_id=lc.lesson_template_id and at.deleted_at is null join logos_academy.activity_assignments aa on aa.tenant_id=at.tenant_id and aa.activity_template_id=at.id and aa.deleted_at is null join logos_academy.enrollments e on e.tenant_id=aa.tenant_id and e.id=aa.enrollment_id and e.deleted_at is null join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id and sp.deleted_at is null where c.tenant_id=p_tenant_id and c.id=p_concept_id and c.deleted_at is null and sp.user_id=p_actor_user_id and aa.status<>'locked' and aa.released_at is not null group by c.id,c.slug,c.title,c.summary,c.body;
  if v is null then raise exception using errcode='42501',message='concept not released'; end if; return v;
end; $$;

revoke all on function logos_academy.student_concepts_page(uuid,uuid,text,text,integer),logos_academy.student_concept_detail(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function logos_academy.student_concepts_page(uuid,uuid,text,text,integer),logos_academy.student_concept_detail(uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
