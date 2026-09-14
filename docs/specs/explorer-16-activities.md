---
title: "Explorer — proposta operacional das 16 atividades"
date: 2026-09-13
projeto: "Logos Academy Platform"
status: approved
tipo: auditoria curricular
fontes:
  - "../../../Curriculo/Curriculo_Operacional_Explorer.md"
  - "supabase/migrations/0015_bootstrap_explorer_v1.sql"
  - "supabase/migrations/0046_activity_workbench_context.sql"
  - "supabase/migrations/0047_activity_workbench_v2.sql"
  - "supabase/tests/046_activity_workbench_v2.test.sql"
  - "docs/PRD.md"
  - "docs/specs/curriculum-bootstrap.md"
  - "docs/specs/student-activity-workbench.md"
tags: [spec, curriculo, explorer, atividades, evidencias]
---

# Explorer — proposta operacional das 16 atividades

## Objetivo

Definir uma proposta canônica, verificável e implementável para as 16 atividades do Explorer. Cada atividade deve prolongar o encontro presencial, produzir evidência útil para o projeto do ciclo e usar entregáveis compatíveis com os quatro tipos já suportados pela plataforma: `text`, `file`, `external_link` e `github_repository`.

Esta spec define o conteúdo curricular aprovado. A implementação técnica é regida por `docs/specs/explorer-activity-system-v2.md`.

## Diagnóstico do estado atual

### O que já está consistente

- O currículo operacional, a migration `0015` e a expansão `0047` preservam a progressão Usar → Criar → Automatizar → Construir.
- Existem exatamente 16 atividades, agrupadas em quatro ciclos, com Project Days nas posições 4, 8, 12 e 16.
- A `0047` substitui títulos genéricos, acrescenta contexto, resultado esperado, passos, Plano B, reflexão e evidência de portfólio.
- A plataforma já valida o tipo do requisito e aceita `text`, `file`, `external_link` e `github_repository`.
- As atividades alimentam projetos por ciclo e a revisão usa critérios visíveis ao aluno.

### Lacunas encontradas

1. Vários requisitos da `0015` agregam artefatos de naturezas diferentes em um único campo. Um requisito `file`, por exemplo, não consegue receber também prompts e justificativa textual.
2. A `0047` acrescenta requisitos unitários, mas mantém os requisitos agregados da v1. Isso cria duplicação e, em alguns casos, obriga um link externo mesmo quando o Plano B admite produção offline ou simulada.
3. Parte dos critérios chamados de atômicos ainda contém duas ou mais verificações. “Entrega peça e processo” e “Portfólio e reflexão” não produzem uma decisão binária inequívoca.
4. Nenhuma atividade usa `github_repository`, apesar de esse tipo existir no contrato e o PRD prever orientação de GitHub quando uma atividade o exigir.
5. “Contexto” explica a relevância pedagógica, mas não explicita sempre o desafio em linguagem de missão para o aluno.
6. A `0047` altera conteúdo identificado como Explorer v1. A próxima consolidação deve criar uma versão curricular nova, mantendo a v1 como snapshot histórico imutável.

### Impacto por grupo de atividades

| Atividades | Estado persistido hoje | Impacto operacional |
|---|---|---|
| 1–3 | requisito v1 agregado + textos adicionais na `0047` | o formulário repete parte da entrega e não separa sempre experimento, resultado e reflexão |
| 4 | um texto agregado + prompt, exemplos, testes e vídeo adicional | a ficha do assistente e a melhoria pós-teste continuam misturadas no requisito agregado |
| 5 | um `file` agregado + prompts e justificativa em texto | o arquivo precisa representar a grade; prompts e justificativa não devem estar no label do campo de upload |
| 6 | brief em `text`, slogan/copy em `text` e imagem em `file` | estrutura próxima do ideal, mas o brief original ainda repete itens dos campos adicionais |
| 7–8 | requisito v1 `external_link` agrega vídeo, roteiro, copy ou campanha inteira | um link não armazena os textos nem substitui o arquivo da imagem; faltam artefatos com responsabilidade única |
| 9 | diagrama em `file` + frase em `text` | estrutura próxima do ideal; falta separar a ficha do processo da frase de valor |
| 10–12 | links externos obrigatórios nos requisitos v1, mesmo com Planos B offline/simulados | aluno pode concluir pedagogicamente o Plano B e ainda ficar tecnicamente impedido de enviar |
| 13–14 | brief/texto e wireframe/arquivo, com complementos | falta tornar descoberta real, escopo, wireframe e fluxo verificáveis como artefatos separados |
| 15 | dois links externos sobrepostos + documentação | não há campo próprio para teste, corte de escopo ou repositório opcional |
| 16 | texto agregado + link do portfólio + reflexão | apresentação, portfólio e reflexão precisam de campos distintos; cada projeto precisa de critério próprio |

