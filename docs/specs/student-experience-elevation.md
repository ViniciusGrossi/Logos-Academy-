---
title: "Student Experience Elevation — Visual Redesign"
date: 2026-09-10
status: approved
milestone: visual-product-2026
wave: 8
tags: [spec, frontend, design, motion]
---

# Student Experience Elevation — Visual Redesign

## Objetivo

Elevar Início, Jornada e Projetos ao padrão visual do Auth “Estúdio Vivo de Evidências”, preservando contratos, dados, rotas e fluxos existentes.

## Direção

- A experiência do aluno é uma oficina viva: progresso, evidência e próximo passo têm presença espacial, resposta tátil e movimento intencional.
- O Auth fornece a atmosfera — topografia, rota, profundidade e luz de borda — sem ser copiado literalmente para a área de trabalho.
- Movimento deve comunicar estado ou orientar atenção; não entra como decoração repetitiva.
- A paleta e a tipografia existentes continuam canônicas. Nenhuma cor ou espaçamento é hardcoded fora dos tokens Academy.

## Escopo desta wave

1. **Início:** cena de progresso, rota de missão, destaque da próxima ação e feedback animado em marcos concluídos.
2. **Jornada:** trilha de aprendizado explorável, com progressão, conexões e revelação progressiva de detalhes.
3. **Projetos:** coleção de evidências, com cards em camadas, preview contextual e navegação com continuidade visual.
4. **Sistema compartilhado:** primitives reutilizáveis de entrada em cascata, magnetismo apenas para CTAs prioritários, foco/hover direcional e transições com spring.

## Fora de escopo

- Alterar APIs, schemas, RLS, permissões, dados de produção ou regras pedagógicas.
- Trocar a navegação de informação, esconder conteúdo essencial em animações, ou converter páginas administrativas no mesmo espetáculo visual.
- Adicionar dependências sem inspeção prévia e necessidade real. `framer-motion` e `gsap` já instalados são suficientes por padrão.

## Critérios de aceite

- [ ] As três rotas preservam conteúdo, CTAs e estados loading/empty/error existentes.
- [ ] Cada tela tem uma composição própria e um elemento de assinatura que comunica progresso/evidência, não apenas cards genéricos.
- [ ] CTAs prioritários têm feedback tátil; ações secundárias permanecem discretas.
- [ ] Animações respeitam `prefers-reduced-motion` e não dependem de hover em dispositivos de toque.
- [ ] Teclado, foco visível, contraste WCAG AA e alvos de 44 px são preservados.
- [ ] Não há overflow horizontal em 375, 768 e 1440 px; há screenshot de cada rota nesses viewports.
- [ ] Testes existentes passam, com novos testes para lógica visual/interativa.
- [ ] TypeScript, lint, build e `validate-ui.py --rigor completo` passam.

## Regras de motion

- Springs para progresso, expansão e confirmação, com easing uniforme entre primitives.
- Parallax, magnetismo ou resposta ao ponteiro só em superfícies de destaque; desligados em touch e movimento reduzido.
- Stagger de entrada curto e apenas na primeira carga ou mudança intencional de contexto.
- GSAP, se usado, fica restrito a uma cena de assinatura por rota; Framer Motion cobre o restante.

## Referências de implementação

- 21st: “Onboarding Stages” orienta a progressão da Home; “Interactive Tech Stack Builder” orienta a materialidade de Projetos. Referências de comportamento, não componentes copiados cegamente.
- Kinetics: card expansível, contador elástico, tab deslizante e feedback de clique orientam os primitives, adaptados aos tokens Academy.
- ReUI `data-grid`/`filters` fica reservado à futura elevação funcional do Admin, fora desta wave.

