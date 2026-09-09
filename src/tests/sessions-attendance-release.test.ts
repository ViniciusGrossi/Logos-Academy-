import { describe, expect, it } from "vitest";

import { AttendanceUpsertSchema, MakeupSchema, ReleaseSessionSchema, SessionPatchSchema, StudentAttendanceQuerySchema } from "@/src/modules/admissions/schema";

const firstEnrollmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondEnrollmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("sessions-attendance-release", () => {
  it("valida reagendamento sem permitir atualização vazia", () => {
    expect(() => SessionPatchSchema.parse({})).toThrow();
    expect(SessionPatchSchema.parse({ startsAt: "2026-10-01T14:00:00.000Z", status: "rescheduled" })).toMatchObject({ status: "rescheduled" });
  });

  it("aceita uma chamada única por matrícula e bloqueia duplicatas", () => {
    expect(AttendanceUpsertSchema.parse({ entries: [{ enrollmentId: firstEnrollmentId, status: "absent", privateNote: "Responsável avisou." }] }).entries).toHaveLength(1);
    expect(() => AttendanceUpsertSchema.parse({ entries: [{ enrollmentId: firstEnrollmentId, status: "present" }, { enrollmentId: firstEnrollmentId, status: "absent" }] })).toThrow();
  });

  it("limita reposição a metadados contextuais e horário ISO", () => {
    expect(MakeupSchema.parse({ completedAt: "2026-10-02T14:00:00.000Z", note: "Reposição presencial." }).makeupSessionId).toBeUndefined();
    expect(() => MakeupSchema.parse({ completedAt: "amanhã", note: "x" })).toThrow();
  });

  it("valida release coletivo ou segmentado sem IDs repetidos", () => {
    expect(ReleaseSessionSchema.parse({ target: { kind: "all_active_enrollments" }, dueAt: "2026-10-03T14:00:00.000Z" }).target.kind).toBe("all_active_enrollments");
    expect(ReleaseSessionSchema.parse({ target: { kind: "enrollments", enrollmentIds: [firstEnrollmentId, secondEnrollmentId] }, dueAt: "2026-10-03T14:00:00.000Z" }).target.kind).toBe("enrollments");
    expect(() => ReleaseSessionSchema.parse({ target: { kind: "enrollments", enrollmentIds: [firstEnrollmentId, firstEnrollmentId] }, dueAt: "2026-10-03T14:00:00.000Z" })).toThrow();
  });

  it("exige paginação limitada para o histórico do aluno", () => {
    expect(StudentAttendanceQuerySchema.parse({ limit: "25" }).limit).toBe(25);
    expect(() => StudentAttendanceQuerySchema.parse({ limit: 101 })).toThrow();
    expect(() => StudentAttendanceQuerySchema.parse({ privateNote: "não permitido" })).toThrow();
  });
});
