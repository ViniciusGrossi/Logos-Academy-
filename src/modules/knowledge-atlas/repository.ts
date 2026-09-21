import "server-only";

import type {
  AdminKnowledgeItemDetail,
  AdminKnowledgePage,
  AtlasPage,
  AtlasConceptSummary,
  ConceptDetail,
  KnowledgeAsset,
  LibraryResourceDetail,
  LibraryResourceSummary,
} from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { KnowledgeAtlasAdminAdapter } from "@/src/lib/supabase/knowledge-atlas-admin";
import type {
  AdminAtlasQuery,
  AtlasConceptsQuery,
  AtlasLibraryQuery,
  KnowledgeAssetUploadInput,
  KnowledgeDocumentInput,
} from "@/src/modules/knowledge-atlas/schema";

export type AtlasActor = Readonly<{ tenantId: string; userId: string }>;
export type AssetPathEntry = Readonly<{ id: string; storagePath: string; status: string }>;
export type CreatedAsset = Readonly<{ asset: KnowledgeAsset; storagePath: string }>;
export type AdminWriteInput = Readonly<{
  curriculumId: string;
  lessonTemplateIds: readonly string[];
  document: KnowledgeDocumentInput;
}>;

export interface KnowledgeAtlasStore {
  studentConceptsPage(actor: AtlasActor, query: AtlasConceptsQuery, requestId: string): Promise<AtlasPage<AtlasConceptSummary>>;
  studentConceptDetail(actor: AtlasActor, conceptId: string, requestId: string): Promise<ConceptDetail>;
  studentLibraryPage(actor: AtlasActor, query: AtlasLibraryQuery, requestId: string): Promise<AtlasPage<LibraryResourceSummary>>;
  studentLibraryDetail(actor: AtlasActor, resourceId: string, requestId: string): Promise<LibraryResourceDetail>;

  adminPage(actor: AtlasActor, query: AdminAtlasQuery, requestId: string): Promise<AdminKnowledgePage>;
  adminDetail(actor: AtlasActor, itemId: string, requestId: string): Promise<AdminKnowledgeItemDetail>;
  adminCreate(actor: AtlasActor, input: AdminWriteInput, requestId: string): Promise<AdminKnowledgeItemDetail>;
  adminUpdate(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, input: AdminWriteInput, requestId: string): Promise<AdminKnowledgeItemDetail>;
  adminPublish(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, requestId: string): Promise<AdminKnowledgeItemDetail>;
  adminArchive(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, requestId: string): Promise<AdminKnowledgeItemDetail>;

  createAsset(actor: AtlasActor, input: KnowledgeAssetUploadInput, requestId: string): Promise<CreatedAsset>;
  finalizeAsset(actor: AtlasActor, assetId: string, requestId: string): Promise<KnowledgeAsset>;
  /** Tenant-scoped: usada pelo service tanto para leituras de aluno quanto de admin (a RPC não exige actor). */
  assetPaths(tenantId: string, assetIds: readonly string[], requestId: string): Promise<readonly AssetPathEntry[]>;

