---
title: "student-home-journey-concepts — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-frontend"
status: approved
wave: 2
tags: [spec, feature, sdd, student]
---

# Spec: student-home-journey-concepts

## Objetivo
Fazer o aluno entender em até cinco segundos sua próxima ação, trajetória, agenda, presença e conceitos já apresentados.

## Fora de Escopo
- Ranking, notas, métricas de colegas, central de notificações, vídeo-aulas e conteúdo de aulas futuras.

## Requisitos Funcionais
1. Priorizar correção → feedback novo → atividade disponível → configurar GitHub → sem pendência.
2. Mostrar quatro destinos de projeto, ocultando detalhes futuros e bloqueando URL direta.
3. Exibir calendário/frequência próprios e glossário pesquisável somente do conteúdo liberado.
4. Registrar visualização de feedback de forma idempotente.
5. Manter leitura de conteúdo liberado após conclusão.

## Superfícies Frontend
- `/`: Início sem tabs; prioridade única e próxima aula.
- `/jornada`: timeline contínua de quatro ciclos; ciclos não viram tabs.
- `/glossario` e `/glossario/[conceptId]`: busca/lista e detalhe deep-linkável.
- `/agenda`: tabs Shadcn `Próximas aulas` e `Frequência`, persistidas em `?tab=`.

## API Contract
Owner nesta spec: `GET /api/student/home`, `GET /api/student/journey` e os dois endpoints de conceitos. Receipt, calendário e frequência são contratos consumidores; seus owners estão em `review-feedback-loop`, `admissions-classes-calendar` e `sessions-attendance-release`.
```typescript
"GET /api/student/home": Endpoint<Record<string, never>, StudentHome>;
"POST /api/student/reviews/:reviewId/seen": Endpoint<{ reviewId: UUID }, ReviewDetail>;
"GET /api/student/journey": Endpoint<{ enrollmentId: UUID }, {
  enrollment: EnrollmentSummary;
  projects: readonly ProjectSummary[];
  sessionsCompleted: number;
  sessionsTotal: 16;
}>;
"GET /api/student/calendar": Endpoint<{ enrollmentId: UUID; from?: ISODate; to?: ISODate }, readonly SessionSummary[]>;
"GET /api/student/attendance": Endpoint<PageQuery & { enrollmentId?: UUID }, Page<{
  session: SessionSummary;
  status: AttendanceStatus;
  makeup: AttendanceEntry["makeup"];
}>>;
"GET /api/student/concepts": Endpoint<PageQuery & { search?: string }, Page<ConceptSummary>>;
"GET /api/student/concepts/:conceptId": Endpoint<{ conceptId: UUID }, ConceptDetail>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Correção pendente ocupa a ação principal acima de qualquer outro item.
- [ ] Feedback não visto, inclusive de aprovação, precede atividade quando não há correção; abrir marca como visto uma vez.
- [ ] Sem pendência, Início mostra próxima aula e estado claro.
- [ ] Jornada mostra destinos dos quatro ciclos sem revelar detalhes futuros.
- [ ] Conteúdo não liberado retorna `FORBIDDEN` por acesso direto.
- [ ] Busca sem acento encontra conceito liberado e exclui conceito futuro.
- [ ] Matrícula concluída mantém conteúdo liberado em leitura.
- [ ] Telas têm content/loading/empty/error, teclado e 375/768/1440 sem overflow.
- [ ] Atividade disponível sem correção/feedback ocupa a ação “Continuar atividade”.
- [ ] Início não contém ranking, comparação ou dados de colegas.

## Restrições Técnicas
- **Tabelas:** leitura derivada de matrículas, sessões, assignments, reviews/receipts, projetos, presença e currículo.
- **Endpoints:** sete listados acima.
- **Libs novas:** nenhuma; reutilizar Shadcn, Framer Motion e componentes do protótipo.
- **Background jobs:** não.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | — |

## Segurança
- **Auth:** JWT student.
- **RLS:** consultas filtram `student_profile_id`/`enrollment_id` da sessão; detalhes futuros são negados no service e banco.
- **Criptografia:** repository devolve apenas DTO autorizado já decifrado.
- **LGPD:** nenhuma comparação entre alunos; feedback pertence ao aluno autenticado.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| backend-engineer | agregação e regras de prioridade | agents/backend-engineer.md |
| frontend-engineer | conectar telas ao design aprovado | agents/frontend-engineer.md |
| ui-reviewer | acessibilidade, estados e responsividade | agents/ui-reviewer.md |

## Validação
- **GWT-01:** Dada correção e atividade disponível, quando abre Home, então `primaryAction.kind=revise_submission`.
- **GWT-02:** Dado feedback de aprovação não visto sem correção, quando abre e marca visto duas vezes, então precede atividade, depois some e existe um receipt.
- **GWT-03:** Dado nenhum trabalho pendente, quando abre Home, então `primaryAction.kind=none` apresenta mensagem clara de conclusão do trabalho atual, mostra a próxima sessão e não exibe ranking.
- **GWT-04:** Dada aula futura, quando abre Jornada, então vê só o destino do ciclo e nenhum conteúdo da aula.
- **GWT-05:** Dado assignment bloqueado, quando chama detalhe por UUID, então recebe `FORBIDDEN`.
- **GWT-06:** Dado “automação” liberado e outro futuro, quando busca “automacao”, então retorna apenas o liberado.
- **GWT-07:** Dada matrícula concluída, quando consulta conceito liberado, então lê e não encontra mutação disponível.
- **GWT-08:** Dada viewport 375 px e navegação por teclado, quando percorre estados, então não há overflow nem foco invisível.
- **GWT-09:** Dada atividade disponível sem correção nem feedback novo, quando abre Home, então `primaryAction.kind=continue_activity`.
- **GWT-10:** Dados alunos A e B, quando A abre Home, então não há ranking, comparação ou dado identificável de B.
```bash
npm test -- -t "student-home|journey|concepts"
# UI: agent-browser open localhost:3000/ → snapshot
```
