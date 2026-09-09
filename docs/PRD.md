# PRD — Logos Academy Platform

**Versão:** 0.1.2  
**Data:** 2026-09-04  
**Produto tipo:** `saas-premium`  
**Fase:** 2 — PRD  
**Status:** aprovado — `PRD LOCK` em 2026-09-01; SR-001/SR-002 aprovados em 2026-09-01; SR-003 aprovado em 2026-09-04  
**Escopo:** MVP Explorer para admin e aluno

## 1. Resumo executivo

A Logos Academy Platform é o ambiente digital de continuidade da formação presencial. Ela organiza o que hoje ficaria fragmentado no WhatsApp: conceitos, atividades, entregas, feedbacks, presença e evolução por projetos.

A aula principal continua presencial. A plataforma não contém videoaulas nem tenta substituir o professor. Depois de cada encontro, o aluno encontra uma referência conceitual, conclui uma atividade curta, envia evidências e recebe feedback. O admin controla a progressão até que quatro projetos componham o portfólio interno do Explorer.

O produto também funciona como demonstração conduzida da capacidade técnica e pedagógica da Logos Academy. Dados reais de menores nunca são usados nessa apresentação.

## 2. Problema

Depois das aulas presenciais, materiais, atividades, entregas e feedbacks ficam espalhados no WhatsApp. Essa fragmentação produz quatro efeitos:

1. o aluno não sabe com clareza qual é o próximo passo;
2. conceitos apresentados em aula são difíceis de reencontrar;
3. versões, correções e evidências de projeto se perdem;
4. o admin não enxerga pendências, frequência e evolução de forma confiável.

O concorrente principal é o status quo do WhatsApp. LMSs tradicionais são concorrentes indiretos, mas partem de videoaulas e consumo de conteúdo, não da continuidade de uma experiência presencial orientada por projetos.

## 3. Objetivos

### 3.1 Objetivos do MVP

- Centralizar o ciclo aula → atividade → entrega → feedback → projeto.
- Fazer o aluno identificar sua próxima ação em até cinco segundos.
- Preservar versões, correções e evidências ao longo de várias matrículas.
- Dar ao admin uma fila operacional de revisões, atrasos, reposições e próximas aulas.
- Validar o Explorer com até três turmas e cinco alunos individuais.
- Alcançar 80% de atividades entregues e aprovadas antes da aula seguinte.

### 3.2 Não objetivos

- Oferecer ensino totalmente online ou assíncrono.
- Hospedar videoaulas.
- Vender cursos, cobrar mensalidades ou controlar inadimplência.
- Atender outras escolas como SaaS.
- Automatizar WhatsApp.
- Criar rede social, ranking, badges ou gamificação.
- Avaliar com notas numéricas.
- Publicar portfólios de menores.
- Analisar repositórios GitHub automaticamente.

## 4. Público e papéis

### 4.1 Aluno — MVP

Jovem de 12 a 17 anos, iniciante em tecnologia, com computador e internet fora da Academy. Usa a plataforma para continuar o trabalho iniciado em sala, revisar conceitos e acompanhar seus projetos. Vê apenas seus próprios dados.

### 4.2 Admin — MVP

Vinicius opera a Academy e também exerce a função pedagógica inicial. Gerencia currículo pré-cadastrado, turmas, matrículas, calendário, frequência, liberações, revisões e conclusão.

### 4.3 Professor — pós-MVP

Opera apenas turmas e alunos atribuídos. Registra presença, libera atividades e revisa entregas. Não altera o currículo canônico nem administra toda a organização.

### 4.4 Responsável — pós-MVP

Cliente econômico da formação. Acompanha frequência, pendências, projetos, progresso e todo feedback pedagógico compartilhado. Não edita, entrega nem libera conteúdo.

## 5. Princípios do produto

