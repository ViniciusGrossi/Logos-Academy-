import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";

const BUCKET = "knowledge-assets";
const UPLOAD_URL_TTL_SECONDS = 300;
/** TTL curto por spec: prévias assinadas não devem sobreviver além de uma janela de leitura. */
const READ_URL_TTL_SECONDS = 120;

/**
 * Adapter server-only para o módulo knowledge-atlas: RPCs `student_atlas_*`/`admin_atlas_*`
 * (reaproveita o padrão de `AdmissionsAdminAdapter.call`) e Storage do bucket privado
 * `knowledge-assets` (upload e leitura só via URL assinada, nunca policy authenticated/anon).
 */
export class KnowledgeAtlasAdminAdapter {
  private readonly client: SupabaseClient;

  constructor() {
    const env = getAdminSupabaseEnv();
    this.client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async call(name: string, parameters: Record<string, unknown>, requestId: string): Promise<unknown> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(name as never, parameters as never);
    if (error || data === null) {
      throw new AppError(mapRpcError(error?.code), "Não foi possível concluir a operação.", requestId);
    }
    return data;
  }

  async createSignedUploadUrl(path: string, requestId: string): Promise<{ signedUrl: string; expiresAt: string }> {
    const { data, error } = await this.client.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      throw new AppError("INTERNAL_ERROR", "Não foi possível preparar o upload.", requestId);
    }
    return { signedUrl: data.signedUrl, expiresAt: expiry(UPLOAD_URL_TTL_SECONDS) };
  }

  /** Assina em lote; caminhos sem objeto correspondente (asset ainda pendente) são omitidos do mapa, sem lançar. */
  async createSignedUrls(paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
    const map = new Map<string, string>();
    if (paths.length === 0) return map;
    const { data, error } = await this.client.storage.from(BUCKET).createSignedUrls([...paths], READ_URL_TTL_SECONDS);
    if (error || !data) return map;
    for (const entry of data) {
      if (entry.signedUrl && entry.path && !entry.error) map.set(entry.path, entry.signedUrl);
    }
    return map;
  }
}

function expiry(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1_000).toISOString();
}
