begin;

create or replace function private.guard_completion_evidence()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='project_records' then
    if new.status='approved' and current_setting('app.project_evidence', true) is distinct from 'on' then
      raise exception using errcode='42501', message='project approval requires the evidence workflow';
    end if;
  elsif tg_table_name='presentation_records' then
    if current_setting('app.record_presentation', true) is distinct from 'on' then
      raise exception using errcode='42501', message='presentation requires record_presentation';
    end if;
  elsif tg_table_name='completion_records' then
    if new.status='completed' and current_setting('app.complete_enrollment', true) is distinct from 'on' then
      raise exception using errcode='42501', message='completion record requires complete_enrollment';
    end if;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
