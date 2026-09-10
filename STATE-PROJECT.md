---
title: "Logos Academy Platform — State of Project"
date: 2026-09-09
fase_atual: "12"
etapa_atual: "Milestone visual concluído"
produto_tipo: "saas-premium"
proximo_passo: "Handshake visual do novo Auth; publicar novo deployment somente após aprovação"
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
  fase_10: pass
  fase_11: pass
  fase_12: pass
features: { draft: 0, approved: 12, built: 12, reviewed: 12 }
overrides:
  - gate: npm-audit
    data: 2026-09-08
    motivo: "1 critical + 4 moderate sao devDependencies (Vitest/esbuild dev-server, nunca em producao); 2 high sao postcss build-time interno do Next 15 com CSS 100% first-party — zero vetor runtime em producao. CSO PASS 9/10. Limpo pelo upgrade Next 16 (em git stash) como milestone proprio."
status: "🟡 Produção estável · redesign local"
tags: [status, roadmap, logos-academy, plataforma-estudantil]
---

# ESTADO — Logos Academy Platform

> Driver único do projeto. A skill `/logos` lê este arquivo para rotear o trabalho.

## Em Andamento

- [ ] Handshake visual do novo Auth com Vinicius; a produção permanece estável na versão anterior.

## Concluído

- [2026-09-09] Milestone visual `auth-estudio-vivo` concluído localmente: login, ativação e recuperação foram remodelados com mapa topográfico SVG, portal circular, rota ligada ao foco, resposta ao ponteiro, hovers, estados de formulário e motion reduzível. O fallback de `/ativar` sem configuração do Supabase deixou de quebrar a página. Inspeção em browser passou em 375/768/1440 sem overflow; `prefers-reduced-motion` desliga rota, sinal, portal e ponteiro. 63 testes, TypeScript, lint e build passaram. Produção ainda não foi alterada.

- [2026-09-09] Fase 12 concluída: deploy-check aprovado, `/cso` diário passou em 9/10 (sem finding reportável), Vercel confirmou o deployment de produção como `Ready`, smoke em produção confirmou `/login` 200 e `/`/`/admin` 307 sem sessão. O teste RLS em produção, numa transação revertida e sob `authenticated`, retornou zero matrículas cross-tenant; as 32 tabelas `logos_academy` têm RLS habilitado e forçado. Canary de 90 segundos realizou 3 checagens estáveis sem alertas e salvou evidências em `.gstack/canary-reports/`. Rollback: promover o deployment anterior na Vercel; se uma migration futura falhar, restaurar o snapshot do Supabase e registrar o incidente. A observação de dependências (`next` moderado e `postcss` transitivo alto no build) continua aceita e registrada para o milestone de upgrade.

- [2026-09-08] Produção publicada em `https://logos-academy-mu.vercel.app` (deployment `dpl_6o1dwaqp8tGxWUZrGeKoX65wtZBd`). O preset Next.js foi versionado em `vercel.json`; build remoto, login público e redirecionamento de rota protegida foram validados. Variáveis de produção permanecem configuradas na Vercel, sem modo demo e sem segredos no Git. O fechamento formal da Fase 12 permanece aberto até CSO, deploy-check e canary/monitoramento.

- [2026-09-08] Repositório Git independente criado e enviado para `ViniciusGrossi/Logos-Academy-`; commit inicial `bc76e84` em `main`, com `.env.local` e artefatos gerados excluídos pelo `.gitignore`.

- [2026-09-08] Fase 11 concluída: `docs/features.md` e `docs/flows.md` documentam a experiência de aluno, administrador e demo local; bugs e pattern do ciclo foram consolidados no Knowledge e o checkpoint registrou o fechamento em `04-Projetos/00-log.md`.

- [2026-09-08] Gate QA Mental da Fase 10 aprovado por Vinicius: apto como protótipo, isolamento entre tenants e RBAC administrativo confirmados. Indisponibilidade do banco deve exibir erro compreensível e orientar contato via WhatsApp; aviso automático fica explicitamente fora do MVP e entra na próxima etapa de integrações.