## Decisões da proposta

- Cada requisito representa um único artefato e um único tipo de armazenamento.
- Links de ferramentas ou peças publicadas usam `external_link`; arquivos enviados usam `file`; respostas e documentação curta usam `text`.
- `github_repository` é opcional no Build Day, pois nem todo AI Product exige código. Ele não pode bloquear projetos feitos com formulário, slides ou automação visual.
- Vídeo é opcional quando o currículo já prevê storyboard, prints ou demonstração simulada como alternativa válida.
- Cada critério responde a uma única pergunta de sim/não e pode ser revisado isoladamente como `met` ou `needs_adjustment`.
- A continuidade prepara a atividade seguinte e nomeia o artefato que será reutilizado.
- Project Days consolidam trabalho anterior; não introduzem conteúdo novo.
- Ao persistir esta proposta, criar Explorer v2 por migration idempotente. Não voltar a desabilitar a proteção para reescrever a v1.

## Matriz de continuidade

| Ciclo | Construção progressiva | Evidência final |
|---|---|---|
| 1 — Meu Assistente Inteligente | experimento crítico → escolha de ferramenta → prompt iterado → assistente testado | página do assistente, prompt, exemplos e testes |
| 2 — Creative Studio | exploração visual → brief → vídeo/storyboard → campanha consolidada | página da campanha com imagem, peça e processo |
| 3 — Automation Lab | diagrama → workflow básico → IA no fluxo → automação documentada | página da automação com diagrama, execução e teste |
| 4 — AI Product | problema → fluxo/wireframe → MVP → Demo Day | produto demonstrável, portfólio e reflexão |

## Proposta por atividade

### Atividade 1 — Primeiro experimento com IA

**Desafio:** descobrir em quatro testes quando uma resposta de IA ajuda, surpreende, parece estranha ou precisa ser verificada.

**Contexto:** IA generativa recebe uma entrada, processa padrões aprendidos e produz uma saída provável. Como ela pode errar, o primeiro hábito do Explorer deve ser observar e conferir, não aceitar automaticamente.

**Objetivo:** explicar entrada e saída de uma IA generativa e reconhecer pelo menos uma resposta que exige verificação.

**Passos:**

1. Perguntar algo cuja resposta o aluno já conhece.
2. Perguntar algo cuja resposta o aluno ainda não conhece.
3. Pedir a explicação simples de um tema.
4. Pedir uma resposta criativa.
5. Classificar e justificar cada resposta como boa, estranha, a verificar ou surpreendente.

**Entregáveis estruturados:**

- `text` obrigatório — **Registro dos quatro testes:** pergunta, resumo da resposta e classificação de cada teste.
- `text` obrigatório — **Explicação crítica:** por que a IA pode errar e qual resposta precisaria ser conferida.
- `file` opcional — **Evidência visual:** um print legível das interações, sem dados pessoais.

**Critérios atômicos:**

- Identifica a entrada enviada à IA.
- Identifica a saída devolvida pela IA.
- Registra exatamente quatro testes.
- Aponta pelo menos uma resposta que exige verificação.
- Explica em uma frase por que a IA pode errar.

**Continuidade:** escolher um tema e um problema específico para o assistente do Ciclo 1; esse tema será usado na comparação da Atividade 2.

**Evidência para projeto/portfólio:** card “Primeiro experimento com IA generativa”, com síntese dos quatro testes e, se houver, print anonimizado.

**Plano B:** usar respostas previamente salvas, simular previsões de palavras no quadro e registrar as perguntas em papel para testar depois.

### Atividade 2 — Duelo de ferramentas

**Desafio:** executar a mesma tarefa em duas ferramentas e escolher a mais adequada com base em critérios observáveis.

**Contexto:** ferramentas diferentes organizam contexto, fontes e respostas de modos distintos. A escolha deve depender da tarefa, não da aparência ou preferência pessoal.

**Objetivo:** comparar duas ferramentas de IA pela mesma tarefa e justificar qual delas serve melhor ao assistente do ciclo.

**Passos:**

1. Definir uma tarefa relacionada ao tema escolhido na Atividade 1.
2. Executar a mesma instrução, sem alterações, em duas ferramentas.
3. Comparar clareza, organização, utilidade e confiabilidade.
4. Escolher uma ferramenta e escrever a justificativa no formato “X para Y porque Z”.

**Entregáveis estruturados:**

- `text` obrigatório — **Tabela comparativa:** tarefa, ferramentas e comparação pelos quatro critérios.
- `text` obrigatório — **Escolha justificada:** “Eu escolheria X para Y porque Z”.
- `file` opcional — **Comparação visual:** print lado a lado, sem dados pessoais.

**Critérios atômicos:**

