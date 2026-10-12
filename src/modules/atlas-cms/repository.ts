import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AdminAsset, AdminAtlasDetail, AdminAtlasDraftInput, AdminAtlasListItem, AdminAtlasOptions, AdminAtlasRevisionListItem, Page, ResolvedAtlasAsset } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import { assetSchema, detailSchema, listItemSchema, pageSchema, parseOutput, revisionSchema, uuidSchema, type AtlasActor, type AssetTarget, type ListQuery, type PageQuery, type PublishInput, type ArchiveInput, type RestoreInput, type UploadInput, type FinalizeInput } from "./schema";

export type VerifiedImage = { contentType: "image/png" | "image/jpeg" | "image/webp"; sizeBytes: number; width: number; height: number };
export interface AtlasCmsStore {
  options?(actor: AtlasActor, query: PageQuery, requestId: string): Promise<AdminAtlasOptions>;
  list(actor: AtlasActor, query: ListQuery, requestId: string): Promise<Page<AdminAtlasListItem>>;
  detail(actor: AtlasActor, itemId: string, requestId: string): Promise<AdminAtlasDetail>;
  upsert(actor: AtlasActor, itemId: string | null, draft: AdminAtlasDraftInput, clock: string | null, requestId: string): Promise<AdminAtlasDetail>;
  publish(actor: AtlasActor, input: PublishInput, requestId: string): Promise<AdminAtlasDetail>;
  archive(actor: AtlasActor, input: ArchiveInput, requestId: string): Promise<AdminAtlasDetail>;
  revisions(actor: AtlasActor, itemId: string, query: PageQuery, requestId: string): Promise<Page<AdminAtlasRevisionListItem>>;
  restore(actor: AtlasActor, input: RestoreInput, requestId: string): Promise<AdminAtlasDetail>;
  authorize(actor: AtlasActor, input: UploadInput, requestId: string): Promise<{ asset: AdminAsset; signedUploadUrl: string; expiresAt: string }>;
  assetTarget(actor: AtlasActor, assetId: string, requestId: string): Promise<AssetTarget>;
  assetBytes(target: AssetTarget, requestId: string): Promise<Uint8Array>;
  finalize(actor: AtlasActor, input: FinalizeInput, verified: VerifiedImage | null, requestId: string): Promise<AdminAsset>;
}
const authorizedAssetSchema = z.object({ id: uuidSchema, bucket: z.literal("knowledge-assets"), bucketPath: z.string(), status: z.literal("pending"), contentType: z.string(), sizeBytes: z.number() });
const finalizeResultSchema = z.union([assetSchema, z.object({ id: uuidSchema, status: z.literal("failed") })]);
const signedSchema = z.string().url();

/** The privileged client is kept in this server-only repository. Every RPC
 * rechecks active administrator membership and tenant ownership in PostgreSQL. */
