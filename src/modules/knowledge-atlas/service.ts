import type {
  AdminKnowledgeItemDetail,
  AdminKnowledgePage,
  AtlasPage,
  AtlasConceptSummary,
  ConceptDetail,
  KnowledgeAsset,
  KnowledgeBlock,
  KnowledgeDocument,
  KnowledgeImage,
  KnowledgePublishIssue,
  LibraryResourceDetail,
  LibraryResourceSummary,
} from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { publishIssues } from "@/src/modules/knowledge-atlas/publish-issues";
import type { AtlasActor, KnowledgeAtlasStore } from "@/src/modules/knowledge-atlas/repository";
import {
  AdminAtlasArchiveInputSchema,
  AdminAtlasCreateInputSchema,
  AdminAtlasItemPathSchema,
  AdminAtlasPublishInputSchema,
  AdminAtlasQuerySchema,
  AdminAtlasUpdateInputSchema,
  AtlasConceptPathSchema,
  AtlasConceptsQuerySchema,
  AtlasLibraryQuerySchema,
  AtlasResourcePathSchema,
  KnowledgeAssetFinalizePathSchema,
  KnowledgeAssetUploadInputSchema,
  type KnowledgeDocumentInput,
} from "@/src/modules/knowledge-atlas/schema";

export type { AtlasActor } from "@/src/modules/knowledge-atlas/repository";

export class KnowledgeAtlasService {
  constructor(private readonly repository: KnowledgeAtlasStore) {}

  /* ---------- aluno ---------- */

  async studentConcepts(actor: AtlasActor, rawQuery: unknown, requestId: string): Promise<AtlasPage<AtlasConceptSummary>> {
    const query = parse(AtlasConceptsQuerySchema, rawQuery, requestId);
    return this.repository.studentConceptsPage(actor, query, requestId);
  }

  async studentConceptDetail(actor: AtlasActor, rawConceptId: unknown, requestId: string): Promise<ConceptDetail> {
    const { conceptId } = parse(AtlasConceptPathSchema, { conceptId: rawConceptId }, requestId);
    const detail = await this.repository.studentConceptDetail(actor, conceptId, requestId);
    const map = await this.resolveSignedUrlsByAssetId(actor.tenantId, collectBlockAssetIds(detail.blocks), requestId);
    return { ...detail, blocks: applyImageUrlsToBlocks(detail.blocks, map) };
  }

  async studentLibrary(actor: AtlasActor, rawQuery: unknown, requestId: string): Promise<AtlasPage<LibraryResourceSummary>> {
    const query = parse(AtlasLibraryQuerySchema, rawQuery, requestId);
    return this.repository.studentLibraryPage(actor, query, requestId);
  }

  async studentLibraryDetail(actor: AtlasActor, rawResourceId: unknown, requestId: string): Promise<LibraryResourceDetail> {
    const { resourceId } = parse(AtlasResourcePathSchema, { resourceId: rawResourceId }, requestId);
    const detail = await this.repository.studentLibraryDetail(actor, resourceId, requestId);
    const referenceImages = detail.artifact.type === "design_system" ? detail.artifact.referenceImages : [];
    const ids = [...collectBlockAssetIds(detail.blocks), ...referenceImages.map((image) => image.assetId)];
    const map = await this.resolveSignedUrlsByAssetId(actor.tenantId, ids, requestId);
    const blocks = applyImageUrlsToBlocks(detail.blocks, map);
    if (detail.artifact.type === "design_system") {
      return { ...detail, blocks, artifact: { ...detail.artifact, referenceImages: detail.artifact.referenceImages.map((image) => applyUrl(image, map)) } };
    }
    return { ...detail, blocks };
  }

  /* ---------- admin ---------- */

  async adminList(actor: AtlasActor, rawQuery: unknown, requestId: string): Promise<AdminKnowledgePage> {
    const query = parse(AdminAtlasQuerySchema, rawQuery, requestId);
    return this.repository.adminPage(actor, query, requestId);
  }

