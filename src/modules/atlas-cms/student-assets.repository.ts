import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ResolvedAtlasAsset } from "@/specs/api.contracts";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { AppError } from "@/src/lib/api-error";
import { blockSchema, mimeSchema, parseOutput, uuidSchema } from "./schema";

/** Resolves only assets referenced by an already-authorized, published RPC
 * response. The caller must never pass a draft or user-supplied content tree. */
export class StudentAtlasAssetsRepository {
  private readonly client: SupabaseClient;
  constructor(client?: SupabaseClient) { const env = client ? null : getAdminSupabaseEnv(); this.client = client ?? createClient(env!.NEXT_PUBLIC_SUPABASE_URL, env!.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } }); }
  async resolve(tenantId: string, released: Record<string, unknown>, ownerId: string, ownerKind: "concept" | "resource", requestId: string): Promise<Record<string, unknown>> {
    const content = parseOutput(z.object({ id: uuidSchema, contentBlocks: z.array(blockSchema).max(100) }), released, requestId);
    if (content.id !== ownerId) throw new AppError("FORBIDDEN", "Conteúdo indisponível.", requestId);
    const sources = content.contentBlocks.filter((block) => block.isVisible).flatMap((block) => block.type === "image" ? [block.source] : block.type === "gallery" ? [...block.items] : []);
    const ids = Array.from(new Set(sources.flatMap((source) => source.kind === "asset" ? [source.assetId] : [])));
    if (!ids.length) return { ...released, resolvedAssets: [] };
    const { data, error } = await this.client.schema("logos_academy").from("knowledge_assets").select("id,bucket_path,alt,caption,width,height,content_type").eq("tenant_id", tenantId).eq(ownerKind === "concept" ? "concept_id" : "resource_id", ownerId).eq("status", "ready").is("deleted_at", null).in("id", ids);
    if (error) throw new AppError("INTERNAL_ERROR", "Não foi possível carregar as imagens.", requestId);
    const rows = parseOutput(z.array(z.object({ id: uuidSchema, bucket_path: z.string(), alt: z.string().min(1), caption: z.string().nullable(), width: z.number().int().positive(), height: z.number().int().positive(), content_type: mimeSchema })), data, requestId);
    for (const row of rows) if (row.bucket_path !== `${tenantId}/${ownerKind}/${ownerId}/${row.id}`) throw new AppError("FORBIDDEN", "Imagem indisponível.", requestId);
    // Missing/deleted assets stay unresolved and receive an accessible fallback.
    if (!rows.length) return { ...released, resolvedAssets: [] };
    const signed = await this.client.storage.from("knowledge-assets").createSignedUrls(rows.map((row) => row.bucket_path), 300);
    if (signed.error || !signed.data || signed.data.length !== rows.length) throw new AppError("INTERNAL_ERROR", "Não foi possível autorizar as imagens.", requestId);
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    const resolvedAssets: ResolvedAtlasAsset[] = rows.map((row, index) => ({ id: row.id, readUrl: parseOutput(z.string().url(), signed.data![index].signedUrl, requestId), expiresAt, alt: row.alt, caption: row.caption, width: row.width, height: row.height, contentType: row.content_type }));
    return { ...released, resolvedAssets };
  }
}