1. **Presencial primeiro:** a plataforma prolonga a aula; não a substitui.
2. **Ação antes de análise:** aluno tem `Início`; dashboards analíticos pertencem ao admin e, futuramente, ao responsável.
3. **Projeto antes de consumo:** conceitos apoiam a prática; não formam um catálogo de conteúdo.
4. **Progressão explícita:** o aluno vê destinos futuros, mas conteúdo só aparece após liberação.
5. **Evidência antes de nota:** critérios são binários e visíveis; não há média de 0 a 10.
6. **Privado por padrão:** portfólio e dados de menores permanecem fechados.
7. **Uma fonte canônica:** entregas e feedbacks válidos vivem na plataforma, não no WhatsApp.

## 6. Modelo pedagógico Explorer

O Explorer dura oito semanas, com 16 encontros presenciais, duas vezes por semana. Cada ciclo possui três aulas de construção e um Project Day.

| Ciclo | Aulas | Projeto |
|---|---:|---|
| 1 | 1–4 | Meu Assistente Inteligente |
| 2 | 5–8 | Creative Studio |
| 3 | 9–12 | Automation Lab |
| 4 | 13–16 | AI Product |

Cada aula possui uma única entrega canônica. Ela pode começar presencialmente e terminar depois. Atividades regulares exigem de 15 a 30 minutos; marcos maiores, até 45 minutos.

Os quatro projetos aparecem desde o início na Jornada. Títulos, conceitos, instruções e critérios de aulas futuras permanecem ocultos.

## 7. Arquitetura de informação

### 7.1 Navegação do aluno

- **Início:** próxima ação, próxima aula, feedback recente e projeto atual.
- **Jornada:** quatro ciclos, progresso e bloqueios.
- **Glossário:** conceitos já apresentados, com busca.
- **Projetos:** quatro projetos e portfólio interno, com atividades, versões, feedbacks e evidências.
- **Agenda:** calendário e frequência em abas do mesmo conjunto de encontros; presença, faltas e reposições nunca expõem notas privadas.
- **Perfil:** dados básicos e usuário GitHub.

Não existe uma central separada de notificações no MVP. Mudanças relevantes aparecem no Início.

### 7.2 Navegação do admin

- **Dashboard:** fila consolidada de trabalho e métricas operacionais.
- **Turmas:** calendário, alunos, presença e liberações coletivas.
- **Alunos:** ficha objetiva, matrículas, consentimento e trajetória.
- **Revisões:** entregas aguardando retorno e SLA de 48 horas.

O currículo pré-cadastrado não possui página administrativa no MVP. O admin o encontra somente no contexto de turmas, encontros, atividades e projetos.

### 7.3 Páginas, abas e superfícies contextuais

- Página muda o objeto ou a tarefa principal; aba muda apenas a visão do mesmo objeto.
- Tabs persistem em `?tab=` para deep link, histórico e refresh.
- Até três abas usam barra horizontal. Quatro ou cinco usam trilho rolável com foco visível e setas de teclado; nunca quebram em duas linhas.
- Jornada permanece uma linha do tempo contínua: ciclos não viram abas porque esconderiam sequência e bloqueios.
- Atividade e revisão permanecem fluxos únicos: histórico usa accordion/aside, não tabs concorrentes com a ação principal.
- Criação, confirmação e alteração curta usam Sheet/Dialog: convite, matrícula, reagendamento, liberação, reposição, apresentação e conclusão.

**Aluno**

| Rota | Composição |
|---|---|
| `/` | Início sem tabs |
| `/jornada` | linha do tempo de ciclos, aulas e bloqueios |
| `/glossario` e `/glossario/[conceptId]` | busca/lista + detalhe deep-linkável |
| `/atividades/[assignmentId]` | execução, envio, critérios e histórico no mesmo fluxo |
| `/projetos` | abas `Em construção` e `Portfólio` |
| `/projetos/[projectId]` | abas `Visão geral`, `Evidências` e `Feedback` |
| `/agenda` | abas `Próximas aulas` e `Frequência` |
| `/perfil` | conta e GitHub sem tabs |

**Admin**

