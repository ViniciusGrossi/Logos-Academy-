import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/src/lib/api-error";
import { academyActivationUrl, academyInvitationUrl, isAcademySupabaseVerificationUrl } from "@/src/lib/public-site";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type { InviteStudentInput } from "@/src/modules/admissions/schema";
import type { TenantActor } from "@/src/modules/admissions/repository";

type InviteResult = Readonly<{ studentId: string; enrollmentId: string; invitationSentAt: string; activationLink: string | null }>;

export class AdmissionsAdminAdapter {
  private readonly env = getAdminSupabaseEnv();
  private readonly client: SupabaseClient = createClient(this.env.NEXT_PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });

  async invite(actor: TenantActor, input: InviteStudentInput, idempotencyKey: string, requestId: string): Promise<InviteResult> {
    // PostgREST receives RPC arguments as JSON. Passing Node's Buffer here makes
    // it an object (`{ type: "Buffer", data: [...] }`) rather than PostgreSQL
    // `bytea`; use the textual bytea representation instead.
    const payloadHash = `\\x${createHash("sha256").update(canonical(input)).digest("hex")}`;
    const claim = await this.rpc("claim_student_invitation", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash }, requestId);
    if (hasFinalResult(claim)) {
      const recovery = await this.generateActivationLink(input.email, "recovery", requestId);
      return toInviteResult(claim, await this.shortenActivationLink(actor, recovery.data.properties.action_link, requestId));
    }
    let authUserId = readString(claim, "authUserId");
    let invitationSentAt = readString(claim, "invitationSentAt");
    let providerLink: string | null = null;
    let createdHere = false;
    if (!authUserId || !invitationSentAt) {
      const invited = await this.generateActivationLink(input.email, "invite", requestId);
      authUserId = invited.data.user.id; invitationSentAt = new Date().toISOString(); createdHere = true;
      providerLink = invited.data.properties.action_link;
      await this.rpc("bind_student_invitation_auth", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash, p_auth_user_id: authUserId, p_invitation_sent_at: invitationSentAt }, requestId);
    }
    try {
      const enrollment = input.enrollment.kind === "class" ? { p_kind: "class", p_class_id: input.enrollment.classId, p_individual_schedule: null } : { p_kind: "individual", p_class_id: null, p_individual_schedule: input.enrollment.individualSchedule };
      const result = await this.rpc("finalize_invited_student", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash, p_auth_user_id: authUserId, p_email: input.email, p_display_name: input.displayName, p_birth_date: input.birthDate, p_guardian_name: input.guardian.name, p_relationship: input.guardian.relationship, p_guardian_email: input.guardian.email ?? null, p_guardian_phone: input.guardian.phone ?? null, p_term_version: input.consent.termVersion, p_signed_at: input.consent.signedAt, p_physical_copy_archived: true, p_curriculum_id: input.enrollment.curriculumId, ...enrollment, p_encryption_key: this.env.PII_ENCRYPTION_KEY, p_invitation_sent_at: invitationSentAt, p_request_id: requestId }, requestId);
      if (!hasFinalResult(result)) throw new AppError("INTERNAL_ERROR", "Não foi possível concluir o convite.", requestId);
      const activationLink = providerLink ? await this.shortenActivationLink(actor, providerLink, requestId) : null;
      return toInviteResult(result, activationLink);
    } catch (error: unknown) {
      if (createdHere) {
        await this.rpc("clear_student_invitation_auth", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash, p_auth_user_id: authUserId }, requestId, true);
        const deleted = await this.client.auth.admin.deleteUser(authUserId); if (deleted.error) throw new AppError("INTERNAL_ERROR", "Não foi possível concluir o convite.", requestId);
      }
      throw error;
    }
  }

  async call(name: string, parameters: Record<string, unknown>, requestId: string): Promise<Record<string, unknown>> { return this.rpc(name, parameters, requestId); }

  async activate(tenantId: string, authUserId: string, requestId: string): Promise<string | null> {
    const result = await this.rpc("activate_invited_student", { p_tenant_id: tenantId, p_auth_user_id: authUserId }, requestId);
    return readString(result, "enrollmentId");
  }

  private async generateActivationLink(email: string, type: "invite" | "recovery", requestId: string) {
    const result = await this.client.auth.admin.generateLink({ type, email, options: { redirectTo: academyActivationUrl() } });
    if (result.error || !result.data.user || !result.data.properties) throw invitationAuthError(result.error, requestId);
    if (!isAcademySupabaseVerificationUrl(result.data.properties.action_link)) {
      throw new AppError("INTERNAL_ERROR", "O Supabase devolveu um destino de ativação inválido.", requestId);
    }
    return result;
  }

  private async shortenActivationLink(actor: TenantActor, providerLink: string, requestId: string): Promise<string> {
    const code = randomBytes(16).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await this.rpc("create_invitation_link", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_code: code,
      p_target_url: providerLink,
      p_expires_at: expiresAt,
      p_encryption_key: this.env.PII_ENCRYPTION_KEY,
      p_request_id: requestId,
    }, requestId);
    if (readString(result, "code") !== code) throw new AppError("INTERNAL_ERROR", "Não foi possível encurtar o convite.", requestId);
    return academyInvitationUrl(code);
  }

  private async rpc(name: string, parameters: Record<string, unknown>, requestId: string, allowsNull = false): Promise<Record<string, unknown>> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(name as never, parameters as never);
    if (error || (data === null && !allowsNull) || (data !== null && !isRecord(data))) {
      console.error(`[${requestId}] admissions rpc failed`, { rpc: name, code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
      if (error?.code === "PGRST202") throw new AppError("INTERNAL_ERROR", "O banco de dados ainda não recebeu a configuração de convites.", requestId);
      if (error?.code === "23505" || error?.code === "23514") throw new AppError("CONFLICT", "Não foi possível concluir porque este convite conflita com um registro existente.", requestId);
      if (error?.code === "P0002") throw new AppError("NOT_FOUND", "A turma ou o registro selecionado não está mais disponível.", requestId);
      throw new AppError(mapRpcError(error?.code), "Não foi possível concluir a operação.", requestId);
    }
    return data ?? {};
  }
}