- Usa exatamente a mesma tarefa nas duas ferramentas.
- Compara a clareza das respostas.
- Compara a utilidade para a tarefa escolhida.
- Considera a necessidade de verificar a resposta.
- Justifica a escolha com pelo menos um critério observável.

**Continuidade:** levar a ferramenta escolhida e a tarefa de teste para a Atividade 3, onde o prompt será refinado em versões.

**Evidência para projeto/portfólio:** registro “Como escolhi a ferramenta do meu assistente”, contendo a tabela e a decisão.

**Plano B:** comparar duas respostas salvas, duas respostas da mesma ferramenta ou exemplos impressos preparados pelo professor.

### Atividade 3 — Laboratório de prompts: da v0 à v3

**Desafio:** transformar uma instrução vaga em um prompt que contenha contexto, objetivo, restrições e formato de saída.

**Contexto:** respostas úteis dependem de instruções compreensíveis. Iterar o mesmo prompt torna visível o efeito de cada decisão, sem incentivar a cópia de fórmulas prontas.

**Objetivo:** produzir e comparar quatro estados do mesmo prompt: original, v1, v2 e v3.

**Passos:**

1. Registrar o prompt original “Me ajude a estudar” ou equivalente relacionado ao projeto.
2. Criar a v1 tornando o pedido específico.
3. Criar a v2 acrescentando contexto e objetivo.
4. Criar a v3 acrescentando restrições e formato de resposta.
5. Executar as versões e explicar o que melhorou.

**Entregáveis estruturados:**

- `text` obrigatório — **Histórico do prompt:** original, v1, v2 e v3 identificados.
- `text` obrigatório — **Amostra de respostas:** síntese do resultado de cada versão.
- `text` obrigatório — **Análise da iteração:** qual mudança teve maior efeito e por quê.

**Critérios atômicos:**

- A v3 informa o contexto.
- A v3 declara um objetivo específico.
- A v3 contém pelo menos uma restrição.
- A v3 define o formato esperado da resposta.
- A análise compara a v3 com uma versão anterior.

**Continuidade:** adaptar a v3 para o prompt principal do assistente, acrescentando papel, público, personalidade e limite de atuação antes do Project Day.

**Evidência para projeto/portfólio:** peça “Antes e depois de um prompt”, com versões e aprendizado principal.

**Plano B:** revisar prompts impressos em grupo, simular respostas com colegas e preencher um checklist de prompt no papel.

### Atividade 4 — Project Day: Meu Assistente Inteligente

**Desafio:** entregar um assistente de escopo pequeno que responda de modo consistente, reconheça limites e melhore após testes.

**Contexto:** este Project Day consolida as três atividades anteriores. O valor está em ter propósito, instrução, teste e melhoria demonstráveis, não em criar um assistente que “faz tudo”.

**Objetivo:** construir, testar, corrigir, documentar e apresentar o Projeto 1.

**Passos:**

1. Definir nome, problema, público e objetivo do assistente.
2. Escrever personalidade, prompt principal, limites e comportamento quando não souber.
3. Criar três exemplos de interação.
4. Executar cinco testes diferentes e registrar o resultado.
5. Aplicar pelo menos uma melhoria baseada nos testes.
6. Preparar uma demonstração de até três minutos.

**Entregáveis estruturados:**

- `text` obrigatório — **Ficha do assistente:** nome, problema, público, objetivo, personalidade e limites.
- `text` obrigatório — **Prompt principal:** versão final completa.
- `text` obrigatório — **Exemplos:** três pares de entrada e saída esperada.
- `text` obrigatório — **Relatório de testes:** cinco testes, resultado e falhas encontradas.
- `text` obrigatório — **Melhoria aplicada:** mudança realizada e motivo.
- `external_link` opcional — **Demonstração gravada:** URL HTTPS acessível ao professor.

**Critérios atômicos:**

- O assistente resolve um problema específico para um público definido.
- O prompt principal contém papel, objetivo, tom e limites.
- Existem exatamente três exemplos de interação.
- Existem exatamente cinco testes registrados.
- Pelo menos uma alteração decorre de um teste.
- O aluno consegue explicar o assistente em até três minutos.

**Continuidade:** registrar uma limitação e uma melhoria futura no dossiê do Projeto 1; a próxima atividade inicia um novo ciclo, reutilizando o hábito de variar um elemento por vez.

**Evidência para projeto/portfólio:** página “Meu Assistente Inteligente” com ficha, prompt, exemplos, testes, melhoria e demonstração opcional.

**Plano B:** demonstrar com respostas salvas, apresentar o prompt e o roteiro de testes e concluir a execução quando a ferramenta voltar.

### Atividade 5 — Três direções para uma imagem

**Desafio:** gerar três versões da mesma ideia, alterando somente um elemento visual por vez, e selecionar a que melhor comunica a intenção.

