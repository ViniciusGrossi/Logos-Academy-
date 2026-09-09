begin;

create or replace function logos_academy.admin_update_enrollment(p_tenant_id uuid,p_actor_user_id uuid,p_enrollment_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v logos_academy.enrollments%rowtype;
begin
  perform private.assert_tenant_admin(p_tenant_id,p_actor_user_id);
  if p_status not in ('invited','active','paused','cancelled') then raise exception using errcode='22023',message='invalid enrollment status'; end if;
  update logos_academy.enrollments set status=p_status,activated_at=case when p_status in ('active','paused') then coalesce(activated_at,now()) else activated_at end where tenant_id=p_tenant_id and id=p_enrollment_id and deleted_at is null returning * into v;
  if not found then raise exception using errcode='P0002',message='enrollment not found'; end if;
  return jsonb_build_object('id',v.id,'studentId',v.student_profile_id,'kind',v.kind,'classId',v.class_id,'status',v.status,'activatedAt',v.activated_at,'completedAt',v.completed_at);
end; $$;

revoke all on function logos_academy.admin_update_enrollment(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function logos_academy.admin_update_enrollment(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
