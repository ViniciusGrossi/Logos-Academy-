import "server-only";

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type { InviteStudentInput } from "@/src/modules/admissions/schema";
import type { TenantActor } from "@/src/modules/admissions/repository";

type InviteResult = Readonly<{ studentId: string; enrollmentId: string; invitationSentAt: string }>;

export class AdmissionsAdminAdapter {
  private readonly env = getAdminSupabaseEnv();
  private readonly client: SupabaseClient = createClient(this.env.NEXT_PUBLIC_SUPABASE_URL, this.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });

  constructor(private readonly siteOrigin?: string) {}

  async invite(actor: TenantActor, input: InviteStudentInput, idempotencyKey: string, requestId: string): Promise<InviteResult> {
    const payloadHash = createHash("sha256").update(canonical(input)).digest();
    const claim = await this.rpc("claim_student_invitation", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash }, requestId);
    if (hasFinalResult(claim)) return toInviteResult(claim);
    let authUserId = readString(claim, "authUserId");
    let invitationSentAt = readString(claim, "invitationSentAt");
    let createdHere = false;
    if (!authUserId || !invitationSentAt) {
      const redirectTo = this.siteOrigin ? new URL("/ativar", this.siteOrigin).toString() : undefined;
      const invited = await this.client.auth.admin.inviteUserByEmail(
        input.email,
        redirectTo ? { redirectTo } : undefined,
      );
      if (invited.error || !invited.data.user) throw new AppError("INTERNAL_ERROR", "Não foi possível enviar o convite.", requestId);
      authUserId = invited.data.user.id; invitationSentAt = new Date().toISOString(); createdHere = true;
      await this.rpc("bind_student_invitation_auth", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash, p_auth_user_id: authUserId, p_invitation_sent_at: invitationSentAt }, requestId);
    }
    try {
      const enrollment = input.enrollment.kind === "class" ? { p_kind: "class", p_class_id: input.enrollment.classId, p_individual_schedule: null } : { p_kind: "individual", p_class_id: null, p_individual_schedule: input.enrollment.individualSchedule };
      const result = await this.rpc("finalize_invited_student", { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_idempotency_key: idempotencyKey, p_payload_hash: payloadHash, p_auth_user_id: authUserId, p_email: input.email, p_display_name: input.displayName, p_birth_date: input.birthDate, p_guardian_name: input.guardian.name, p_relationship: input.guardian.relationship, p_guardian_email: input.guardian.email ?? null, p_guardian_phone: input.guardian.phone ?? null, p_term_version: input.consent.termVersion, p_signed_at: input.consent.signedAt, p_physical_copy_archived: true, p_curriculum_id: input.enrollment.curriculumId, ...enrollment, p_encryption_key: this.env.PII_ENCRYPTION_KEY, p_invitation_sent_at: invitationSentAt, p_request_id: requestId }, requestId);
      if (!hasFinalResult(result)) throw new AppError("INTERNAL_ERROR", "Não foi possível concluir o convite.", requestId);
      return toInviteResult(result);
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

  private async rpc(name: string, parameters: Record<string, unknown>, requestId: string, allowsNull = false): Promise<Record<string, unknown>> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(name as never, parameters as never);
    if (error || (data === null && !allowsNull) || (data !== null && !isRecord(data))) throw new AppError(mapRpcError(error?.code), "Não foi possível concluir a operação.", requestId);
    return data ?? {};
  }
}

function canonical(input: InviteStudentInput): string { return JSON.stringify(sortValue(input)); }
function sortValue(value: unknown): unknown { if (Array.isArray(value)) return value.map(sortValue); if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])); return value; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function readString(value: Record<string, unknown>, key: string): string | null { const item = value[key]; return typeof item === "string" ? item : null; }
function hasFinalResult(value: Record<string, unknown>): value is Record<string, string> { return typeof value.studentId === "string" && typeof value.enrollmentId === "string" && typeof value.invitationSentAt === "string"; }
function toInviteResult(value: Record<string, string>): InviteResult { return { studentId: value.studentId, enrollmentId: value.enrollmentId, invitationSentAt: value.invitationSentAt }; }
