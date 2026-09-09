---
title: "Logos Academy Platform — Plano de Build do MVP"
date: 2026-09-03
fase: 5
status: approved
tags: [tasks, waves, mvp, sdd]
---

# Plano de Build do MVP

## Escopo travado

MVP: admin + aluno, tenant único Logos Academy, Explorer com 16 encontros/4 ciclos/4 projetos, turmas de até 6 alunos e produto individual, apoio às aulas presenciais, entrega e feedback pedagógico, presença com reposição, portfólio privado e conclusão derivada.

Fora do MVP: professor, responsável, Builder, Engineer, WhatsApp automático, certificado digital, CMS curricular, OAuth GitHub, IA no runtime, pagamentos, vídeo-aulas, realtime, filas e microsserviços.

## Arquitetura de interface aprovada

Regra: página troca objeto/tarefa; aba troca apenas a visão do mesmo objeto. O estado da aba vive em `?tab=`. Fluxos curtos usam Sheet/Dialog e não ganham rota própria.

| Área | Família | Abas ou composição |
|---|---|---|
| Aluno | Início | sem tabs; próxima ação |
| Aluno | Jornada | timeline contínua, sem tabs por ciclo |
| Aluno | Glossário | busca/lista + detalhe deep-linkável |
| Aluno | Atividade | fluxo único + accordion de histórico |
| Aluno | Projetos | `Em construção` · `Portfólio`; detalhe: `Visão geral` · `Evidências` · `Feedback` |
| Aluno | Agenda | `Próximas aulas` · `Frequência` |
| Aluno | Perfil | conta + GitHub, sem tabs |
| Admin | Dashboard | sem tabs; filtros contextuais |
| Admin | Alunos | lista + ficha: `Resumo` · `Formação` · `Entregas` · `Projetos` · `Cadastro e consentimento` |
| Admin | Turmas | lista + operação: `Visão geral` · `Calendário` · `Alunos` · `Pendências` |
| Admin | Encontro | `Chamada` · `Atividade` · `Reposições` |
| Admin | Revisões | `Aguardando` · `Prazo crítico` · `Correções`; detalhe em workspace único |
| Acesso | Conta | login, ativação e recuperação no mesmo shell |

Sheets/Dialogs: convidar aluno, criar matrícula/turma, reagendar, liberar atividade, registrar reposição/apresentação e confirmar conclusão.

## Tracer bullets

1. **Preparar e entrar:** importar currículo → criar turma ou individual → gerar 16 encontros → verificar consentimento → convidar → ativar aluno.
2. **Aula vira ação:** reagendar/fazer chamada → liberar atividade e conceitos → aluno vê Início, Jornada, Calendário e Frequência sem acessar conteúdo futuro.
3. **Produzir evidência:** abrir atividade → salvar rascunho → anexar texto/link/GitHub/arquivo privado → enviar versão imutável.
4. **Fechar feedback:** admin prioriza entrega → revisa critérios → publica feedback → aluno corrige ou recebe aprovação e marca leitura.
5. **Consolidar trajetória:** evidências aprovadas formam projetos → portfólio paginado → presença, apresentação e reflexão habilitam conclusão → histórico vira leitura.
6. **Operar por exceção:** dashboard deriva revisões, atrasos, reposições, próximas aulas e baixa adesão.

## Dependências e caminho crítico

```text
segurança/auth/RLS
  ├─ currículo ─┬─ turma/matrícula/sessões ─┬─ frequência/reposição ─┐
  │             │                           └─ liberação              │
  │             └─ conceitos ────────────────────────────────────────┤
  └─ storage privado ── rascunho/submissão ── revisão ── projetos ── conclusão
                                                            └─────── dashboard
```

Caminho crítico: fundação → currículo → matrícula/sessões → liberação → assignment → submissão → revisão → projeto → conclusão. Upload é ramo paralelo; dashboard entra somente após os estados transacionais estabilizarem.

## Waves

Todas as tarefas abaixo têm estimativa máxima de 4 horas.

Os comandos `npm test` das specs tornam-se executáveis em W0.10. Antes disso, os cenários GWT são oráculos aprováveis, não testes que fingem existir no protótipo.

### Wave 0 — Fundação segura

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W0.1 | Configurar Supabase local, env example e clientes server/browser/admin | 3h | — | conexão local e secret somente no servidor |
| W0.2 | Migrar tenant, users e memberships com RLS | 3h | W0.1 | pgTAP cross-role/cross-tenant |
| W0.3 | Migrar perfis, responsáveis e consentimentos com pgcrypto/RLS | 4h | W0.2 | cipher em repouso e DTO autorizado |
| W0.4 | Migrar currículo canônico com constraints | 3h | W0.2 | cardinalidade e relações verdes |
| W0.5 | Migrar turmas, matrículas, sessões e presença | 4h | W0.4 | constraints operacionais verdes |
| W0.6 | Migrar assignments e submissões com constraints | 3h | W0.5 | estados e versões verdes |
| W0.7 | Migrar arquivos e configurar bucket privado | 3h | W0.6 | policies de ownership verdes |
| W0.8 | Migrar reviews e feedback receipts append-only | 3h | W0.6 | constraints de revisão verdes |
| W0.9 | Migrar projetos, conclusão, auditoria e idempotência | 3h | W0.8 | constraints de evidência verdes |
| W0.10 | Configurar Vitest, Testing Library, jsdom, scripts e fixtures multiusuário | 4h | W0.2 | `npm test` + admin/aluno A/aluno B |

