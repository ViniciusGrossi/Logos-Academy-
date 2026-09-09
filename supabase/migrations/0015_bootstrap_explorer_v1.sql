begin;

-- Canonical operational data. Fixture tenants in seed.sql intentionally use different IDs/slugs.
insert into logos_academy.tenants (id, tenant_id, name, slug)
values (md5('logos-academy-operational-tenant')::uuid, md5('logos-academy-operational-tenant')::uuid, 'Logos Academy', 'logos-academy')
on conflict (slug) do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
)
insert into logos_academy.curricula (id, tenant_id, name, version, status)
select md5('logos-academy-explorer-v1-curriculum')::uuid, id, 'Explorer', 'v1', 'active'
from operational_tenant
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), cycles_data(position, title, project_title) as (
  values
    (1::smallint, 'Meu Assistente Inteligente', 'Meu Assistente Inteligente'),
    (2::smallint, 'Creative Studio', 'Creative Studio'),
    (3::smallint, 'Automation Lab', 'Automation Lab'),
    (4::smallint, 'AI Product', 'AI Product')
)
insert into logos_academy.cycles (id, tenant_id, curriculum_id, position, title, project_title)
select md5('logos-academy-explorer-v1-cycle-' || d.position)::uuid, t.id,
  md5('logos-academy-explorer-v1-curriculum')::uuid, d.position, d.title, d.project_title
