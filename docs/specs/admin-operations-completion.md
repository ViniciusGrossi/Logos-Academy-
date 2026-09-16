---
title: "admin-operations-completion: Spec"
date: 2026-09-16
projeto: "Logos Academy Platform"
fase: "release-2-onda-a"
status: approved
wave: 11
tags: [spec, admin, release-2, onda-a]
---

# Spec: admin-operations-completion (Release 2 · Onda A)

## Objetivo

Permitir que o admin opere a Academy inteira pela interface, sem SQL: convidar aluno, criar turma, matricular, registrar reposição, concluir matrícula, revisar entregas com contexto e priorizar o dia pelo dashboard. Hoje a maior parte da API existe, mas não tem tela, e algumas telas não têm os dados de que precisam.

## Diagnóstico (branch `main`, commit d44307b)

| Capacidade (PRD) | API | Interface | Lacuna |
|---|---|---|---|
| F01 Convite do aluno | `POST /api/admin/students/invite` ✅ | ❌ | Tela; falta listar currículos (SR-A3) |
| F09 Criar turma + 16 encontros | `POST /api/admin/classes` ✅ | ❌ | Tela; SR-A3 |
| F09 Matrícula individual/turma | `POST /api/admin/enrollments` ✅ | ❌ | Tela; SR-A3 |
| Pausar/cancelar/reativar matrícula | `PATCH /api/admin/enrollments/:id` ✅ | ❌ | Tela |
| F10 Reposição | `POST /api/admin/attendance/:id/makeup` ✅ | ❌ | `AttendanceEntry` não traz o id do registro (SR-A1); não existe lista de reposições pendentes (SR-A2) |
| F13 Conclusão | `completion`, `presentation`, `complete` ✅ | ❌ | Tela |
| F06 Revisão | `GET /api/admin/reviews`, `POST .../review` ✅ | protótipo em `/revisoes` | Fila sem aluno/atividade/turma (SR-A4); sem detalhe único (SR-A5); admin não baixa anexos (SR-A7) |
| F11 Dashboard | `GET /api/admin/dashboard?classId` ✅ | protótipo | Tela premium, filtro por turma, taxa, link para fila |
| F12 Ficha: entregas e frequência | ❌ | ❌ | Endpoints por aluno (SR-A6) |

## Spec Sync Requests (exigem aprovação de Vinicius)

| SR | Mudança de contrato | Motivo |
|---|---|---|
| **SR-A1** | `AttendanceEntry` ganha `attendanceId: UUID` | O endpoint de reposição exige o id do registro de frequência, que nenhuma leitura expõe. |
| **SR-A2** | `GET /api/admin/makeups?classId&studentId&cursor&limit` → `Page<PendingMakeup>` com `{ attendanceId, enrollmentId, studentId, studentName, classId, className, session: SessionSummary, status }` | Faltas sem reposição precisam de uma fila; hoje só existe a contagem. |
| **SR-A3** | `GET /api/admin/curricula` → `readonly { id, name, version, status }[]` (somente `active`) | Convite, turma e matrícula exigem `curriculumId`, e nenhuma leitura o fornece. |
| **SR-A4** | `ReviewQueueSubmission` ganha `student: { id, displayName }`, `activity: { title, lessonPosition, cyclePosition }`, `classSummary: { id, name } \| null` e `dueAt` | A fila atual mostra apenas o id da atividade. |
| **SR-A5** | `GET /api/admin/submissions/:submissionId` → `ReviewQueueSubmission` com `reviews` (histórico) e `requirements` | Workspace único de revisão em `/admin/revisoes/[submissionId]` (PRD §7.3). |
| **SR-A6** | `GET /api/admin/students/:studentId/submissions?cursor&limit` → `Page<ReviewQueueSubmission>` e `GET /api/admin/students/:studentId/attendance?enrollmentId&cursor&limit` → `Page<AttendanceEntry & { session: SessionSummary }>` (com nota privada) | Abas Entregas e Frequência da ficha (PRD §7.3). |
| **SR-A7** | `GET /api/files/:fileId/download-url` passa a aceitar admin do mesmo tenant | O revisor precisa abrir anexos da entrega. |

Nenhuma SR altera regra pedagógica, estado ou tabela; todas são leituras novas ou campos a mais. Implementação via RPCs `service_role` (migration `0051_admin_operations_read_models.sql`, número provisório: a Release 1 pode ocupar 0051 com o Atlas — renumerar no merge).

## Rotas e composição (PRD §7.3)

