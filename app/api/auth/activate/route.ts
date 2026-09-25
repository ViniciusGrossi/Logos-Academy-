import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { AdmissionsAdminAdapter } from "@/src/lib/supabase/admissions-admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { ActivationService } from "@/src/modules/admissions/service";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";

export async function POST(): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);

    const identity = await new IdentityService(new IdentityRepository(client)).requireAuthenticated(user.id, requestId);
    if (identity.role !== "student") throw new AppError("FORBIDDEN", "Convite de estudante obrigatório.", requestId);

    const result = await new ActivationService(new AdmissionsAdminAdapter()).activate(identity.tenantId, user.id, requestId);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível ativar o acesso.");
    const status = ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[appError.code];
    return NextResponse.json(toApiResult(appError), { status });
  }
}
