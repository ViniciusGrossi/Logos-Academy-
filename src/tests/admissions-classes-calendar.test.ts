import { describe, expect, it } from "vitest";

import { InMemoryAdmissionsRepository } from "@/src/modules/admissions/repository";
import { AdmissionsService } from "@/src/modules/admissions/service";
import { AdmissionsInvitationService } from "@/src/modules/admissions/service";
import { ActivationService } from "@/src/modules/admissions/service";
import { enrollmentFromStudentDetail } from "@/src/modules/admissions/dto";
import { validationBoundary } from "@/src/modules/admissions/validation";
import { CalendarQuerySchema, ClassPatchSchema, ConsentUpsertSchema, CreateClassSchema, EnrollSchema, PathIdSchema, RevokeConsentSchema, StudentListQuerySchema } from "@/src/modules/admissions/schema";
import { securityFixture } from "@/src/tests/fixtures/security";

const admin = { tenantId: securityFixture.tenantA, userId: securityFixture.userA };
const curriculumId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const studentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const schedule = {
  startsOn: "2026-09-07",
  weekdays: [1, 3] as const,
  startsAtLocal: ["14:00", "14:00"] as const,
  durationMinutes: 90,
  timezone: "America/Sao_Paulo",
};

function service() {
  return new AdmissionsService(new InMemoryAdmissionsRepository());
}