| Rota | Composição |
|---|---|
| `/admin` | Dashboard sem tabs; filtros preservam contexto |
| `/admin/alunos` | lista/busca; convite em Sheet |
| `/admin/alunos/[studentId]` | `Resumo`, `Formação`, `Entregas`, `Projetos`, `Cadastro e consentimento` |
| `/admin/turmas` | lista; criação em Sheet |
| `/admin/turmas/[classId]` | `Visão geral`, `Calendário`, `Alunos`, `Pendências` |
| `/admin/encontros/[sessionId]` | `Chamada`, `Atividade`, `Reposições`; reagendamento no cabeçalho |
| `/admin/revisoes` | `Aguardando`, `Prazo crítico`, `Correções` |
| `/admin/revisoes/[submissionId]` | workspace único de revisão, sem tabs |

**Acesso:** `/login`, `/ativar-conta` e `/recuperar-senha` compartilham um único shell visual.

## 8. Requisitos funcionais

### F01 — Convite e ativação

**Job:** permitir entrada controlada de menores já matriculados.

**Comportamento:**

- somente admin cria aluno e matrícula;
- consentimento físico verificado é pré-requisito;
- convite é enviado ao e-mail próprio do aluno;
- aluno define senha e recupera acesso por e-mail;
- outros métodos de autenticação ficam fora do MVP.

**Aceite:**

- Dado um aluno sem consentimento verificado, quando o admin tenta convidá-lo, então o sistema bloqueia o envio e explica o requisito.
- Dado consentimento válido, quando o admin cria a matrícula, então o aluno recebe convite e a matrícula fica `invited`.
- Dado convite válido, quando o aluno define a senha, então a conta e a matrícula tornam-se acessíveis.
- Dado um aluno autenticado, quando solicita dados de outro aluno, então recebe `FORBIDDEN` sem exposição de conteúdo.

### F02 — Início do aluno

**Job:** mostrar o próximo passo em até cinco segundos.

**Prioridade da ação principal:**

1. corrigir entrega;
2. ver feedback novo;
3. continuar atividade disponível;
4. configurar GitHub quando necessário;
5. estado sem pendência.

**Aceite:**

- Dada uma correção solicitada, quando o aluno abre o Início, então ela ocupa a ação principal.
- Dado um feedback ainda não visualizado, inclusive de aprovação, quando o aluno abre o Início sem correção pendente, então “Ver feedback novo” precede atividades disponíveis.
- Dado um feedback novo, quando o aluno o abre, então o sistema registra a visualização de forma idempotente e deixa de tratá-lo como novo.
- Dada uma atividade disponível sem correção, quando abre o Início, então vê “Continuar atividade”.
- Dado nenhum trabalho pendente, quando abre o Início, então vê a próxima aula e um estado de conclusão claro.
- O Início não exibe métricas comparativas, ranking ou dados de colegas.

### F03 — Jornada e bloqueios

**Job:** tornar a progressão compreensível sem liberar o projeto inteiro.

**Comportamento:**

- quatro projetos visíveis desde o início;
- detalhes futuros ocultos;
- liberação sempre explícita pelo admin;
- aprovação de entrega não libera automaticamente a etapa seguinte;
- admin pode liberar excepcionalmente para alunos específicos usando o mesmo fluxo de liberação segmentada.

**Aceite:**

- Dada uma aula futura, quando o aluno consulta a Jornada, então vê apenas o destino do ciclo, sem conteúdo da aula.
- Dada uma atividade não liberada, quando tenta acessar a URL diretamente, então recebe `FORBIDDEN`.
- Dada liberação coletiva, quando confirmada, então a turma é derivada do encontro e cada matrícula ativa recebe uma atividade individual.
- Dada liberação excepcional, quando aplicada, então apenas os alunos selecionados ganham acesso.

### F04 — Glossário conceitual

**Job:** recuperar rapidamente conceitos apresentados presencialmente.

**Comportamento:**

- conceito é liberado junto da aula;
- permanece consultável após liberação e após conclusão;
- busca por título e termos relacionados, insensível a acentos;
- atividade contém links diretos para os conceitos necessários;
- não há vídeo ou player.

**Aceite:**

- Dado um conceito de aula futura, quando o aluno busca pelo termo, então ele não aparece.
- Dado um conceito liberado, quando o aluno pesquisa sem acento, então o resultado correspondente aparece.
- Dada uma matrícula concluída, quando o aluno consulta um conceito já liberado, então o acesso permanece em modo de leitura.

### F05 — Atividade, rascunho e entrega

