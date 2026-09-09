import type { ClassSummary, EnrollmentSummary, SessionSummary } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { CalendarQuerySchema, CreateClassSchema, EnrollSchema, InviteStudentSchema, RevokeConsentSchema, type EnrollInput, type InviteStudentInput, type ScheduleInput } from "@/src/modules/admissions/schema";
import type { AdmissionsStore, StoredEnrollment, TenantActor } from "@/src/modules/admissions/repository";
import type { AdmissionsAdminAdapter } from "@/src/lib/supabase/admissions-admin";

export class AdmissionsService {
  constructor(public readonly repository: AdmissionsStore) {}

  async invite(actor: TenantActor, input: unknown): Promise<{ studentId: string; enrollmentId: string; invitationSentAt: string }> {
    const parsed = parse(InviteStudentSchema, input);
    const existing = await this.repository.findInvite(actor.tenantId, parsed.email);
    if (existing) return { studentId: existing.studentId, enrollmentId: existing.enrollmentId, invitationSentAt: existing.invitationSentAt };
    const studentId = crypto.randomUUID();
    const enrollment = await this.createEnrollment(actor, studentId, parsed.displayName, parsed.enrollment);
    const invitationSentAt = new Date().toISOString();
    await this.repository.saveInvite(actor.tenantId, parsed.email, { studentId, enrollmentId: enrollment.id, invitationSentAt });
    return { studentId, enrollmentId: enrollment.id, invitationSentAt };
  }

  async createClass(actor: TenantActor, input: unknown): Promise<{ class: ClassSummary; sessions: readonly SessionSummary[] }> {
    const parsed = parse(CreateClassSchema, input);
    const summary: ClassSummary = { id: crypto.randomUUID(), name: parsed.name, curriculumName: "Explorer", startsOn: parsed.schedule.startsOn, status: "planned", activeStudentCount: 0 };
    const sessions = sessionsFor(parsed.schedule);
    await this.repository.saveClass({ tenantId: actor.tenantId, curriculumId: parsed.curriculumId, schedule: parsed.schedule, summary }, sessions);
    return { class: summary, sessions };
  }

  async enroll(actor: TenantActor, input: unknown): Promise<EnrollmentSummary> { const parsed = parse(EnrollSchema, input); return this.createEnrollment(actor, parsed.studentId, "Aluno", parsed); }

  async calendar(actor: TenantActor, input: unknown): Promise<readonly SessionSummary[]> {
    const parsed = parse(CalendarQuerySchema, input); const enrollment = await this.requireEnrollment(actor, parsed.enrollmentId);
    const sessions = await this.repository.listSessions(actor.tenantId, enrollment.summary.id);
    return sessions.filter((session) => (!parsed.from || session.startsAt >= `${parsed.from}T00:00:00.000Z`) && (!parsed.to || session.startsAt <= `${parsed.to}T23:59:59.999Z`));
  }

  async revokeConsent(actor: TenantActor, studentId: string, reason: string): Promise<{ pausedEnrollmentIds: readonly string[]; accessDisabled: true }> {
    parse(RevokeConsentSchema, { studentId, reason }); return { pausedEnrollmentIds: await this.repository.pauseActiveEnrollments(actor.tenantId, studentId), accessDisabled: true };
  }

  async getEnrollment(actor: TenantActor, enrollmentId: string): Promise<EnrollmentSummary> { return (await this.requireEnrollment(actor, enrollmentId)).summary; }

  private async createEnrollment(actor: TenantActor, studentId: string, studentName: string, input: InviteStudentInput["enrollment"] | EnrollInput): Promise<EnrollmentSummary> {
    if (input.kind === "class") { const offering = await this.repository.getClass(actor.tenantId, input.classId); if (!offering) throw new AppError("NOT_FOUND", "Turma não encontrada.", crypto.randomUUID()); if (await this.repository.countActiveClassEnrollments(actor.tenantId, input.classId) >= 6) throw new AppError("CONFLICT", "A turma já atingiu seis matrículas ativas.", crypto.randomUUID()); return this.persistEnrollment(actor, studentId, studentName, input.curriculumId, "class", input.classId); }
    return this.persistEnrollment(actor, studentId, studentName, input.curriculumId, "individual", null, input.individualSchedule);
  }