- [2026-09-08] Modo de demonstração local concluído: login por credenciais em `.env.local`, cookie `httpOnly` de 8 horas e logout próprio; dados fictícios em memória cobrem as telas de aluno e administração, sem alterar banco ou Auth remoto. A sidebar passou a expor links diretos para todas as rotas prontas. Seis testes demo, TypeScript, lint e build passaram; login, persistência de sessão, rota protegida e logout foram conferidos no navegador.

- [2026-09-07] Dados de demonstração semeados no tenant live `4e39d3d6` (a pedido de Vinicius, override do QA Mental): Vinicius como admin+aluno + aluna Lia; 1 turma (cap 6), 16 sessões, 6 presenças, 8 atividades (2 em revisão), 2 submissões finalizadas, 8 projetos (4 ciclos × 2), 1 consentimento verificado. PII cifrada com `academy-local-dev-pii-key` (mesma chave em `.env.local`). Auth de Lia criada em `auth.users` (FK NOT NULL).
- [2026-09-07] `.env.local` criado (URL + anon key reais, `PII_ENCRYPTION_KEY=academy-local-dev-pii-key`, `SUPABASE_SECRET_KEY` como placeholder para Vinicius colar). Confirmado gitignored.
- [2026-09-07] Navegação da sidebar já funcional via Next `<Link>` (`app-shell.tsx`) — nenhuma mudança necessária; RBAC alterna nav aluno/admin por `profile.role`.
- [2026-09-08] **Bug de infra corrigido**: schema `logos_academy` não estava exposto no PostgREST (`PGRST106`) → todas as APIs davam 500 ("Não foi possível resolver a sessão"). Fix: `alter role authenticator set pgrst.db_schemas=...,logos_academy` + `notify pgrst,'reload config/schema'`. ⚠️ Durabilidade: se Vinicius editar Exposed Schemas no painel Supabase, precisa manter `logos_academy` na lista.
- [2026-09-08] **Bug de código corrigido** (`app/api/me/route.ts`): `/api/me` passava pelo `activityController` que exige role `student` → admin recebia 403 e o app-shell nunca carregava perfil/toggle. Reescrito como handler próprio com `requireAuthenticated` (perfil é do próprio usuário; `getProfile` usa só tenantId+userId). PATCH segue exclusivo de aluno. Vinicius definido como `admin` (superset: vê as 7 telas de aluno via `requireAuthenticated` + as 3 de admin).

