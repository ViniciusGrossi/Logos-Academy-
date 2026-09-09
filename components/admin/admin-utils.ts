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

