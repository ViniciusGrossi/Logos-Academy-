import "server-only";

import { createClient } from "@supabase/supabase-js";

import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import type { AuditEventInput } from "@/src/modules/identity/schema";

export async function writeAuditEvent(event: AuditEventInput): Promise<void> {
  const env = getAdminSupabaseEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    db: { schema: "logos_academy" },
  });

  const { error } = await client.rpc("write_audit_event", {
    p_tenant_id: event.tenantId,
    p_actor_user_id: event.actorUserId,
    p_action: event.action,
    p_entity_type: event.entityType,
    p_entity_id: event.entityId,
    p_request_id: event.requestId,
    p_metadata: event.metadata,
  });

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Não foi possível registrar a auditoria.", event.requestId);
  }
}