- [2026-08-31] Projeto inicializado via `/logos init` como `saas-premium`.
- [2026-08-31] Entrevista Socrática da Fase 1 concluída e `IDEA LOCK` aprovado.
- [2026-09-01] PRD, JSON Schema e 38 contratos iniciais criados, validados e revisados.
- [2026-09-01] `PRD LOCK` aprovado explicitamente; contratos congelados e Fase 3 iniciada.
- [2026-09-01] Arquitetura mínima Next.js + Supabase documentada; diagramas Archify renderizados e validados.
- [2026-09-01] SR-001 e SR-002 aprovados explicitamente por Vinicius.
- [2026-09-01] Recibo persistente de feedback e paginação de presença/portfólio sincronizados no PRD, schema e contratos.
- [2026-09-01] Contratos TypeScript strict, JSON Schema, `validate.py` e check de 39 endpoints passaram.
- [2026-09-01] Revisões independentes de contrato e arquitetura passaram sem blocker crítico ou alto.
- [2026-09-01] Gate da Fase 3 aprovado; Fase 4 iniciada.
- [2026-09-02] Quinze referências oficiais da Academy catalogadas e verificadas.
- [2026-09-02] Três direções visuais renderizadas, validadas em browser e preparadas para o gate humano.
- [2026-09-02] Gate `style_direction` aprovado: Estúdio de Missões como base, com linguagem de evidência do Caderno de Construção.
- [2026-09-02] `PRODUCT.md` criado pelo fluxo obrigatório da Impeccable.
- [2026-09-02] `DESIGN.md`, `.impeccable/design.json` v2 e `docs/design-system.md` consolidados.
- [2026-09-02] Direção A+C elevada para “Oficina de Evidências”, com Home do aluno, painel admin, temas, estados, motion e responsividade.
- [2026-09-02] Auditoria browser corrigiu logo externa, animação de layout e captura de toque da sidebar mobile.
- [2026-09-02] Protótipo real Next.js 15 criado com Home do aluno, Atividade e Painel admin, mock data e estados de conteúdo/loading/empty/error.
- [2026-09-02] Curadoria 21st aplicada ao trilho de progresso e aos campos; `skiper40` instalado via registry Shadcn e usado em um único link secundário.
- [2026-09-02] Smooth Input reconstruído sem DialKit, SSR-safe, com caret elástico, label persistente, helper acessível e fallback para movimento reduzido.
- [2026-09-02] Lint, TypeScript, build e auditoria responsiva 375/768/1440 passaram; screenshots do Handshake geradas.
- [2026-09-03] Handshake Visual aprovado explicitamente por Vinicius; gate da Fase 4 passou e o projeto avançou para a Fase 5.
- [2026-09-03] `/logos plan` concluiu 6 tracer bullets, 7 waves operacionais, 10 specs draft e registry; 39/39 endpoints e oráculos GWT validados.
- [2026-09-04] SR-003 e mapa de páginas aprovados: seis itens na navegação do aluno, quatro no admin e tabs somente entre visões do mesmo objeto.
- [2026-09-04] Batch das 10 specs aprovado explicitamente; gate da Fase 5 passou e o projeto avançou para a Fase 6.
- [2026-09-05] Schema core concluído em 9 migrations: 32 tabelas, RLS/Storage, pgcrypto, seed de dois tenants e 72 asserts pgTAP versionados.
- [2026-09-05] Duas rodadas de revisão adversarial corrigiram fluxos de submissão/upload, bypasses administrativos, seed, bucket privado, PII e aprovação auditável de projetos; revisão final estática aprovada sem finding crítico/alto.
- [2026-09-05] MCP Supabase adicionado ao `.mcp.json` do projeto para o ref `nqubjiosnlaatxxamiut`; autenticação permanece pendente no Claude CLI.
- [2026-09-05] Migrations 0001–0010 aplicadas no projeto Supabase `nqubjiosnlaatxxamiut` sob o schema isolado `logos_academy`: 32 tabelas com RLS e bucket privado `submissions`; seed local não foi aplicado no remoto.
- [2026-09-05] Schema `logos_academy` exposto na Data API por Vinicius; grants para authenticated e RLS nas 32 tabelas confirmados via banco.
- [2026-09-05] Migrations 0011-0013 aplicadas no projeto remoto: guards de atualização/evidência corrigidos e privilégios de escrita operacional mantidos exclusivamente no backend.
- [2026-09-05] Gate da Fase 6 aprovado: 72 asserts pgTAP passaram em transações revertidas (10 schema, 21 RLS, 20 regras, 21 RPCs); fixture nunca persistiu no projeto remoto.
- [2026-09-05] Advisors consultados: nenhum alerta associado ao schema `logos_academy`; alertas existentes pertencem aos schemas compartilhados `public`, `delphi` e `Logus_Tech_Oficinas` e ficaram fora do escopo.
- [2026-09-05] Wave 0 iniciou por `platform-security-foundation`, mas foi pausada por Sync Request: ausência de clientes Supabase, ambiente de teste e controller contratado impede TDD e uma implementação segura.
- [2026-09-05] Vinicius aprovou incorporar W0.1/W0.10 à fundação: clientes Supabase, `.env.example`, Vitest/jsdom e fixtures entram sem endpoint novo; spec atualizada antes do redispatch.
- [2026-09-05] `platform-security-foundation` concluída: clientes Supabase SSR/admin server-only, erro tipado, cursor, identidade tenant-aware e 7 testes verdes; TypeScript e lint passaram.
- [2026-09-06] RPCs transacionais de admissions aplicadas no Supabase remoto: criação de turma/sessões, matrícula, consentimento e convite idempotente são `SECURITY DEFINER` exclusivas de service role; 18 asserts pgTAP passaram em transação revertida.
- [2026-09-06] Recovery do convite após Auth aplicado no remoto: vínculo idempotente de `auth_user_id` sem PII e 9 asserts pgTAP passaram; o fluxo de convite server-only foi integrado e validado localmente.
- [2026-09-06] `admissions-classes-calendar` concluída: convite idempotente, consentimento, turmas, 16 sessões, matrículas, calendário e rotas contratadas usam adapters/RPCs server-only; 10 testes focalizados, TypeScript e lint passaram.
- [2026-09-06] Wave 1 aprovada após correções: migrations 0020–0023, callback de ativação, compensação Auth, posições globais 1–16 e DTOs completos passaram pela rerevisão sem finding crítico/alto.
- [2026-09-06] Wave 2 iniciou com migration 0024 aplicada no remoto: atualização administrativa de sessão e leitura paginada de frequência do aluno são RPCs server-only, sem nota privada.
- [2026-09-06] Rotas da Wave 2 implementadas no commit `aacf2ae`: 5 testes focalizados, TypeScript e lint passaram; aguardam correção de cursor/DTOs no banco antes da revisão.
- [2026-09-06] Wave 2 aprovada após migrations 0025–0026: cursor de frequência, DTOs de presença/reposição e posição global de sessão passaram pela rerevisão sem finding crítico/alto.
- [2026-09-06] Wave 3 no app concluída no commit `2cf2270`: rotas de Início, Jornada, Conceitos e confirmação de leitura usam RPCs server-only, validação Zod e erros normalizados; 2 testes focalizados, TypeScript e lint passaram. A revisão deve cobrir as lacunas remanescentes nos DTOs/paginação das RPCs 0027.
- [2026-09-06] Wave 3 aprovada após migrations 0028–0030: ownership de conceitos, recibo de feedback, DTOs derivados, prioridade Home e cursor foram rerevisados sem finding crítico/alto/médio.
- [2026-09-07] WIP committado (`ba8dd69`): RBAC no nav via `/api/me`, rubrica de critérios obrigatória na fila de revisão, jornada sem `enrollmentId` exigido, migration 0041, fix `rel=noreferrer` no skiper40. 46 testes vitest verdes, tsc e lint limpos.
- [2026-09-07] Gate da Fase 7 aprovado: 9 features (waves 0–5) built + reviewed sem finding crítico/alto; zero `any`, zero `console.log`, C→S→R respeitado. `e2e-acceptance` reclassificado como escopo Fase 10 (endurecimento adversarial + WCAG + E2E + LGPD) e não bloqueia o gate.
- [2026-09-07] Fase 8 iniciada. Telas core do protótipo já ligadas às APIs reais (Início, Atividade, Jornada, Projetos, Revisões, Admin); faltam Glossário, Agenda, Perfil, Alunos, Turmas, Encontro e o shell de auth.

