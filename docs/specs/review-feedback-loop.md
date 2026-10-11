---
title: "review-feedback-loop — Spec"
date: 2026-10-10
projeto: "Logos Academy Platform"
fase: "build-frontend"
status: approved
wave: 4
tags: [spec, feature, sdd, reviews]
---

# Spec: review-feedback-loop

## Objetivo

Dar ao admin uma visão completa da turma por atividade — quem ainda não enviou, quem aguarda revisão, quem precisa corrigir e quem foi aprovado — e um workspace claro para revisar cada evidência com histórico auditável.

## Decisão de experiência aprovada

- A visão de turma usa o conceito visual **Mapa de Evidências**: seletor de turma e atividade, síntese de estados e uma matriz de progresso por aluno.
- A revisão individual permanece em rota própria como **Mesa de Revisão**, mantendo entrega, rubrica, comentários e versões no mesmo contexto.
- A assinatura visual usa obsidiana, papel, linhas técnicas e laranja funcional do design system. O movimento principal é a progressão da linha de evidência; não há animação ornamental em todas as superfícies.

## Fora de escopo

- Nota numérica, rubrica editável, revisão por múltiplos professores e notificações automáticas por WhatsApp.
- Edição ou exclusão silenciosa de revisão publicada.
- Lembretes automáticos; a interface apenas torna atrasos e pendências visíveis.

## Requisitos funcionais

1. Listar turmas e permitir selecionar uma atividade do currículo da turma.
2. Exibir todos os alunos vinculados à turma, inclusive os que ainda não enviaram a atividade.
3. Distinguir `não enviado`, `rascunho`, `aguardando revisão`, `correção solicitada` e `aprovado`.
4. Abrir o workspace apenas quando existir uma versão enviada.
5. Mostrar a evidência atual, requisitos, rubrica, histórico de versões e revisões anteriores.
6. Exigir resultado para todos os critérios antes de publicar.
7. Permitir aprovação sem texto quando todos os critérios forem atendidos.
8. Exigir orientação textual quando qualquer critério precisar de ajuste.
9. Permitir comentário opcional por critério, tanto como correção quanto como sugestão de melhoria.
10. Publicar revisão append-only e alterar o assignment atomicamente para `approved` ou `revision_requested`.
11. Em correção, abrir novo rascunho sem apagar versões e revisões anteriores.
12. Registrar leitura de feedback idempotente e preservar isolamento por tenant.

## Contratos

```typescript
"GET /api/admin/reviews": Endpoint<PageQuery & {
  classId?: UUID;
  overdueOnly?: boolean;
}, Page<ReviewQueueSubmission>>;

"GET /api/admin/reviews/overview": Endpoint<{
  classId: UUID;
  activityId?: UUID;
}, ReviewOverview>;

"GET /api/admin/submissions/:submissionId": Endpoint<{
  submissionId: UUID;
}, AdminSubmissionWorkspace>;

"POST /api/admin/submissions/:submissionId/review": Endpoint<{
  submissionId: UUID;
  decision: ReviewDecision;
  feedback: string;
  criteria: readonly {
    criterionId: UUID;
    result: CriterionResult;
    comment?: string;
  }[];
}, ReviewDetail>;
```

## Regras do read model

- `admin_review_overview` é backend-only, valida o admin do tenant e exige `classId` pertencente ao mesmo tenant.
- As atividades vêm do currículo da turma, não apenas de submissões existentes.
- A linha do aluno parte das matrículas não canceladas da turma e faz `left join` com o assignment da atividade selecionada.
- A submissão apontada é a versão enviada mais recente; rascunhos nunca aparecem como evidência revisável.
- A resposta é ordenada por prioridade: aguardando revisão atrasada, aguardando revisão, correção solicitada, rascunho/disponível, aprovado.

## Critérios de aceite

- [ ] Uma turma com três alunos e somente uma entrega mostra os três alunos e identifica corretamente os dois sem envio.
- [ ] Trocar a atividade atualiza o mapa sem trocar de página e preserva a turma selecionada na URL.
- [ ] Aguardando revisão abre `/admin/revisoes/[submissionId]`; estados sem submissão não oferecem ação falsa.
- [ ] Todos os critérios atendidos permitem aprovar com feedback vazio.
- [ ] Qualquer critério em ajuste bloqueia a publicação até existir orientação textual.
- [ ] Comentários por critério são enviados e reaparecem no histórico da revisão.
- [ ] Publicar uma correção cria um novo rascunho e preserva a versão anterior.
- [ ] O mapa e o workspace têm estados loading, vazio, erro e sucesso; funcionam em 375, 768 e 1440 px.
- [ ] Controles têm foco visível, alvos de toque de 44 px e movimento reduzido respeitado.
- [ ] Admin de outro tenant não acessa turma, roster, submissão ou revisão.
- [ ] IDs UUID determinísticos persistidos pelo currículo são aceitos.

## Validação Given/When/Then

- **GWT-01:** Dada uma turma com alunos em estados diferentes, quando o admin abre o mapa, então todos aparecem em uma única leitura comparável.
- **GWT-02:** Dada uma atividade sem submissões, quando ela é selecionada, então o mapa mostra os alunos como não enviados, sem estado vazio enganoso.
- **GWT-03:** Dada uma entrega satisfatória, quando todos os critérios são marcados como atendidos e o feedback fica vazio, então a aprovação é publicada.
- **GWT-04:** Dado um critério em ajuste, quando o admin tenta publicar sem orientação, então recebe `VALIDATION_ERROR` e nada persiste.
- **GWT-05:** Dada uma revisão publicada, quando o aluno reenvia, então o histórico preserva todas as versões e revisões.
- **GWT-06:** Dado outro tenant, quando solicita o overview ou workspace, então recebe `FORBIDDEN`/recurso indisponível.

## Segurança e privacidade

- RPCs administrativas disponíveis apenas para `service_role` e chamadas após autenticação/role check no controller.
- Feedback é dado educacional privado, cifrado em repouso e nunca registrado em logs.
- Toda consulta filtra `tenant_id`; nenhum endpoint recebe tenant do cliente.

## Comandos de validação

```bash
npm test -- -t "review|feedback"
npm run lint
npm run build
```
