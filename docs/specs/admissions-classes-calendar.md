---
title: "admissions-classes-calendar — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 1
tags: [spec, feature, sdd, admissions]
---

# Spec: admissions-classes-calendar

## Objetivo
Permitir ao admin cadastrar menor com consentimento, criar turma ou produto individual, gerar 16 encontros e convidar o aluno com segurança.

## Fora de Escopo
- Matrícula pública, pagamento, mais de seis alunos ativos por turma, professor/responsável autenticado e recorrência aberta.

## Requisitos Funcionais
1. Criar turma com dois dias semanais, horários, duração, timezone e 16 sessões ordenadas pelo currículo.
2. Criar matrícula de turma ou individual; turma limita seis matrículas ativas.
3. Registrar responsável e consentimento físico verificado antes de enviar convite.
4. Validar consentimento antes do Auth; reservar/reusar uma chave idempotente, criar ou reutilizar convite Supabase Auth uma vez e compensar falha de domínio removendo apenas usuário criado na tentativa. Matrícula permanece `invited` até a ativação oficial.
5. Permitir múltiplas matrículas históricas e consulta do calendário próprio.

## Superfícies Frontend
- `/login`, `/ativar-conta` e `/recuperar-senha`: shell comum, sem tabs.
- `/admin/alunos`: lista e busca; convite em Sheet.
- `/admin/alunos/[studentId]`: owner inicial das abas `Resumo` e `Cadastro e consentimento`; outras specs alimentam as demais.
- `/admin/turmas`: lista e criação em Sheet.
- `/admin/turmas/[classId]`: shell com abas `Visão geral`, `Calendário`, `Alunos` e `Pendências`.
- `/agenda?tab=aulas`: calendário consumido pela área do aluno.

