begin;

alter table logos_academy.cycles
  add column project_challenge text not null default 'Projeto Explorer preservado.',
  add column project_problem text not null default 'Contexto pedagogico preservado.',
  add column project_audience text not null default 'Estudante Explorer.',
  add column project_expected_result text not null default 'Evidencia de aprendizagem preservada.',
  add column project_quality_criteria text[] not null default array['Evidencia preservada'],
  add column project_concepts text[] not null default array['Conceitos preservados'];

/* O snapshot Explorer v1 e imutavel; o Explorer v2 recebe seu brief completo na 0049. */
/*
update logos_academy.cycles set
  project_challenge = case position
    when 1 then 'Criar um assistente de IA útil, confiável e fácil de explicar para um público específico.'
    when 2 then 'Criar uma campanha visual que conduza uma decisão clara usando hierarquia, contraste e narrativa.'
    when 3 then 'Construir uma automação que transforme uma entrada real em um resultado verificável.'
    else 'Transformar um problema real em um produto de IA pequeno, demonstrável e bem documentado.' end,
  project_problem = case position
    when 1 then 'Pedidos genéricos produzem respostas genéricas e pouco confiáveis.'
    when 2 then 'Mensagens visuais perdem força quando imagem, texto e chamada disputam a atenção.'
    when 3 then 'Tarefas repetitivas consomem tempo quando não existe um fluxo claro entre entrada, decisão e saída.'
    else 'Boas ideias não viram produto sem problema, usuário, escopo e evidência de funcionamento.' end,
  project_audience = case position
    when 1 then 'Uma pessoa que precisa resolver uma tarefa recorrente com apoio de IA.'
    when 2 then 'Pessoas que precisam compreender a mensagem principal e saber o que fazer em poucos segundos.'
    when 3 then 'Um usuário que executa manualmente um processo simples e repetitivo.'
    else 'Um usuário real afetado pelo problema escolhido pelo aluno.' end,
  project_expected_result = case position
    when 1 then 'Assistente com objetivo, personalidade, prompt principal, exemplos, testes e documentação.'
    when 2 then 'Campanha autoral com conceito, imagem principal, vídeo curto, copy e processo documentado.'
    when 3 then 'Workflow com problema, usuário, diagrama, prompt, teste, resultado e documentação.'
    else 'MVP com problema, usuário, solução, fluxo, demonstração, documentação e apresentação.' end,
  project_quality_criteria = case position
    when 1 then array['Objetivo e público claros','Prompt estruturado','Respostas testadas e verificadas','Melhoria registrada após os testes']
    when 2 then array['Uma mensagem principal perceptível','Hierarquia visual intencional','Imagem, texto e ação coerentes','Decisões explicadas entre versões']
    when 3 then array['Fluxo com começo, meio e fim','Entrada e saída verificáveis','Condição de decisão explícita','Teste e resultado documentados']
    else array['Problema e usuário reais','Escopo de MVP demonstrável','Solução testada','Aprendizados e próximos passos explicados'] end,
  project_concepts = case position
    when 1 then array['Prompt','Contexto','Restrições','Testes','Verificação']
    when 2 then array['Hierarquia visual','Contraste','Storytelling','Curadoria','Copy curta']
    when 3 then array['Gatilho','Entrada','Processamento','Condição','Saída']
    else array['Problema','Usuário','Escopo','MVP','Demonstração'] end;

*/
alter table logos_academy.cycles
  alter column project_challenge set not null,
  alter column project_problem set not null,
  alter column project_audience set not null,
  alter column project_expected_result set not null,
  alter column project_quality_criteria set not null,
  alter column project_concepts set not null,
  add constraint cycles_project_brief_text_check check (
    length(btrim(project_challenge)) > 0 and length(btrim(project_problem)) > 0
    and length(btrim(project_audience)) > 0 and length(btrim(project_expected_result)) > 0
  ),
  add constraint cycles_project_brief_lists_check check (
    cardinality(project_quality_criteria) > 0 and cardinality(project_concepts) > 0
  );