export class AtlasCmsRepository implements AtlasCmsStore {
  private readonly client: SupabaseClient;
  constructor(client?: SupabaseClient) {
    if (client) this.client = client;
    else {
      const env = getAdminSupabaseEnv();
      this.client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    }
  }
  async list(actor: AtlasActor, query: ListQuery, requestId: string): Promise<Page<AdminAtlasListItem>> {
    return parseOutput(pageSchema(listItemSchema), await this.rpc(actor, "admin_atlas_list", {
      p_kind: query.kind ?? null, p_status: query.status ?? null, p_curriculum_id: query.curriculum ?? null, p_cycle_id: query.cycle ?? null, p_lesson_id: query.lesson ?? null,
      p_tags: query.tags ?? null, p_search: query.search ?? null, p_cursor: query.cursor ?? null, p_limit: query.limit,
    }, requestId), requestId);
  }
  async options(actor: AtlasActor, query: PageQuery, requestId: string): Promise<AdminAtlasOptions> {
    // Recheck the database administrator guard before privileged reads.
    await this.rpc(actor, "admin_atlas_list", { p_limit: 1 }, requestId);
    const db = this.client.schema("logos_academy");
    const offset = query.cursor ? Number(query.cursor) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0) throw new AppError("VALIDATION_ERROR", "Página inválida.", requestId);
    const { data, error } = await db.from("lesson_templates").select("id,title,position,cycles!inner(id,title,position,curriculum_id,curricula!inner(status))").eq("tenant_id", actor.tenantId).is("deleted_at", null).is("cycles.deleted_at", null).is("cycles.curricula.deleted_at", null).eq("cycles.curricula.status", "active").order("id").range(offset, offset + query.limit);
    if (error) throw this.storageError(requestId);
    const cycle = z.object({ id: uuidSchema, title: z.string(), position: z.number(), curriculum_id: uuidSchema, curricula: z.object({ status: z.literal("active") }) });
    const rows = parseOutput(z.array(z.object({ id: uuidSchema, title: z.string(), position: z.number(), cycles: cycle })), data, requestId);
    const count = async (table: "concepts" | "knowledge_resources", field: "status" | "kind", value: string) => {
      const result = await db.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", actor.tenantId).is("deleted_at", null).eq(field, value);
      if (result.error || result.count === null) throw this.storageError(requestId);
      return result.count;
    };
    const values = await Promise.all([count("concepts", "status", "draft"), count("knowledge_resources", "status", "draft"), count("concepts", "status", "published"), count("knowledge_resources", "status", "published"), count("concepts", "status", "archived"), count("knowledge_resources", "status", "archived"), count("knowledge_resources", "kind", "prompt"), count("knowledge_resources", "kind", "design_system")]);
    return { lessons: { items: rows.slice(0, query.limit).map((row) => ({ id: row.id, title: row.title, position: row.position, cycleId: row.cycles.id, cycleTitle: row.cycles.title, cyclePosition: row.cycles.position, curriculumId: row.cycles.curriculum_id })), nextCursor: rows.length > query.limit ? String(offset + query.limit) : null }, counts: { draft: values[0] + values[1], published: values[2] + values[3], archived: values[4] + values[5], concept: values[0] + values[2] + values[4], prompt: values[6], design_system: values[7] } };
  }
  async detail(actor: AtlasActor, itemId: string, requestId: string): Promise<AdminAtlasDetail> {
    return this.resolveDetail(actor, await this.rpc(actor, "admin_atlas_detail", { p_item_id: itemId }, requestId), requestId);
  }
  async upsert(actor: AtlasActor, itemId: string | null, draft: AdminAtlasDraftInput, clock: string | null, requestId: string): Promise<AdminAtlasDetail> {
    return this.resolveDetail(actor, await this.rpc(actor, "admin_atlas_upsert", { p_item_id: itemId, p_payload: draft, p_expected_draft_updated_at: clock }, requestId), requestId);
  }
  async publish(actor: AtlasActor, input: PublishInput, requestId: string): Promise<AdminAtlasDetail> {
    return this.resolveDetail(actor, await this.rpc(actor, "admin_atlas_publish", { p_item_id: input.itemId, p_expected_draft_updated_at: input.expectedDraftUpdatedAt, p_expected_item_updated_at: input.expectedItemUpdatedAt }, requestId), requestId);
  }
  async archive(actor: AtlasActor, input: ArchiveInput, requestId: string): Promise<AdminAtlasDetail> {
    return this.resolveDetail(actor, await this.rpc(actor, "admin_atlas_archive", { p_item_id: input.itemId, p_expected_item_updated_at: input.expectedItemUpdatedAt }, requestId), requestId);
  }
  async revisions(actor: AtlasActor, itemId: string, query: PageQuery, requestId: string): Promise<Page<AdminAtlasRevisionListItem>> {
    return parseOutput(pageSchema(revisionSchema), await this.rpc(actor, "admin_atlas_revisions", { p_item_id: itemId, p_cursor: query.cursor ?? null, p_limit: query.limit }, requestId), requestId);
  }
  async restore(actor: AtlasActor, input: RestoreInput, requestId: string): Promise<AdminAtlasDetail> {
    return this.resolveDetail(actor, await this.rpc(actor, "admin_atlas_restore", { p_item_id: input.itemId, p_revision: input.revision, p_expected_draft_updated_at: input.expectedDraftUpdatedAt }, requestId), requestId);
  }
  async authorize(actor: AtlasActor, input: UploadInput, requestId: string) {
    const authorized = parseOutput(authorizedAssetSchema, await this.rpc(actor, "admin_atlas_asset_authorize", { p_owner: { kind: input.ownerKind, id: input.ownerId }, p_original_filename: input.filename, p_content_type: input.contentType, p_byte_size: input.sizeBytes }, requestId), requestId);
    this.assertPath(actor, input.ownerKind, input.ownerId, authorized.id, authorized.bucketPath, requestId);
    const detail = await this.detail(actor, input.ownerId, requestId);
    const asset = detail.assets.find((candidate) => candidate.id === authorized.id);
    if (!asset) throw this.storageError(requestId);
    const { data, error } = await this.client.storage.from("knowledge-assets").createSignedUploadUrl(authorized.bucketPath, { upsert: false });
    if (error || !data) throw this.storageError(requestId);
    return { asset, signedUploadUrl: parseOutput(signedSchema, data.signedUrl, requestId), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() };
  }
  async assetTarget(actor: AtlasActor, assetId: string, requestId: string): Promise<AssetTarget> {
    const { data, error } = await this.client.schema("logos_academy").from("knowledge_assets").select("id,concept_id,resource_id").eq("tenant_id", actor.tenantId).eq("id", assetId).is("deleted_at", null).maybeSingle();
    if (error) throw this.storageError(requestId);
    const row = parseOutput(z.object({ id: uuidSchema, concept_id: uuidSchema.nullable(), resource_id: uuidSchema.nullable() }).nullable(), data, requestId);
    if (!row) throw new AppError("FORBIDDEN", "Asset indisponível.", requestId);
    const ownerId = row.concept_id ?? row.resource_id;
    if (!ownerId) throw this.storageError(requestId);
    // Authorize before any storage URL is issued, including requests made with
    // a forged/cross-tenant asset id. This also rejects inactive administrators.
    const detail = parseOutput(detailSchema, await this.rpc(actor, "admin_atlas_detail", { p_item_id: ownerId }, requestId), requestId);
    const target = detail.assets.find((candidate) => candidate.id === assetId);
    if (!target) throw new AppError("FORBIDDEN", "Asset indisponível.", requestId);
    this.assertPath(actor, target.ownerKind, target.ownerId, target.id, target.bucketPath, requestId);
    return target;
  }
  async assetBytes(target: AssetTarget, requestId: string): Promise<Uint8Array> {
    const { data, error } = await this.client.storage.from("knowledge-assets").createSignedUrl(target.bucketPath, 30);
    if (error || !data) throw this.storageError(requestId);
    const response = await fetch(parseOutput(signedSchema, data.signedUrl, requestId), { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok || !response.body) throw this.storageError(requestId);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 5242880 || size > target.sizeBytes) throw new AppError("VALIDATION_ERROR", "O arquivo excede o tamanho autorizado.", requestId);
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
  async finalize(actor: AtlasActor, input: FinalizeInput, verified: VerifiedImage | null, requestId: string): Promise<AdminAsset> {
    const target = await this.assetTarget(actor, input.assetId, requestId);
    const result = parseOutput(finalizeResultSchema, await this.rpc(actor, "admin_atlas_asset_finalize", { p_asset_id: input.assetId, p_alt: input.alt, p_caption: input.caption ?? null,
      p_backend_derived_content_type: verified?.contentType ?? null, p_backend_derived_byte_size: verified?.sizeBytes ?? null, p_backend_derived_width: verified?.width ?? null, p_backend_derived_height: verified?.height ?? null,
    }, requestId), requestId);
    if ("ownerId" in result) return result;
    const refreshed = await this.assetTarget(actor, input.assetId, requestId);
    if (refreshed.ownerId !== target.ownerId) throw this.storageError(requestId);
    return parseOutput(assetSchema, refreshed, requestId);
  }
  private async resolveDetail(actor: AtlasActor, raw: unknown, requestId: string): Promise<AdminAtlasDetail> {
    const detail = parseOutput(detailSchema, raw, requestId);
    for (const asset of detail.assets) {
      if (asset.ownerId !== detail.id || asset.ownerKind !== (detail.kind === "concept" ? "concept" : "resource")) throw new AppError("FORBIDDEN", "Asset indisponível.", requestId);
      this.assertPath(actor, asset.ownerKind, asset.ownerId, asset.id, asset.bucketPath, requestId);
    }
    const ready = detail.assets.filter((asset) => asset.status === "ready");
    const resolvedAssets: ResolvedAtlasAsset[] = [];
    if (ready.length) {
      const { data, error } = await this.client.storage.from("knowledge-assets").createSignedUrls(ready.map((asset) => asset.bucketPath), 300);
      if (error || !data || data.length !== ready.length) throw this.storageError(requestId);
      for (let index = 0; index < ready.length; index++) {
        const asset = ready[index]; const signed = data[index];
        if (!signed?.signedUrl || !asset?.alt || !asset.width || !asset.height) throw this.storageError(requestId);
        resolvedAssets.push({ id: asset.id, readUrl: parseOutput(signedSchema, signed.signedUrl, requestId), expiresAt: new Date(Date.now() + 300_000).toISOString(), alt: asset.alt, caption: asset.caption, width: asset.width, height: asset.height, contentType: asset.contentType });
      }
    }
    return { ...detail, assets: detail.assets.map((asset) => parseOutput(assetSchema, asset, requestId)), resolvedAssets };
  }
  private assertPath(actor: AtlasActor, ownerKind: string, ownerId: string, assetId: string, path: string, requestId: string) {
    if (path !== `${actor.tenantId}/${ownerKind}/${ownerId}/${assetId}`) throw new AppError("FORBIDDEN", "Asset indisponível.", requestId);
  }
  private async rpc(actor: AtlasActor, name: string, parameters: Record<string, unknown>, requestId: string): Promise<unknown> {
    const { data, error } = await this.client.schema("logos_academy").rpc(name, { p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, ...parameters });
    if (error || data === null) {
      const match = error?.message.match(/^ATLAS_(?:VALIDATION|CONFLICT):([a-zA-Z0-9_.]+):([A-Z_]+)$/);
      const code = error?.message.startsWith("ATLAS_VALIDATION:") ? "VALIDATION_ERROR" : error?.code === "40001" ? "CONFLICT" : mapRpcError(error?.code);
      throw new AppError(code, code === "CONFLICT" ? "O conteúdo mudou em outra sessão. Recarregue antes de continuar." : "Não foi possível concluir a operação editorial.", requestId,
        match ? { [match[1]]: [match[2]] } : undefined);
    }
    return data;
  }
  private storageError(requestId: string) { return new AppError("INTERNAL_ERROR", "Não foi possível acessar o asset editorial.", requestId); }
}