- [2026-09-07] Gate da Fase 8 aprovado: Glossário, Agenda, Perfil, Alunos, Turmas, Encontro e Auth foram entregues com estados, tokens Academy, motion Framer Motion/GSAP, fallback de movimento reduzido e responsividade registrada. `npm test` (52), lint, TypeScript, build e `validate-ui.py --rigor completo` passaram; revisão independente terminou sem finding crítico, alto ou médio.
- [2026-09-07] Hardening pós-revisão: retorno pós-auth aceita apenas path interno validado; notas privadas de frequência vazias são soft-deleted pela migration remota `0043_clear_attendance_private_note`; abas de Agenda têm roving tabindex e foco por setas.

- [2026-09-07] Gate da Fase 9 aprovado como não aplicável ao MVP: PRD, tarefas e arquitetura excluem WhatsApp automático, N8N, OAuth GitHub, IA em runtime e webhooks. A spec `integrations-mvp-phase9` documenta os gatilhos de evolução; varredura local e revisão de segurança não encontraram cliente externo, token real, webhook ou dependência especulativa. `npm test` (52), lint, TypeScript e build passaram; revisão final terminou sem finding crítico, alto ou médio.
- [2026-09-07] Fase 10 — ciclo técnico concluído: 57 testes, lint e build passaram; code review, security audit, UI review e auditoria adversarial foram rechecados após um único ciclo de correções. O banco remoto confirma RLS forçada em 32/32 tabelas e remoção do `EXECUTE` de `authenticated` das quatro RPCs legadas. `memoria/eval.json` registrou score 0,945. Falta apenas o QA Mental humano.

## Specs

