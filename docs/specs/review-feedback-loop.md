---
title: "review-feedback-loop — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 4
tags: [spec, feature, sdd, reviews]
---

# Spec: review-feedback-loop

## Objetivo
Permitir ao admin revisar cada entrega por critérios binários e devolver feedback pedagógico auditável até aprovação.

## Fora de Escopo
- Nota numérica, rubrica editável, revisão por professor, notificações automáticas e alteração silenciosa de revisão publicada.

## Requisitos Funcionais
1. Listar submissões paginadas por turma e proximidade do SLA de 48 horas.
2. Exigir resultado para todos os critérios e feedback textual antes de publicar.
3. Publicar revisão append-only e alterar assignment atomicamente para `approved` ou `revision_requested`.
4. Em correção, abrir novo rascunho sem apagar versões/reviews anteriores.
5. Registrar leitura de feedback idempotente, inclusive aprovação, e refletir prioridade na Home.
6. Correção administrativa supersede com novo registro auditável.

## Superfícies Frontend
- `/admin/revisoes`: tabs `Aguardando`, `Prazo crítico` e `Correções`, persistidas em `?tab=`.
- `/admin/revisoes/[submissionId]`: workspace único de revisão, sem tabs, para manter entrega e critérios simultaneamente visíveis.
- `/admin/alunos/[studentId]?tab=entregas`: histórico de versões e feedbacks.
- `/atividades/[assignmentId]#historico`: feedback recebido e ação de correção no contexto da atividade.

## API Contract
```typescript
"GET /api/admin/reviews": Endpoint<PageQuery & { classId?: UUID; overdueOnly?: boolean }, Page<SubmissionDetail>>;
"POST /api/admin/submissions/:submissionId/review": Endpoint<{
  submissionId: UUID;
  decision: ReviewDecision;
  feedback: string;
  criteria: readonly { criterionId: UUID; result: CriterionResult; comment?: string }[];
}, ReviewDetail>;
"POST /api/student/reviews/:reviewId/seen": Endpoint<{ reviewId: UUID }, ReviewDetail>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Fila pagina sem repetição e prioriza submissão próxima/fora de 48h.
- [ ] Critério ausente ou feedback vazio bloqueia publicação.
- [ ] `revision_requested` cria ação “Corrigir entrega” e rascunho da próxima versão.
- [ ] `approved` muda estado e torna a evidência elegível ao projeto.
- [ ] Revisão publicada nunca é atualizada/apagada pela aplicação.
- [ ] Marcar feedback visto duas vezes produz um receipt e remove estado “novo”.
- [ ] Admin não acessa submissão de tenant estranho; aluno não publica revisão.

## Restrições Técnicas
- **Tabelas:** `reviews`, `criterion_reviews`, `feedback_receipts`, `submissions`, `activity_assignments`, `audit_events`, `idempotency_keys`.
- **Endpoints:** três listados acima.
- **Libs novas:** nenhuma.
- **Background jobs:** não; SLA é derivado na consulta.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | — |

## Segurança
- **Auth:** mutação de review somente admin; receipt somente aluno dono.
- **RLS:** reviews seguem tenant e cadeia submission→assignment→enrollment→student.
- **Criptografia:** feedback pedagógico cifrado em repouso se classificação de dados exigir.
- **LGPD:** feedback é dado educacional privado e não aparece em logs/demos reais.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| backend-engineer | transação append-only e fila | agents/backend-engineer.md |
| frontend-engineer | revisão admin e feedback aluno | agents/frontend-engineer.md |
| adversarial-tester | autorização e concorrência | agents/adversarial-tester.md |

## Validação
- **GWT-01:** Dadas submissões com 47h, 49h e 2h, quando lista overdue/prioridade, então ordena 49h antes de 47h e pagina sem duplicar.
- **GWT-02:** Dado critério sem resultado ou feedback vazio, quando publica, então recebe `VALIDATION_ERROR` e nada persiste.
- **GWT-03:** Dada decisão revision_requested, quando publica, então assignment muda e surge novo rascunho editável mantendo versão anterior.
- **GWT-04:** Dada decisão approved, quando publica, então assignment fica approved e project query inclui evidência.
- **GWT-05:** Dada revisão publicada, quando tenta alterá-la, então não existe update e correção cria revisão nova/superseding.
- **GWT-06:** Dado feedback novo, quando aluno marca visto duas vezes, então existe um receipt e Home deixa de priorizá-lo.
- **GWT-07:** Dado aluno ou admin de outro tenant, quando publica/lê review indevido, então recebe `FORBIDDEN`.
```bash
npm test -- -t "review|feedback"
```