**Contexto:** criação visual com IA exige direção e curadoria. Uma sequência controlada permite distinguir escolha intencional de geração aleatória.

**Objetivo:** experimentar estilo, luz, cenário ou composição e justificar uma escolha visual.

**Passos:**

1. Definir a ideia e a mensagem visual.
2. Produzir uma imagem-base.
3. Produzir duas variações, mudando um elemento por vez.
4. Comparar as três versões.
5. Escolher uma direção para a campanha do ciclo.

**Entregáveis estruturados:**

- `file` obrigatório — **Grade visual:** arquivo único com as três versões identificadas como A, B e C.
- `text` obrigatório — **Prompts:** prompt-base e alteração feita em cada variação.
- `text` obrigatório — **Curadoria:** versão escolhida, justificativa e próximo ajuste.

**Critérios atômicos:**

- A grade contém três versões da mesma ideia.
- Cada variação muda um elemento visual identificável.
- Os prompts permitem reconhecer o elemento alterado.
- A justificativa cita pelo menos um aspecto visual concreto.
- A versão escolhida se relaciona à mensagem pretendida.

**Continuidade:** levar a imagem escolhida, o público e a mensagem pretendida para compor o brief da Atividade 6.

**Evidência para projeto/portfólio:** estudo “Exploração visual com IA”, mostrando processo, não apenas a imagem final.

**Plano B:** montar um moodboard com imagens existentes, comparar referências fornecidas ou escrever os três prompts para geração posterior.

### Atividade 6 — Brief de campanha que comunica

**Desafio:** transformar a direção visual escolhida em uma campanha com público, mensagem, slogan, copy e tom coerentes.

**Contexto:** estética sem público e mensagem não constitui comunicação. O brief liga intenção, linguagem e peça antes da produção de vídeo.

**Objetivo:** definir o conceito criativo completo do Projeto 2.

**Passos:**

1. Nomear a campanha e descrever o que ela promove.
2. Definir um público específico.
3. Escrever a mensagem central em uma frase.
4. Definir estilo visual e tom de voz.
5. Criar slogan e copy curta.
6. Selecionar a imagem principal.

**Entregáveis estruturados:**

- `text` obrigatório — **Brief criativo:** nome, oferta/ideia, público, mensagem, estilo e tom.
- `text` obrigatório — **Slogan e copy:** slogan e texto curto da peça.
- `file` obrigatório — **Imagem principal:** arquivo visual selecionado ou composto.

**Critérios atômicos:**

- O público está descrito de forma específica.
- A mensagem central cabe em uma frase.
- O slogan se relaciona à mensagem central.
- A copy é adequada ao público definido.
- A imagem principal sustenta a mensagem da campanha.

**Continuidade:** preparar para a Atividade 7 uma referência de vídeo, um clima de áudio e a frase que precisa permanecer compreensível na peça.

**Evidência para projeto/portfólio:** brief “Conceito criativo da campanha”, acompanhado da imagem principal.

**Plano B:** criar o brief no papel ou em slides e usar imagens previamente baixadas ou a grade da Atividade 5.

### Atividade 7 — Vídeo curto: roteiro à primeira versão

**Desafio:** transformar o brief em uma peça de 15 a 30 segundos com começo, meio e fim, sem perder a mensagem em efeitos.

**Contexto:** vídeo combina sequência, ritmo, imagem e som. Uma peça simples e compreensível gera melhor evidência que uma produção sofisticada incompleta.

**Objetivo:** produzir uma primeira versão assistível ou um storyboard temporal completo da campanha.

**Passos:**

1. Escrever um roteiro com gancho, desenvolvimento e encerramento.
2. Dividir o roteiro em cenas com duração estimada.
3. Produzir ou selecionar a imagem de cada cena.
4. Definir narração, trilha ou ambiente sonoro.
5. Editar a primeira versão e conferir a mensagem.

**Entregáveis estruturados:**

- `text` obrigatório — **Roteiro temporal:** cenas, duração, ação visual e áudio.
- `external_link` obrigatório — **Primeira versão:** link HTTPS para vídeo ou storyboard compartilhável.
- `text` obrigatório — **Copy da peça:** textos usados na tela ou na narração.
- `file` opcional — **Backup:** exportação leve, storyboard em PDF ou frame-chave.

**Critérios atômicos:**

- O roteiro contém início, desenvolvimento e encerramento.
- A duração planejada está entre 15 e 30 segundos.
- O link abre sem solicitar permissão adicional ao professor.
- Imagem e áudio sustentam a mesma mensagem.
- A peça comunica a campanha sem explicação externa longa.

**Continuidade:** listar ajustes de imagem, áudio, ritmo e copy que serão concluídos no Project Day.

**Evidência para projeto/portfólio:** primeira versão do vídeo e roteiro, preservando a evolução até a peça final.

