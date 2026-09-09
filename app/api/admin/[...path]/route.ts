import { admissionsController, consentController, validationBoundary } from "@/src/modules/admissions/controller";
import { enrollmentFromStudentDetail } from "@/src/modules/admissions/dto";
import { AttendanceUpsertSchema, ClassListQuerySchema, ClassPatchSchema, CreateClassSchema, EnrollmentPatchSchema, EnrollSchema, MakeupSchema, PathIdSchema, ReleaseSessionSchema, RevokeConsentSchema, SessionPatchSchema, StudentListQuerySchema } from "@/src/modules/admissions/schema";
import { AppError } from "@/src/lib/api-error";

type Context = { params: Promise<{ path: string[] }> };

async function getRoute(request: Request, context: Context) {
  const path = (await context.params).path;
  const query = new URL(request.url).searchParams;
  if (path.join("/") === "students") { const v = StudentListQuerySchema.parse(Object.fromEntries(query)); return admissionsController(request, "admin_list_students", { p_encryption_key: process.env.PII_ENCRYPTION_KEY, p_search: v.search ?? null, p_class_id: v.classId ?? null, p_cursor: v.cursor ?? null, p_limit: v.limit }); }
  if (path.join("/") === "classes") { const v = ClassListQuerySchema.parse(Object.fromEntries(query)); return admissionsController(request, "admin_list_classes", { p_status: v.status ?? null, p_cursor: v.cursor ?? null, p_limit: v.limit }); }
  if (path[0] === "students" && path[1]) return admissionsController(request, "admin_student_detail", { p_student_profile_id: PathIdSchema.parse({ id: path[1] }).id, p_encryption_key: process.env.PII_ENCRYPTION_KEY });
  if (path[0] === "classes" && path[1]) return admissionsController(request, "admin_class_detail", { p_class_id: PathIdSchema.parse({ id: path[1] }).id });
  if (path[0] === "sessions" && path[1] && path[2] === "attendance") { const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "admin_session_attendance", { p_session_id: id, p_encryption_key: process.env.PII_ENCRYPTION_KEY }, false, async (result) => { if (!Array.isArray(result.entries)) throw new AppError("INTERNAL_ERROR", "Resposta inválida de chamada.", crypto.randomUUID()); return result.entries; }); }
  return Response.json({ ok: false }, { status: 404 });
}

