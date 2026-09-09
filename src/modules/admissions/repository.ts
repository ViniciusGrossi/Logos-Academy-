import type { ClassSummary, EnrollmentSummary, SessionSummary } from "@/specs/api.contracts";
import type { ScheduleInput } from "@/src/modules/admissions/schema";

export type TenantActor = Readonly<{ tenantId: string; userId: string }>;
export type StoredClass = Readonly<{ tenantId: string; curriculumId: string; schedule: ScheduleInput; summary: ClassSummary }>;
export type StoredEnrollment = Readonly<{ tenantId: string; studentId: string; summary: EnrollmentSummary; schedule?: ScheduleInput }>;
export type InviteRecord = Readonly<{ studentId: string; enrollmentId: string; invitationSentAt: string }>;

export interface AdmissionsStore {
  findInvite(tenantId: string, email: string): Promise<InviteRecord | null>;
  saveInvite(tenantId: string, email: string, invite: InviteRecord): Promise<void>;
  invitationCount(): number;
  saveClass(value: StoredClass, sessions: readonly SessionSummary[]): Promise<void>;
  getClass(tenantId: string, classId: string): Promise<StoredClass | null>;
  saveEnrollment(value: StoredEnrollment, sessions: readonly SessionSummary[]): Promise<void>;
  getEnrollment(tenantId: string, enrollmentId: string): Promise<StoredEnrollment | null>;
  listSessions(tenantId: string, enrollmentId: string): Promise<readonly SessionSummary[]>;
  countActiveClassEnrollments(tenantId: string, classId: string): Promise<number>;
  pauseActiveEnrollments(tenantId: string, studentId: string): Promise<readonly string[]>;
}

export class InMemoryAdmissionsRepository implements AdmissionsStore {
  private readonly invites = new Map<string, InviteRecord>();
  private readonly classes = new Map<string, StoredClass>();
  private readonly enrollments = new Map<string, StoredEnrollment>();
  private readonly sessions = new Map<string, readonly SessionSummary[]>();

  async findInvite(tenantId: string, email: string): Promise<InviteRecord | null> { return this.invites.get(`${tenantId}:${email}`) ?? null; }
  async saveInvite(tenantId: string, email: string, invite: InviteRecord): Promise<void> { this.invites.set(`${tenantId}:${email}`, invite); }
  invitationCount(): number { return this.invites.size; }
  async saveClass(value: StoredClass, sessions: readonly SessionSummary[]): Promise<void> { this.classes.set(`${value.tenantId}:${value.summary.id}`, value); this.sessions.set(`${value.tenantId}:class:${value.summary.id}`, sessions); }
  async getClass(tenantId: string, classId: string): Promise<StoredClass | null> { return this.classes.get(`${tenantId}:${classId}`) ?? null; }
  async saveEnrollment(value: StoredEnrollment, sessions: readonly SessionSummary[]): Promise<void> { this.enrollments.set(`${value.tenantId}:${value.summary.id}`, value); this.sessions.set(`${value.tenantId}:enrollment:${value.summary.id}`, sessions); }
  async getEnrollment(tenantId: string, enrollmentId: string): Promise<StoredEnrollment | null> { return this.enrollments.get(`${tenantId}:${enrollmentId}`) ?? null; }
  async listSessions(tenantId: string, enrollmentId: string): Promise<readonly SessionSummary[]> {
    const enrollment = await this.getEnrollment(tenantId, enrollmentId); if (!enrollment) return [];
    return enrollment.summary.classId ? this.sessions.get(`${tenantId}:class:${enrollment.summary.classId}`) ?? [] : this.sessions.get(`${tenantId}:enrollment:${enrollmentId}`) ?? [];
  }
  async countActiveClassEnrollments(tenantId: string, classId: string): Promise<number> { return [...this.enrollments.values()].filter((entry) => entry.tenantId === tenantId && entry.summary.classId === classId && ["invited", "active", "paused"].includes(entry.summary.status)).length; }
  async pauseActiveEnrollments(tenantId: string, studentId: string): Promise<readonly string[]> {
    const paused: string[] = [];
    for (const [key, entry] of this.enrollments) if (entry.tenantId === tenantId && entry.studentId === studentId && ["invited", "active"].includes(entry.summary.status)) { this.enrollments.set(key, { ...entry, summary: { ...entry.summary, status: "paused", activatedAt: entry.summary.activatedAt ?? new Date().toISOString() } }); paused.push(entry.summary.id); }
    return paused;
  }
}