| Spec | Status | Atualização |
|---|---|---|
| `docs/ideia.md` | aprovado | 2026-08-31 |
| `docs/PRD.md` | aprovado e locked — v0.1.2 (SR-003) | 2026-09-04 |
| `specs/product.schema.json` | validado | 2026-09-01 |
| `specs/api.contracts.ts` | validado — 39 endpoints | 2026-09-01 |
| `docs/ARCHITECTURE.md` | aprovado | 2026-09-01 |
| `docs/tasks.md` | aprovado — tasks ≤4h | 2026-09-04 |
| `specs/registry.json` | 10 features aprovadas | 2026-09-04 |
| `docs/specs/frontend-premium-phase8.md` | built e reviewed | 2026-09-07 |
| `docs/specs/integrations-mvp-phase9.md` | built e reviewed — não aplicável ao MVP | 2026-09-07 |
| `docs/specs/demo-auth-and-data.md` | built e validated — somente ambiente local | 2026-09-08 |

## Workers Ativos

(nenhum.)

## Sync Requests Pendentes

(nenhum — RPCs transacionais aprovadas por Vinicius em 2026-09-05.)

## Bloqueios

- Fase 12 — `npm audit` ainda reporta 2 vulnerabilidades altas em PostCSS transitivo do Next 15 e 1 crítica/4 moderadas no toolchain Vitest/Vite. A correção automática exige `npm audit fix --force` (Next 16 + Vitest 5), uma atualização major que requer aprovação explícita e validação completa antes de novo deploy.
- Registro vivo de ADRs expõe apenas ADR-030, embora o playbook cite ADR-025–031; não numerar ADR global até o checkpoint corrigir a deriva.
- Git: o projeto vive dentro do repo do vault (sem `.git` próprio) e ~40 arquivos versionáveis seguem untracked (`docs/`, `specs/`, `supabase/migrations/`, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`). Commits anteriores só rastrearam `app/` e `src/`. Regularizar antes do deploy (ADR-035: repo GitHub dedicado via `git init` na subpasta).

## Lições

- [2026-08-31] A plataforma não substitui a aula presencial → conceitos são referência; atividades e acompanhamento prolongam o encontro.
- [2026-08-31] Dados pessoais do aluno não justificam um tenant por aluno → tenant representa a Logos Academy; propriedade individual usa aluno, matrícula e RLS.
- [2026-08-31] “GitHub conectado” não implica OAuth → no MVP, vincular perfil e enviar URL do repositório.
- [2026-09-01] Chamar a tela inicial do aluno de dashboard confundia ação com análise → aluno terá `Início`; dashboards ficam para admin e, futuramente, responsáveis.
- [2026-09-01] Percentual mínimo de presença não representa a regra pedagógica → concluir qualquer módulo exige 100% dos encontros, com reposição obrigatória para faltas.
- [2026-09-01] Feedback “novo” exige estado de leitura próprio; não pode ser inferido de `revision_requested` porque feedback aprovado também precisa aparecer.
- [2026-09-01] Coleções pequenas por matrícula podem ser limitadas pelo domínio, mas históricos entre matrículas precisam de paginação explícita.
- [2026-09-02] Login do CLI 21st não autoriza automaticamente o registry remoto no Shadcn; componentes externos só entram após inspeção do código-fonte.
- [2026-09-02] DialKit pertence ao playground do Smooth Input, não ao produto; preservar a microinteração não exige levar a ferramenta de configuração para produção.
- [2026-09-03] Hovers amplos e secos não comunicam o caráter premium da Academy → usar deslocamento de 1–2 px, borda laranja progressiva e movimento direcional; reservar o halo animado às superfícies prioritárias.
- [2026-09-04] Tabs só agrupam visões do mesmo objeto; Jornada, Atividade, Dashboard e Revisão detalhada permanecem fluxos contínuos para não esconder sequência ou decisão.
- [2026-09-05] Em triggers reutilizados, ramificar por `tg_table_name` antes de referenciar campos de `new`; booleanos SQL não protegem campos ausentes em todos os tipos de registro.
- [2026-09-05] Grants amplos para schema customizado não podem reabrir escritas operacionais: reaplicar revogações backend-only após o grant e cobrir o limite com pgTAP.
- [2026-09-07] Regex de data não valida o calendário: datas impossíveis precisam de round-trip UTC antes de alcançar uma RPC, para retornarem 400 em vez de erro interno.
- [2026-09-08] Um projeto Vercel legado marcado como `Other` pode construir Next.js, mas empacotar middleware de forma incompatível; `vercel.json` com `framework: "nextjs"` versiona e aplica o override por deploy.
