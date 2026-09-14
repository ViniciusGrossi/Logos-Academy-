import { z } from "zod";

const UuidSchema = z.string().uuid();
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Informe uma data ISO válida.").refine(isCalendarDate, "Informe uma data ISO válida.");
const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, "Informe um horário válido.");

export const GuardianInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  relationship: z.string().trim().min(1).max(60),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(7).max(30).optional(),
}).strict().refine((guardian) => guardian.email || guardian.phone, {
  message: "Informe e-mail ou telefone do responsável.", path: ["email"],
});

export const ScheduleInputSchema = z.object({
  startsOn: IsoDateSchema,
  weekdays: z.tuple([z.number().int().min(0).max(6), z.number().int().min(0).max(6)]).refine(([first, second]) => first !== second, "Os dias devem ser diferentes."),
  startsAtLocal: z.tuple([TimeSchema, TimeSchema]),
  durationMinutes: z.number().int().min(15).max(480),
  timezone: z.string().min(1).max(100).refine(isTimezone, "Informe um timezone IANA válido."),
}).strict();

const EnrollmentPlacementWithCurriculumSchema = z.discriminatedUnion("kind", [
  z.object({ curriculumId: UuidSchema, kind: z.literal("class"), classId: UuidSchema }).strict(),
  z.object({ curriculumId: UuidSchema, kind: z.literal("individual"), individualSchedule: ScheduleInputSchema }).strict(),
]);

export const InviteStudentSchema = z.object({
  email: z.string().trim().email(), displayName: z.string().trim().min(1).max(120), birthDate: IsoDateSchema,
  guardian: GuardianInputSchema,
  consent: z.object({ termVersion: z.string().trim().min(1).max(40), signedAt: IsoDateSchema, physicalCopyArchived: z.literal(true) }).strict(),
  enrollment: EnrollmentPlacementWithCurriculumSchema,
}).strict();

export const CreateClassSchema = z.object({ name: z.string().trim().min(1).max(120), curriculumId: UuidSchema, schedule: ScheduleInputSchema }).strict();
export const EnrollSchema = z.discriminatedUnion("kind", [
  z.object({ studentId: UuidSchema, curriculumId: UuidSchema, kind: z.literal("class"), classId: UuidSchema }).strict(),
  z.object({ studentId: UuidSchema, curriculumId: UuidSchema, kind: z.literal("individual"), individualSchedule: ScheduleInputSchema }).strict(),
]);
export const CalendarQuerySchema = z.object({ enrollmentId: UuidSchema, from: IsoDateSchema.optional(), to: IsoDateSchema.optional() }).strict();
export const RevokeConsentSchema = z.object({ studentId: UuidSchema, reason: z.string().trim().min(1).max(500) }).strict();
export const ClassPatchSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), status: z.enum(["planned", "active", "completed", "cancelled"]).optional() }).strict().refine((value) => value.name !== undefined || value.status !== undefined);
export const EnrollmentPatchSchema = z.object({ status: z.enum(["invited", "active", "paused", "cancelled"]) }).strict();
export const StudentListQuerySchema = z.object({ search: z.string().trim().min(1).max(120).optional(), classId: UuidSchema.optional(), cursor: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const ClassListQuerySchema = z.object({ status: z.enum(["planned", "active", "completed", "cancelled"]).optional(), cursor: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const ConsentUpsertSchema = z.object({ guardian: GuardianInputSchema, termVersion: z.string().trim().min(1).max(40), signedAt: IsoDateSchema, physicalCopyArchived: z.literal(true) }).strict();
export const PathIdSchema = z.object({ id: UuidSchema }).strict();
export const SessionPatchSchema = z.object({ startsAt: IsoDateTimeSchema.optional(), endsAt: IsoDateTimeSchema.optional(), status: z.enum(["scheduled", "completed", "rescheduled", "cancelled"]).optional() }).strict().refine((value) => value.startsAt !== undefined || value.endsAt !== undefined || value.status !== undefined);
export const AttendanceUpsertSchema = z.object({ entries: z.array(z.object({ enrollmentId: UuidSchema, status: z.enum(["present", "absent", "excused_absence"]), privateNote: z.string().trim().min(1).max(1000).optional() }).strict()).min(1).max(6).refine((entries) => new Set(entries.map((entry) => entry.enrollmentId)).size === entries.length, "Duplicate enrollment ids are not allowed.") }).strict();
export const ReleaseSessionSchema = z.object({ target: z.discriminatedUnion("kind", [z.object({ kind: z.literal("all_active_enrollments") }).strict(), z.object({ kind: z.literal("enrollments"), enrollmentIds: z.array(UuidSchema).min(1).max(6).refine((ids) => new Set(ids).size === ids.length, "Duplicate enrollment ids are not allowed.") }).strict()]), dueAt: IsoDateTimeSchema, supplementalInstructions: z.string().trim().min(1).max(2000).optional() }).strict();
export const MakeupSchema = z.object({ makeupSessionId: UuidSchema.optional(), completedAt: IsoDateTimeSchema, note: z.string().trim().min(1).max(1000).optional() }).strict();
export const StudentAttendanceQuerySchema = z.object({ enrollmentId: UuidSchema.optional(), cursor: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const JourneyQuerySchema = z.object({ enrollmentId: UuidSchema.optional() }).strict();
export const ConceptsQuerySchema = z.object({ search: z.string().trim().min(1).max(120).optional(), cursor: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const LibraryQuerySchema = z.object({ kind: z.enum(["prompt", "design_system"]), search: z.string().trim().min(1).max(120).optional(), cursor: z.string().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const LibraryResourcePathSchema = z.object({ resourceId: UuidSchema }).strict();

export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;
export type InviteStudentInput = z.infer<typeof InviteStudentSchema>;
export type CreateClassInput = z.infer<typeof CreateClassSchema>;
export type EnrollInput = z.infer<typeof EnrollSchema>;

function isTimezone(value: string): boolean {
  try { Intl.DateTimeFormat(undefined, { timeZone: value }); return true; } catch { return false; }
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
