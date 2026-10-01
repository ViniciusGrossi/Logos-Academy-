begin;

-- O administrador permanece; apenas o perfil de aluno criado para testes sai.
create temp table retained_admin on commit drop as
select id
from auth.users
where lower(email) = 'viniciussggrossi@gmail.com';

create temp table admin_student_profiles on commit drop as
select sp.tenant_id, sp.id
from logos_academy.student_profiles sp
join logos_academy.users u
  on u.tenant_id = sp.tenant_id and u.id = sp.user_id
join retained_admin a on a.id = u.auth_user_id;

do $$
begin
  if (select count(*) from retained_admin) <> 1 then
    raise exception 'expected exactly one retained Academy administrator';
  end if;

  if exists (
    select 1
    from logos_academy.enrollments e
    join admin_student_profiles sp on sp.tenant_id = e.tenant_id and sp.id = e.student_profile_id
  ) or exists (
    select 1
    from logos_academy.guardian_records gr
    join admin_student_profiles sp on sp.tenant_id = gr.tenant_id and sp.id = gr.student_profile_id
  ) or exists (
    select 1
    from logos_academy.uploaded_files uf
    join admin_student_profiles sp on sp.tenant_id = uf.tenant_id and sp.id = uf.student_profile_id
  ) then
    raise exception 'admin test profile still has dependent data';
  end if;
end;
$$;

delete from logos_academy.student_profiles sp
using admin_student_profiles asp
where sp.tenant_id = asp.tenant_id and sp.id = asp.id;

notify pgrst, 'reload schema';

commit;