**Plano B:** criar storyboard compartilhável em slides, usar imagens estáticas com transições ou gravar narração sobre a apresentação.

### Atividade 8 — Project Day: Creative Studio

**Desafio:** finalizar e apresentar uma campanha autoral cuja imagem, peça, copy e processo comuniquem a mesma ideia.

**Contexto:** este Project Day consolida direção visual, brief e vídeo. O padrão de qualidade é clareza e coerência; perfeccionismo estético não deve impedir a entrega.

**Objetivo:** concluir, documentar e apresentar o Projeto 2.

**Passos:**

1. Revalidar público e mensagem central.
2. Finalizar a imagem principal.
3. Finalizar vídeo ou storyboard.
4. Revisar slogan e copy.
5. Documentar prompts, escolhas e ajustes.
6. Apresentar em até três minutos.

**Entregáveis estruturados:**

- `text` obrigatório — **Resumo da campanha:** nome, objetivo, público e mensagem.
- `file` obrigatório — **Imagem final:** arquivo pronto para exibição.
- `external_link` obrigatório — **Peça audiovisual:** vídeo ou storyboard compartilhável.
- `text` obrigatório — **Copy final:** slogan e texto da peça.
- `text` obrigatório — **Processo criativo:** prompts, escolha principal e melhoria realizada.

**Critérios atômicos:**

- O resumo identifica público e mensagem.
- A imagem final está legível e completa.
- A peça audiovisual abre pelo link informado.
- A copy final é coerente com o brief.
- O processo registra pelo menos uma decisão de curadoria.
- O aluno apresenta a campanha em até três minutos.

**Continuidade:** publicar a página do Projeto 2 no portfólio e levar para o ciclo seguinte uma tarefa repetitiva real que possa ser representada como fluxo.

**Evidência para projeto/portfólio:** página “Creative Studio” com imagem, peça audiovisual, copy e bastidores do processo.

**Plano B:** entregar imagem + storyboard + roteiro; usar slides narrados ou demonstrar a peça offline com arquivo exportado.

### Atividade 9 — Raio-X de uma automação

**Desafio:** representar uma tarefa repetitiva como entrada, processamento, decisão e saída antes de abrir uma ferramenta de automação.

**Contexto:** automação começa pela compreensão do processo. Um fluxo que não pode ser explicado no papel também será difícil de construir e testar no n8n.

**Objetivo:** desenhar um fluxo simples e explicar para quem ele gera valor.

**Passos:**

1. Escolher uma tarefa repetitiva real.
2. Identificar o evento ou dado de entrada.
3. Descrever o processamento.
4. Acrescentar uma decisão somente se necessária.
5. Definir saída e usuário beneficiado.
6. Resumir o valor do fluxo em uma frase.

**Entregáveis estruturados:**

- `file` obrigatório — **Diagrama do fluxo:** foto legível ou arquivo exportado.
- `text` obrigatório — **Ficha do processo:** frequência, entrada, processamento, saída e usuário.
- `text` obrigatório — **Frase de valor:** “Este fluxo ajuda X a Y porque Z”.

**Critérios atômicos:**

- O fluxo possui uma entrada identificada.
- O fluxo possui um processamento identificável.
- O fluxo possui uma saída identificada.
- O usuário beneficiado está nomeado.
- A frase de valor corresponde ao fluxo desenhado.

**Continuidade:** escolher a versão mínima do fluxo, sem decisões desnecessárias, para implementar na Atividade 10.

**Evidência para projeto/portfólio:** primeiro diagrama de automação acompanhado da explicação de valor.

**Plano B:** desenhar com papel, post-its ou quadro e fotografar; construir um fluxo coletivo se o aluno ainda não encontrar um caso próprio.

### Atividade 10 — Primeiro workflow em execução

**Desafio:** transformar o diagrama em um workflow mínimo com gatilho, processamento e saída realmente executados.

**Contexto:** o objetivo não é aprender toda a ferramenta, mas observar uma ação acontecendo de ponta a ponta e saber explicar os dados em cada etapa.

**Objetivo:** construir e testar um workflow básico no n8n ou alternativa disponível.

**Passos:**

1. Criar o gatilho por formulário, execução manual ou webhook.
2. Adicionar um processamento simples.
3. Configurar uma saída observável.
4. Executar um caso de teste.
5. Registrar o fluxo e o resultado.

**Entregáveis estruturados:**

- `external_link` opcional — **Workflow compartilhado:** URL HTTPS do fluxo quando o ambiente permitir compartilhamento.
- `file` obrigatório — **Print da execução:** visão do fluxo executado sem credenciais ou dados pessoais.
- `text` obrigatório — **Explicação dos nós:** o que cada etapa recebe, faz e entrega.
- `text` obrigatório — **Caso de teste:** entrada utilizada e saída obtida.

**Critérios atômicos:**

