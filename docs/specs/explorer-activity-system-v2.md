---
title: "Explorer Activity System v2 — Spec de implementação"
date: 2026-09-13
projeto: "Logos Academy Platform"
status: approved
wave: 9
tags: [spec, explorer, atividades, feedback, curriculo, frontend]
---

# Spec: Explorer Activity System v2

## Objetivo

Entregar as 16 atividades Explorer como uma sequência pedagógica coerente e disponibilizá-las na Mesa de Atividade, com orientação, evidências, critérios, versões e feedback funcionando de ponta a ponta para aluno e orientador.

## Fontes canônicas

- `Curriculo/Curriculo_Operacional_Explorer.md`
- `docs/PRD.md`, especialmente F05, F06 e a máquina de estados da atividade
- `docs/specs/explorer-16-activities.md`, conteúdo pedagógico das 16 atividades
- `docs/specs/activity-component-scout.md`, auditoria de componentes
- `docs/specs/activity-submission-files.md`
- `docs/specs/review-feedback-loop.md`

## Fora de escopo

- Editor colaborativo, comentários em tempo real ou autosave remoto a cada tecla.
- OAuth do GitHub; o MVP continua usando URL HTTPS e perfil informado pelo aluno.
- Autoria curricular pela interface administrativa.
- Gamificação por pontos, ranking, mascote ou recompensa artificial.
- Aplicação de migrations ou deploy em produção antes do gate humano e do deploy-check.

## Decisões

1. Cada atividade é uma missão curta que produz evidência aproveitável no projeto do ciclo.
2. O desafio usa `instructions`; o objetivo usa `objective`. Não será criada uma coluna redundante `challenge`.
3. Cada requisito representa um artefato e um único tipo de armazenamento.
4. Cada critério responde a uma verificação isolada que o orientador marca como `met` ou `needs_adjustment`.
5. GitHub e vídeo permanecem opcionais quando o currículo aceita soluções sem código, offline ou simuladas.
6. A página mantém navegação por âncoras entre Orientação, Construção, Qualidade e Histórico. Tabs que escondem contexto não serão usadas.
7. O núcleo energético, os seis circuitos, a rota do projeto, o brief, os passos e o feedback autorais são preservados.
8. Componentes básicos já instalados serão reutilizados. Não entra dependência nova sem lacuna comprovada.

## Requisitos funcionais

### RF01 — Currículo Explorer v2

- Persistir exatamente 16 atividades, agrupadas em quatro ciclos de quatro encontros.
- Project Days nas posições 4, 8, 12 e 16.
- Cada atividade deve ter título, contexto, objetivo, desafio, passos, continuidade, Plano B, reflexão e evidência para projeto/portfólio.
- Entregáveis e critérios seguem integralmente `explorer-16-activities.md`.
- Não transportar requisitos agregados da Explorer v1 para a v2.
- Preservar matrículas, submissões e currículo Explorer v1 como histórico.
- Explorer v2 torna-se a opção ativa para novas turmas; v1 não recebe novas matrículas após a publicação.

### RF02 — Mesa de Atividade

- Exibir projeto, ciclo, posição, título, objetivo, tempo, prazo e estado.
- Exibir primeiro o feedback pendente, quando existir.
- Orientação contém contexto, missão, resultado esperado, passos, ferramentas, Plano B, reflexão, continuidade e evidência do projeto.
- Construção suporta simultaneamente `text`, `file`, `external_link` e `github_repository`.
- Mostrar progresso dos entregáveis e levar o aluno ao primeiro campo obrigatório ausente.
- Salvar rascunho com confirmação de versão, data e horário.
- Envio inválido lista nominalmente todos os requisitos ausentes.
- Envio aprovado ou em revisão é somente leitura.
- Matrícula não ativa mostra a mesa e o histórico em leitura, sem apresentar controles que irão falhar.

### RF03 — Feedback e nova versão

- Feedback geral e resultado/comentário de cada critério permanecem visíveis mesmo após a criação do novo rascunho.
- Ao solicitar ajustes, o backend cria a próxima versão já preenchida com os itens da versão revisada.
- O aluno altera somente o necessário e registra a nova versão sem reconstruir a entrega.
- Feedback aprovado também é mostrado e marcado como visto de forma idempotente.
- Correção administrativa cria uma nova review que referencia a anterior, sem alterar a review publicada.
- A decisão final deve ser coerente com a rubrica: qualquer `needs_adjustment` exige `revision_requested`; `approved` exige todos `met`.

### RF04 — Arquivos e GitHub

- O aluno abre arquivos próprios de versões atuais e anteriores por URL assinada.
- O orientador abre os arquivos da entrega antes de publicar a revisão.
- A autorização de download aceita somente aluno proprietário ou admin do mesmo tenant.
- Um requisito GitHub opcional ausente nunca bloqueia salvar ou enviar.
- Se o aluno preencher GitHub, URL HTTPS e domínio GitHub continuam obrigatórios.

### RF05 — Histórico e atraso

- Cada versão mostra itens, arquivos, links, reviews, data, decisão e atraso daquela entrega.
- `isOverdue` só indica pendência vencida enquanto a atividade ainda aceita edição.
- `SubmissionDetail.isLate` preserva se a versão foi enviada depois do prazo.
- O histórico inicial é limitado e paginado; “Carregar versões anteriores” busca a próxima página sem apagar a mesa atual.
- Múltiplas reviews da mesma submissão permanecem auditáveis.

