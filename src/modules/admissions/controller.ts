import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { AdmissionsAdminAdapter } from "@/src/lib/supabase/admissions-admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { AdmissionsInvitationService } from "@/src/modules/admissions/service";
import { AdmissionsRpcService } from "@/src/modules/admissions/service";
import { ConsentUpsertSchema } from "@/src/modules/admissions/schema";
export { validationBoundary } from "@/src/modules/admissions/validation";

export async function inviteController(request: Request): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const context = await new IdentityService(new IdentityRepository(server)).requireAdmin(user.id, requestId);
    const key = request.headers.get("idempotency-key") ?? "";
    const result = await new AdmissionsInvitationService(new AdmissionsAdminAdapter()).invite(context, await request.json(), key, requestId);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível concluir a operação.");
    return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) });
  }
}

export async function admissionsController(request: Request, rpc: string, parameters: Record<string, unknown>, student = false, mapper?: (result: Record<string, unknown>, service: AdmissionsRpcService, context: { tenantId: string; userId: string }) => Promise<unknown>, actorOnly = false): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const identity = new IdentityService(new IdentityRepository(server));
    const context = student ? await identity.requireAuthenticated(user.id, requestId) : await identity.requireAdmin(user.id, requestId);
    const service = new AdmissionsRpcService(new AdmissionsAdminAdapter()); const result = actorOnly ? await service.callActor(context, rpc, parameters, requestId) : await service.call(context, rpc, parameters, requestId);
    return NextResponse.json({ ok: true, data: mapper ? await mapper(result, service, context) : result });
  } catch (error: unknown) { const appError = asApiError(error, requestId, "Não foi possível concluir a operação."); return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) }); }
}

export async function consentController(request: Request, studentId: string): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const parsed = ConsentUpsertSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados inválidos.", requestId);
    const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const context = await new IdentityService(new IdentityRepository(server)).requireAdmin(user.id, requestId);
    const service = new AdmissionsRpcService(new AdmissionsAdminAdapter()); const guardian = parsed.data.guardian;
    await service.call(context, "register_guardian_consent", { p_student_profile_id: studentId, p_guardian_name: guardian.name, p_relationship: guardian.relationship, p_guardian_email: guardian.email ?? null, p_guardian_phone: guardian.phone ?? null, p_term_version: parsed.data.termVersion, p_signed_at: parsed.data.signedAt, p_physical_copy_archived: true, p_encryption_key: process.env.PII_ENCRYPTION_KEY, p_request_id: requestId }, requestId);
    const detail = await service.call(context, "admin_student_detail", { p_student_profile_id: studentId, p_encryption_key: process.env.PII_ENCRYPTION_KEY }, requestId);
    if (!detail.consent || typeof detail.consent !== "object") throw new AppError("INTERNAL_ERROR", "Não foi possível ler o consentimento.", requestId);
    return NextResponse.json({ ok: true, data: detail.consent });
  } catch (error: unknown) { const appError = asApiError(error, requestId, "Não foi possível concluir a operação."); return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) }); }
}

function statusFor(code: AppError["code"]): number { return ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[code]; }
