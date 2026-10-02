import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";

export class InvitationLinkRepository {
  private readonly env = getAdminSupabaseEnv();
  private readonly client: SupabaseClient = createClient(
    this.env.NEXT_PUBLIC_SUPABASE_URL,
    this.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  async resolve(code: string): Promise<string | null> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(
      "resolve_invitation_link" as never,
      { p_code: code, p_encryption_key: this.env.PII_ENCRYPTION_KEY } as never,
    );
    if (error || typeof data !== "object" || data === null || !("targetUrl" in data)) return null;
    return typeof data.targetUrl === "string" ? data.targetUrl : null;
  }
}
