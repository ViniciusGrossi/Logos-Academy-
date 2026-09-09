import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { ActivitySubmissionFilesRepository } from "@/src/modules/activity-submission-files/repository";
import { activityController } from "@/src/modules/activity-submission-files/controller";

const statusFor = (code: AppError["code"]): number => ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[code];

// Perfil é do próprio usuário: qualquer papel autenticado lê o seu (getProfile usa só tenantId+userId; role vem do contexto real).
export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user?.email) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const context = await new IdentityService(new IdentityRepository(server)).requireAuthenticated(user.id, requestId);
    const base = await new ActivitySubmissionFilesRepository(server).getProfile({ tenantId: context.tenantId, userId: context.userId, email: user.email, role: "student" }, requestId);
    return NextResponse.json({ ok: true, data: { ...base, email: user.email, role: context.role } });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível concluir a operação.");
    return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) });
  }
}

// PATCH edita github_username no student_profile — permanece exclusivo de aluno.
export async function PATCH(request: Request) { return activityController(request, (service, actor, requestId) => request.json().then((body: unknown) => service.patchProfile(actor, body, requestId))); }
