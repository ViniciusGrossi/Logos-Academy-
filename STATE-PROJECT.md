---
title: "Logos Academy Platform — State of Project"
date: 2026-10-05
fase_atual: "12"
etapa_atual: "Fluxo real da página de projeto validado localmente e aguardando aprovação de deploy"
produto_tipo: "saas-premium"
proximo_passo: "Aprovar o deploy da correção da página Projetos; depois retomar o ensaio ponta-a-ponta com o aluno da turma-piloto Explorer v3"
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
features: { draft: 0, approved: 15, built: 15, reviewed: 12 }
overrides:
  - gate: npm-audit
    data: 2026-09-08
    motivo: "1 critical + 4 moderate sao devDependencies (Vitest/esbuild dev-server, nunca em producao); 2 high sao postcss build-time interno do Next 15 com CSS 100% first-party — zero vetor runtime em producao. CSO PASS 9/10. Limpo pelo upgrade Next 16 (em git stash) como milestone proprio."
status: "🟢 Produção estável · correção da página Projetos pronta para deploy"
tags: [status, roadmap, logos-academy, plataforma-estudantil]
---
# ESTADO — Logos Academy Platform

> Driver único do projeto. A skill `/logos` lê este arquivo para rotear o trabalho.

> Compactado por `state-compact.js` em 2026-10-02. O STATE guarda só o presente; o histórico integral está em `STATE-HISTORY.md`.

## Em Andamento

- [x] **`project-activity-flow-clarity`**: régua conceitual substituída pelos estados reais da atividade, orientação de uso e próximas ações explícitas; responsivo validado localmente, aguardando gate humano de deploy.
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

- [2026-10-05] A página de projeto deixou de inferir “Referências → Hipótese” por contagem de versões. A régua agora acompanha `AssignmentStatus`, explica que avança automaticamente e cada card informa a próxima ação. “Decisão registrada” virou “Registro da atividade”. Validação: 94 testes, lint, build e browser em 375 px sem overflow global.

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
| `specs/api.contracts.ts` | validado — 39 endpoints | 2026-09-01 |
| `docs/ARCHITECTURE.md` | aprovado | 2026-09-01 |
| `docs/tasks.md` | aprovado — tasks ≤4h | 2026-09-04 |
| `specs/registry.json` | 10 features aprovadas | 2026-09-04 |
| `docs/specs/frontend-premium-phase8.md` | built e reviewed | 2026-09-07 |
| `docs/specs/integrations-mvp-phase9.md` | built e reviewed — não aplicável ao MVP | 2026-09-07 |
| `docs/specs/demo-auth-and-data.md` | built e validated — somente ambiente local | 2026-09-08 |
| `docs/specs/student-experience-elevation.md` | approved — redesign visual em implementação | 2026-09-10 |

## Workers Ativos

(nenhum.)

## Sync Requests Pendentes

- [ ] Expor `trackKey`/nível tipado em `GET /api/student/journey`; a interface atual infere Explorer, Builder ou Engineer pelo nome do currículo. Não bloqueia o gate atual, mas deve ser sincronizado em spec e contrato antes de novas nomenclaturas entrarem em produção.

## Bloqueios

- Nenhum aluno real percorreu o fluxo completo: `reviews`, `uploaded_files`, `presentation_records` e `completion_records` estão com zero linhas e `project_records.approved` = 0 em produção. Correção, anexo, apresentação e conclusão nunca foram exercitados fora do modo demo.
- `logos_academy.approve_project` (migration 0009) é código morto: nenhuma rota, tela ou função do banco a chama — a aprovação real acontece pelo trigger `activity_assignments_sync_project`. Decidir entre remover ou expor como fallback manual.
- `python [SKILL_ROOT]/scripts/validate.py` do CLAUDE.md não existe (`~/.claude/skills/logos/` só tem `agents/`, `phases/`, `references/`, `SKILL.md`). O gate de specs da fase 2 não tem como rodar — mesma classe de deriva do ADR-022.
- Fase 12 — `npm audit` ainda reporta 2 vulnerabilidades altas em PostCSS transitivo do Next 15 e 1 crítica/4 moderadas no toolchain Vitest/Vite. A correção automática exige `npm audit fix --force` (Next 16 + Vitest 5), uma atualização major que requer aprovação explícita e validação completa antes de novo deploy.
- Registro vivo de ADRs expõe apenas ADR-030, embora o playbook cite ADR-025–031; não numerar ADR global até o checkpoint corrigir a deriva.
- Git: verificado em 2026-09-25 — o projeto TEM repo próprio (`.git` na pasta do projeto, remote `origin` → `ViniciusGrossi/Logos-Academy-`, 30 commits, HEAD `c5bc4e4`). `docs/`, `specs/`, `supabase/migrations/`, `PRODUCT.md`, `DESIGN.md` e `ARCHITECTURE.md` estão versionados. Working tree com 11 entradas sujas (10 modificados do redesign + `coach-mat.png` e o novo teste untracked). Push para o GitHub exige aprovação explícita separada. O bloqueio anterior ("sem `.git` próprio, ~40 arquivos untracked") era STATE desatualizado.
- Fase 12 — não existe superfície admin para **criar turma** (`POST /api/admin/classes`), **convidar aluno** (`POST /api/admin/students/invite`) nem **matricular** (`POST /api/admin/enrollments`), apesar de `docs/specs/admissions-classes-calendar.md` prever `/admin/alunos` com convite em Sheet e `/admin/turmas` com criação em Sheet. Mesma deriva da Formação: backend + RPC + mock prontos, tela ausente. Bloqueia o ensaio ponta-a-ponta com aluno real. Requer também `GET /api/admin/curricula`, que não existe (Sync Request).

## Lições

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
