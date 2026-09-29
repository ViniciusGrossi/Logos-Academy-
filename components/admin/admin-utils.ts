import type { AttendanceStatus, ClassSummary, EnrollmentSummary, SessionStatus, StudentSummary } from "@/specs/api.contracts";

export type RiskFilter = "all" | "attention" | "clear";

export function hasStudentRisk(student: StudentSummary) {
  return student.pendingAssignmentCount > 0 || student.pendingMakeupCount > 0;
}

export function matchesRisk(student: StudentSummary, filter: RiskFilter) {
  if (filter === "all") return true;
  return filter === "attention" ? hasStudentRisk(student) : !hasStudentRisk(student);
}

export function activeEnrollments(enrollments: readonly EnrollmentSummary[]) {
  return enrollments.filter((enrollment) => enrollment.status === "active").slice(0, 6);
}

export function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

export function toWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/gu, "");
  if (digits.length < 10 || digits.length > 15) return null;
  // ponytail: assume BR quando vem sem código de país; número com DDI já chega com 12+ dígitos
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function inviteMessage(invite: { guardianName: string; studentName: string; className: string; loginEmail: string; activationLink: string }): string {
  const guardian = invite.guardianName.trim().split(/\s+/u)[0];
  return [
    `Olá, ${guardian}! Aqui é da Logos Academy.`,
    "",
    `O acesso do(a) ${invite.studentName} à turma ${invite.className} está pronto.`,
    "",
    "Para ativar, abra este link e crie a senha:",
    invite.activationLink,
    "",
    `Depois da ativação, o login será sempre o e-mail ${invite.loginEmail}.`,
    "",
    "O link é individual e expira. Qualquer dúvida, me chama por aqui.",
  ].join("\n");
}

export function whatsAppInviteUrl(phone: string, message: string): string | null {
  const digits = toWhatsAppDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}

export const classStatusLabels: Record<ClassSummary["status"], string> = {
  planned: "Planejada",
  active: "Ativa",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const sessionStatusLabels: Record<SessionStatus, string> = {
  scheduled: "Agendada",
  completed: "Concluída",
  rescheduled: "Remarcada",
  cancelled: "Cancelada",
};

export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente — requer reposição",
  excused_absence: "Ausência justificada — requer reposição",
};