from operational_tenant t cross join cycles_data d
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), lessons(cycle_position, position, title, objective, reference_content, estimated_minutes) as (
  values
    (1::smallint,1::smallint,'Como computadores e IA funcionam','Entender como computadores processam informações e como a IA generativa recebe entrada, processa padrões e devolve uma saída provável que pode errar.','Conceitos: input, processamento, output, LLM, alucinação, verificação, uso responsável e cuidado com dados pessoais. Ferramentas: ChatGPT ou Gemini. Evidência: primeiras interações com IA generativa e reflexão crítica.',25::smallint),
    (1,2,'Ferramentas diferentes resolvem problemas diferentes','Comparar ferramentas de IA por utilidade, clareza, organização e confiabilidade.','Conceitos: ChatGPT, Gemini, Claude, NotebookLM, fontes, contexto, confiabilidade e limites de ferramentas gratuitas. Evidência: comparação entre ferramentas de IA.',25),
    (1,3,'Como conversar com uma IA','Criar prompts melhores usando contexto, objetivo, restrições, exemplos e formato de saída.','Conceitos: prompt ruim e bom, contexto, objetivo, restrições, exemplos, formato, iteração e revisão. Evidência: antes e depois de um prompt.',25),
    (1,4,'Project Day: Meu Assistente Inteligente','Construir um assistente de IA com nome, objetivo, personalidade, instruções e testes.','Project Day sem conteúdo novo: construir, testar, corrigir, documentar e apresentar o assistente. Evidência: página Meu Assistente Inteligente.',45),
    (2,1,'IA para criação visual','Transformar uma ideia em imagem usando prompts visuais com intenção e curadoria.','Conceitos: imagem generativa, estilo, composição, iluminação, cenário, aspect ratio, variações, curadoria e refinamento. Evidência: exploração visual com IA.',25),
    (2,2,'Storytelling e design','Transformar uma imagem ou ideia em comunicação visual com mensagem clara para um público.','Conceitos: campanha, público, mensagem, história, slogan, hierarquia visual, copy e tom de voz. Evidência: conceito criativo da campanha.',25),
    (2,3,'Vídeo e áudio com IA','Criar uma peça de vídeo ou animação curta entendendo vídeo como sequência, ritmo e mensagem.','Conceitos: roteiro, cena, gancho, duração, narração, trilha, texto na tela, ritmo, storyboard e edição. Evidência: vídeo inicial e roteiro.',25),
    (2,4,'Project Day: Creative Studio','Finalizar uma campanha digital autoral com imagem, vídeo, copy e apresentação.','Project Day sem conteúdo novo: consolidar campanha, ajustar visual, finalizar vídeo, documentar processo e apresentar. Evidência: página Creative Studio.',45),
    (3,1,'O que é automação','Pensar em processos com entrada, processamento, decisão e saída.','Conceitos: automação, gatilho, evento, ação, dados, fluxo, condição, automação versus IA e redução de escopo. Evidência: primeiro diagrama de automação.',25),
    (3,2,'Primeiro workflow no n8n','Construir um primeiro workflow funcional que executa uma ação.','Conceitos: interface do n8n, nodes, conexões, webhook, entrada, saída, teste e debug básico. Evidência: print do workflow e explicação.',25),
    (3,3,'IA dentro da automação','Entender como a IA processa informações dentro de um fluxo automatizado.','Conceitos: IA como etapa, classificação, resumo, prompt no fluxo, entrada e saída estruturada, API conceitual e controle de formato. Evidência: workflow, prompt e resultado.',25),
    (3,4,'Project Day: Automation Lab','Construir uma automação real ou simulada que resolva um problema simples.','Project Day sem conteúdo novo: finalizar ideia, montar fluxo, testar, corrigir, documentar e apresentar. Evidência: página Automation Lab.',45),
    (4,1,'O que é um produto','Pensar em problema, usuário e solução antes de pensar em ferramenta.','Conceitos: produto, problema, usuário, dor, solução, MVP, escopo, valor, validação e definição de pronto. Evidência: definição do problema do AI Product.',25),
    (4,2,'Design da solução','Desenhar o produto antes de construir para reduzir erro, confusão e retrabalho.','Conceitos: fluxo do usuário, wireframe, entrada, processamento, saída, jornada, papel da IA e protótipo versus funcional. Evidência: wireframe e fluxo do produto.',25),
    (4,3,'Build Day','Construir uma versão funcional ou demonstrável do AI Product com conhecimentos dos ciclos anteriores.','Build Day sem conteúdo novo: execução, mentoria, correção, redução de escopo, revisão de prompt, ajuste de fluxo e backup. Evidência: prints, vídeo, link e documentação.',45),
    (4,4,'Demo Day','Apresentar o produto final e fechar o Explorer com evidência pública de aprendizagem.','Demo Day: problema, solução, demonstração e aprendizado; portfólio com quatro projetos, reflexão final e continuidade para Builder. Evidência: projeto final e apresentação.',45)
)
insert into logos_academy.lesson_templates (id, tenant_id, cycle_id, position, title, objective, reference_content, estimated_activity_minutes)
select md5('logos-academy-explorer-v1-lesson-' || ((l.cycle_position - 1) * 4 + l.position))::uuid, t.id,
  md5('logos-academy-explorer-v1-cycle-' || l.cycle_position)::uuid, l.position, l.title, l.objective, l.reference_content, l.estimated_minutes