**Job:** concluir uma atividade com instrução e expectativa inequívocas.

**Cada atividade exibe:** objetivo, contexto, instruções, continuidade pós-aula, tempo estimado, prazo, formatos exigidos, conceitos relacionados, critérios de aprovação e projeto associado.

**Formatos combináveis:** texto, arquivo, link externo e repositório GitHub.

**Comportamento:**

- uma entrega por aula;
- rascunho é editável;
- versão enviada é imutável;
- todos os requisitos obrigatórios precisam estar preenchidos;
- prazo vencido marca atraso, mas não fecha o envio;
- tentativas são ilimitadas enquanto a matrícula estiver ativa.

**Aceite:**

- Dado um rascunho incompleto, quando o aluno tenta enviar, então o sistema lista os requisitos ausentes.
- Dado um rascunho válido, quando envia, então uma versão imutável é criada e o estado passa a `submitted`.
- Dada uma atividade vencida, quando o aluno envia, então a versão é aceita e o atraso permanece registrado.
- Dada matrícula pausada, concluída ou cancelada, quando o aluno tenta editar, então o sistema mantém consulta e bloqueia mutação.

### F06 — Revisão e correção

**Job:** produzir feedback verificável sem nota numérica.

**Comportamento:**

- admin marca cada critério como `met` ou `needs_adjustment`;
- decisão final é `approved` ou `revision_requested`;
- feedback textual é obrigatório;
- correção reabre um novo rascunho;
- histórico de versões e avaliações é preservado;
- meta operacional de revisão é 48 horas.

**Aceite:**

- Dado um critério sem resultado, quando o admin tenta concluir a revisão, então o sistema bloqueia.
- Dada decisão de correção, quando publicada, então o aluno recebe a ação “Corrigir entrega” e nova versão editável.
- Dada aprovação, quando publicada, então a atividade passa a `approved` e a evidência alimenta o projeto.
- O admin não pode alterar silenciosamente uma revisão publicada; correção administrativa gera novo registro auditável.

### F07 — Projetos e portfólio interno

**Job:** transformar atividades aprovadas em evidência compreensível de evolução.

**Comportamento:**

- quatro cards de projeto no Explorer;
- cada card mostra linha do tempo das quatro aulas do ciclo;
- versões, feedbacks e evidências ficam associados;
- Project Day consolida a versão aprovada;
- portfólio é privado e permanente entre matrículas.

**Aceite:**

- Dadas atividades aprovadas em um ciclo, quando o aluno abre o projeto, então vê as evidências em ordem pedagógica.
- Dado Project Day ainda não aprovado, quando abre o portfólio, então o projeto aparece em andamento.
- Dado Project Day aprovado, quando abre o portfólio, então o projeto aparece concluído com data e evidências.
- Dado um portfólio com projetos de múltiplas matrículas, quando excede o limite da página, então o aluno recebe `nextCursor` e percorre todo o histórico.
- Nenhum endpoint público retorna o portfólio no MVP.

### F08 — Currículo Explorer pré-cadastrado

**Job:** operar a primeira turma sem construir um CMS.

**Comportamento:**

- 16 aulas, quatro ciclos e quatro projetos são carregados da fonte curricular;
- objetivos, conceitos e critérios canônicos não são editáveis pela interface;
- admin pode ajustar prazo e instrução complementar por execução;
- alteração do currículo exige mudança versionada fora da interface do MVP.

**Aceite:**

- Dada uma turma ativa, quando o admin adiciona instrução complementar, então apenas aquela execução é alterada.
- Dada tentativa de alterar critério canônico pela API operacional, então o sistema retorna `FORBIDDEN`.
- O currículo importado mantém a ordem das 16 aulas e a relação correta com os quatro projetos.

### F09 — Turmas, matrícula individual e calendário

**Job:** executar o mesmo currículo em formato coletivo ou individual.

**Comportamento:**

- turma aceita no máximo seis matrículas ativas;
- admin informa data inicial, dois dias, horários, duração e fuso;
- sistema gera os 16 encontros;
- encontro pode ser reagendado sem perder a aula associada;
- individual usa o mesmo gerador, sem turma;
- aluno pode ter várias matrículas ao longo do tempo.

