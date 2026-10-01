begin;

-- A versão anterior retornava OLD para todo UPDATE e anulava alterações fora do v1.
create or replace function private.guard_explorer_v1_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tenant_id uuid := (to_jsonb(old)->>'tenant_id')::uuid;
  v_id uuid := (to_jsonb(old)->>'id')::uuid;
  v_curriculum_id uuid := md5('logos-academy-explorer-v1-curriculum')::uuid;
  v_is_explorer boolean;
begin
  v_is_explorer := case tg_table_name
    when 'curricula' then v_id = v_curriculum_id
    when 'cycles' then (to_jsonb(old)->>'curriculum_id')::uuid = v_curriculum_id
    when 'lesson_templates' then exists (select 1 from logos_academy.cycles c where c.tenant_id = v_tenant_id and c.id = (to_jsonb(old)->>'cycle_id')::uuid and c.curriculum_id = v_curriculum_id)
    when 'activity_templates' then exists (select 1 from logos_academy.lesson_templates l join logos_academy.cycles c on c.tenant_id = l.tenant_id and c.id = l.cycle_id where l.tenant_id = v_tenant_id and l.id = (to_jsonb(old)->>'lesson_template_id')::uuid and c.curriculum_id = v_curriculum_id)
    when 'activity_requirements' then exists (select 1 from logos_academy.activity_templates a join logos_academy.lesson_templates l on l.tenant_id = a.tenant_id and l.id = a.lesson_template_id join logos_academy.cycles c on c.tenant_id = l.tenant_id and c.id = l.cycle_id where a.tenant_id = v_tenant_id and a.id = (to_jsonb(old)->>'activity_template_id')::uuid and c.curriculum_id = v_curriculum_id)
    when 'activity_criteria' then exists (select 1 from logos_academy.activity_templates a join logos_academy.lesson_templates l on l.tenant_id = a.tenant_id and l.id = a.lesson_template_id join logos_academy.cycles c on c.tenant_id = l.tenant_id and c.id = l.cycle_id where a.tenant_id = v_tenant_id and a.id = (to_jsonb(old)->>'activity_template_id')::uuid and c.curriculum_id = v_curriculum_id)
    when 'lesson_concepts' then exists (select 1 from logos_academy.lesson_templates l join logos_academy.cycles c on c.tenant_id = l.tenant_id and c.id = l.cycle_id where l.tenant_id = v_tenant_id and l.id = (to_jsonb(old)->>'lesson_template_id')::uuid and c.curriculum_id = v_curriculum_id)
    when 'concepts' then exists (select 1 from logos_academy.lesson_concepts lc join logos_academy.lesson_templates l on l.tenant_id = lc.tenant_id and l.id = lc.lesson_template_id join logos_academy.cycles c on c.tenant_id = l.tenant_id and c.id = l.cycle_id where lc.tenant_id = v_tenant_id and lc.concept_id = v_id and c.curriculum_id = v_curriculum_id)
  end;
  if v_is_explorer then
    raise exception using errcode = '42501', message = 'Explorer v1 curriculum is immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

update logos_academy.curricula
set status = 'archived', updated_at = now()
where id = md5('logos-academy-explorer-v2-curriculum')::uuid
  and status = 'active';

commit;