## API Contract
```typescript
"POST /api/admin/students/invite": Endpoint<{
  email: string;
  displayName: string;
  birthDate: ISODate;
  guardian: GuardianInput;
  consent: { termVersion: string; signedAt: ISODate; physicalCopyArchived: true };
  enrollment: { curriculumId: UUID } & EnrollmentPlacementInput;
}, { studentId: UUID; enrollmentId: UUID; invitationSentAt: ISODateTime }>;
"GET /api/admin/students": Endpoint<PageQuery & { search?: string; classId?: UUID }, Page<StudentSummary>>;
"GET /api/admin/students/:studentId": Endpoint<{ studentId: UUID }, {
  student: StudentSummary;
  guardian: GuardianRecord;
  consent: ConsentRecord;
  enrollments: readonly EnrollmentSummary[];
  projects: readonly ProjectSummary[];
}>;
"PUT /api/admin/students/:studentId/consent": Endpoint<{
  studentId: UUID;
  guardian: GuardianInput;
  termVersion: string;
  signedAt: ISODate;
  physicalCopyArchived: true;
}, ConsentRecord>;
"POST /api/admin/students/:studentId/consent/revoke": Endpoint<{
  studentId: UUID;
  reason: string;
}, { consent: ConsentRecord; pausedEnrollmentIds: readonly UUID[]; accessDisabled: true }>;
"POST /api/admin/classes": Endpoint<{
  name: string;
  curriculumId: UUID;
  schedule: ScheduleInput;
}, { class: ClassSummary; sessions: readonly SessionSummary[] }>;
"GET /api/admin/classes": Endpoint<PageQuery & { status?: ClassSummary["status"] }, Page<ClassSummary>>;
"GET /api/admin/classes/:classId": Endpoint<{ classId: UUID }, {
  class: ClassSummary;
  enrollments: readonly EnrollmentSummary[];
  sessions: readonly SessionSummary[];
}>;
"PATCH /api/admin/classes/:classId": Endpoint<{ classId: UUID; name?: string; status?: ClassSummary["status"] }, ClassSummary>;
"POST /api/admin/enrollments": Endpoint<{
  studentId: UUID;
  curriculumId: UUID;
} & EnrollmentPlacementInput, EnrollmentSummary>;
"PATCH /api/admin/enrollments/:enrollmentId": Endpoint<{
  enrollmentId: UUID;
  status: Exclude<EnrollmentStatus, "completed">;
}, EnrollmentSummary>;
"GET /api/student/calendar": Endpoint<{ enrollmentId: UUID; from?: ISODate; to?: ISODate }, readonly SessionSummary[]>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Sem consentimento físico confirmado, convite é bloqueado com explicação.
- [ ] Com consentimento válido, convite cria aluno/matrícula `invited` e envia e-mail uma vez.
- [ ] Ativação por convite torna conta e matrícula acessíveis.
- [ ] Turma gera 16 sessões curriculares a partir dos dois dias/horários informados.
- [ ] Sétima matrícula ativa na mesma turma retorna `CONFLICT`.
- [ ] Matrícula individual gera calendário próprio com `class_id` nulo.
- [ ] Revogação pausa matrículas ativas e desabilita acesso preservando histórico.
- [ ] Responsável exige nome, vínculo e pelo menos e-mail ou telefone.
- [ ] Não existe campo de anotação geral; observações são aceitas somente no registro contextual correspondente.

## Restrições Técnicas
- **Tabelas:** `users`, `student_profiles`, `guardian_records`, `consent_records`, `classes`, `enrollments`, `sessions`, `audit_events`, `idempotency_keys`.
- **Endpoints:** 12 endpoints listados acima; ativação usa callback oficial do Supabase Auth e `ActivationService`.
- **Libs novas:** nenhuma.
- **Background jobs:** não; envio de convite é adapter externo com compensação síncrona e retry idempotente.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| Supabase Auth | plano do projeto | limite do provedor | incluído | reenvio manual idempotente |

## Segurança
- **Auth:** endpoints admin exigem JWT + membership admin; calendário exige aluno proprietário.
- **RLS:** admin no tenant; aluno apenas matrícula/sessões próprias.
- **Criptografia:** nascimento, e-mail e contatos do responsável em repouso.
- **LGPD:** termo permanece físico; sistema guarda somente versão, datas, confirmação e verificador.
- **Decisão de escrita aprovada:** convite, turma com sessões, matrícula e consentimento serão mutações por RPCs transacionais `SECURITY DEFINER`, chamadas somente por adapter server-only. Cada RPC valida admin e tenant, fixa `search_path`, registra auditoria e não amplia permissões diretas para `authenticated`.
- **Limite do Auth:** criação e envio de convite pelo Supabase Auth ocorrem antes da RPC; se a transação de domínio falhar, o adapter server-only remove o usuário Auth recém-criado como compensação. A RPC recebe o `auth_user_id` já criado e jamais tenta chamar Auth dentro do PostgreSQL.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| dba | tabelas, constraints, RLS e transações | agents/dba.md |
| backend-engineer | Auth adapter, services e endpoints | agents/backend-engineer.md |
| frontend-engineer | fluxos admin e ativação | agents/frontend-engineer.md |

## Validação
- **GWT-01:** Dado consentimento não confirmado, quando o admin convida, então recebe `VALIDATION_ERROR` e nenhum Auth user.
- **GWT-02:** Dado consentimento válido, quando convida duas vezes após retry, então existe um aluno, uma matrícula `invited` e um convite efetivo.
- **GWT-03:** Dado convite válido, quando define senha, então usuário acessa somente sua matrícula `active`.
- **GWT-04:** Dados dois dias semanais válidos, quando cria turma, então recebe 16 sessões na ordem curricular e timezone correto.
- **GWT-05:** Dada turma com seis ativos, quando adiciona o sétimo, então recebe `CONFLICT` sem nova matrícula.
- **GWT-06:** Dada matrícula individual, quando criada, então tem 16 sessões próprias e `class_id` nulo.
- **GWT-07:** Dado consentimento ativo, quando revoga, então acesso desabilita, matrículas pausam e registros permanecem.
- **GWT-08:** Dado responsável sem e-mail e telefone, quando cadastra, então recebe erro nos canais.
- **GWT-09:** Dado payload com anotação geral, quando cadastra aluno, então o schema rejeita o campo; nota privada só é aceita no endpoint contextual de presença.
```bash
npm test -- -t "admissions|classes|calendar"
```