  async adminDetail(actor: AtlasActor, rawItemId: unknown, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const { itemId } = parse(AdminAtlasItemPathSchema, { itemId: rawItemId }, requestId);
    const detail = await this.repository.adminDetail(actor, itemId, requestId);
    return this.completeAdminDetail(actor, detail, requestId);
  }

  async adminCreate(actor: AtlasActor, rawInput: unknown, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const input = parse(AdminAtlasCreateInputSchema, rawInput, requestId);
    const detail = await this.repository.adminCreate(actor, { ...input, document: stripDocumentUrls(input.document) }, requestId);
    return this.completeAdminDetail(actor, detail, requestId);
  }

  async adminUpdate(actor: AtlasActor, rawInput: unknown, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const input = parse(AdminAtlasUpdateInputSchema, rawInput, requestId);
    const detail = await this.repository.adminUpdate(
      actor,
      input.itemId,
      input.expectedUpdatedAt,
      { curriculumId: input.curriculumId, lessonTemplateIds: input.lessonTemplateIds, document: stripDocumentUrls(input.document) },
      requestId,
    );
    return this.completeAdminDetail(actor, detail, requestId);
  }

  /** Bloqueia com VALIDATION_ERROR + fieldErrors antes da RPC quando `publishIssues` acusa pendência. */
  async adminPublish(actor: AtlasActor, rawInput: unknown, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const input = parse(AdminAtlasPublishInputSchema, rawInput, requestId);
    const current = await this.repository.adminDetail(actor, input.itemId, requestId);
    const issues = publishIssues(current.document, current.lessonTemplateIds, current.assets);
    if (issues.length > 0) {
      throw new AppError("VALIDATION_ERROR", "Corrija as pendências antes de publicar.", requestId, toFieldErrors(issues));
    }
    const detail = await this.repository.adminPublish(actor, input.itemId, input.expectedUpdatedAt, requestId);
    return this.completeAdminDetail(actor, detail, requestId);
  }

  async adminArchive(actor: AtlasActor, rawInput: unknown, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const input = parse(AdminAtlasArchiveInputSchema, rawInput, requestId);
    const detail = await this.repository.adminArchive(actor, input.itemId, input.expectedUpdatedAt, requestId);
    return this.completeAdminDetail(actor, detail, requestId);
  }

  async createUploadUrl(actor: AtlasActor, rawInput: unknown, requestId: string): Promise<{ asset: KnowledgeAsset; signedUploadUrl: string; expiresAt: string }> {
    const input = parse(KnowledgeAssetUploadInputSchema, rawInput, requestId);
    const created = await this.repository.createAsset(actor, input, requestId);
    const url = await this.repository.createSignedUploadUrl(created.storagePath, requestId);
    return { asset: created.asset, signedUploadUrl: url.signedUrl, expiresAt: url.expiresAt };
  }

  async finalizeAsset(actor: AtlasActor, rawAssetId: unknown, requestId: string): Promise<KnowledgeAsset> {
    const { assetId } = parse(KnowledgeAssetFinalizePathSchema, { assetId: rawAssetId }, requestId);
    return this.repository.finalizeAsset(actor, assetId, requestId);
  }

  /** Recalcula `publishIssues` (a RPC devolve `[]`) e assina imagens só dos assets referenciados. */
  private async completeAdminDetail(actor: AtlasActor, detail: AdminKnowledgeItemDetail, requestId: string): Promise<AdminKnowledgeItemDetail> {
    const documents = [detail.document, detail.publishedDocument].filter((doc): doc is KnowledgeDocument => doc !== null);
    const ids = new Set<string>();
    for (const document of documents) {
      collectBlockAssetIds(document.blocks).forEach((id) => ids.add(id));
      if (document.artifact.type === "design_system") document.artifact.referenceImages.forEach((image) => ids.add(image.assetId));
    }
    const map = await this.resolveSignedUrlsByAssetId(actor.tenantId, [...ids], requestId);
    return {
      ...detail,
      document: signDocumentImages(detail.document, map),
      publishedDocument: detail.publishedDocument ? signDocumentImages(detail.publishedDocument, map) : null,
      assets: detail.assets.map((asset) => ({ ...asset, url: map.get(asset.id) ?? null })),
      publishIssues: publishIssues(detail.document, detail.lessonTemplateIds, detail.assets),
    };
  }

