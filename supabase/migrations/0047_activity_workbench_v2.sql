begin;

-- Expansão segura de schema. O conteúdo versionado entra somente na 0049;
-- nenhuma linha canônica do Explorer v1 é alterada aqui.
alter table logos_academy.activity_templates
  add column if not exists context text,
  add column if not exists expected_result text,
  add column if not exists steps jsonb not null default '[]'::jsonb,
  add column if not exists plan_b text,
  add column if not exists reflection_prompt text,
  add column if not exists portfolio_evidence text,
  add column if not exists tool_hint text;

alter table logos_academy.activity_templates
  drop constraint if exists activity_templates_steps_array_check,
  add constraint activity_templates_steps_array_check check (jsonb_typeof(steps) = 'array');

notify pgrst, 'reload schema';
commit;