**Aceite:**

- Dada turma com seis alunos ativos, quando o admin tenta incluir o sétimo, então recebe `CONFLICT`.
- Dados dois dias semanais, quando a turma é criada, então o sistema gera 16 encontros na ordem curricular.
- Dado encontro reagendado, quando o calendário é consultado, então a nova data aparece e a posição pedagógica permanece.
- Dada matrícula individual, quando criada, então possui calendário próprio e nenhuma turma obrigatória.

### F10 — Frequência e reposição

**Job:** comprovar participação integral nos encontros presenciais.

**Comportamento:**

- chamada rápida por encontro;
- estados persistidos: presente, ausente e falta justificada;
- observação é contextual e privada;
- aluno vê o próprio histórico, nunca a nota privada;
- conclusão exige 100% dos encontros cumpridos;
- reposição é um registro separado e pode ocorrer individualmente ou em aula equivalente de outra turma;
- ausência original permanece no histórico.

**Aceite:**

- Dada uma ausência, quando a conclusão é verificada, então ela aparece como bloqueio.
- Dada reposição vinculada, quando concluída, então o requisito do encontro fica cumprido e a ausência original continua auditável.
- Dado aluno autenticado, quando consulta frequência, então recebe apenas seus estados, sem observações privadas.
- Dado um histórico que excede o limite da página, quando o aluno consulta frequência, então recebe `nextCursor` e pode continuar sem repetição ou perda.
- Dada chamada de turma, quando enviada, então existe no máximo um registro ativo por aluno e encontro.

### F11 — Dashboard do admin

**Job:** priorizar o trabalho pedagógico diário.

**Componentes:**

- entregas aguardando revisão;
- feedbacks próximos de ultrapassar 48 horas;
- atividades atrasadas;
- reposições pendentes;
- próximas aulas;
- alunos com queda de adesão;
- taxa de entrega e aprovação por turma.

**Aceite:**

- Dadas entregas pendentes em várias turmas, quando o admin abre o Dashboard, então recebe uma fila consolidada e filtrável.
- Dada submissão perto de 48 horas sem revisão, quando o Dashboard é carregado, então ela aparece em prioridade elevada.
- Dado aluno com atividade atrasada ou reposição pendente, quando o admin filtra por risco, então o aluno aparece com o motivo objetivo.
- O Dashboard não inclui faturamento, pagamentos ou métricas de vaidade.

### F12 — Ficha do aluno, consentimento e GitHub

**Job:** manter dados objetivos necessários à operação.

**Ficha:** identidade, responsável, consentimento, matrículas, frequência, entregas, feedbacks, projetos e usuário GitHub. Do responsável, o MVP exige nome, vínculo e pelo menos um canal de contato — e-mail ou telefone — para comunicação operacional e emergencial; o segundo canal é opcional.

**Consentimento:** termo assinado em papel, arquivado fisicamente. O sistema registra responsável, vínculo, data, versão do termo, confirmação de arquivo e admin verificador; não guarda foto ou PDF. Revogação é auditável: desabilita o acesso do aluno e pausa matrículas ativas, preservando registros até execução do procedimento LGPD aplicável.

**GitHub:** nome de usuário e link de perfil. Não há OAuth. Configuração não bloqueia ativação, mas é obrigatória antes da primeira atividade que exigir repositório.

**Aceite:**

- Dado consentimento sem confirmação de arquivo físico, quando o admin tenta verificar, então o sistema bloqueia.
- Dado consentimento revogado, quando a revogação é confirmada, então o acesso é desabilitado e matrículas ativas são pausadas.
- Dado aluno sem GitHub, quando acessa atividade que não exige repositório, então pode trabalhar normalmente.
- Dado aluno sem GitHub em atividade que exige repositório, quando tenta enviar, então recebe orientação para configurar o perfil.
- Não existe campo livre de anotações gerais; observações pertencem a registros contextuais.

### F13 — Conclusão e acesso posterior

**Job:** concluir o módulo apenas com evidência completa e preservar a trajetória.

**Critérios de conclusão:**

