---
title: "Logos Academy Platform — State of Project"
date: 2026-10-15
fase_atual: "10"
etapa_atual: "Reparos MVP integrados na branch; CI e jornada real isolada em validação"
produto_tipo: "saas-premium"
proximo_passo: "Validar PR #3: pgTAP completo, E2E real, revisão visual e dependências; preservar produção e obter aprovação LGPD"
fases_skipped: []
gates:
  fase_1: pass
  fase_2: pass
  fase_3: pass
  fase_4: pass
  fase_5: pass
  fase_6: pass
  fase_7: pass
  fase_8: pass
  fase_9: pass
  fase_10: pending
  fase_11: pass
  fase_12: pending
features: { draft: 0, approved: 22, built: 18, reviewed: 12 }
overrides:
  - gate: npm-audit
    data: 2026-09-08
    motivo: "1 critical + 4 moderate sao devDependencies (Vitest/esbuild dev-server, nunca em producao); 2 high sao postcss build-time interno do Next 15 com CSS 100% first-party — zero vetor runtime em producao. CSO PASS 9/10. Limpo pelo upgrade Next 16 (em git stash) como milestone proprio."
status: "🟢 Produção · Atlas CMS e Revisões premium publicados"
tags: [status, roadmap, logos-academy, plataforma-estudantil]
---
# ESTADO — Logos Academy Platform

> Driver único do projeto. A skill `/logos` lê este arquivo para rotear o trabalho.

> Compactado por `state-compact.js` em 2026-10-02. O STATE guarda só o presente; o histórico integral está em `STATE-HISTORY.md`.

## Em Andamento

