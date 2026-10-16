begin;

-- Portfolio ordering is (approved_at, project_id), unlike the three-field
-- administrative cursor. Validate its own opaque cursor shape before querying.
create or replace function logos_academy.student_portfolio_page(
  p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid default null,p_cursor text default null,p_limit integer default 25
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cursor jsonb; v_items jsonb; v_next text;
begin
  if p_limit not between 1 and 100 then raise exception using errcode='22023',message='invalid page limit'; end if;
  if p_cursor is not null then
    begin v_cursor:=convert_from(decode(p_cursor,'base64'),'utf8')::jsonb;
    exception when others then raise exception using errcode='22023',message='invalid cursor'; end;
    if jsonb_typeof(v_cursor)<>'array' or jsonb_array_length(v_cursor)<>2 then raise exception using errcode='22023',message='invalid cursor'; end if;
  end if;
  if p_enrollment_id is not null then perform private.student_enrollment(p_tenant_id,p_actor_user_id,p_enrollment_id); end if;
  with rows as (select pr.id,pr.approved_at from logos_academy.project_records pr join logos_academy.enrollments e on e.tenant_id=pr.tenant_id and e.id=pr.enrollment_id join logos_academy.student_profiles sp on sp.tenant_id=e.tenant_id and sp.id=e.student_profile_id where pr.tenant_id=p_tenant_id and sp.user_id=p_actor_user_id and pr.status='approved' and pr.deleted_at is null and e.deleted_at is null and sp.deleted_at is null and (p_enrollment_id is null or pr.enrollment_id=p_enrollment_id) and (v_cursor is null or (pr.approved_at,pr.id)<((v_cursor->>0)::timestamptz,(v_cursor->>1)::uuid)) order by pr.approved_at desc,pr.id desc limit p_limit+1), page as(select * from rows limit p_limit), tail as(select * from rows offset p_limit limit 1), page_tail as(select * from page offset greatest(p_limit-1,0) limit 1)
  select coalesce(jsonb_agg(private.project_detail_json(p_tenant_id,id) order by approved_at desc,id desc),'[]'::jsonb),(select case when exists(select 1 from tail) then encode(convert_to(jsonb_build_array(approved_at,id)::text,'utf8'),'base64') end from page_tail) into v_items,v_next from page;
  return jsonb_build_object('items',v_items,'nextCursor',v_next);
end;
$$;

revoke all on function logos_academy.student_portfolio_page(uuid,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function logos_academy.student_portfolio_page(uuid,uuid,uuid,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