- 16 encontros cumpridos por presença ou reposição;
- quatro projetos aprovados;
- reflexão final entregue e aprovada como parte da atividade da Aula 16;
- Demo Day ou apresentação substitutiva registrada com data e autor;
- nenhuma correção obrigatória pendente.

**Comportamento:**

- certificado é emitido fora da plataforma no MVP;
- após conclusão, conteúdos liberados, entregas, feedbacks e portfólio ficam em leitura;
- nova atividade exige nova matrícula ativa.

**Aceite:**

- Dado qualquer critério incompleto, quando o admin tenta concluir, então o sistema lista bloqueios e não altera a matrícula.
- Dados todos os critérios derivados como cumpridos, quando o admin confirma sem enviar marcadores manuais, então matrícula passa a `completed`.
- Dada matrícula concluída, quando o aluno consulta a trajetória, então vê todo o histórico e não pode alterar entregas.

### F14 — Arquivos e links

**Job:** receber evidências com segurança e sem transformar a plataforma em armazenamento de mídia pesada.

**Regras:**

- arquivos ficam em bucket privado e usam URL assinada temporária;
- início de upload cria `fileId` opaco vinculado no servidor a tenant, aluno, atividade e usuário;
- rascunho aceita somente `fileId`, nunca caminho de storage fornecido pelo cliente;
- finalização valida tamanho, tipo, propriedade e existência antes de permitir associação;
- download exige endpoint autorizado que emite URL assinada curta;
- tamanho máximo inicial: 20 MB por arquivo;
- tipos aceitos: PDF, TXT, Markdown, PNG, JPEG, WebP, DOCX e PPTX;
- vídeo e áudio são entregues por link externo;
- executáveis e tipos não autorizados são rejeitados;
- URL externa precisa usar HTTPS;
- repositório precisa pertencer ao domínio `github.com`.

**Aceite:**

- Dado arquivo acima de 20 MB, quando o aluno solicita upload, então recebe `VALIDATION_ERROR` antes da transferência.
- Dado tipo executável, quando solicita upload, então o sistema rejeita.
- Dada URL não HTTPS, quando salva o rascunho, então o requisito permanece inválido.
- Dado outro aluno, quando tenta abrir arquivo alheio, então recebe `FORBIDDEN` e nenhuma URL assinada.

## 9. Regras de estado

### 9.1 Matrícula

```text
invited → active → completed
             ├→ paused → active
             └→ cancelled
```

### 9.2 Atividade

```text
locked → available → draft → submitted
                              ├→ revision_requested → draft
                              └→ approved
```

`overdue` é um indicador derivado de prazo, não encerra o fluxo.

### 9.3 Encontro

```text
scheduled → completed
     ├→ rescheduled → scheduled
     └→ cancelled
```

### 9.4 Invariantes

- Envio não libera etapa futura automaticamente.
- Versão enviada não pode ser editada.
- Revisão publicada não pode ser sobrescrita silenciosamente.
- Uma turma não ultrapassa seis matrículas ativas.
- Um aluno não acessa registros de outro.
- Conclusão não ocorre com ausência sem reposição.

## 10. Fluxos principais

### 10.1 Preparar turma

1. Admin cria turma e escolhe currículo Explorer.
2. Informa data inicial, dois dias e horários semanais.
3. Sistema gera 16 encontros.
4. Admin registra responsável e consentimento físico.
5. Admin convida até seis alunos.
6. Alunos ativam as contas.

### 10.2 Encerrar aula e liberar atividade

1. Admin abre o encontro.
2. Registra frequência.
3. Confirma que a aula foi realizada.
4. Revisa prazo e instrução complementar sugeridos.
5. Libera a atividade para turma ou alunos selecionados.
6. Conceitos relacionados tornam-se pesquisáveis.

### 10.3 Entregar e corrigir

1. Aluno abre a ação principal no Início.
2. Consulta instruções, critérios e conceitos.
3. Salva rascunho com todos os blocos exigidos.
4. Envia versão imutável.
5. Admin revisa cada critério.
6. Se houver correção, aluno recebe novo rascunho e reenvia.
7. Se aprovado, evidência atualiza o projeto.

### 10.4 Repor falta