- [15/10 — E2E #14] Sete ativações reais passaram (seis coletivas + uma individual), limite de vagas e calendário/contexto individual aprovados; acesso cruzado e conteúdo não liberado negados. Upload e rascunho passaram na UI. O ensaio parou no botão de envio durante estado transitório de salvamento; `4ccfe59` aguarda controle visível/habilitado sem relaxar persistência. Restam envio/revisão, quatro projetos, reposição/conclusão, demais gates e deploy. Produção preservada.

- [15/10 — evidência mais recente] E2E #10 delimita a falha em `click-confirmation`, antes de comprovar navegação para ativação; a avaliação diagnóstica da sessão do aluno também ficou indisponível. Ainda não atribuir a falha ao formulário/sessão do produto. `51de0c7` valida protocolo da ferramenta e reduz serviços auxiliares ociosos do runner, mantendo DB/Auth/REST/Storage reais. Revisão visual local isolada de Revisões/Atlas/editor/seletor documentada em `docs/qa/mvp-admin-visual-2026-10-15.md`; não substitui AA integral nem jornada real.

- [15/10 — atualização da validação] CI #65 passou aplicação e banco. E2E #7 aprovou login real de dois admins, turma com 16 encontros e bloqueio cross-tenant após corrigir cliques fora da viewport no harness. Próxima falha está na avaliação da página de ativação do primeiro aluno; E2E #8 (`0836342`) acrescenta classificação privada e retry somente para navegação transitória. Não tratar F01/ativação nem a jornada completa como aprovadas. Relatórios atuais em `docs/qa/mvp-validation-2026-10-15.md` e `docs/qa/mvp-real-e2e.md`. Produção preservada.

- [ ] **Reparos de 15/10 — PR #3 em rascunho**: conclusão v3, guards de tenant excluído, contexto/calendário individual, busca sem acento/tags, consentimento/cancelamento, matrícula adicional, dashboard, paginação/URL, duplicação/undo CMS e fila individual implementados. CI #62 (`4a8959a`) aprovou aplicação/lint/build e 491 pgTAP; suíte local 232/232. E2E #4 passou preparação Auth/RLS real, mas login UI ficou sem cookie; `618d7ba` aguarda interatividade React e E2E #5 está em execução. Runtime audit zero; alerta dev-only de braces sem patch aguarda decisão humana, não coberto pelo override histórico de setembro. Procedimento conservador de snapshots em `docs/qa/upload-snapshot-reconciliation.md`; relatório em `docs/qa/mvp-validation-2026-10-15.md`. Nenhuma migration remota nova nem deploy deste lote.

- [ ] **`mvp-completion`**: usuário autorizou concluir o MVP inteiro em 13/10. Escopo: F01-F14 e specs posteriores aprovadas, sem pós-MVP novo. Flags/gates herdados não provam conclusão. Auditoria de requisitos e segurança em andamento; teste local real será executado no runner isolado do GitHub (sem mocks na produção). Navegador `academy-mvp-admin` aberto para login manual seguro; nenhum reset de senha de admin.
- [x] **`admin-interface-deploy`**: PR #2 integrado por squash `589b77d`; produção Vercel `dpl_12WUzped3votALdMERJfb82QLDUx` READY no domínio canônico. CI #54 e CI da main verdes: 183 testes da aplicação e 390 pgTAP. Finalize idempotente e paginação administrativa aplicados por migrations incrementais; ACL backend-only das quatro funções confirmada. Smoke: login 200 em 0,735 s, páginas admin 307 para login, APIs 401 sem sessão, CSP/HSTS presentes e console do login limpo. Sem resets/seeds ou novas contas remotas. Rollback em `docs/deploy/2026-10-12-functions-rollback.sql` e deployment anterior preservado. Ensaio autenticado real ainda pendente.
- [x] **`atlas-editorial-map-premium`**: núcleo orbital, três coleções, 16 nós em quatro projetos, conexões SVG e pulsos; pausa manual, suspensão fora da viewport e reduced-motion. Validado localmente em 1440/768/375 sem overflow e publicado na produção pelo PR #2.
- [x] **`atlas-editor-controls-refinement`**: tags em chips com Enter, remoção, deduplicação e limite; seletor visual central de blocos com busca, categorias e miniaturas. Publicado em produção pelo PR #2.
- [x] **`admin-design-reference`**: Atlas CMS e Revisões reconstruídos conforme referências Claude Design; editor de 16 tipos de blocos, biblioteca, preview, assets privados, histórico/restauração e mesa de feedback integrados às APIs. Publicado em `https://logos-academy-three.vercel.app`; worktree `C:/la-admin-interface` preservado.
- [ ] **Ensaio administrativo autenticado**: publicação autorizada e concluída com pgTAP completo verde. Falta testar editor, assets e envio/leitura de feedback com sessões reais admin/aluno; não substituído por smoke anônimo. Rascunho de revisão permanece local à aba, não sincronizado no servidor.
- [x] **`reviews-experience-v2`**: Mapa de Evidências por turma e atividade, roster completo de alunos, filtros operacionais e Mesa de Revisão premium publicados em `https://logos-academy-three.vercel.app/admin/revisoes`. Migration aplicada e função validada com bloqueio para `anon`/`authenticated` e acesso exclusivo do backend.
- [x] **`reviews-postgres-uuid-hotfix`**: causa do “Sinal interrompido” identificada nos validadores da aplicação; fila e publicação de revisão agora aceitam UUIDs determinísticos já persistidos pelo currículo. Teste focado, lint e TypeScript aprovados; aguarda deploy e smoke autenticado em produção.
- [x] **`project-activity-flow-clarity`**: régua conceitual substituída pelos estados reais da atividade, orientação de uso e próximas ações explícitas; publicada e verificada em produção.
- [x] **`explorer-four-projects-v3`**: publicado no Supabase e GitHub; verificação remota confirmou os quatro ciclos, 16 aulas completas, 69 entregáveis, 64 critérios e a atividade atribuída atualizada para o novo conteúdo.
- [ ] **`ensaio-ponta-a-ponta`**: runbook em `docs/ensaio-ponta-a-ponta.md`. A Onda A administrativa foi integrada de `main` e a migration `0053` foi aplicada no Supabase em 30/09; o gate local de lint, 83 testes e build passou. Falta executar o ciclo real com uma conta de aluno de teste.
- [ ] `student-visual-system-rounding-orbit`: raios sistêmicos e campo orbital compartilhado implementados e validados; aguardando gate visual humano.
- [ ] `student-journey-premium`: fusão da Jornada real com a direção premium implementada e validada; aguardando gate visual humano.
- [ ] `student-knowledge-atlas`: versão premium implementada e validada em 1440/768/375, tema claro/escuro e movimento reduzido; aguardando gate visual humano.
- [ ] `student-activity-editorial-redesign`: abertura compacta, orientação recolhível e construção priorizada implementadas; aguardando gate visual humano.
- [x] `explorer-activity-system-v2`: implementação local concluída, gate visual aprovado e migrations aplicadas de forma controlada no Supabase.
- [x] `student-activity-workbench`: Mesa de Atividade Explorer v2 validada em 1440/768/375, tema claro/escuro e movimento reduzido; gate visual aprovado.
- [ ] Implementação do milestone `student-experience-elevation`: redesign de Início, Jornada, Projetos e Atividade; produção permanece estável até validação visual e deploy aprovado.

## Concluído

- [2026-10-11] Revisões v2 publicada pelo commit `1d09408`: migration `review_overview` aplicada no Supabase e produção Vercel `dpl_2jSsEGNDM7ddvBAxVqtnEmp8CqU4` em estado `READY`. Smoke: `/login` 200, `/admin/revisoes` 307 para login sem sessão, API administrativa 401 anônima, CSP/HSTS presentes, função remota retornando atividades e alunos, nenhum erro novo nos logs Vercel ou PostgreSQL. Rollback: promover o deployment anterior na Vercel e restaurar as funções pela migration `0050` se necessário.

- [2026-10-11] A experiência administrativa de Revisões foi reconstruída em dois níveis: o Mapa de Evidências parte das matrículas da turma para mostrar também quem ainda não enviou; a Mesa de Revisão separa evidências, histórico, rubrica, correções obrigatórias e sugestões opcionais. O administrador pode aprovar sem escrever feedback quando tudo está satisfatório. Foram adicionados endpoint tipado, RPC backend-only, pgTAP, regressões unitárias e referências visuais. Lint, TypeScript, 94 testes aplicáveis e build passaram; o pgTAP novo aguarda ambiente Supabase local ou aplicação controlada da migration.

- [2026-10-10] Hotfix da fila de Revisões implementado em worktree isolado: o banco e a RPC estavam íntegros, mas o parser TypeScript rejeitava IDs determinísticos armazenados em colunas PostgreSQL `uuid` por exigir bits RFC de versão/variante. O contrato passou a validar a forma aceita pelo PostgreSQL tanto na leitura quanto na publicação do feedback; regressão coberta por teste com ID real do currículo.

- [2026-10-05] A página de projeto deixou de inferir “Referências → Hipótese” por contagem de versões. A régua agora acompanha `AssignmentStatus`, explica que avança automaticamente e cada card informa a próxima ação. “Decisão registrada” virou “Registro da atividade”. Commit `c3d6778` publicado na Vercel; validação: 94 testes, lint, build, browser em 375 px sem overflow global e smoke de produção (`/login` 200; `/projetos` 307 para login).

- [2026-10-03] A mesa de Atividade passou a incluir o rascunho salvo em `latestSubmission` no histórico visível, com estado próprio e sem duplicar versões já enviadas. O “Repositório inicial” da aula 1 do Assistente foi tornado opcional em produção; os três demais entregáveis continuam obrigatórios. Regressão coberta por teste de UI e pgTAP; suíte com 90 testes e build passaram.

- [2026-10-02] Deploy curricular concluído: migration `enrich_explorer_v3_four_projects` aplicada no Supabase e commit `1da06a5` enviado ao GitHub. A produção agora exibe Assistente Pessoal Inteligente, Creative Studio, Automation Lab e MVP: Produto Inteligente; consulta remota confirmou 4 ciclos, 16 aulas, 16 atividades, 69 entregáveis e 64 critérios. O login público respondeu 200 e a raiz protegida manteve o redirecionamento esperado. O advisor de segurança não trouxe regressão desta migration; o único aviso Academy é preexistente para `invitation_links` sem policy de cliente, mantida bloqueada e acessada somente por servidor.

- [2026-10-02] `explorer-four-projects-v3` implementado localmente: os quatro ciclos agora constroem Assistente Pessoal Inteligente, Creative Studio, Automation Lab e MVP: Produto Inteligente em 16 aulas incrementais. Todos os campos pedagógicos, 69 entregáve…
- [2026-10-02] As abas do prontuário do aluno foram refinadas com laranja sólido tanto no seletor animado quanto na moldura do conjunto, sem alterar a transição ou o suporte a movimento reduzido.
- [2026-10-02] A confirmação do convite deixou de ser bloqueada pela CSP: `form-action` permite a origem exata do Supabase além de `'self'`, e o middleware passou a reutilizar a política de segurança testada. Em produção, um clique real em `Continuar ativação…
- [2026-10-02] O link curto de convite passou a exigir uma confirmação humana antes de abrir o token de uso único do Supabase. Em produção, uma prévia com user-agent do WhatsApp recebeu `200`, sem redirecionamento nem token no HTML; o acesso posterior chegou …
- [2026-10-02] A ficha administrativa do aluno ganhou navegação de abas com seletor laranja deslizante inspirado no `Tab Pill Glide` do Kinetics, transição curta do painel e quebra responsiva sem scrollbar. Browser validou o spring entre posições e ausência d…
- [2026-10-02] A ativação por convite passou a capturar a sessão implícita entregue no fragmento pelo Supabase antes de iniciar o cliente PKCE. Em produção, um convite real abriu `/ativar`, removeu os tokens da URL, preencheu o e-mail e habilitou `Ativar meu …
- [2026-10-02] Convites de aluno passaram a usar origem canônica fixa `https://logos-academy-three.vercel.app/ativar` e link público curto `https://logos-academy-three.vercel.app/c/<código>`. A allowlist remota do Supabase foi atualizada sem alterar os outros…
- [2026-10-01] A conta de aluno Luis Vinicius Sabino Guimarães Grossi foi removida do Supabase, com a matrícula, convite e dados operacionais vinculados. A conta administrativa foi preservada.
- [2026-10-01] Base de testes manuais resetada no Supabase: as seis contas de aluno e todos os dados operacionais vinculados foram removidos; inclusive o perfil de aluno residual do administrador. Permanecem somente a conta administrativa `viniciussggrossi`, …
- [2026-10-01] O reenvio de convite pendente passou a gerar um novo link de recuperação/ativação, sem reaproveitar token consumido. A ativação local foi verificada em `http://localhost:3000/ativar`; a mensagem de WhatsApp orienta abrir o link somente uma vez.

_Histórico completo: `STATE-HISTORY.md`._

## Specs

| Spec | Status | Atualização |
|---|---|---|
| `docs/ideia.md` | aprovado | 2026-08-31 |
| `docs/PRD.md` | aprovado e locked — v0.1.2 (SR-003) | 2026-09-04 |
| `specs/product.schema.json` | validado | 2026-09-01 |
| `specs/api.contracts.ts` | validado — 40 endpoints | 2026-10-11 |
| `docs/specs/review-feedback-loop.md` | built e validado localmente | 2026-10-11 |
| `docs/ARCHITECTURE.md` | aprovado | 2026-09-01 |
| `docs/tasks.md` | aprovado — tasks ≤4h | 2026-09-04 |
| `specs/registry.json` | 10 features aprovadas | 2026-09-04 |
| `docs/specs/frontend-premium-phase8.md` | built e reviewed | 2026-09-07 |
| `docs/specs/integrations-mvp-phase9.md` | built e reviewed — não aplicável ao MVP | 2026-09-07 |
| `docs/specs/demo-auth-and-data.md` | built e validated — somente ambiente local | 2026-09-08 |
| `docs/specs/student-experience-elevation.md` | approved — redesign visual em implementação | 2026-09-10 |

## Workers Ativos

- Nenhum worker ativo. Entregas de banco, frontend e harness integradas; revisões estáticas concluídas, validação runtime continua pelo orquestrador.

## Sync Requests Pendentes

- [ ] Expor `trackKey`/nível tipado em `GET /api/student/journey`; a interface atual infere Explorer, Builder ou Engineer pelo nome do currículo. Não bloqueia o gate atual, mas deve ser sincronizado em spec e contrato antes de novas nomenclaturas entrarem em produção.

## Bloqueios

- [13/10/2026] `docs/compliance/lgpd-operational-procedures.md` e evidência das aprovações jurídica e operacional exigidas pelo PRD/tasks não encontrados. Documento pode ser preparado tecnicamente; revisão jurídica não será presumida da autorização genérica de build.
- Nenhum aluno real percorreu o fluxo completo: `reviews`, `uploaded_files`, `presentation_records` e `completion_records` estão com zero linhas e `project_records.approved` = 0 em produção. Correção, anexo, apresentação e conclusão nunca foram exercitados fora do modo demo.
- `logos_academy.approve_project` (migration 0009) é código morto: nenhuma rota, tela ou função do banco a chama — a aprovação real acontece pelo trigger `activity_assignments_sync_project`. Decidir entre remover ou expor como fallback manual.
- `python [SKILL_ROOT]/scripts/validate.py` do CLAUDE.md não existe (`~/.claude/skills/logos/` só tem `agents/`, `phases/`, `references/`, `SKILL.md`). O gate de specs da fase 2 não tem como rodar — mesma classe de deriva do ADR-022.
- Fase 12 — `npm audit` ainda reporta 2 vulnerabilidades altas em PostCSS transitivo do Next 15 e 1 crítica/4 moderadas no toolchain Vitest/Vite. A correção automática exige `npm audit fix --force` (Next 16 + Vitest 5), uma atualização major que requer aprovação explícita e validação completa antes de novo deploy.
- Registro vivo de ADRs expõe apenas ADR-030, embora o playbook cite ADR-025–031; não numerar ADR global até o checkpoint corrigir a deriva.
- Git: verificado em 2026-09-25 — o projeto TEM repo próprio (`.git` na pasta do projeto, remote `origin` → `ViniciusGrossi/Logos-Academy-`, 30 commits, HEAD `c5bc4e4`). `docs/`, `specs/`, `supabase/migrations/`, `PRODUCT.md`, `DESIGN.md` e `ARCHITECTURE.md` estão versionados. Working tree com 11 entradas sujas (10 modificados do redesign + `coach-mat.png` e o novo teste untracked). Push para o GitHub exige aprovação explícita separada. O bloqueio anterior ("sem `.git` próprio, ~40 arquivos untracked") era STATE desatualizado.
- Fase 12 — não existe superfície admin para **criar turma** (`POST /api/admin/classes`), **convidar aluno** (`POST /api/admin/students/invite`) nem **matricular** (`POST /api/admin/enrollments`), apesar de `docs/specs/admissions-classes-calendar.md` prever `/admin/alunos` com convite em Sheet e `/admin/turmas` com criação em Sheet. Mesma deriva da Formação: backend + RPC + mock prontos, tela ausente. Bloqueia o ensaio ponta-a-ponta com aluno real. Requer também `GET /api/admin/curricula`, que não existe (Sync Request).

## Lições

- [2026-10-12] Mapa Editorial é o chamariz do CMS: tratar como elemento assinatura, com percurso completo de 16 aulas, conexões e energia visual; filtros usam IDs reais, sem inferir cobertura publicada a partir do diagrama.

- [2026-10-12] Atlas CMS: preservar os controles visuais do protótipo aprovado. Tags devem ser chips removíveis; o catálogo de blocos deve manter busca, agrupamento e miniaturas, não ser reduzido a uma lista de botões genéricos.

- [2026-10-11] Uma fila construída apenas a partir de entregas nunca consegue responder “quem ainda não enviou”. A projeção operacional de revisão deve começar pelas matrículas e atribuições da turma, anexando a entrega e o parecer quando existirem.

- [2026-10-10] Colunas PostgreSQL `uuid` aceitam qualquer sequência hexadecimal no formato 8-4-4-4-12; IDs determinísticos do currículo não necessariamente carregam bits RFC de versão/variante. Validadores da fronteira precisam reproduzir o contrato do armazenamento ou um registro válido pode derrubar uma projeção inteira.

- [2026-10-05] Uma régua pedagógica não pode avançar por uma soma indireta de versões e atividades concluídas quando o aluno interpreta cada rótulo como uma ação. O estado visual deve vir do mesmo enum que governa o workflow e explicar explicitamente quando a transição é automática.

- [2026-10-03] `latestSubmission` e `submissionHistory` têm papéis diferentes: o primeiro pode conter o rascunho editável, enquanto o segundo reúne versões enviadas. Uma linha do tempo que promete mostrar versões salvas deve compor as duas projeções e deduplicar por `submission.id`.
- [2026-10-02] Em regex SQL, uma barra invertida pode atravessar duas camadas de escape e virar uma busca por barra literal. Para domínios fixos, preferir a classe `[.]`; o teste de migração deve cobrir uma URL real de `github.com` no rascunho e no envio.
- [2026-10-02] Nos projetos Explorer, diferenciar contrato de aprendizagem de escolha estética: o aluno deve cumprir capacidades, limites e evidências, mas elementos como orbe, avatar, waveform e o tema professor são referências opcionais, não critérios obrigatórios.
- [2026-10-02] A diretiva CSP `form-action` também valida os destinos atravessados por redirecionamentos do envio. Um formulário que posta em `'self'` e recebe `303` para um provedor externo precisa autorizar a origem exata desse provedor. A CSP do middleware deve importar a mesma função coberta pelos testes; manter uma cópia local torna a regressão invisível.
- [2026-10-02] Links de autenticação de uso único não podem ficar atrás de um `GET` que redireciona diretamente: crawlers de preview do WhatsApp seguem o redirecionamento e consomem o token antes do aluno. O link compartilhável deve responder com uma página inerte, sem expor o destino, e liberar a verificação somente apó um `POST` iniciado pelo usuário.
- [2026-10-02] A navegação da ficha do aluno substituiu o scroll horizontal por abas responsivas com seletor laranja deslizante, seguindo o `Tab Pill Glide` do Kinetics. O spring usa a dependência Framer Motion já instalada, e `prefers-reduced-motion` mantém a troca estática.
- [2026-10-02] `generateLink` administrativo entrega a sessão do convite no fragmento por fluxo implícito, enquanto `createBrowserClient` de `@supabase/ssr` força PKCE. Redirecionar corretamente para `/ativar` não prova que a sessão foi criada: a página precisa capturar `access_token` e `refresh_token`, remover o fragmento e chamar `setSession` antes de instanciar o cliente PKCE. O aceite deve verificar e-mail preenchido e botão habilitado em navegador real.
- [2026-10-02] Definir `redirectTo` no código não basta: o Supabase substitui destinos ausentes da allowlist pelo `Site URL`, que ainda era `localhost`. Convites públicos exigem três garantias juntas: destino canônico fail-closed no adapter, URL exata na allowlist remota e rota curta excluída da autenticação do middleware. A validação deve seguir um token real até o `Location` final, não apenas inspecionar a string gerada.
- [2026-09-25] Diagnóstico de "o fluxo não fecha" precisa seguir o gatilho, não só a função com nome óbvio. A conclusão anterior de que o projeto nunca chegava a `approved` estava errada: `admin_publish_review` dispara `activity_assignments_sync_project` → `private.sync_project_record_from_assignment`, que aprova o `project_records` do ciclo quando a atividade aprovada é a última aula. Quem estava sem uso era a `approve_project`, e o furo real era de UI, não de banco. Corolário: `specs/registry.json` marcando `built: true` não prova superfície existente — a feature tinha rotas, RPCs e mock prontos e nenhuma tela.
- [2026-09-24] Tokens derivados em `@theme inline` precisam de um token-base resolvido no runtime. Sem `--radius`, o navegador descartava silenciosamente os `border-radius` derivados em todas as páginas; corrigir o token compartilhado é mais seguro do que aplicar raios isolados componente a componente.

_Histórico completo: `STATE-HISTORY.md`._

## Avaliação consultiva — Atividade (2026-09-24)

- Revisão solicitada pelo usuário: código atual, protótipo `Atividade v2 Premium.dc.html` e sessão autenticada em 1440×900, 768×1024 e 375×812. Nenhuma entrega enviada ou código de aplicação alterado; gates e próximo passo mantidos.
- Relatório: `C:/Users/everex/.codex/.chatgpt-projects/g-p-6a8a5a550a58819188163b85928ca0dd/AVALIACAO_PAGINA_ATIVIDADES_LOGOS_ACADEMY.md`.
- Achados para priorização, ainda não implementados: ausência de proteção de alterações não salvas; feedback de operações restrito ao formulário editável; campos editáveis durante salvamento; prontidão que mistura obrigatórios/opcionais; concorrência/remoção de uploads; navegação muito pequena e longa abertura antes da construção.
- Demonstração mistura detalhe legado de cartaz com título de vídeo no percurso v2 e conceitos genéricos, incluindo RAG. Origem confirmada nas fixtures; não extrapolar para dados reais do Supabase.
- Recomendações de composição e motion são propostas de revisão, não aprovação de nova direção visual nem autorização de deploy.