- Existe um gatilho configurado.
- Existe uma etapa de processamento.
- Existe uma saída observável.
- O caso de teste chegou até a saída.
- A explicação descreve cada etapa sem expor segredo.

**Continuidade:** identificar uma etapa em que classificação, resumo ou geração por IA agregaria valor ao workflow da Atividade 11.

**Evidência para projeto/portfólio:** print do primeiro workflow executado, com legenda de entrada, processamento e saída.

**Plano B:** usar o ambiente central do professor, duplicar um template, simular com formulário e planilha ou registrar a execução guiada em dupla.

### Atividade 11 — IA como etapa do fluxo

**Desafio:** inserir uma etapa de IA que receba uma entrada definida, produza uma resposta previsível e determine a ação seguinte.

**Contexto:** colocar IA dentro de um processo é diferente de conversar livremente com um chatbot. O fluxo precisa controlar entrada, prompt, formato da resposta e destino do resultado.

**Objetivo:** construir ou simular um workflow em que a IA analise, classifique, resuma ou gere uma saída utilizada pela automação.

**Passos:**

1. Definir a entrada que chegará à IA.
2. Escrever um prompt curto com formato de saída previsível.
3. Ligar a resposta a uma condição ou próxima ação.
4. Executar um teste.
5. Registrar entrada, resposta e saída final.

**Entregáveis estruturados:**

- `file` obrigatório — **Fluxo com IA:** print ou diagrama indicando a etapa de IA.
- `text` obrigatório — **Prompt da automação:** instrução completa usada no nó ou na simulação.
- `text` obrigatório — **Registro do teste:** entrada, resposta da IA e ação seguinte.
- `external_link` opcional — **Workflow compartilhado:** URL HTTPS quando disponível.

**Critérios atômicos:**

- A entrada recebida pela IA está definida.
- O prompt especifica o formato da resposta.
- A resposta da IA está registrada.
- O fluxo define uma ação posterior à resposta.
- O teste demonstra a passagem da entrada até a saída final.

**Continuidade:** escolher o problema pequeno que será resolvido no Project Day e preparar um teste de sucesso e um teste de falha.

**Evidência para projeto/portfólio:** comparação “chat isolado vs. IA no processo”, ilustrada pelo fluxo e pelo caso de teste.

**Plano B:** usar uma resposta mockada no lugar da API, executar a etapa de IA manualmente e manter o restante do fluxo e da documentação verificáveis.

### Atividade 12 — Project Day: Automation Lab

**Desafio:** entregar uma automação real ou simulada que resolva um problema pequeno de ponta a ponta e sobreviva a uma demonstração.

**Contexto:** este Project Day consolida diagrama, workflow e IA no processo. Problema pequeno resolvido tem mais valor pedagógico que fluxo grande e inacabado.

**Objetivo:** concluir, testar, documentar e apresentar o Projeto 3.

**Passos:**

1. Declarar problema, usuário e resultado esperado.
2. Revisar o diagrama e montar o workflow mínimo.
3. Executar um caso de sucesso.
4. Executar ou descrever um caso de falha seguro.
5. Registrar resultado e limitações.
6. Preparar uma demonstração curta.

**Entregáveis estruturados:**

- `text` obrigatório — **Ficha da automação:** problema, usuário, entrada e saída esperada.
- `file` obrigatório — **Diagrama final:** fluxo completo e legível.
- `file` obrigatório — **Evidência de execução:** print do caso de sucesso sem dados sensíveis.
- `text` obrigatório — **Teste e resultado:** entrada usada, saída obtida e limitação encontrada.
- `external_link` opcional — **Demonstração:** workflow compartilhado ou vídeo curto.

**Critérios atômicos:**

- O problema resolvido está descrito em uma frase.
- O diagrama representa entrada, processamento e saída.
- A evidência mostra uma execução concluída.
- O resultado do teste corresponde ao objetivo declarado.
- Pelo menos uma limitação está documentada.
- O aluno consegue explicar o fluxo de ponta a ponta.

**Continuidade:** publicar a página do Projeto 3 e observar um problema real que possa originar o AI Product do ciclo final.

**Evidência para projeto/portfólio:** página “Automation Lab” com problema, diagrama, execução, resultado e demonstração opcional.

**Plano B:** entregar diagrama completo, prompt, resposta mockada, fluxo parcial e vídeo ou roteiro que explique a simulação.

### Atividade 13 — Product Brief: problema antes da solução

**Desafio:** investigar uma necessidade real e reduzir a ideia a um produto demonstrável em uma semana.

**Contexto:** produto começa no problema e no usuário, não na ferramenta. Uma conversa curta com alguém afetado evita construir apenas a partir de suposições.

**Objetivo:** definir problema, usuário, solução, papel da IA e limites do MVP do Projeto 4.

**Passos:**