1. Ausência cria pendência objetiva.
2. Admin agenda atendimento individual ou seleciona aula equivalente.
3. Após presença, registra reposição contra o encontro original.
4. Histórico preserva ausência e reposição.

### 10.5 Concluir Explorer

1. Sistema calcula elegibilidade.
2. Admin vê qualquer bloqueio restante.
3. Consulta reflexão aprovada e registro auditável da apresentação.
4. Confirma a conclusão; o servidor recalcula todos os critérios.
5. Matrícula passa a concluída.
6. Aluno mantém acesso de leitura à trajetória.

## 11. Segurança, privacidade e LGPD

- Supabase Auth gerencia credenciais; a aplicação nunca armazena senha.
- RLS é obrigatória em todas as tabelas.
- Toda linha de negócio possui `tenant_id`.
- Aluno acessa somente registros vinculados ao próprio `student_id` e matrículas.
- Admin acessa o tenant Logos Academy.
- Storage é privado; downloads usam URLs assinadas curtas.
- Logs não contêm e-mail, data de nascimento, telefone, conteúdo de entrega ou feedback.
- Portfólio não possui rota pública.
- Demonstrações usam conta e dados fictícios.
- Termos físicos não são digitalizados no MVP.
- Revogação de consentimento desabilita login e pausa matrículas ativas imediatamente; reativação exige novo consentimento verificado.
- Procedimentos de retenção, exportação, revogação de consentimento e eliminação precisam de revisão jurídica antes do deploy; ausência de procedimento aprovado bloqueia produção.
- Interface de responsável não será simulada sem autenticação e vínculo verificado.

## 12. Requisitos não funcionais

### 12.1 Acessibilidade

- WCAG 2.1 AA.
- Navegação completa por teclado.
- Foco visível.
- Alvos interativos de pelo menos 44 px.
- Estados não dependem somente de cor.
- Respeito a `prefers-reduced-motion`.

### 12.2 Responsividade

- Desktop é a experiência principal de construção e envio.
- Mobile permite consulta de Início, calendário, conceitos, status e feedback.
- Viewports de aceite: 375, 768 e 1440 px, sem overflow horizontal.

### 12.3 Performance e resiliência

- LCP abaixo de 2,5 segundos nas telas principais em produção.
- Listagens paginadas com limite máximo de 50 itens.
- Upload usa URL assinada e não atravessa o servidor da aplicação.
- Falha de uma consulta mostra estado de erro recuperável, sem apagar rascunho local.
- Rascunho salvo confirma data e versão persistida.
- Operações de envio e revisão são idempotentes contra duplo clique.

### 12.4 Auditoria

- Convite, consentimento, liberação, envio, revisão, reposição e conclusão registram ator e data.
- Registros pedagógicos publicados não são sobrescritos sem trilha.
- Nenhum dado sensível é enviado a analytics externo no MVP.

## 13. Métricas

### 13.1 North Star do MVP

**Taxa de continuidade:** percentual de atividades liberadas que foram entregues e aprovadas antes da aula seguinte. Meta: pelo menos 80%.

### 13.2 Métricas auxiliares

| Métrica | Meta |
|---|---:|
| Feedback enviado após submissão | até 48 horas |
| Alunos ativos com quatro projetos ao final | 100% |
| Encontros cumpridos por presença ou reposição para conclusão | 100% |
| Tempo semanal de revisão do admin | 4–6 horas |
| Acesso indevido entre alunos em testes | zero |

As métricas são calculadas a partir dos registros transacionais; não exigem plataforma externa de analytics no MVP.

## 14. Escopo por versão

### 14.1 MVP

F01 a F14 deste documento, apenas admin e aluno, currículo Explorer, tenant único Logos Academy.

### 14.2 Pós-MVP próximo

- interface do professor com escopo por turma;
- interface do responsável com todo feedback pedagógico compartilhado;
- Builder e Engineer;
- notificações automáticas por WhatsApp;
- certificado digital;
- editor versionado de currículo, quando houver professores e necessidade real.

### 14.3 Não comprometido