### Wave 1 — Preparar operação e entrada

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W1.1 | Implementar importador versionado do Explorer | 4h | W0.4 | snapshot 16/4/4 e Aula 16 estrutural |
| W1.2 | Implementar gerador puro de 16 encontros com timezone | 3h | W1.1 | casos turma e individual |
| W1.3 | Persistir turma e suas 16 sessões | 3h | W1.2,W0.5 | criação atômica e timezone correto |
| W1.4 | Criar matrícula de turma/individual e impor limite de 6 | 3h | W1.3 | endpoints e constraint de capacidade |
| W1.5 | Persistir ficha, responsável e consentimento verificado | 3h | W0.3,W1.4 | validação de canal e termo físico |
| W1.6 | Implementar convite idempotente, compensação Auth e ativação | 4h | W1.5 | fluxo sem órfão/duplicata |
| W1.7 | Construir shell de login, ativação e recuperação | 3h | W1.6 | três estados no mesmo shell visual |
| W1.8 | Construir lista de alunos e Sheet de convite | 4h | W1.6 | `/admin/alunos` navegável |
| W1.9 | Construir ficha do aluno: Resumo + Cadastro/consentimento | 4h | W1.5,W1.8 | tabs deep-linkáveis |
| W1.10 | Construir lista de turmas e Sheet de criação | 4h | W1.4 | `/admin/turmas` navegável |
| W1.11 | Construir shell da operação da turma | 3h | W1.10 | rota dinâmica e tabs vazias tipadas |

### Wave 2 — Aula presencial vira ação

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W2.1 | Implementar reagendamento e chamada por encontro | 4h | W1.3 | posição pedagógica preservada |
| W2.2 | Implementar reposição sem apagar ausência | 3h | W2.1 | presença efetiva derivada |
| W2.3 | Implementar liberação transacional coletiva/segmentada | 4h | W1.4 | assignment idempotente e bloqueio direto |
| W2.4 | Implementar consultas Início e Jornada | 3h | W2.3 | prioridade e bloqueios corretos |
| W2.5 | Implementar consultas Calendário e Frequência | 3h | W2.1,W2.2 | presença efetiva e isolamento |
| W2.6 | Implementar glossário liberado e busca sem acento | 3h | W1.1,W2.3 | conteúdo futuro ausente |
| W2.7 | Conectar Início e Jornada aos dados reais | 4h | W2.4 | prioridade + timeline responsiva |
| W2.8 | Construir Glossário e detalhe de conceito | 4h | W2.6 | busca, lista e deep link |
| W2.9 | Construir Agenda com tabs Aulas/Frequência | 4h | W2.5 | `?tab=` + estados obrigatórios |
| W2.10 | Preencher tabs Calendário/Alunos/Pendências da turma | 4h | W1.11,W2.1,W2.3 | operação por turma |
| W2.11 | Construir Encontro com tabs Chamada/Atividade/Reposições | 4h | W2.1,W2.2,W2.3 | fluxo presencial completo |

### Wave 3 — Produzir e entregar evidência

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W3.1 | Implementar detalhe e rascunho de texto/link/GitHub | 4h | W2.3 | validação HTTPS/github.com/requisitos |
| W3.2 | Implementar upload-url, finalize e download privado | 4h | W0.7,W2.3 | MIME/20MB/ownership validados |
| W3.3 | Implementar submissão imutável e atraso derivado | 4h | W3.1,W3.2 | expectedDraftId e histórico |
| W3.4 | Conectar Activity UI, Smooth Input e estados de envio | 4h | W3.3 | envio por teclado e mobile |
| W3.5 | Construir Perfil com conta e GitHub | 3h | W3.1 | atualização sem OAuth |

### Wave 4 — Feedback pedagógico

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W4.1 | Implementar fila paginada de revisão e SLA de 48h | 3h | W3.3 | prioridades derivadas |
| W4.2 | Implementar revisão append-only com todos os critérios | 4h | W4.1 | approved/revision_requested atômicos |
| W4.3 | Implementar correção, novo rascunho e reenvio | 4h | W4.2 | versões anteriores imutáveis |
| W4.4 | Implementar recibo idempotente e prioridade de feedback na Home | 3h | W4.2 | feedback visto uma única vez |
| W4.5 | Construir fila de Revisões com três tabs | 3h | W4.1 | filtros em `?tab=` |
| W4.6 | Construir workspace de revisão sem tabs | 4h | W4.2,W4.5 | entrega e critérios simultâneos |
| W4.7 | Integrar feedback/correção no histórico da Atividade | 3h | W4.3,W4.4 | loop aluno completo |