create or replace function private.project_detail_json(p_tenant_id uuid,p_project_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.project_summary_json(pr.tenant_id,pr.enrollment_id,pr.cycle_id) || jsonb_build_object(
    'brief',jsonb_build_object(
      'challenge',c.project_challenge,'problem',c.project_problem,'audience',c.project_audience,
      'expectedResult',c.project_expected_result,'qualityCriteria',c.project_quality_criteria,'concepts',c.project_concepts
    ),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'status',aa.status,
        'latestVersion',(select max(s.version) from logos_academy.submissions s where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null),
        'decision',null,'latestFeedback',null
      ) order by lt.position)
      from logos_academy.activity_assignments aa
      join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id
      join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
      where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null
    ),'[]'::jsonb)
  )
  from logos_academy.project_records pr
  join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id
  where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
$$;

create function private.project_dossier_json(p_tenant_id uuid,p_project_id uuid,p_encryption_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.project_summary_json(pr.tenant_id,pr.enrollment_id,pr.cycle_id) || jsonb_build_object(
    'brief',jsonb_build_object(
      'challenge',c.project_challenge,'problem',c.project_problem,'audience',c.project_audience,
      'expectedResult',c.project_expected_result,'qualityCriteria',c.project_quality_criteria,'concepts',c.project_concepts
    ),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignmentId',aa.id,'lessonPosition',lt.position,'title',at.title,'status',aa.status,
        'latestVersion',lv.version,'decision',di.value,
        'latestFeedback',case when lf.id is null then null else jsonb_build_object(
          'decision',lf.decision,'feedback',lf.feedback,'reviewerName',lf.reviewer_name,'reviewedAt',lf.reviewed_at
        ) end
      ) order by lt.position)
      from logos_academy.activity_assignments aa
      join logos_academy.activity_templates at on at.tenant_id=aa.tenant_id and at.id=aa.activity_template_id
      join logos_academy.lesson_templates lt on lt.tenant_id=at.tenant_id and lt.id=at.lesson_template_id
      left join lateral (
        select s.version from logos_academy.submissions s
        where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null
        order by s.version desc limit 1
      ) lv on true
      left join lateral (
        select extensions.pgp_sym_decrypt(si.text_value_encrypted,p_encryption_key) value
        from logos_academy.submissions s
        join logos_academy.submission_items si on si.tenant_id=s.tenant_id and si.submission_id=s.id and si.kind='text' and si.deleted_at is null
        join logos_academy.activity_requirements ar on ar.tenant_id=si.tenant_id and ar.id=si.activity_requirement_id and ar.deleted_at is null
        where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null
        order by s.version desc,(lower(ar.label) like '%decis%') desc,ar.position limit 1
      ) di on true
      left join lateral (
        select r.id,r.decision,extensions.pgp_sym_decrypt(r.feedback_encrypted,p_encryption_key) feedback,
          u.display_name reviewer_name,r.reviewed_at
        from logos_academy.submissions s
        join logos_academy.reviews r on r.tenant_id=s.tenant_id and r.submission_id=s.id and r.deleted_at is null
        join logos_academy.users u on u.tenant_id=r.tenant_id and u.id=r.reviewer_user_id and u.deleted_at is null
        where s.tenant_id=aa.tenant_id and s.activity_assignment_id=aa.id and s.deleted_at is null
        order by r.reviewed_at desc,r.id desc limit 1
      ) lf on true
      where aa.tenant_id=pr.tenant_id and aa.enrollment_id=pr.enrollment_id and lt.cycle_id=pr.cycle_id and aa.deleted_at is null
    ),'[]'::jsonb)
  )
  from logos_academy.project_records pr
  join logos_academy.cycles c on c.tenant_id=pr.tenant_id and c.id=pr.cycle_id
  where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
$$;

drop function logos_academy.student_project_detail(uuid,uuid,uuid);
create function logos_academy.student_project_detail(p_tenant_id uuid,p_actor_user_id uuid,p_project_id uuid,p_encryption_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_enrollment uuid; v jsonb;
begin
  select pr.enrollment_id into v_enrollment from logos_academy.project_records pr
  where pr.tenant_id=p_tenant_id and pr.id=p_project_id and pr.deleted_at is null;
  perform private.student_enrollment(p_tenant_id,p_actor_user_id,v_enrollment);
  select private.project_dossier_json(p_tenant_id,p_project_id,p_encryption_key) into v;
  if v is null then raise exception using errcode='42501',message='project unavailable'; end if;
  return v;
end;
$$;

revoke all on function private.project_dossier_json(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function logos_academy.student_project_detail(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function logos_academy.student_project_detail(uuid,uuid,uuid,text) to service_role;

notify pgrst,'reload schema';
commit;