  /** URLs assinadas apenas para assets efetivamente referenciados no documento já autorizado pela RPC. */
  private async resolveSignedUrlsByAssetId(tenantId: string, assetIds: readonly string[], requestId: string): Promise<ReadonlyMap<string, string>> {
    const uniqueIds = [...new Set(assetIds)];
    if (uniqueIds.length === 0) return new Map();
    const paths = await this.repository.assetPaths(tenantId, uniqueIds, requestId);
    const readyPaths = paths.filter((entry) => entry.status === "ready").map((entry) => entry.storagePath);
    if (readyPaths.length === 0) return new Map();
    const signedByPath = await this.repository.createSignedUrls(readyPaths);
    const byAssetId = new Map<string, string>();
    for (const entry of paths) {
      const url = signedByPath.get(entry.storagePath);
      if (url) byAssetId.set(entry.id, url);
    }
    return byAssetId;
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, input: unknown, requestId: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados inválidos.", requestId);
  return parsed.data;
}

function toFieldErrors(issues: readonly KnowledgePublishIssue[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const issue of issues) (grouped[issue.path] ??= []).push(issue.message);
  return grouped;
}

function collectBlockAssetIds(blocks: readonly KnowledgeBlock[]): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.type === "image") ids.push(block.image.assetId);
    if (block.type === "gallery") block.images.forEach((image) => ids.push(image.assetId));
  }
  return ids;
}

function applyUrl(image: KnowledgeImage, map: ReadonlyMap<string, string>): KnowledgeImage {
  const url = map.get(image.assetId);
  return url ? { ...image, url } : image;
}

function applyImageUrlsToBlocks(blocks: readonly KnowledgeBlock[], map: ReadonlyMap<string, string>): readonly KnowledgeBlock[] {
  return blocks.map((block) => {
    if (block.type === "image") return { ...block, image: applyUrl(block.image, map) };
    if (block.type === "gallery") return { ...block, images: block.images.map((image) => applyUrl(image, map)) };
    return block;
  });
}

function signDocumentImages(document: KnowledgeDocument, map: ReadonlyMap<string, string>): KnowledgeDocument {
  const blocks = applyImageUrlsToBlocks(document.blocks, map);
  if (document.artifact.type === "design_system") {
    return { ...document, blocks, artifact: { ...document.artifact, referenceImages: document.artifact.referenceImages.map((image) => applyUrl(image, map)) } };
  }
  return { ...document, blocks };
}

/** `url` nunca é aceito do cliente para escrita: descartado antes de qualquer chamada de RPC de gravação. */
function stripDocumentUrls(document: KnowledgeDocumentInput): KnowledgeDocumentInput {
  const blocks = document.blocks.map((block) => {
    if (block.type === "image") return { ...block, image: stripImageUrl(block.image) };
    if (block.type === "gallery") return { ...block, images: block.images.map(stripImageUrl) };
    return block;
  });
  if (document.artifact.type === "design_system") {
    return { ...document, blocks, artifact: { ...document.artifact, referenceImages: document.artifact.referenceImages.map(stripImageUrl) } };
  }
  return { ...document, blocks };
}

function stripImageUrl<T extends { url?: string }>(image: T): T {
  if (image.url === undefined) return image;
  const rest = { ...image };
  delete rest.url;
  return rest as T;
}