1. Descrever o problema e quem o enfrenta.
2. Registrar como a pessoa resolve isso hoje.
3. Conversar com pelo menos uma pessoa real ou analisar um relato fornecido pelo professor.
4. Propor a solução e onde a IA entra.
5. Definir entrada, saída e forma de demonstração.
6. Fixar o que entra e o que fica fora do MVP de uma semana.

**Entregáveis estruturados:**

- `text` obrigatório — **Product Brief:** problema, usuário, solução atual, proposta, IA, entrada, saída e demo.
- `text` obrigatório — **Registro de descoberta:** pessoa/perfil consultado, três aprendizados e uma mudança provocada pela conversa.
- `text` obrigatório — **Escopo do MVP:** itens “entra” e “fica fora”.

**Critérios atômicos:**

- O problema está descrito sem mencionar uma ferramenta como solução.
- O usuário afetado está identificado.
- O registro contém evidência de uma conversa ou relato real.
- O papel da IA está explicitado.
- A demonstração esperada está definida.
- O escopo separa o que entra do que fica fora.

**Continuidade:** levar para a Atividade 14 apenas o fluxo mínimo necessário para demonstrar a promessa central do Product Brief.

**Evidência para projeto/portfólio:** documento “Definição do problema do AI Product”, incluindo a descoberta que alterou a ideia.

**Plano B:** usar entrevista em dupla, relato fornecido pelo professor, post-its e template impresso; nenhuma ferramenta digital é necessária.

### Atividade 14 — Blueprint da solução

**Desafio:** desenhar o caminho completo do usuário e localizar exatamente onde IA ou automação participa.

**Contexto:** wireframe e fluxo reduzem retrabalho antes do Build Day. O desenho deve priorizar compreensão funcional: feio e claro vence bonito e confuso.

**Objetivo:** produzir o blueprint do MVP com entrada, processamento, resultado e demonstração.

**Passos:**

1. Desenhar o ponto inicial do usuário.
2. Desenhar a informação fornecida pelo usuário.
3. Representar o processamento e a etapa de IA/automação.
4. Desenhar o resultado recebido.
5. Marcar o caminho da demonstração.
6. Listar materiais e backups necessários para construir.

**Entregáveis estruturados:**

- `file` obrigatório — **Wireframe:** telas ou estados essenciais do MVP.
- `file` obrigatório — **Fluxo do produto:** usuário, entrada, processamento, IA e resultado.
- `text` obrigatório — **Plano de build:** núcleo, materiais, ferramentas, evidências e backup.
- `text` obrigatório — **Roteiro da demo:** sequência que será apresentada.

**Critérios atômicos:**

- O wireframe mostra o ponto de entrada.
- O fluxo mostra o dado fornecido pelo usuário.
- O fluxo identifica a etapa de IA ou automação.
- O resultado entregue ao usuário está representado.
- O roteiro permite demonstrar a promessa central.
- O plano inclui um backup executável no tempo disponível.

**Continuidade:** iniciar o Build Day pelo caminho mínimo da demo, deixando elementos decorativos e funcionalidades extras para depois.

**Evidência para projeto/portfólio:** wireframe e diagrama “Como o AI Product funciona”.

**Plano B:** desenhar em papel, fotografar e escrever o roteiro; ferramenta de prototipação digital é opcional.

### Atividade 15 — Build Day: AI Product

**Desafio:** construir primeiro o núcleo demonstrável do produto e cortar qualquer extra que ameace a entrega.

**Contexto:** o AI Product pode combinar prompt, mídia, formulário, página, automação ou código. O critério comum é demonstrar a solução; GitHub só é pertinente quando existe um repositório real.

**Objetivo:** produzir, testar e documentar uma versão funcional ou demonstrável do Projeto 4.

**Passos:**

1. Construir o caminho mínimo definido no blueprint.
2. Testar uma entrada representativa.
3. Conferir se o resultado demonstra a promessa central.
4. Reduzir escopo quando algo não funcionar.
5. Capturar evidências e documentar limitações.
6. Ensaiar a apresentação de cinco minutos.

**Entregáveis estruturados:**

- `external_link` obrigatório — **Demo do MVP:** página, automação, formulário, protótipo ou vídeo compartilhável.
- `text` obrigatório — **Documentação do produto:** problema, solução, uso, ferramentas e limitações.
- `file` obrigatório — **Evidência de teste:** print ou PDF da entrada e do resultado.
- `text` obrigatório — **Registro de escopo:** o que foi cortado e por quê.
- `github_repository` opcional — **Repositório do produto:** URL pública ou autorizada do GitHub quando houver código/versionamento.

**Critérios atômicos:**

- A demo abre sem depender da conta pessoal do professor.
- A demo apresenta uma entrada ou ação do usuário.
- A demo apresenta um resultado relacionado ao problema.
- A evidência registra pelo menos um teste concluído.
- A documentação declara uma limitação real.
- O registro identifica pelo menos um corte de escopo consciente.
- Quando enviado, o repositório corresponde ao produto demonstrado.