## Validação

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
python "C:/Users/BSBIA02-PROF01/Documents/Vinicius/Logos-Tech-master/Logos-Tech-master/.claude/skills/logos/scripts/validate-ui.py" --rigor completo
```

---

# Wave 9 — Activity Workbench v2 (a mesa de trabalho da Atividade)

**Data:** 2026-09-11 · **Status:** approved (em implementação) · **Milestone:** student-experience-elevation

## Por que esta wave existe

A Atividade é onde o aluno passa a maior parte do tempo. A versão atual funciona, mas não é uma **mesa de trabalho**: falta contexto imediato, o "pronto significa" não separa entregáveis de critérios de qualidade, o feedback por critério e o histórico existem no dado mas não são renderizados, e há um **bug crítico** no ciclo revisão→reenvio. Esta wave torna a página uma oficina completa, sem quebrar contratos, rotas ou RLS.

## Escopo (3 frentes)

### A — Corrigir o ciclo feedback → nova versão → reenvio (frontend + demo, sem schema)

Bug confirmado: em produção, `admin_publish_review` com `revision_requested` (migration 0035) cria um **draft vazio** (`version+1`, `is_draft=true`). A projeção `student_activity_detail` (0046) ordena `is_draft desc, version desc`, então `latestSubmission` passa a ser esse draft vazio — e a UI (activity-detail.tsx) lê o feedback de `latestSubmission.review` (null) e ainda gateia a exibição em `decision === "revision_requested"`. Resultado: o feedback some, os campos zeram, e feedback de atividade **aprovada** nunca aparece (viola Lição 166).

O demo mascara o bug: o `latest` mock é `is_draft:false` **com** review anexado — não reproduz o draft vazio de produção.

**Correção (frontend-only + demo):**
1. Derivar o `latestReview` da submissão **revisada mais recente** (varrer `submissionHistory` por review não-nula, maior `version`), nunca de `latestSubmission`.
2. Remover o gate `decision === "revision_requested"` — feedback aprovado e de revisão sempre visíveis enquanto houver review; estado de leitura vem de `seenAt`, não do decision.
3. Pré-preencher o novo draft vazio com os `items` da submissão anterior (o aluno edita a partir do que enviou, não do zero).
4. Tornar o demo fiel: após revisão, `latestSubmission` é um draft vazio (`is_draft:true`, sem review), e a review vive no histórico — reproduzindo produção.

### B — Completar a mesa com dado que já existe (frontend-only)

O contrato e a projeção 0046 já entregam tudo abaixo; falta renderizar:
1. **Feedback por critério** — mapear `review.criteria[]` (`met` / `needs_adjustment` + comentário) sobre cada `criteria[]` da atividade, com chip de resultado e comentário inline.
2. **Histórico expansível** — cada item de `submissionHistory` abre para mostrar entregáveis, arquivos, resultado por critério, feedback, data e decisão (hoje só versão/data/contagem).
3. **Abrir arquivo** — `GET /api/files/:fileId/download-url` para cada item `kind:"file"`, com o nome real do arquivo (novo `item.fileName`).
4. **Atrasada** — indicador visível quando `isOverdue`.
5. **Rascunho salvo** — confirmação com timestamp e versão ao salvar draft.

### C — Novos campos pedagógicos + reescrita das 16 atividades a partir do currículo (schema + seed)

O SSOT é `Curriculo/Curriculo_Operacional_Explorer.md`. Cada aula já tem os campos que faltam — nada é inventado, tudo é extraído.

**Migration 0047 — schema.** Novas colunas em `activity_templates` (todas texto, exceto `steps`):
| coluna | origem no currículo | papel na mesa |
|---|---|---|
| `context` | Objetivo da aula + Conteúdo | contexto imediato: onde você está e por quê |
| `expected_result` | Entrega do aluno (estado final) | "pronto significa": como fica quando termina |
| `steps jsonb` | Atividade prática (sequência) | passos da missão (`[{position,label}]`) |
| `plan_b` | Plano B se a ferramenta falhar | rota alternativa quando a ferramenta cai |
| `reflection_prompt` | Tarefa pós-aula / reflexão | pergunta de fechamento |
| `portfolio_evidence` | Evidência para portfólio | o que vira evidência |
| `tool_hint` | Ferramenta usada | ferramentas sugeridas |

**Multi-entregável e critérios atômicos são expansão de seed, não coluna nova:**
- `activity_requirements`: hoje 1 por atividade → passam a refletir todos os entregáveis de "Entrega do aluno".
- `activity_criteria`: hoje 1 critério composto por atividade ("objetivo claro, prompt estruturado, três exemplos, cinco testes e melhoria") → decompostos em critérios atômicos verificáveis.

**Decisão de arquitetura — imutabilidade.** O currículo Explorer v1 é protegido por `guard_explorer_v1_immutability` (0015), que bloqueia `UPDATE`/`DELETE`. A 0047 **desabilita os triggers** (`alter table … disable trigger user`), aplica `UPDATE` (títulos reais + 6 campos + steps; texto do critério existente vira o 1º critério atômico) e `INSERT` (entregáveis e critérios adicionais) — **nunca `DELETE`**, para não quebrar FK com `submission_items`/`criterion_reviews` existentes — e **reabilita os triggers**. Mesmos `curriculum_id` e ids de template: toda matrícula/submissão existente continua ligada. Migration é o canal sancionado para evolução controlada de seed; o invariante de runtime é preservado após.

**Migration 0047 — projeção.** `CREATE OR REPLACE student_activity_detail`: adiciona os 7 campos ao `jsonb_build_object` e adiciona `fileName` a cada submission item (join em `uploaded_files`).

**Contrato.** `ActivityDetail` ganha `context`, `expectedResult`, `steps: ActivityStep[]`, `planB`, `reflectionPrompt`, `portfolioEvidence`, `toolHint` (todos nullable durante rollout). `SubmissionItem` ganha `fileName: string | null`. Novo `ActivityStep { position: number; label: string }`.

## Fora de escopo desta wave

- Gate responsivo (375/768) — instrução explícita do fundador: **não** ir ao gate responsivo ainda. Só desktop 1440.
- UI de autoria de atividade no admin — não existe e não é necessária; os campos nascem do seed.
- Aplicar migrations 0045/0046/0047 em produção — permanecem locais até o gate visual passar.

## Sequência de execução (orquestração logos)

1. **Fundação (autoria direta):** spec → contrato → migration 0047 → demo fiel. `tsc --noEmit` verde.
2. **component-scout:** varre a mesa, troca bases genéricas por componentes melhores (dropzone, histórico expansível/timeline, chips de critério met/needs_adjustment, callout de contexto). Muda a base, testa render.
3. **frontend-engineer:** implementa A + B contra o novo contrato, os 3 estados, fidelidade ao design system, desktop 1440.
4. **ui-polisher:** craft, motion e elementos-assinatura, sem mudar comportamento/layout.
5. **Gate visual (humano):** Vinicius aprova o desktop 1440.

## Critérios de aceite (Wave 9)

- [x] Feedback (aprovado e revisão) sempre visível enquanto houver review; nunca some após criar novo draft.
- [x] Novo draft pós-revisão vem pré-preenchido com a submissão anterior.
- [x] Cada critério mostra resultado (`met`/`needs_adjustment`) e comentário quando revisado.
- [x] Histórico expande para itens/arquivos/critérios/feedback/data/decisão.
- [x] Arquivos abrem via download-url com nome real; `isOverdue` visível; rascunho salvo confirma versão+timestamp.
- [x] As 16 atividades têm título real, contexto, "pronto significa" separando entregáveis de critérios, múltiplos entregáveis e critérios atômicos — todos extraídos do currículo.
- [x] Demo fiel reproduz o draft vazio pós-revisão de produção.
- [x] `tsc`, lint, build e testes passam; nenhum token hardcoded fora do @theme.