- tutor de IA;
- code review automático;
- OAuth GitHub;
- marketplace;
- comunidade própria;
- aplicativo nativo;
- plataforma white-label para outras escolas;
- portfólio público hospedado pela Academy.

## 15. Contratos de API

Fonte canônica: `specs/api.contracts.ts`.

| Domínio | Endpoints |
|---|---:|
| Conta e perfil | 2 |
| Alunos e consentimento | 5 |
| Turmas | 4 |
| Matrículas e conclusão | 5 |
| Encontros, frequência, liberação e reposição | 4 |
| Dashboard e revisões do admin | 3 |
| Experiência do aluno | 13 |
| Upload privado | 3 |
| **Total** | **39** |

Autenticação, convite e recuperação de senha usam fluxos oficiais do Supabase Auth; os endpoints do produto controlam autorização, perfil e matrícula.

## 16. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Baixa adesão fora da aula | Alto | Atividade curta, conferência no encontro seguinte e progressão condicionada. |
| Sobrecarga do admin | Alto | Critérios pré-cadastrados, fila única, revisão curta e análise detalhada nos marcos. |
| Bloqueio gerar frustração | Médio | Correção ilimitada, recuperação e liberação excepcional. |
| WhatsApp continuar como repositório | Alto | Toda entrega e feedback válido precisa existir na plataforma. |
| Exposição de dados de menores | Crítico | Ambiente fechado, RLS, consentimento, storage privado e demo fictícia. |
| Currículo e app divergirem | Alto | Importação canônica versionada; currículo não editável no MVP. |
| Arquivos pesados degradarem uso | Médio | Limite de 20 MB; mídia por link externo. |
| Escopo virar LMS | Alto | Fora de escopo explícito e PRD Lock com Spec Sync Request. |

## 17. Dependências e premissas

- Cada aluno possui e-mail próprio e acessível.
- Cada aluno possui computador e internet fora da Academy.
- Conta GitHub será criada antes da primeira atividade que exigir repositório.
- Pagamentos e comunicação urgente continuam externos.
- Admin consegue dedicar quatro a seis horas semanais à revisão no volume inicial.
- Currículo operacional Explorer é a fonte de conteúdo da primeira carga.
- Revisão jurídica de consentimento e LGPD é condição anterior ao deploy, não à prototipação.

## 18. Critérios globais de aceite do MVP

- Fluxo completo convite → atividade → correção → aprovação → projeto funciona para aluno de teste.
- Turma de seis alunos e matrícula individual operam o mesmo currículo sem duplicação.
- Conteúdo futuro não pode ser obtido pela interface nem por chamada direta.
- Aluno A não acessa dado ou arquivo do aluno B.
- Admin consegue identificar toda pendência operacional pelo Dashboard.
- Falta sem reposição impede conclusão.
- Quatro projetos aprovados aparecem no portfólio interno.
- Conta concluída mantém leitura e bloqueia mutação.
- 375, 768 e 1440 px não apresentam overflow horizontal.
- Build, testes, RLS e validação de contratos passam sem erro crítico.

## 19. Rastreabilidade

| Fonte | Uso |
|---|---|
| `docs/ideia.md` | problema, público, jobs, escopo e métricas aprovados no Idea Lock |
| `../../Curriculo/Curriculo_Operacional_Explorer.md` | estrutura das 16 aulas, quatro ciclos e critérios pedagógicos |
| `specs/product.schema.json` | entidades, invariantes e relações do produto |
| `specs/api.contracts.ts` | contratos executáveis dos endpoints |
| `../../prd-plataforma-logos-academy.md` | referência histórica; não é fonte canônica |

## 20. PRD Lock

`PRD LOCK` aprovado explicitamente por Vinicius em 2026-09-01, após validação e revisão independente. Qualquer mudança em feature, estado, entidade, endpoint ou critério de aceite exige Spec Sync Request.

**SR-003 — Arquitetura de informação:** aprovado explicitamente por Vinicius em 2026-09-04. Consolida Calendário + Frequência em Agenda, projetos + portfólio em uma seção, remove Currículo da navegação administrativa e aprova o mapa de páginas/abas da seção 7.3. Não altera entidade, endpoint, regra pedagógica ou critério de aceite.
