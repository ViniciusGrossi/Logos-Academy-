import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { AppError } from "@/src/lib/api-error";
import { IdentityContextSchema, type IdentityContext } from "@/src/modules/identity/schema";

const IdentityRowSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  auth_user_id: z.string().uuid(),
  access_enabled: z.boolean(),
});

const MembershipRowSchema = z.object({
  role: z.enum(["admin", "student"]),
});

export class IdentityRepository {
  constructor(private readonly client?: SupabaseClient) {}

  async findContext(authUserId: string, requestId = crypto.randomUUID()): Promise<IdentityContext | null> {
    if (!this.client) {
      throw new AppError("INTERNAL_ERROR", "Cliente de dados indisponível.", requestId);
    }

    const { data, error } = await this.client
      .schema("logos_academy")
      .from("users")
      .select("id, tenant_id, auth_user_id, access_enabled")
      .eq("auth_user_id", authUserId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL_ERROR", "Não foi possível resolver a sessão.", requestId);
    }
    if (!data) return null;

    const row = IdentityRowSchema.parse(data);
    const { data: membershipData, error: membershipError } = await this.client
      .schema("logos_academy")
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", row.tenant_id)
      .eq("user_id", row.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (membershipError) {
      throw new AppError("INTERNAL_ERROR", "NÃ£o foi possÃ­vel resolver a sessÃ£o.", requestId);
    }

    const membership = membershipData ? MembershipRowSchema.parse(membershipData) : null;
    if (!row.access_enabled || !membership) return null;

    return IdentityContextSchema.parse({
      authUserId: row.auth_user_id,
      tenantId: row.tenant_id,
      userId: row.id,
      role: membership.role,
    });
  }
}
