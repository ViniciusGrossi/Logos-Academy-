import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AdminStudentAttendanceEntry, CurriculumOption, Page, PendingMakeup } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type { MakeupsQuery, StudentAttendanceQuery } from "@/src/modules/admin-operations-completion/schema";

export type AdminActor = Readonly<{ tenantId: string; userId: string }>;

export interface AdminOperationsStore {
  pendingMakeups(actor: AdminActor, query: MakeupsQuery, requestId: string): Promise<Page<PendingMakeup>>;
  activeCurricula(actor: AdminActor, requestId: string): Promise<readonly CurriculumOption[]>;
  studentAttendance(actor: AdminActor, query: StudentAttendanceQuery, requestId: string): Promise<Page<AdminStudentAttendanceEntry>>;
}

const SessionSummarySchema = z.object({
  id: z.string().uuid(),
  lessonPosition: z.number(),
  lessonTitle: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(["scheduled", "completed", "rescheduled", "cancelled"]),
});

const PendingMakeupSchema = z.object({
  attendanceId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  classId: z.string().uuid().nullable(),
  className: z.string().nullable(),
  session: SessionSummarySchema,
  status: z.enum(["absent", "excused_absence"]),
});

const MakeupsPageSchema = z.object({
  items: z.array(PendingMakeupSchema),
  nextCursor: z.string().nullable(),
});

const CurriculumOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  status: z.literal("active"),
});

const CurriculaResultSchema = z.object({ items: z.array(CurriculumOptionSchema) });

const AttendanceEntrySchema = z.object({
  attendanceId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  studentName: z.string(),
  status: z.enum(["present", "absent", "excused_absence"]),
  privateNote: z.string().nullable(),
  makeup: z.object({ completedAt: z.string(), makeupSessionId: z.string().uuid().nullable() }).nullable(),
  session: SessionSummarySchema,
});

const AttendancePageSchema = z.object({
  items: z.array(AttendanceEntrySchema),
  nextCursor: z.string().nullable(),
});

export class AdminOperationsRepository implements AdminOperationsStore {
  private readonly client: SupabaseClient;
  private readonly env = getAdminSupabaseEnv();

  constructor() {
    this.client = createClient(this.env.NEXT_PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async pendingMakeups(actor: AdminActor, query: MakeupsQuery, requestId: string): Promise<Page<PendingMakeup>> {
    const data = await this.rpc("admin_pending_makeups_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_class_id: query.classId ?? null,
      p_student_profile_id: query.studentId ?? null,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    const parsed = MakeupsPageSchema.safeParse(data);
    if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Resposta de reposições pendentes inválida.", requestId);
    return parsed.data;
  }

  async activeCurricula(actor: AdminActor, requestId: string): Promise<readonly CurriculumOption[]> {
    const data = await this.rpc("admin_active_curricula", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
    }, requestId);
    const parsed = CurriculaResultSchema.safeParse(data);
    if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Resposta de currículos inválida.", requestId);
    return parsed.data.items;
  }

  async studentAttendance(actor: AdminActor, query: StudentAttendanceQuery, requestId: string): Promise<Page<AdminStudentAttendanceEntry>> {
    const data = await this.rpc("admin_student_attendance_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_student_profile_id: query.studentId,
      p_enrollment_id: query.enrollmentId ?? null,
      p_encryption_key: this.env.PII_ENCRYPTION_KEY,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    const parsed = AttendancePageSchema.safeParse(data);
    if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Resposta de frequência inválida.", requestId);
    return parsed.data;
  }

  private async rpc(name: string, parameters: Record<string, unknown>, requestId: string): Promise<unknown> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(name as never, parameters as never);
    if (error || data === null) {
      const code = error?.code === "22023" ? "VALIDATION_ERROR" : mapRpcError(error?.code);
      throw new AppError(code, "Não foi possível concluir a operação.", requestId);
    }
    return data;
  }
}
