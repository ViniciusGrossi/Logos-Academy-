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

> Compactado por `state-compact.js` em 2026-10-15. O STATE guarda só o presente; o histórico integral está em `STATE-HISTORY.md`.

## Em Andamento

- [15/10 — evidência mais recente] E2E #10 delimita a falha em `click-confirmation`, antes de comprovar navegação para ativação; a avaliação diagnóstica da sessão do aluno também ficou indisponível. Ainda não atribuir a falha ao formulário/sessão do produto. `51de0c7` valida protocolo da ferramenta e reduz serviços auxiliares ociosos do runner, mantendo DB/Auth/REST/Storage reais. Revisão visual local isolada de Revisões/Atlas/editor/seletor documentada em `docs/qa/mvp-admin-visual-2026-10-15.md`; não substitui AA integral nem jornada real.

- [15/10 — atualização da validação] CI #65 passou aplicação e banco. E2E #7 aprovou login real de dois admins, turma com 16 encontros e bloqueio cross-tenant após corrigir cliques fora da viewport no harness. Próxima falha está na avaliação da página de ativação do primeiro aluno; E2E #8 (`0836342`) acrescenta classificação privada e retry somente para navegação transitória. Não tratar F01/ativação nem a jornada completa como aprovadas. Relatórios atuais em `docs/qa/mvp-validation-2026-10-15.md` e `docs/qa/mvp-real-e2e.md`. Produção preservada.

_Histórico completo: `STATE-HISTORY.md`._

## Concluído

- [2026-10-11] Revisões v2 publicada pelo commit `1d09408`: migration `review_overview` aplicada no Supabase e produção Vercel `dpl_2jSsEGNDM7ddvBAxVqtnEmp8CqU4` em estado `READY`. Smoke: `/login` 200, `/admin/revisoes` 307 para login sem sessão, API administ…
- [2026-10-11] A experiência administrativa de Revisões foi reconstruída em dois níveis: o Mapa de Evidências parte das matrículas da turma para mostrar também quem ainda não enviou; a Mesa de Revisão separa evidências, histórico, rubrica, correções obrigatór…
- [2026-10-10] Hotfix da fila de Revisões implementado em worktree isolado: o banco e a RPC estavam íntegros, mas o parser TypeScript rejeitava IDs determinísticos armazenados em colunas PostgreSQL `uuid` por exigir bits RFC de versão/variante. O contrato pas…
- [2026-10-05] A página de projeto deixou de inferir “Referências → Hipótese” por contagem de versões. A régua agora acompanha `AssignmentStatus`, explica que avança automaticamente e cada card informa a próxima ação. “Decisão registrada” virou “Registro da a…
- [2026-10-03] A mesa de Atividade passou a incluir o rascunho salvo em `latestSubmission` no histórico visível, com estado próprio e sem duplicar versões já enviadas. O “Repositório inicial” da aula 1 do Assistente foi tornado opcional em produção; os três d…
- [2026-10-02] Deploy curricular concluído: migration `enrich_explorer_v3_four_projects` aplicada no Supabase e commit `1da06a5` enviado ao GitHub. A produção agora exibe Assistente Pessoal Inteligente, Creative Studio, Automation Lab e MVP: Produto Inteligen…
- [2026-10-02] `explorer-four-projects-v3` implementado localmente: os quatro ciclos agora constroem Assistente Pessoal Inteligente, Creative Studio, Automation Lab e MVP: Produto Inteligente em 16 aulas incrementais. Todos os campos pedagógicos, 69 entregáve…
- [2026-10-02] As abas do prontuário do aluno foram refinadas com laranja sólido tanto no seletor animado quanto na moldura do conjunto, sem alterar a transição ou o suporte a movimento reduzido.
- [2026-10-02] A confirmação do convite deixou de ser bloqueada pela CSP: `form-action` permite a origem exata do Supabase além de `'self'`, e o middleware passou a reutilizar a política de segurança testada. Em produção, um clique real em `Continuar ativação…
- [2026-10-02] O link curto de convite passou a exigir uma confirmação humana antes de abrir o token de uso único do Supabase. Em produção, uma prévia com user-agent do WhatsApp recebeu `200`, sem redirecionamento nem token no HTML; o acesso posterior chegou …

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

_Histórico completo: `STATE-HISTORY.md`._

## Avaliação consultiva — Atividade (2026-09-24)

- Revisão solicitada pelo usuário: código atual, protótipo `Atividade v2 Premium.dc.html` e sessão autenticada em 1440×900, 768×1024 e 375×812. Nenhuma entrega enviada ou código de aplicação alterado; gates e próximo passo mantidos.
- Relatório: `C:/Users/everex/.codex/.chatgpt-projects/g-p-6a8a5a550a58819188163b85928ca0dd/AVALIACAO_PAGINA_ATIVIDADES_LOGOS_ACADEMY.md`.
- Achados para priorização, ainda não implementados: ausência de proteção de alterações não salvas; feedback de operações restrito ao formulário editável; campos editáveis durante salvamento; prontidão que mistura obrigatórios/opcionais; concorrência/remoção de uploads; navegação muito pequena e longa abertura antes da construção.
- Demonstração mistura detalhe legado de cartaz com título de vídeo no percurso v2 e conceitos genéricos, incluindo RAG. Origem confirmada nas fixtures; não extrapolar para dados reais do Supabase.
- Recomendações de composição e motion são propostas de revisão, não aprovação de nova direção visual nem autorização de deploy.
