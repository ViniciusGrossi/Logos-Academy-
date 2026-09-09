---
title: "sessions-attendance-release — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 2
tags: [spec, feature, sdd, attendance]
---

# Spec: sessions-attendance-release

## Objetivo
Transformar cada encontro presencial em presença auditável e liberação gradual de atividades, preservando faltas e reposições.

## Fora de Escopo
- Check-in automático, geolocalização, biometria, notificação WhatsApp e liberação automática por aprovação.

## Requisitos Funcionais
1. Reagendar encontro preservando posição pedagógica e histórico.
2. Registrar uma chamada ativa por aluno/encontro com nota privada somente do admin.
3. Registrar reposição separada, mantendo a ausência original e derivando encontro cumprido.
4. Liberar atividade coletiva ou segmentada em transação idempotente para matrículas ativas.
5. Exigir 100% dos 16 encontros por presença ou reposição para conclusão.

## Superfícies Frontend
- `/admin/encontros/[sessionId]`: abas `Chamada`, `Atividade` e `Reposições`; reagendamento permanece ação contextual no cabeçalho.
- `/admin/turmas/[classId]?tab=calendario|pendencias`: consumo das sessões, presença e liberações.
- `/agenda?tab=frequencia`: histórico próprio, faltas e reposições sem notas privadas.

## API Contract
```typescript
"PATCH /api/admin/sessions/:sessionId": Endpoint<{
  sessionId: UUID;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
  status?: SessionStatus;
}, SessionSummary>;
"PUT /api/admin/sessions/:sessionId/attendance": Endpoint<{
  sessionId: UUID;
  entries: readonly { enrollmentId: UUID; status: AttendanceStatus; privateNote?: string }[];
}, readonly AttendanceEntry[]>;
"POST /api/admin/sessions/:sessionId/release": Endpoint<{
  sessionId: UUID;
  target: { kind: "all_active_enrollments" } | { kind: "enrollments"; enrollmentIds: readonly UUID[] };
  dueAt: ISODateTime;
  supplementalInstructions?: string;
}, { assignmentIds: readonly UUID[]; releasedAt: ISODateTime }>;
"POST /api/admin/attendance/:attendanceId/makeup": Endpoint<{
  attendanceId: UUID;
  makeupSessionId?: UUID;
  completedAt: ISODateTime;
  note?: string;
}, AttendanceEntry>;
"GET /api/student/attendance": Endpoint<PageQuery & { enrollmentId?: UUID }, Page<{
  session: SessionSummary;
  status: AttendanceStatus;
  makeup: AttendanceEntry["makeup"];
}>>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Reagendamento muda data, mas mantém aula e ordem associadas.
- [ ] Chamada repetida atualiza sem criar dois registros ativos por aluno/encontro.
- [ ] Aluno vê apenas seus estados, sem notas privadas.
- [ ] Ausência bloqueia conclusão até reposição concluída.
- [ ] Reposição cumpre requisito sem apagar ausência original.
- [ ] Histórico paginado retorna `nextCursor` sem perda/repetição.
- [ ] Release coletivo cria um assignment por matrícula ativa; retry não duplica.
- [ ] Release segmentado libera somente IDs selecionados; URL direta futura permanece `FORBIDDEN`.

## Restrições Técnicas
- **Tabelas:** `sessions`, `attendance_records`, `attendance_private_notes`, `makeup_records`, `activity_assignments`, `idempotency_keys`, `audit_events`.
- **Endpoints:** cinco listados acima.
- **Libs novas:** nenhuma.
- **Background jobs:** não; release de até seis alunos é transacional síncrono.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | — |

## Segurança
- **Auth:** admin para mutações; aluno para leitura própria.
- **RLS:** nota privada nunca é selecionável pelo papel student; release valida target no tenant/encontro.
- **Criptografia:** nota contextual pode conter dado pessoal e deve ser cifrada em repouso.
- **LGPD:** observação somente contextual, sem campo livre geral.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| dba | constraints e policies de presença/release | agents/dba.md |
| backend-engineer | services transacionais e endpoints | agents/backend-engineer.md |
| frontend-engineer | chamada, calendário e frequência | agents/frontend-engineer.md |

## Validação
- **GWT-01:** Dado encontro 05, quando reagenda, então `startsAt` muda e `lesson_template_id`/posição permanecem.
- **GWT-02:** Dada chamada já salva, quando reenvia, então existe um registro ativo por matrícula/encontro.
- **GWT-03:** Dada nota privada, quando aluno consulta frequência, então a resposta não contém a nota.
- **GWT-04:** Dada ausência sem reposição, quando calcula conclusão, então `attendanceComplete=false`.
- **GWT-05:** Dada ausência com reposição concluída, quando calcula cumprimento, então conta o encontro e preserva a ausência.
- **GWT-06:** Dadas mais linhas que o limite, quando pagina até o fim, então cada presença aparece exatamente uma vez.
- **GWT-07:** Dado release coletivo repetido, quando executa duas vezes, então cada matrícula ativa possui um assignment.
- **GWT-08:** Dado release segmentado, quando aluno não selecionado acessa UUID, então recebe `FORBIDDEN`.
```bash
npm test -- -t "sessions|attendance|release"
```