  createSignedUploadUrl(path: string, requestId: string): Promise<{ signedUrl: string; expiresAt: string }>;
  createSignedUrls(paths: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export class KnowledgeAtlasRepository implements KnowledgeAtlasStore {
  constructor(private readonly adapter: KnowledgeAtlasAdminAdapter = new KnowledgeAtlasAdminAdapter()) {}

  async studentConceptsPage(actor: AtlasActor, query: AtlasConceptsQuery, requestId: string): Promise<AtlasPage<AtlasConceptSummary>> {
    const result = await this.adapter.call("student_atlas_concepts_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_search: query.search ?? null,
      p_cycle: query.cycle ?? null,
      p_lesson: query.lesson ?? null,
      p_tag: query.tag ?? null,
      p_has_video: query.hasVideo ?? null,
      p_max_reading_minutes: query.maxReadingMinutes ?? null,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    return result as AtlasPage<AtlasConceptSummary>;
  }

  async studentConceptDetail(actor: AtlasActor, conceptId: string, requestId: string): Promise<ConceptDetail> {
    const result = await this.adapter.call("student_atlas_concept_detail", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_concept_id: conceptId,
    }, requestId);
    return result as ConceptDetail;
  }

  async studentLibraryPage(actor: AtlasActor, query: AtlasLibraryQuery, requestId: string): Promise<AtlasPage<LibraryResourceSummary>> {
    const result = await this.adapter.call("student_atlas_library_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_kind: query.kind,
      p_search: query.search ?? null,
      p_cycle: query.cycle ?? null,
      p_lesson: query.lesson ?? null,
      p_tag: query.tag ?? null,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    return result as AtlasPage<LibraryResourceSummary>;
  }

  async studentLibraryDetail(actor: AtlasActor, resourceId: string, requestId: string): Promise<LibraryResourceDetail> {
    const result = await this.adapter.call("student_atlas_library_detail", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_resource_id: resourceId,
    }, requestId);
    return result as LibraryResourceDetail;
  }

  async adminPage(actor: AtlasActor, query: AdminAtlasQuery, requestId: string): Promise<AdminKnowledgePage> {
    const result = await this.adapter.call("admin_atlas_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_kind: query.kind ?? null,
      p_status: query.status ?? null,
      p_curriculum_id: query.curriculumId ?? null,
      p_cycle: query.cycle ?? null,
      p_lesson: query.lesson ?? null,
      p_tag: query.tag ?? null,
      p_search: query.search ?? null,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    return result as AdminKnowledgePage;
  }

  async adminDetail(actor: AtlasActor, itemId: string, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const result = await this.adapter.call("admin_atlas_detail", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_item_id: itemId,
    }, requestId);
    return result as AdminKnowledgeItemDetail;
  }

  async adminCreate(actor: AtlasActor, input: AdminWriteInput, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const result = await this.adapter.call("admin_atlas_create", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_curriculum_id: input.curriculumId,
      p_lesson_template_ids: input.lessonTemplateIds,
      p_document: input.document,
      p_request_id: requestId,
    }, requestId);
    return result as AdminKnowledgeItemDetail;
  }

  async adminUpdate(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, input: AdminWriteInput, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const result = await this.adapter.call("admin_atlas_update", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_item_id: itemId,
      p_expected_updated_at: expectedUpdatedAt,
      p_curriculum_id: input.curriculumId,
      p_lesson_template_ids: input.lessonTemplateIds,
      p_document: input.document,
      p_request_id: requestId,
    }, requestId);
    return result as AdminKnowledgeItemDetail;
  }

  async adminPublish(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const result = await this.adapter.call("admin_atlas_publish", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_item_id: itemId,
      p_expected_updated_at: expectedUpdatedAt,
      p_request_id: requestId,
    }, requestId);
    return result as AdminKnowledgeItemDetail;
  }

  async adminArchive(actor: AtlasActor, itemId: string, expectedUpdatedAt: string, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const result = await this.adapter.call("admin_atlas_archive", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_item_id: itemId,
      p_expected_updated_at: expectedUpdatedAt,
      p_request_id: requestId,
    }, requestId);
    return result as AdminKnowledgeItemDetail;
  }

  async createAsset(actor: AtlasActor, input: KnowledgeAssetUploadInput, requestId: string): Promise<CreatedAsset> {
    const result = await this.adapter.call("admin_atlas_asset_create", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_filename: input.filename,
      p_content_type: input.contentType,
      p_size_bytes: input.sizeBytes,
      p_width: input.width,
      p_height: input.height,
      p_request_id: requestId,
    }, requestId);
    if (!isRecord(result) || typeof result.storagePath !== "string") {
      throw new AppError("INTERNAL_ERROR", "Não foi possível preparar o upload.", requestId);
    }
    const { storagePath, ...assetFields } = result;
    return { asset: assetFields as unknown as KnowledgeAsset, storagePath };
  }

  async finalizeAsset(actor: AtlasActor, assetId: string, requestId: string): Promise<KnowledgeAsset> {
    const result = await this.adapter.call("admin_atlas_asset_finalize", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_asset_id: assetId,
    }, requestId);
    return result as KnowledgeAsset;
  }

  async assetPaths(tenantId: string, assetIds: readonly string[], requestId: string): Promise<readonly AssetPathEntry[]> {
    if (assetIds.length === 0) return [];
    const result = await this.adapter.call("admin_atlas_asset_paths", {
      p_tenant_id: tenantId,
      p_asset_ids: assetIds,
    }, requestId);
    return Array.isArray(result) ? (result as AssetPathEntry[]) : [];
  }

  async createSignedUploadUrl(path: string, requestId: string): Promise<{ signedUrl: string; expiresAt: string }> {
    return this.adapter.createSignedUploadUrl(path, requestId);
  }

  async createSignedUrls(paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
    return this.adapter.createSignedUrls(paths);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