from operational_tenant t cross join lessons l
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), concepts_data(position, slug, title, summary, body) as (
  values
    (1,'ia-generativa','IA generativa','IA gera saídas prováveis e pode errar.','Entrada, processamento, saída, alucinação e verificação crítica.'),
    (2,'escolha-de-ferramentas','Escolha de ferramentas','Ferramentas devem ser escolhidas pela tarefa.','Utilidade, clareza, contexto e confiabilidade orientam a comparação.'),
    (3,'engenharia-de-prompts','Engenharia de prompts','Prompts claros dão direção à resposta.','Contexto, objetivo, restrições, exemplos e formato de saída.'),
    (4,'assistente-inteligente','Assistente inteligente','Um assistente resolve um problema específico.','Objetivo, público, personalidade, instruções, testes e documentação.'),
    (5,'criacao-visual-com-ia','Criação visual com IA','Prompts visuais exigem intenção e curadoria.','Estilo, composição, iluminação, cenário e refinamento.'),
    (6,'storytelling','Storytelling e design','Comunicação visual começa pelo público e pela mensagem.','Campanha, promessa, slogan, hierarquia, copy e tom de voz.'),
    (7,'video-e-audio','Vídeo e áudio','Vídeo combina sequência, ritmo e mensagem.','Roteiro, cenas, gancho, trilha, texto na tela e edição.'),
    (8,'campanha-digital','Campanha digital','Uma campanha reúne mensagem, visual e apresentação.','Imagem, vídeo, copy, processo e apresentação autoral.'),
    (9,'automacao','Automação','Automação transforma um fluxo repetível em processo.','Gatilho, evento, ação, dados, condição, entrada e saída.'),
    (10,'workflow-n8n','Workflow no n8n','Um workflow conecta etapas e executa uma ação.','Nodes, conexões, webhook, teste, saída e debug.'),
    (11,'ia-em-workflows','IA em workflows','IA pode classificar, resumir e gerar dentro de um fluxo.','Prompt, dados estruturados, condição, API conceitual e formato.'),
    (12,'automation-lab','Automation Lab','Uma automação simples pode resolver um problema real.','Diagrama, workflow, prompt, teste, resultado e documentação.'),
    (13,'produto-mvp','Produto e MVP','Produto conecta problema, usuário e solução viável.','Dor, valor, escopo, MVP, validação e definição de pronto.'),
    (14,'wireframe-e-fluxo','Wireframe e fluxo','Desenhar o fluxo reduz retrabalho.','Entrada, processamento, saída, jornada e papel da IA.'),
    (15,'construcao-de-mvp','Construção de MVP','Uma versão demonstrável prioriza o núcleo.','Execução, redução de escopo, evidências, documentação e backup.'),
    (16,'demo-day','Demo Day','Apresentar evidencia a evolução e o aprendizado.','Problema, solução, demonstração, reflexão e portfólio.')
)
insert into logos_academy.concepts (id, tenant_id, slug, title, summary, body)
select md5('logos-academy-explorer-v1-concept-' || d.position)::uuid, t.id, d.slug, d.title, d.summary, d.body
from operational_tenant t cross join concepts_data d
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
)
insert into logos_academy.lesson_concepts (id, tenant_id, lesson_template_id, concept_id)
select md5('logos-academy-explorer-v1-lesson-concept-' || n)::uuid, t.id,
  md5('logos-academy-explorer-v1-lesson-' || n)::uuid, md5('logos-academy-explorer-v1-concept-' || n)::uuid
from operational_tenant t cross join generate_series(1, 16) n
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), activities(position, instructions, continuity_guidance) as (
  values
    (1,'Faça quatro testes com IA, identifique resposta boa, estranha, verificável e surpreendente.','Registre as descobertas e traga uma ideia de tema para o assistente.'),
    (2,'Execute a mesma tarefa em duas ferramentas e compare clareza, organização, profundidade, utilidade e confiabilidade.','Escolha uma ferramenta para o Projeto 1 e justifique em três frases.'),
    (3,'Transforme “Me ajude a estudar” em três versões de prompt e compare os resultados.','Escreva o rascunho do prompt principal com papel, público, problema, tom, limites e formato.'),
    (4,'Crie, teste, corrija e documente um assistente com nome, problema, público, personalidade e instruções.','Melhore a documentação e, se possível, grave uma demonstração curta.'),
    (5,'Gere três imagens mudando um elemento por vez e explique a versão escolhida.','Escolha campanha, público, referência visual e mensagem principal.'),
    (6,'Crie um conceito de campanha com nome, público, mensagem, visual, slogan, copy e tom de voz.','Traga referências visual e de vídeo, clima de trilha e frase principal.'),
    (7,'Crie vídeo de 15 a 30 segundos: ideia, roteiro, cenas, imagem ou vídeo, áudio e edição.','Finalize título, texto, imagem, vídeo, copy e apresentação para o Project Day.'),
    (8,'Finalize campanha respondendo o que é, para quem é, que mensagem comunica, que visual usa e qual processo seguiu.','Organize no portfólio, salve links e grave apresentação se possível.'),
    (9,'Desenhe um fluxo com entrada, processamento, decisão, saída, usuário e valor.','Escolha uma tarefa repetitiva real e descreva frequência, entrada e saída.'),
    (10,'Crie um workflow formulário ou webhook, processamento simples e saída; execute um teste.','Explique o que cada etapa recebe, faz e entrega.'),
    (11,'Construa fluxo em que IA analisa ou classifica uma entrada e orienta a saída.','Melhore o prompt pedindo resposta curta, organizada, limitada e previsível.'),
    (12,'Construa uma automação útil, real ou simulada, e documente fluxo, teste e resultado.','Grave demonstração curta de problema, entrada, fluxo, saída e aprendizado.'),
    (13,'Preencha Product Brief com problema, usuário, solução, IA, escopo, entrada, saída, demo e o que fica fora.','Converse com uma pessoa real e registre o que descobriu.'),
    (14,'Desenhe entrada, processamento com IA ou automação, resultado e demonstração.','Liste materiais, prompts, formulários, automação, textos, evidências e backup.'),
    (15,'Construa uma versão demonstrável combinando IA, prompt, mídia, automação, formulário, página ou documentação.','Prepare apresentação de cinco minutos: problema, solução, demonstração, aprendizado e melhoria.'),
    (16,'Apresente cinco minutos: problema, solução, demonstração e aprendizado; registre a reflexão final.','Publique o portfólio final e registre aprendizados, dificuldades, melhorias e interesse no Builder.')
)
insert into logos_academy.activity_templates (id, tenant_id, lesson_template_id, title, objective, instructions, continuity_guidance, estimated_minutes)
select md5('logos-academy-explorer-v1-activity-' || a.position)::uuid, t.id,
  md5('logos-academy-explorer-v1-lesson-' || a.position)::uuid, 'Missão ' || a.position,
  l.objective, a.instructions, a.continuity_guidance, l.estimated_activity_minutes