### RF06 — Disponibilidade das 16 atividades

- As 16 atividades existem no banco e são resolvidas pelo `assignmentId` da matrícula.
- Atividade bloqueada não abre por URL direta; o percurso mostra apenas sua posição e estado.
- O modo demo oferece quatro projetos e 16 atividades para inspeção, mantendo um único estado atual por ciclo.
- A página mostra apenas as quatro atividades do projeto corrente, evitando uma lista global sem contexto.

### RF07 — Componentes e responsividade

- Reutilizar `Accordion` em apoios e histórico.
- Reutilizar `Progress`, `Input`, `Textarea`, `Button` e `StatusBadge` onde substituírem código customizado sem perder a assinatura visual.
- Upload continua nativo, com nome, progresso, substituir e abrir arquivo.
- Em 1440 px, orientação e construção preservam hierarquia e ação principal na primeira dobra relevante.
- Em 768 e 375 px, o fluxo é linear, sem compressão em duas colunas e sem overflow horizontal.
- Teclado, foco visível, alvos de 44 px, contraste AA e `prefers-reduced-motion` são obrigatórios.

## Alterações de contrato previstas

### `ActivityDetail`

- `canEdit: boolean`
- `readOnlyReason: "inactive_enrollment" | "submitted" | "approved" | null`
- `latestReview: ReviewDetail | null`
- `submissionHistory: Page<SubmissionDetail>` ou projeção equivalente com `items` e `nextCursor`

### `SubmissionDetail`

- `isLate: boolean`
- `reviews: readonly ReviewDetail[]`
- `review` pode permanecer temporariamente como alias da review mais recente durante a migração.

### Download de arquivo

- O endpoint permanece único, mas passa a autorizar aluno proprietário e admin do mesmo tenant.

## Arquivos impactados

### Banco

- Revisar `supabase/migrations/0047_activity_workbench_v2.sql`, ainda não aplicada em produção, para manter somente a expansão segura de schema.
- Criar migration do currículo Explorer v2 e das correções transacionais de review, draft, atraso e projeções.
- Atualizar pgTAP de currículo, RLS, download e review.

### Contratos e validação

- `specs/api.contracts.ts`
- schemas Zod de atividades, arquivos e reviews
- `specs/registry.json`, somente após aprovação desta spec

### Backend

- módulos `activity-submission-files` e `review-feedback-loop`
- projeções/RPCs de atividade, submissão, review e download
- rotas atuais; rota nova apenas se a paginação do histórico não couber com segurança no endpoint existente

### Frontend

- `components/prototype/activity-detail.tsx`
- `components/prototype/activity-detail.module.css`
- `components/prototype/review-queue.tsx`
- mocks de demo e testes correspondentes

## Plano de implementação

1. Banco: consolidar Explorer v2, atomizar requisitos/critérios e corrigir review/draft/atraso/download.
2. Contratos e Zod: sincronizar edição, latest review, reviews plurais, atraso por versão e paginação.
3. Repository: retornar DTOs completos e autorizar arquivo por tenant + proprietário/papel.
4. Service: validar requisitos ausentes, GitHub opcional e coerência decisão/rubrica.
5. Controller: manter rotas finas e erros com `fieldErrors` utilizáveis.
6. Frontend aluno: adaptar a mesa à densidade das 16 atividades e usar os componentes existentes.
7. Frontend admin: permitir abrir evidências e revisar todos os critérios sem carregar a fila inteira.
8. Demo: quatro projetos, 16 atividades e estados representativos.
9. Testes e browser: fluxos aluno/admin, tenant A/B, 375/768/1440, temas e movimento reduzido.

## Critérios de aceite

- [ ] Existem exatamente 16 atividades Explorer v2 e quatro Project Days nas posições corretas.
- [ ] Toda atividade possui todos os campos pedagógicos e ao menos um entregável obrigatório.
- [ ] Nenhum requisito agrega artefatos de tipos diferentes ou duplica outro campo.
- [ ] O aluno conclui uma atividade regular, um Project Day e uma revisão solicitada de ponta a ponta.
- [ ] O novo rascunho de revisão nasce preenchido no backend.
- [ ] GitHub opcional não bloqueia aluno sem username vinculado.
- [ ] Admin abre arquivos e não acessa arquivo de outro tenant.
- [ ] A decisão da review sempre corresponde aos resultados da rubrica.
- [ ] Histórico preserva múltiplas reviews e atraso por versão, com paginação.
- [ ] Demo permite inspecionar as 16 atividades distribuídas nos quatro projetos.
- [ ] A Mesa de Atividade comporta 6 entregáveis e 10 critérios sem esconder a ação atual.
- [ ] Loading, empty, error, success e estados de domínio estão cobertos.
- [ ] 375, 768 e 1440 px passam sem overflow; teclado, foco, contraste e movimento reduzido passam.
- [ ] Testes focalizados, pgTAP, TypeScript, lint, suíte completa e build passam.

## Gate humano

Esta spec altera currículo, contratos e comportamento de revisão. Implementação começa somente após aprovação explícita.
