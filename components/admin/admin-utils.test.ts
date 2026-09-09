import { describe, expect, it } from "vitest";
import type { EnrollmentSummary, StudentSummary } from "@/specs/api.contracts";
import { activeEnrollments, hasStudentRisk, matchesRisk, toIsoDateTime, toLocalDateTime } from "./admin-utils";

const student: StudentSummary = {
  id: "student-1",
  displayName: "Ada",
  email: "ada@example.com",
  githubUsername: "ada",
  activeEnrollmentCount: 1,
  pendingAssignmentCount: 0,
  pendingMakeupCount: 0,
};

function enrollment(index: number): EnrollmentSummary {
  return {
    id: `enrollment-${index}`,
    studentId: `student-${index}`,
    studentName: `Aluno ${index}`,
    curriculumName: "Explorer",
    kind: "class",
    classId: "class-1",
    status: "active",
    activatedAt: null,
    completedAt: null,
  };
}

describe("regras das telas administrativas da Fase 8", () => {
  it("sinaliza atividade ou reposição como atenção pedagógica", () => {
    expect(hasStudentRisk(student)).toBe(false);
    expect(hasStudentRisk({ ...student, pendingMakeupCount: 1 })).toBe(true);
    expect(matchesRisk(student, "clear")).toBe(true);
    expect(matchesRisk(student, "attention")).toBe(false);
  });

  it("limita a chamada aos seis alunos permitidos por turma", () => {
    const enrollments = Array.from({ length: 8 }, (_, index) => enrollment(index + 1));
    expect(activeEnrollments(enrollments)).toHaveLength(6);
  });

  it("mantém data local editável e converte o envio para ISO", () => {
    const source = "2026-09-08T17:00:00.000Z";
    const local = toLocalDateTime(source);
    expect(local).toMatch(/^2026-09-08T/);
    expect(toIsoDateTime(local)).toMatch(/^2026-09-08T/);
  });
});

