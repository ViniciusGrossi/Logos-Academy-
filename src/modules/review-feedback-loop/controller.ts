import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { ReviewFeedbackRepository, type AdminActor } from "@/src/modules/review-feedback-loop/repository";
import { ReviewFeedbackService } from "@/src/modules/review-feedback-loop/service";

export async function reviewFeedbackController<T>(operation: (service: ReviewFeedbackService, actor: AdminActor, requestId: string) => Promise<T>): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const identity = await new IdentityService(new IdentityRepository(client)).requireAdmin(user.id, requestId);
    const actor: AdminActor = { tenantId: identity.tenantId, userId: identity.userId, role: "admin" };
    const service = new ReviewFeedbackService(new ReviewFeedbackRepository());
    return NextResponse.json({ ok: true, data: await operation(service, actor, requestId) });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível concluir a revisão.");
    return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) });
  }
}

function statusFor(code: AppError["code"]): number {
  return ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[code];
}