### Wave 5 — Trajetória, conclusão e operação

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W5.1 | Implementar project records e timeline pedagógica | 4h | W4.2 | quatro ciclos ordenados |
| W5.2 | Implementar portfólio privado paginado | 3h | W5.1 | histórico entre matrículas |
| W5.3 | Implementar presentation record e completion check derivado | 4h | W2.2,W5.1 | bloqueios 16/16,4 projetos,reflexão,apresentação |
| W5.4 | Implementar transição completed e modo somente leitura | 3h | W5.3 | mutações bloqueadas após conclusão |
| W5.5 | Implementar agregações e filtros do dashboard | 4h | W2.2,W4.1,W5.1 | pendências objetivas sem finanças |
| W5.6 | Construir Projetos com tabs Construção/Portfólio | 3h | W5.2 | lista e paginação responsivas |
| W5.7 | Construir detalhe do projeto com três tabs | 4h | W5.1,W5.6 | visão/evidências/feedback |
| W5.8 | Preencher tab Formação da ficha do aluno | 3h | W2.2,W5.3 | matrículas, frequência e conclusão |
| W5.9 | Preencher tabs Entregas e Projetos da ficha | 4h | W4.2,W5.2 | histórico contextual |
| W5.10 | Conectar Dashboard ao design aprovado | 4h | W5.5 | UI admin responsiva com dados reais |

### Wave 6 — Endurecimento e aceite

| ID | Tarefa | Est. | Dependência | Evidência |
|---|---|---:|---|---|
| W6.1 | Completar matriz adversarial RLS e storage | 4h | W5.1,W5.2,W5.3,W5.4,W5.5,W5.6,W5.7,W5.8,W5.9,W5.10 | zero leitura cross-user/cross-tenant |
| W6.2 | Testar idempotência, concorrência e invariantes | 4h | W5.1,W5.2,W5.3,W5.4,W5.5,W5.6,W5.7,W5.8,W5.9,W5.10 | convites, releases, drafts e reviews |
| W6.3 | Auditar WCAG, 375/768/1440 e performance | 4h | W5.6,W5.7,W5.8,W5.9,W5.10 | validate-ui e screenshots |
| W6.4 | Executar E2E convite→conclusão com dados fictícios | 4h | W6.1,W6.2,W6.3 | demonstração conduzida completa |
| W6.5 | Redigir `docs/compliance/lgpd-operational-procedures.md` para revisão | 3h | W6.1 | retenção/exportação/revogação/eliminação documentadas e prontas para revisão |

**Checkpoint externo sem estimativa:** antes do deploy, assessor jurídico e Vinicius precisam aprovar `docs/compliance/lgpd-operational-procedures.md`. Ausência de ambas as aprovações bloqueia produção, mas não infla artificialmente a duração de W6.5.

## Paralelização segura

- W0.10 pode acompanhar W0.3–W0.9.
- W2.1–W2.2 e W2.3–W2.4/W2.6 são trilhas independentes; W2.5 converge após presença e reposição.
- W3.1 e W3.2 podem rodar em paralelo; W3.3 depende das duas.
- W5.5 começa após W5.1 e pode rodar em paralelo a W5.2–W5.4; W5.6/W5.7, W5.8/W5.9 e W5.10 formam três trilhas de UI independentes.
- Máximo de dois workers simultâneos e nenhum compartilhamento de migration entre writers.

## Specs do batch

1. `platform-security-foundation`
2. `curriculum-bootstrap`
3. `admissions-classes-calendar`
4. `sessions-attendance-release`
5. `student-home-journey-concepts`
6. `activity-submission-files`
7. `review-feedback-loop`
8. `projects-portfolio-completion`
9. `admin-dashboard`
10. `e2e-acceptance`

## Ownership de endpoints compartilhados

Uma rota possui exatamente um owner de implementação. Specs consumidoras exibem a assinatura para tornar a dependência explícita, mas não recriam controller/service/repository.

| Endpoint | Owner | Consumers |
|---|---|---|
| `GET /api/admin/students` | `admissions-classes-calendar` | `admin-dashboard` |
| `GET /api/admin/classes` | `admissions-classes-calendar` | `admin-dashboard` |
| `GET /api/admin/reviews` | `review-feedback-loop` | `admin-dashboard` |
| `POST /api/student/reviews/:reviewId/seen` | `review-feedback-loop` | `student-home-journey-concepts` |
| `GET /api/student/calendar` | `admissions-classes-calendar` | `student-home-journey-concepts` |
| `GET /api/student/attendance` | `sessions-attendance-release` | `student-home-journey-concepts` |

`e2e-acceptance` consome todos os 39 endpoints e não implementa nenhum.