describe("admissions-classes-calendar", () => {
  it("projeta a matrícula atualizada como EnrollmentSummary, sem expor o retorno interno da RPC", () => {
    const enrollmentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const internalResult = { id: enrollmentId, studentId, status: "active" };
    const expected = {
      id: enrollmentId,
      studentId,
      studentName: "Aluno",
      curriculumName: "Explorer",
      kind: "individual",
      classId: null,
      status: "active",
      activatedAt: "2026-09-01T12:00:00.000Z",
      completedAt: null,
    };

    expect(enrollmentFromStudentDetail({ enrollments: [expected] }, enrollmentId)).toEqual(expected);
    expect(enrollmentFromStudentDetail({ enrollments: [] }, enrollmentId)).not.toEqual(internalResult);
  });

  it("rejeita entradas extras nas rotas administrativas e exige consentimento físico", () => {
    expect(() => StudentListQuerySchema.parse({ limit: 25, ignored: true })).toThrow();
    expect(() => ClassPatchSchema.parse({})).toThrow();
    expect(() => ConsentUpsertSchema.parse({ guardian: { name: "R", relationship: "mãe", email: "r@example.com" }, termVersion: "v1", signedAt: "2026-09-01", physicalCopyArchived: false })).toThrow();
  });

  it("bloqueia as cinco categorias de entrada antes de qualquer RPC", () => {
    expect(() => CreateClassSchema.parse({ name: "Turma", curriculumId, schedule: { ...schedule, weekdays: [1, 1] } })).toThrow();
    expect(() => EnrollSchema.parse({ studentId, curriculumId, kind: "individual" })).toThrow();
    expect(() => RevokeConsentSchema.parse({ studentId: "inválido", reason: "x" })).toThrow();
    expect(() => PathIdSchema.parse({ id: "inválido" })).toThrow();
    expect(() => CalendarQuerySchema.parse({ enrollmentId: "inválido", from: "ontem" })).toThrow();
  });

  it("rejeita datas de calendário impossíveis antes de chamar a RPC", () => {
    expect(() => CalendarQuerySchema.parse({ enrollmentId: studentId, from: "2026-02-31" })).toThrow();
    expect(() => CreateClassSchema.parse({ name: "Turma", curriculumId, schedule: { ...schedule, startsOn: "2026-02-31" } })).toThrow();
  });

  it("normaliza ZodError como envelope VALIDATION_ERROR 400", async () => {
    const response = await validationBoundary(async () => { CalendarQuerySchema.parse({ enrollmentId: "inválido" }); return new Response(); });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });
  it("ativa matrícula convidada de forma idempotente pelo callback", async () => {
    let calls = 0;
    const activation = new ActivationService({ activate: async () => { calls += 1; return calls === 1 ? studentId : null; } });
    expect((await activation.activate(securityFixture.tenantA, securityFixture.authUserA)).activatedEnrollmentId).toBe(studentId);
    expect((await activation.activate(securityFixture.tenantA, securityFixture.authUserA)).activatedEnrollmentId).toBeNull();
  });
  it("valida consentimento antes de chamar o adapter de Auth", async () => {
    let calls = 0;
    const invitations = new AdmissionsInvitationService({ invite: async () => { calls += 1; return { studentId, enrollmentId: crypto.randomUUID(), invitationSentAt: new Date().toISOString() }; } });
    await expect(invitations.invite(admin, { email: "aluno@example.com", displayName: "Aluno", birthDate: "2012-01-01", guardian: { name: "Responsável", relationship: "mãe", email: "r@example.com" }, consent: { termVersion: "v1", signedAt: "2026-09-01", physicalCopyArchived: false }, enrollment: { curriculumId, kind: "individual", individualSchedule: schedule } }, "retry-1", crypto.randomUUID())).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls).toBe(0);
  });
  it("bloqueia convite sem consentimento físico antes de criar conta", async () => {
    const admissions = service();
    await expect(admissions.invite(admin, {
      email: "aluno@example.com", displayName: "Aluno", birthDate: "2012-01-01",
      guardian: { name: "Responsável", relationship: "mãe", email: "responsavel@example.com" },
      consent: { termVersion: "v1", signedAt: "2026-09-01", physicalCopyArchived: false },
      enrollment: { curriculumId, kind: "individual", individualSchedule: schedule },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((admissions.repository as InMemoryAdmissionsRepository).invitationCount()).toBe(0);
  });

  it("pré-cadastra uma vez, convida uma vez e rejeita anotação geral", async () => {
    const admissions = service();
    const input = {
      email: "aluno@example.com", displayName: "Aluno", birthDate: "2012-01-01",
      guardian: { name: "Responsável", relationship: "mãe", phone: "+5511999999999" },
      consent: { termVersion: "v1", signedAt: "2026-09-01", physicalCopyArchived: true },
      enrollment: { curriculumId, kind: "individual" as const, individualSchedule: schedule },
    };
    const first = await admissions.invite(admin, input);
    const second = await admissions.invite(admin, input);
    expect(second).toEqual(first);
    expect((admissions.repository as InMemoryAdmissionsRepository).invitationCount()).toBe(1);
    await expect(admissions.invite(admin, { ...input, generalNote: "não permitido" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("gera 16 encontros ordenados para turma com dois dias fixos", async () => {
    const admissions = service();
    const created = await admissions.createClass(admin, { name: "Turma A", curriculumId, schedule });
    expect(created.sessions).toHaveLength(16);
    expect(created.sessions.map((session) => session.lessonPosition)).toEqual([...Array(16).keys()].map((i) => i + 1));
    expect(created.sessions[0]?.startsAt).toContain("T17:00:00.000Z");
    expect(created.sessions[1]?.startsAt).toContain("T17:00:00.000Z");
  });

  it("recusa a sétima matrícula ativa de turma", async () => {
    const admissions = service();
    const created = await admissions.createClass(admin, { name: "Turma A", curriculumId, schedule });
    for (let index = 0; index < 6; index += 1) {
      await admissions.enroll(admin, { studentId: crypto.randomUUID(), curriculumId, kind: "class", classId: created.class.id });
    }
    await expect(admissions.enroll(admin, { studentId, curriculumId, kind: "class", classId: created.class.id }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("cria calendário individual e mantém isolamento tenant A/B", async () => {
    const admissions = service();
    const enrollment = await admissions.enroll(admin, { studentId, curriculumId, kind: "individual", individualSchedule: schedule });
    expect(enrollment.classId).toBeNull();
    expect(await admissions.calendar(admin, { enrollmentId: enrollment.id })).toHaveLength(16);
    await expect(admissions.calendar({ tenantId: securityFixture.tenantB, userId: crypto.randomUUID() }, { enrollmentId: enrollment.id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("valida responsável e revogação pausa matrículas sem apagar histórico", async () => {
    const admissions = service();
    await expect(admissions.invite(admin, {
      email: "a@example.com", displayName: "Aluno", birthDate: "2012-01-01",
      guardian: { name: "Responsável", relationship: "mãe" },
      consent: { termVersion: "v1", signedAt: "2026-09-01", physicalCopyArchived: true },
      enrollment: { curriculumId, kind: "individual", individualSchedule: schedule },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const enrollment = await admissions.enroll(admin, { studentId, curriculumId, kind: "individual", individualSchedule: schedule });
    const result = await admissions.revokeConsent(admin, studentId, "Solicitação do responsável");
    expect(result.pausedEnrollmentIds).toEqual([enrollment.id]);
    expect((await admissions.getEnrollment(admin, enrollment.id)).status).toBe("paused");
  });
});