| Rota | Composição |
|---|---|
| `/admin` | Dashboard premium: métricas, fila priorizada (48 h), próximas aulas, alunos em risco com motivo, filtro por turma persistido em `?classId=` |
| `/admin/alunos` | Lista atual + ação **Convidar aluno** (Sheet em 3 passos: aluno → responsável e termo → matrícula) |
| `/admin/alunos/[studentId]` | Abas `Resumo`, `Formação` (matrículas: pausar/cancelar/reativar, nova matrícula, conclusão), `Entregas`, `Frequência`, `Projetos`, `Cadastro e consentimento` |
| `/admin/turmas` | Lista atual + **Nova turma** (Sheet: nome, currículo, data inicial, dois dias, horários, duração, fuso, prévia dos 16 encontros) |
| `/admin/turmas/[classId]` | Abas `Visão geral`, `Calendário`, `Alunos` (+ matricular aluno existente, até 6), `Pendências` (reposições e entregas atrasadas) |
| `/admin/encontros/[sessionId]` | Abas `Chamada`, `Atividade`, `Reposições`; reagendamento no cabeçalho |
| `/admin/reposicoes` | Fila de reposições pendentes (SR-A2); registrar via Sheet |
| `/admin/revisoes` | Abas `Aguardando`, `Prazo crítico` (≥ 48 h), `Correções`; substitui `/revisoes` (que passa a redirecionar) |
| `/admin/revisoes/[submissionId]` | Workspace único: entrega + anexos, rubrica por critério, feedback, histórico de versões e revisões |

Navegação admin: Visão geral · Alunos · Turmas · Revisões · Reposições.

## Fluxos e regras

- **Convite:** a validação espelha `InviteStudentSchema`; o termo físico é confirmado por checkbox obrigatório; usa `Idempotency-Key` gerada por tentativa de envio; turma cheia → mensagem de `CONFLICT` ao lado do campo turma.
- **Nova turma:** a prévia calcula os 16 encontros no cliente com as mesmas regras do servidor; a resposta do servidor é a fonte final.
- **Matrícula:** `completed` nunca é setado por PATCH; a conclusão usa o fluxo próprio. Cancelar exige confirmação (Dialog).
- **Conclusão:** exibe `CompletionCheck` com bloqueios legíveis; registrar apresentação (Demo Day ou substitutiva); "Concluir" só fica habilitado com `eligible` e o servidor recalcula.
- **Reposição:** registrar data e encontro equivalente opcional (sessões de outras turmas com a mesma aula); a ausência original permanece visível.
- **Revisão:** rubrica obrigatória por critério; a decisão é derivada (algum `needs_adjustment` → `revision_requested`), com confirmação explícita; feedback obrigatório; proteção contra duplo clique.
- Toda mutação: estado pending, sucesso com recarga do recurso, erro tipado exibido sem perder o formulário.

## Estados, acessibilidade e design

- Mesmo mundo visual do admin atual (`components/admin/*`, `admin-experience.module.css`, `components/academy`), cadência densa e calma. O dashboard e a fila de revisões deixam o CSS do protótipo (`components/prototype/admin-dashboard.tsx`, `review-queue.tsx`).
- Loading com geometria, vazio com próximo passo real e erro com retry local, sempre dentro do `AppShell`.
- Sheets e Dialogs Radix com foco preso e retorno; formulários com `aria-describedby`; alvos ≥ 44 px; `prefers-reduced-motion`.
- Modo demo cobre todos os fluxos novos com dados fictícios.

## Critérios de aceite

- **GWT-A01** Dado consentimento sem confirmação do termo físico, quando o admin tenta convidar, então o envio fica bloqueado com explicação.
- **GWT-A02** Dado convite válido, quando enviado duas vezes (duplo clique), então existe um único aluno e uma única matrícula.
- **GWT-A03** Dada turma com 6 matrículas ativas, quando o admin matricula o sétimo, então vê o conflito e nada é criado.
- **GWT-A04** Dados dois dias e horários, quando a turma é criada, então aparecem 16 encontros na ordem curricular.
- **GWT-A05** Dada uma falta, quando o admin registra a reposição pela fila, então ela sai da fila e a ausência original continua no histórico.
- **GWT-A06** Dado qualquer critério de conclusão pendente, quando o admin abre a conclusão, então vê os bloqueios e "Concluir" fica desabilitado.
- **GWT-A07** Dada entrega com anexo, quando o admin abre o workspace de revisão, então vê aluno, atividade, turma, itens e consegue baixar o arquivo.
- **GWT-A08** Dada submissão com mais de 48 h, quando o admin abre o dashboard ou `Prazo crítico`, então ela aparece priorizada.
- **GWT-A09** Dado filtro por turma no dashboard, quando a página é recarregada, então o filtro persiste pela URL.
- **GWT-A10** Dado usuário aluno, quando chama qualquer rota nova de admin, então recebe `FORBIDDEN`; tenant B nunca lê dados do tenant A.
- **GWT-A11** 375, 768 e 1440 px sem overflow; tabs, Sheets e rubrica operáveis por teclado.

## Fora do escopo desta onda

Área e papel de responsáveis (Ondas B–D), relatório para pais, notificações, edição de currículo e professores.

## Gates

1. Aprovação desta spec e das SR-A1 a SR-A7 por Vinicius.
2. Contratos, migration de leitura e pgTAP.
3. Backend (rotas novas e SR-A7) com testes.
4. Frontend desktop 1440 (claro/escuro, modo demo) → gate visual humano.
5. Responsivo, acessibilidade, testes completos, revisão de código e build.
6. Merge em `main` somente após a Release 1 estar fechada e mergeada (resolver numeração de migration e conflitos em `app-shell`/`demo-api`).
