---
title: "admin-dashboard — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-frontend"
status: approved
wave: 5
tags: [spec, feature, sdd, admin]
---

# Spec: admin-dashboard

## Objetivo
Dar ao admin uma fila única e filtrável das decisões pedagógicas e operacionais que exigem ação hoje.

## Fora de Escopo
- Faturamento, pagamentos, ranking, métricas de vaidade, BI histórico e dashboard de responsável.

## Requisitos Funcionais
1. Derivar contagens de revisão, SLA, atraso e reposição, próximas aulas, alunos em risco e taxa entrega/aprovação.
2. Consolidar turmas e matrícula individual com filtro por turma e motivos objetivos de risco.
3. Priorizar reviews próximas/acima de 48h e permitir navegação ao registro acionável.
4. Não duplicar estado: indicadores são calculados de submissions, reviews, attendance, makeup e sessions.
5. Preservar design aprovado, estados obrigatórios, teclado e responsividade.

## Superfícies Frontend
- `/admin`: Dashboard sem tabs; filtros por turma/risco preservam o contexto e cada card navega para Alunos, Turmas ou Revisões.
- Não executa edição inline de aluno, turma, chamada ou review.

## API Contract
Owner nesta spec: somente `GET /api/admin/dashboard`. As três listagens restantes são contratos consumidores e não serão reimplementadas por este worker.
```typescript
"GET /api/admin/dashboard": Endpoint<{ classId?: UUID }, AdminDashboard>;
"GET /api/admin/reviews": Endpoint<PageQuery & { classId?: UUID; overdueOnly?: boolean }, Page<SubmissionDetail>>;
"GET /api/admin/students": Endpoint<PageQuery & { search?: string; classId?: UUID }, Page<StudentSummary>>;
"GET /api/admin/classes": Endpoint<PageQuery & { status?: ClassSummary["status"] }, Page<ClassSummary>>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Entregas de várias turmas formam fila consolidada e filtrável.
- [ ] Submissão próxima/acima de 48h recebe prioridade elevada por regra derivada.
- [ ] Aluno com atraso ou reposição aparece no filtro de risco com motivo objetivo.
- [ ] Taxa usa entregas/aprovações reais e filtros não vazam outra turma/tenant.
- [ ] Dashboard não inclui finanças, ranking ou dados de colegas na área student.
- [ ] Loading/empty/error/content funcionam em 375/768/1440 e por teclado.

## Restrições Técnicas
- **Tabelas:** consultas agregadas indexadas sobre `submissions`, `reviews`, `activity_assignments`, `attendance_records`, `makeup_records`, `sessions`, `enrollments`, `classes`.
- **Endpoints:** quatro listados acima.
- **Libs novas:** nenhuma; sem biblioteca de chart no MVP.
- **Background jobs:** não; adicionar materialized view/cache somente com medição de lentidão.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | consultas diretas indexadas |

## Segurança
- **Auth:** JWT + role admin.
- **RLS:** agregações filtradas pelo tenant e nunca executadas com service role no navegador.
- **Criptografia:** DTO contém somente display name e métricas autorizadas.
- **LGPD:** visão operacional privada; sem exportação ou comparação pública.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| backend-engineer | queries agregadas e filtros | agents/backend-engineer.md |
| frontend-engineer | painel e estados | agents/frontend-engineer.md |
| ui-reviewer | a11y/responsivo/fidelidade | agents/ui-reviewer.md |

## Validação
- **GWT-01:** Dadas pendências em duas turmas, quando admin abre sem filtro e depois filtra, então vê consolidado e recorte corretos.
- **GWT-02:** Dadas submissões com 47h e 49h, quando carrega, então 49h tem prioridade superior sem flag persistida.
- **GWT-03:** Dado aluno atrasado ou com reposição, quando filtra risco, então aparece com o motivo correspondente.
- **GWT-04:** Dados 8 envios e 6 aprovações autorizados, quando calcula taxa, então retorna 75% e exclui outro tenant.
- **GWT-05:** Dado dashboard renderizado, quando inspeciona seções, então não há faturamento, ranking nem pagamentos.
- **GWT-06:** Dadas viewports 375/768/1440 e teclado, quando percorre content/loading/empty/error, então não há overflow nem foco perdido.
```bash
npm test -- -t "admin-dashboard"
# UI: agent-browser open localhost:3000/admin → snapshot
```