  private async persistEnrollment(actor: TenantActor, studentId: string, studentName: string, curriculumId: string, kind: "class" | "individual", classId: string | null, schedule?: ScheduleInput): Promise<EnrollmentSummary> {
    const summary: EnrollmentSummary = { id: crypto.randomUUID(), studentId, studentName, curriculumName: "Explorer", kind, classId, status: "active", activatedAt: new Date().toISOString(), completedAt: null };
    const value: StoredEnrollment = { tenantId: actor.tenantId, studentId, summary, schedule };
    await this.repository.saveEnrollment(value, schedule ? sessionsFor(schedule) : []); return summary;
  }

  private async requireEnrollment(actor: TenantActor, enrollmentId: string): Promise<StoredEnrollment> { const entry = await this.repository.getEnrollment(actor.tenantId, enrollmentId); if (!entry) throw new AppError("FORBIDDEN", "Recurso não disponível.", crypto.randomUUID()); return entry; }
}

export class AdmissionsInvitationService {
  constructor(private readonly adapter: Pick<AdmissionsAdminAdapter, "invite">) {}

  async invite(actor: TenantActor, input: unknown, idempotencyKey: string, requestId: string): Promise<{ studentId: string; enrollmentId: string; invitationSentAt: string }> {
    const parsed = parse(InviteStudentSchema, input);
    if (!idempotencyKey.trim() || idempotencyKey.length > 200) throw new AppError("VALIDATION_ERROR", "Chave de idempotência inválida.", requestId);
    return this.adapter.invite(actor, parsed, idempotencyKey, requestId);
  }
}

export class AdmissionsRpcService {
  constructor(private readonly adapter: Pick<AdmissionsAdminAdapter, "call">) {}
  async call(actor: TenantActor, name: string, parameters: Record<string, unknown>, requestId: string): Promise<Record<string, unknown>> {
    return this.adapter.call(name, { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, ...parameters }, requestId);
  }
  async callActor(actor: TenantActor, name: string, parameters: Record<string, unknown>, requestId: string): Promise<Record<string, unknown>> {
    return this.adapter.call(name, { p_actor_user_id: actor.userId, ...parameters }, requestId);
  }
}

export class ActivationService {
  constructor(private readonly adapter: Pick<AdmissionsAdminAdapter, "activate">) {}
  async activate(tenantId: string, authUserId: string, requestId = crypto.randomUUID()): Promise<{ activatedEnrollmentId: string | null }> {
    return { activatedEnrollmentId: await this.adapter.activate(tenantId, authUserId, requestId) };
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, input: unknown): T { const parsed = schema.safeParse(input); if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados inválidos.", crypto.randomUUID()); return parsed.data; }

function sessionsFor(schedule: ScheduleInput): readonly SessionSummary[] {
  const dates = eachMeetingDate(schedule.startsOn, schedule.weekdays, 16);
  return dates.map((date, index) => { const start = localToUtc(date, schedule.startsAtLocal[index % 2], schedule.timezone); const end = new Date(start.getTime() + schedule.durationMinutes * 60_000); return { id: crypto.randomUUID(), lessonPosition: index + 1, lessonTitle: `Aula ${index + 1}`, startsAt: start.toISOString(), endsAt: end.toISOString(), status: "scheduled" }; });
}

function eachMeetingDate(startsOn: string, weekdays: readonly [number, number], count: number): string[] { const cursor = new Date(`${startsOn}T00:00:00.000Z`); const dates: string[] = []; while (dates.length < count) { if (weekdays.includes(cursor.getUTCDay())) dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return dates; }
function localToUtc(date: string, time: string, timezone: string): Date { const [year, month, day] = date.split("-").map(Number); const [hour, minute] = time.split(":").map(Number); const guess = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!)); const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(guess); const pick = (kind: string) => Number(parts.find((part) => part.type === kind)?.value); const rendered = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute")); return new Date(guess.getTime() - (rendered - guess.getTime())); }