async function patchRoute(request: Request, context: Context) {
  const path = (await context.params).path; const body: unknown = await request.json();
  if (path[0] === "classes" && path[1]) { const v = ClassPatchSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "admin_update_class", { p_class_id: id, p_name: v.name ?? null, p_status: v.status ?? null }, false, async (_result, service, actor) => (await service.call(actor, "admin_class_detail", { p_class_id: id }, crypto.randomUUID())).class); }
  if (path[0] === "sessions" && path[1]) { const v = SessionPatchSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "admin_update_session", { p_session_id: id, p_starts_at: v.startsAt ?? null, p_ends_at: v.endsAt ?? null, p_status: v.status ?? null }); }
  if (path[0] === "enrollments" && path[1]) { const v = EnrollmentPatchSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "admin_update_enrollment", { p_enrollment_id: id, p_status: v.status }, false, async (result, service, actor) => { const detail = await service.call(actor, "admin_student_detail", { p_student_profile_id: result.studentId, p_encryption_key: process.env.PII_ENCRYPTION_KEY }, crypto.randomUUID()); const enrollment = enrollmentFromStudentDetail(detail, id); if (!enrollment) throw new AppError("NOT_FOUND", "Matrícula não encontrada após atualização.", crypto.randomUUID()); return enrollment; }); }
  return Response.json({ ok: false }, { status: 404 });
}
async function postRoute(request: Request, context: Context) {
  const path = (await context.params).path; const body: unknown = await request.json(); if (!isRecord(body)) return Response.json({ ok: false }, { status: 400 });
  if (path.join("/") === "classes") { const v = CreateClassSchema.parse(body); return admissionsController(request, "create_class_with_sessions", { p_name: v.name, p_curriculum_id: v.curriculumId, p_schedule: v.schedule, p_request_id: crypto.randomUUID() }, false, async (result, service, actor) => { const detail = await service.call(actor, "admin_class_detail", { p_class_id: result.classId }, crypto.randomUUID()); return { class: detail.class, sessions: detail.sessions }; }); }
  if (path[0] === "sessions" && path[1] && path[2] === "release") { const v = ReleaseSessionSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "release_session_assignments", { p_session_id: id, p_target_enrollment_ids: v.target.kind === "enrollments" ? v.target.enrollmentIds : null, p_due_at: v.dueAt, p_supplemental_instructions: v.supplementalInstructions ?? null, p_request_id: crypto.randomUUID() }, false, undefined, true); }
  if (path[0] === "attendance" && path[1] && path[2] === "makeup") { const v = MakeupSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "record_makeup", { p_attendance_record_id: id, p_makeup_session_id: v.makeupSessionId ?? null, p_completed_at: v.completedAt, p_note: v.note ?? null, p_encryption_key: process.env.PII_ENCRYPTION_KEY, p_request_id: crypto.randomUUID() }, false, undefined, true); }
  if (path.join("/") === "enrollments") { const v = EnrollSchema.parse(body); return admissionsController(request, "create_admission_enrollment", { p_student_profile_id: v.studentId, p_curriculum_id: v.curriculumId, p_kind: v.kind, p_class_id: v.kind === "class" ? v.classId : null, p_individual_schedule: v.kind === "individual" ? v.individualSchedule : null, p_status: "active", p_request_id: crypto.randomUUID() }, false, async (result, service, actor) => { if (typeof result.id !== "string") throw new AppError("INTERNAL_ERROR", "Resposta inválida de matrícula.", crypto.randomUUID()); const detail = await service.call(actor, "admin_student_detail", { p_student_profile_id: v.studentId, p_encryption_key: process.env.PII_ENCRYPTION_KEY }, crypto.randomUUID()); const enrollment = enrollmentFromStudentDetail(detail, result.id); if (!enrollment) throw new AppError("NOT_FOUND", "Matrícula não encontrada após criação.", crypto.randomUUID()); return enrollment; }); }
  if (path[0] === "students" && path[1] && path[2] === "consent" && path[3] === "revoke") { const v = RevokeConsentSchema.parse({ studentId: path[1], reason: body.reason }); return admissionsController(request, "revoke_admission_consent", { p_student_profile_id: v.studentId, p_reason: v.reason, p_encryption_key: process.env.PII_ENCRYPTION_KEY, p_request_id: crypto.randomUUID() }, false, async (result, service, actor) => { const detail = await service.call(actor, "admin_student_detail", { p_student_profile_id: v.studentId, p_encryption_key: process.env.PII_ENCRYPTION_KEY }, crypto.randomUUID()); return { consent: detail.consent, pausedEnrollmentIds: result.pausedEnrollmentIds, accessDisabled: true }; }); }
  return Response.json({ ok: false }, { status: 404 });
}
async function putRoute(request: Request, context: Context) {
  const path = (await context.params).path;
  if (path[0] === "sessions" && path[1] && path[2] === "attendance") { const body: unknown = await request.json(); const v = AttendanceUpsertSchema.parse(body); const id = PathIdSchema.parse({ id: path[1] }).id; return admissionsController(request, "record_attendance", { p_session_id: id, p_entries: v.entries, p_encryption_key: process.env.PII_ENCRYPTION_KEY, p_request_id: crypto.randomUUID() }, false, async (result) => { if (!Array.isArray(result.entries)) throw new AppError("INTERNAL_ERROR", "Resposta inválida de chamada.", crypto.randomUUID()); return result.entries; }, true); }
  if (path[0] !== "students" || !path[1] || path[2] !== "consent") return Response.json({ ok: false }, { status: 404 });
  return consentController(request, path[1]);
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
export async function GET(request: Request, context: Context) { return validationBoundary(() => getRoute(request, context)); }
export async function PATCH(request: Request, context: Context) { return validationBoundary(() => patchRoute(request, context)); }
export async function POST(request: Request, context: Context) { return validationBoundary(() => postRoute(request, context)); }
export async function PUT(request: Request, context: Context) { return validationBoundary(() => putRoute(request, context)); }