from operational_tenant t cross join activities a
join logos_academy.lesson_templates l on l.tenant_id = t.id
  and l.id = md5('logos-academy-explorer-v1-lesson-' || a.position)::uuid
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), requirements(position, label, kind) as (
  values
    (1,'Registro com quatro perguntas, respostas e reflexão crítica','text'),(2,'Tabela comparativa e justificativa da ferramenta','text'),
    (3,'Documento com três versões de prompt e comparação','text'),(4,'Assistente documentado com exemplos e testes','text'),
    (5,'Grade de três imagens, prompts e justificativa','file'),(6,'Brief criativo da campanha','text'),
    (7,'Vídeo ou link, roteiro e copy','external_link'),(8,'Campanha final com imagem, vídeo, copy e processo','external_link'),
    (9,'Diagrama de automação','file'),(10,'Workflow funcionando e print do fluxo','external_link'),
    (11,'Workflow com IA ou simulação, prompt e teste','external_link'),(12,'Projeto de automação documentado','external_link'),
    (13,'Product Brief do projeto final','text'),(14,'Wireframe e fluxo do produto','file'),
    (15,'Versão demonstrável, evidências e documentação','external_link'),(16,'Apresentação final, portfólio e reflexão','text')
)
insert into logos_academy.activity_requirements (id, tenant_id, activity_template_id, kind, label, is_required, position)
select md5('logos-academy-explorer-v1-requirement-' || r.position)::uuid, t.id,
  md5('logos-academy-explorer-v1-activity-' || r.position)::uuid, r.kind, r.label, true, 1
from operational_tenant t cross join requirements r
on conflict do nothing;

