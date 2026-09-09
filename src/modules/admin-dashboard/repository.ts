import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AdminDashboard } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";

const DashboardSchema = z.object({
  awaitingReviewCount: z.number(),
  feedbackDueSoonCount: z.number(),
  overdueAssignmentCount: z.number(),
  pendingMakeupCount: z.number(),
  deliveryApprovalRate: z.number(),
  upcomingSessions: z.array(z.object({
    id: z.string().uuid(), lessonPosition: z.number(), lessonTitle: z.string(),
    startsAt: z.string(), endsAt: z.string(),
    status: z.enum(["scheduled", "completed", "rescheduled", "cancelled"]),
  })),
  studentsAtRisk: z.array(z.object({
    id: z.string().uuid(), displayName: z.string(), email: z.string(), githubUsername: z.string().nullable(),
    activeEnrollmentCount: z.number(), pendingAssignmentCount: z.number(), pendingMakeupCount: z.number(),
  })),
});

export class AdminDashboardRepository {
  async findDashboard(actor: { tenantId: string; userId: string }, classId: string | null, requestId: string): Promise<AdminDashboard> {
    const env = getAdminSupabaseEnv();
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.schema("logos_academy" as "public").rpc("admin_dashboard" as never, {
      p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_encryption_key: env.PII_ENCRYPTION_KEY, p_class_id: classId,
    } as never);

    if (error || data === null) throw new AppError(mapRpcError(error?.code), "Não foi possível consultar o painel.", requestId);
    const parsed = DashboardSchema.safeParse(data);
    if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Resposta de painel inválida.", requestId);
    return parsed.data;
  }
}
