import { describe, expect, it } from "vitest";
import type { EnrollmentSummary, StudentSummary } from "@/specs/api.contracts";
import { activeEnrollments, hasStudentRisk, inviteMessage, matchesRisk, toIsoDateTime, toLocalDateTime, toWhatsAppDigits, whatsAppInviteUrl } from "./admin-utils";

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

describe("entrega do convite por WhatsApp", () => {
  const invite = {
    guardianName: "Maria Silva Santos",
    studentName: "Ada Lovelace",
    className: "Explorer v2 · Turma A",
    loginEmail: "ada@example.com",
    activationLink: "https://academy.test/auth/v1/verify?token=abc&type=invite",
  };

  it("normaliza telefone brasileiro e preserva número que já traz DDI", () => {
    expect(toWhatsAppDigits("(11) 98888-7777")).toBe("5511988887777");
    expect(toWhatsAppDigits("+55 11 98888-7777")).toBe("5511988887777");
    expect(toWhatsAppDigits("1133334444")).toBe("551133334444");
    expect(toWhatsAppDigits("9999")).toBeNull();
  });

  it("monta mensagem com nome do responsável, turma, link e e-mail de login", () => {
    const message = inviteMessage(invite);
    expect(message).toContain("Olá, Maria!");
    expect(message).toContain("Ada Lovelace");
    expect(message).toContain("Explorer v2 · Turma A");
    expect(message).toContain(invite.activationLink);
    expect(message).toContain("ada@example.com");
  });

  it("gera deep link do WhatsApp com a mensagem codificada e recusa telefone inválido", () => {
    const message = inviteMessage(invite);
    const url = whatsAppInviteUrl("(11) 98888-7777", message);
    expect(url).toContain("https://wa.me/5511988887777?text=");
    expect(url).toContain(encodeURIComponent(invite.activationLink));
    expect(whatsAppInviteUrl("123", message)).toBeNull();
  });
});