with operational_tenant as (
  select id from logos_academy.tenants where slug = 'logos-academy' and deleted_at is null
), criteria(position, label, description) as (
  values
    (1,'Compreensão crítica','Explica entrada, saída, possibilidade de erro e necessidade de verificação.'),
    (2,'Escolha justificada','Justifica ferramenta por utilidade, clareza, formato ou confiabilidade.'),
    (3,'Prompt estruturado','Inclui contexto, objetivo, restrição e formato de resposta.'),
    (4,'Assistente demonstrável','Tem objetivo claro, prompt estruturado, três exemplos, cinco testes e melhoria.'),
    (5,'Curadoria visual','Gera três imagens e explica diferenças de direção visual.'),
    (6,'Comunicação clara','Campanha define nome, público, mensagem, visual, slogan e copy.'),
    (7,'Vídeo assistível','A peça tem começo, meio e fim, mesmo simples.'),
    (8,'Campanha completa','Entrega imagem, vídeo ou storyboard, copy, processo e apresentação.'),
    (9,'Fluxo compreensível','Explica começo, meio e fim da automação.'),
    (10,'Workflow executado','Mostra gatilho, processamento, saída e teste.'),
    (11,'IA no processo','Explica onde IA entra, o que recebe, devolve e o que acontece depois.'),
    (12,'Automação útil','Apresenta entrada, processamento, saída, teste e documentação.'),
    (13,'MVP definido','Tem problema, usuário, solução, escopo possível, demo e limites.'),
    (14,'Fluxo do produto','Explica usuário, entrada, processamento, resultado e papel da IA.'),
    (15,'MVP demonstrável','Problema e solução são compreensíveis e a demonstração mostra IA.'),
    (16,'Evidência de conclusão','Apresenta AI Product, quatro projetos, evolução, portfólio e reflexão.')
)
insert into logos_academy.activity_criteria (id, tenant_id, activity_template_id, label, description, position)
select md5('logos-academy-explorer-v1-criterion-' || c.position)::uuid, t.id,
  md5('logos-academy-explorer-v1-activity-' || c.position)::uuid, c.label, c.description, 1
from operational_tenant t cross join criteria c
on conflict do nothing;

create or replace function private.guard_explorer_v1_immutability()
returns trigger language plpgsql set search_path = '' as $$
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
    when 'activity_templates' then exists (select 1 from logos_academy.lesson_templates l join logos_academy.cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where l.tenant_id=v_tenant_id and l.id=(to_jsonb(old)->>'lesson_template_id')::uuid and c.curriculum_id=v_curriculum_id)
    when 'activity_requirements' then exists (select 1 from logos_academy.activity_templates a join logos_academy.lesson_templates l on l.tenant_id=a.tenant_id and l.id=a.lesson_template_id join logos_academy.cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where a.tenant_id=v_tenant_id and a.id=(to_jsonb(old)->>'activity_template_id')::uuid and c.curriculum_id=v_curriculum_id)
    when 'activity_criteria' then exists (select 1 from logos_academy.activity_templates a join logos_academy.lesson_templates l on l.tenant_id=a.tenant_id and l.id=a.lesson_template_id join logos_academy.cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where a.tenant_id=v_tenant_id and a.id=(to_jsonb(old)->>'activity_template_id')::uuid and c.curriculum_id=v_curriculum_id)
    when 'lesson_concepts' then exists (select 1 from logos_academy.lesson_templates l join logos_academy.cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where l.tenant_id=v_tenant_id and l.id=(to_jsonb(old)->>'lesson_template_id')::uuid and c.curriculum_id=v_curriculum_id)
    when 'concepts' then exists (select 1 from logos_academy.lesson_concepts lc join logos_academy.lesson_templates l on l.tenant_id=lc.tenant_id and l.id=lc.lesson_template_id join logos_academy.cycles c on c.tenant_id=l.tenant_id and c.id=l.cycle_id where lc.tenant_id=v_tenant_id and lc.concept_id=v_id and c.curriculum_id=v_curriculum_id)
  end;
  if v_is_explorer then
    raise exception using errcode = '42501', message = 'Explorer v1 curriculum is immutable';
  end if;
  return old;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['curricula','cycles','lesson_templates','concepts','lesson_concepts','activity_templates','activity_requirements','activity_criteria'] loop
    execute format('drop trigger if exists %I on logos_academy.%I', table_name || '_explorer_v1_immutable', table_name);
    execute format('create trigger %I before update or delete on logos_academy.%I for each row execute function private.guard_explorer_v1_immutability()', table_name || '_explorer_v1_immutable', table_name);
  end loop;
end;
$$;

revoke all on function private.guard_explorer_v1_immutability() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