function canonical(input: InviteStudentInput): string { return JSON.stringify(sortValue(input)); }
function sortValue(value: unknown): unknown { if (Array.isArray(value)) return value.map(sortValue); if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])); return value; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function readString(value: Record<string, unknown>, key: string): string | null { const item = value[key]; return typeof item === "string" ? item : null; }
function hasFinalResult(value: Record<string, unknown>): value is Record<string, string> { return typeof value.studentId === "string" && typeof value.enrollmentId === "string" && typeof value.invitationSentAt === "string"; }
function toInviteResult(value: Record<string, string>, activationLink: string | null): InviteResult { return { studentId: value.studentId, enrollmentId: value.enrollmentId, invitationSentAt: value.invitationSentAt, activationLink }; }

function invitationAuthError(error: { code?: string; message?: string } | null, requestId: string): AppError {
  const detail = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  console.error(`[${requestId}] student invitation auth failed`, { code: error?.code, message: error?.message });
  if (detail.includes("redirect") || detail.includes("url is not allowed")) return new AppError("VALIDATION_ERROR", "A URL de ativação ainda não foi autorizada no Supabase. Adicione /ativar em Authentication → URL Configuration.", requestId);
  if (detail.includes("rate limit")) return new AppError("RATE_LIMITED", "O limite de geração de convites foi atingido. Aguarde alguns minutos e tente novamente.", requestId);
  if (detail.includes("already") || detail.includes("exists") || detail.includes("registered")) return new AppError("CONFLICT", "Este e-mail já possui uma conta ou convite. Use outro e-mail ou localize o aluno existente.", requestId);
  return new AppError("INTERNAL_ERROR", "O Supabase não conseguiu gerar o link de ativação. Tente novamente.", requestId);
}
