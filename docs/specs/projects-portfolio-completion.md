---
title: "projects-portfolio-completion — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 5
tags: [spec, feature, sdd, portfolio]
---

# Spec: projects-portfolio-completion

## Objetivo
Converter evidências aprovadas em quatro projetos privados e concluir o Explorer somente quando toda trajetória estiver comprovada.

## Fora de Escopo
- Portfólio público, certificado digital, badge, ranking e conclusão manual por checkbox.

## Requisitos Funcionais
1. Exibir quatro projetos e linha do tempo das quatro aulas de cada ciclo em ordem pedagógica.
2. Consolidar projeto no Project Day aprovado e manter portfólio privado entre matrículas, paginado.
3. Registrar Demo Day ou apresentação substitutiva com data, autor e nota contextual.
4. Derivar conclusão por 16 encontros cumpridos, 4 projetos, reflexão da Aula 16 aprovada, apresentação e zero correções pendentes.
5. Listar bloqueios sem alterar matrícula quando inelegível.
6. Após conclusão, manter histórico em leitura e impedir novas mutações sem matrícula ativa.

## Superfícies Frontend
- `/projetos`: tabs `Em construção` e `Portfólio`, persistidas em `?tab=`.
- `/projetos/[projectId]`: tabs `Visão geral`, `Evidências` e `Feedback`.
- `/admin/alunos/[studentId]?tab=formacao|projetos`: presença, elegibilidade, apresentação e conclusão no contexto do aluno.
- Registrar apresentação e confirmar conclusão usam Dialog; bloqueios aparecem antes da confirmação.

## API Contract
```typescript
"GET /api/student/projects": Endpoint<{ enrollmentId?: UUID }, readonly ProjectSummary[]>;
"GET /api/student/projects/:projectId": Endpoint<{ projectId: UUID }, ProjectDetail>;
"GET /api/student/portfolio": Endpoint<PageQuery & { enrollmentId?: UUID }, Page<ProjectDetail>>;
"GET /api/admin/enrollments/:enrollmentId/completion": Endpoint<{ enrollmentId: UUID }, CompletionCheck>;
"POST /api/admin/enrollments/:enrollmentId/presentation": Endpoint<{
  enrollmentId: UUID;
  kind: PresentationRecord["kind"];
  performedAt: ISODateTime;
  contextualNote?: string;
}, PresentationRecord>;
"POST /api/admin/enrollments/:enrollmentId/complete": Endpoint<{ enrollmentId: UUID }, CompletionCheck>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Projeto mostra evidências aprovadas em ordem das quatro aulas do ciclo.
- [ ] Antes do Project Day aprovado, projeto aparece em andamento; depois, concluído com data/evidências.
- [ ] Portfólio atravessa matrículas por cursor sem rota pública.
- [ ] Qualquer critério de conclusão faltante retorna blockers e não altera matrícula.
- [ ] Todos os critérios presentes permitem conclusão sem flags enviadas pelo cliente.
- [ ] Ausência original com reposição conta como cumprida sem sumir do histórico.
- [ ] Matrícula concluída mantém leitura e bloqueia mutações.

## Restrições Técnicas
- **Tabelas:** `project_records`, `presentation_records`, `completion_records`, matrículas, sessions/presença/reposição, assignments/submissions/reviews.
- **Endpoints:** seis listados acima.
- **Libs novas:** nenhuma.
- **Background jobs:** não; escala máxima inicial permite derivação transacional/indexada.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | certificado manual fora da plataforma |

## Segurança
- **Auth:** leitura student própria; apresentação/conclusão admin.
- **RLS:** portfólio por student profile e tenant; nenhuma policy pública.
- **Criptografia:** nota contextual cifrada se contiver dado pessoal.
- **LGPD:** portfólio privado, permanente conforme política de retenção aprovada antes do deploy.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| backend-engineer | agregações e conclusão derivada | agents/backend-engineer.md |
| frontend-engineer | projetos, portfólio e estado read-only | agents/frontend-engineer.md |
| security-auditor | privacidade e autorização | agents/security-auditor.md |

## Validação
- **GWT-01:** Dadas quatro atividades do ciclo aprovadas fora de ordem temporal, quando abre projeto, então aparecem na ordem pedagógica.
- **GWT-02:** Dado Project Day pendente/aprovado, quando abre portfólio, então status muda de in_progress para completed com data/evidências.
- **GWT-03:** Dados projetos em múltiplas matrículas acima do limite, quando percorre cursores, então vê todos uma vez e nenhuma rota pública responde.
- **GWT-04:** Dado um entre presença/projetos/reflexão/apresentação/revisões incompleto, quando tenta concluir, então blocker correspondente aparece e status não muda.
- **GWT-05:** Dados todos os critérios reais completos, quando admin confirma sem flags, então matrícula vira completed e receipt é registrado.
- **GWT-06:** Dada falta reposta, quando calcula completion, então encontro conta como cumprido e ausência permanece consultável.
- **GWT-07:** Dada matrícula completed, quando aluno lê e tenta mutar, então GET funciona e PUT/POST retorna `FORBIDDEN`.
```bash
npm test -- -t "projects|portfolio|completion"
```
