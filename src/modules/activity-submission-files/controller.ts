import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { ActivitySubmissionFilesRepository } from "@/src/modules/activity-submission-files/repository";
import { ActivitySubmissionFilesService } from "@/src/modules/activity-submission-files/service";

export async function activityController<T>(request: Request, operation: (service: ActivitySubmissionFilesService, actor: { tenantId: string; userId: string; email: string; role: "student" }, requestId: string) => Promise<T>): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser();
    if (!user?.email) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const context = await new IdentityService(new IdentityRepository(server)).requireAuthenticated(user.id, requestId);
    if (context.role !== "student") throw new AppError("FORBIDDEN", "Acesso do aluno obrigatório.", requestId);
    const actor = { tenantId: context.tenantId, userId: context.userId, email: user.email, role: "student" as const };
    return NextResponse.json({ ok: true, data: await operation(new ActivitySubmissionFilesService(new ActivitySubmissionFilesRepository(server)), actor, requestId) });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível concluir a operação.");
    return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) });
  }
}

function statusFor(code: AppError["code"]): number { return ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[code]; }