**Continuidade:** congelar o núcleo, corrigir apenas bloqueadores, salvar backup offline e preparar problema → solução → demo → aprendizado para o Demo Day.

**Evidência para projeto/portfólio:** versão do MVP, evidência de teste, documentação, link e repositório opcional.

**Plano B:** demonstrar com formulário + operação manual, slides navegáveis, protótipo, automação parcial, vídeo simulado ou fluxo acompanhado de exemplo real de saída.

### Atividade 16 — Demo Day: eu construí isto

**Desafio:** apresentar o AI Product e provar a evolução ao longo dos quatro projetos sem depender integralmente da internet.

**Contexto:** Demo Day é um ritual de evidência, não uma prova de perfeição. A apresentação deve tornar visíveis problema, solução, funcionamento e aprendizado, com backup pronto.

**Objetivo:** apresentar o Projeto 4, consolidar o portfólio do Explorer e registrar a reflexão final.

**Passos:**

1. Apresentar o problema em até um minuto.
2. Apresentar a solução em até um minuto.
3. Demonstrar o produto em até dois minutos.
4. Explicar o principal aprendizado em até um minuto.
5. Usar o backup se a demonstração ao vivo falhar.
6. Publicar o portfólio e registrar a reflexão final.

**Entregáveis estruturados:**

- `external_link` obrigatório — **Portfólio Explorer:** URL com os quatro projetos.
- `file` obrigatório — **Backup da apresentação:** slides em PDF, prints ou arquivo equivalente.
- `external_link` opcional — **Registro do Demo Day:** vídeo da apresentação ou demonstração.
- `text` obrigatório — **Reflexão final:** dificuldade, melhoria, maior aprendizado e próximo interesse.
- `github_repository` opcional — **Repositório final:** quando o AI Product possuir código.

**Critérios atômicos:**

- A apresentação identifica o problema.
- A apresentação explica a solução.
- A demonstração mostra o resultado do produto.
- A fala respeita o limite de cinco minutos.
- O portfólio contém evidência do Projeto 1.
- O portfólio contém evidência do Projeto 2.
- O portfólio contém evidência do Projeto 3.
- O portfólio contém evidência do Projeto 4.
- Existe um backup utilizável sem a demo ao vivo.
- A reflexão responde às quatro perguntas solicitadas.

**Continuidade:** registrar o interesse para o Builder, preservar os links e backups e transformar o feedback do professor em uma próxima melhoria opcional, sem reabrir a conclusão do Explorer.

**Evidência para projeto/portfólio:** portfólio final, slides, registro da apresentação, feedback do professor e reflexão de evolução.

**Plano B:** apresentar vídeo gravado, prints, PDF ou demonstração simulada com roteiro; nunca depender exclusivamente de conexão ou serviço externo.

## Regras de persistência para uma implementação futura

1. Criar uma nova versão curricular `Explorer v2`; não atualizar as linhas canônicas da v1.
2. Inserir os requisitos desta spec com posições determinísticas e IDs namespaced pela nova versão.
3. Não transportar os requisitos agregados da `0015`; eles devem ser substituídos pelos requisitos unitários desta proposta na v2.
4. Marcar como opcionais somente os itens explicitamente descritos como opcionais nesta spec.
5. Manter `github_repository` opcional nas Atividades 15 e 16.
6. Garantir que cada label de critério expresse uma única verificação e que a descrição não introduza uma segunda obrigação.
7. Testar cardinalidade de 16 atividades, ordem 1–16, quatro Project Days, tipos válidos e existência de pelo menos um entregável obrigatório por atividade.
8. Testar continuidade entre atividades: a saída indicada por uma atividade deve aparecer como insumo da seguinte dentro do mesmo ciclo.

## Critérios de aceite desta proposta

- [x] As 16 atividades possuem título, desafio, contexto, objetivo, passos, entregáveis, critérios, continuidade, evidência e Plano B.
- [x] Todo entregável usa um dos quatro tipos suportados pela plataforma.
- [x] Nenhum entregável obrigatório depende de GitHub.
- [x] Todo Project Day consolida artefatos anteriores e inclui demonstração ou backup.
- [x] Os critérios são redigidos para revisão binária e isolada.
- [x] A proposta preserva a progressão dos quatro ciclos do currículo operacional.
- [x] A evolução recomendada não reescreve o snapshot Explorer v1.

## Fora de escopo

- Alterar migrations ou aplicar dados no Supabase.
- Mudar contratos, componentes ou rotas.
- Criar integração com GitHub, n8n ou ferramentas de IA.
- Definir a interface visual dos campos.
- Substituir a mediação presencial do professor.
