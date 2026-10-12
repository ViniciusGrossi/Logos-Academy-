import type { AdminAtlasDraftInput, AdminAtlasDetail } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { publicationErrors } from "@/src/lib/atlas-publication";
export { publicationErrors } from "@/src/lib/atlas-publication";
import { inspectAtlasImage } from "./image";
import type { AtlasCmsStore, VerifiedImage } from "./repository";
import { actorSchema, archiveSchema, assetSchema, createSchema, finalizeSchema, listQuerySchema, pageQuerySchema, parseInput, parseOutput, publishSchema, restoreSchema, saveSchema, uploadSchema, uuidSchema, type AtlasActor } from "./schema";

export class AtlasCmsService {
  constructor(private readonly store: AtlasCmsStore) {}
  list(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); return this.store.list(actor, parseInput(listQuerySchema, input, requestId), requestId);
  }
  detail(actor: AtlasActor, itemId: unknown, requestId: string) {
    this.admin(actor, requestId); return this.store.detail(actor, parseInput(uuidSchema, itemId, requestId), requestId);
  }
  create(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId);
    const parsed = parseInput(createSchema, input, requestId);
    const slug = `${parsed.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "item"}-${crypto.randomUUID().slice(0, 8)}`;
    // The canonical tables require a nonempty summary even for a new base row.
    // Subsequent saves may leave the separate working draft summary incomplete.
    const common = { title: parsed.title, slug, summary: parsed.title, tags: [], lessonTemplateIds: [], contentBlocks: [] };
    const draft: AdminAtlasDraftInput = parsed.kind === "concept" ? { ...common, kind: "concept", video: null, artifact: null }
      : parsed.kind === "prompt" ? { ...common, kind: "prompt", video: null, artifact: { type: "prompt", template: "", variables: [], exampleInput: null, exampleOutput: null } }
      : { ...common, kind: "design_system", video: null, artifact: { type: "design_system", palette: [], typography: [], principles: [], components: [] } };
    return this.store.upsert(actor, null, draft, null, requestId);
  }
  save(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); const parsed = parseInput(saveSchema, input, requestId);
    return this.store.upsert(actor, parsed.itemId, parsed.draft, parsed.expectedDraftUpdatedAt, requestId);
  }
  async publish(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); const parsed = parseInput(publishSchema, input, requestId);
    const detail = await this.store.detail(actor, parsed.itemId, requestId);
    if (detail.itemUpdatedAt !== parsed.expectedItemUpdatedAt || detail.draftUpdatedAt !== parsed.expectedDraftUpdatedAt) throw new AppError("CONFLICT", "O conteúdo mudou em outra sessão. Recarregue antes de continuar.", requestId);
    assertPublishable(detail, requestId);
    return this.store.publish(actor, parsed, requestId);
  }
  archive(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); return this.store.archive(actor, parseInput(archiveSchema, input, requestId), requestId);
  }
  revisions(actor: AtlasActor, itemId: unknown, input: unknown, requestId: string) {
    this.admin(actor, requestId); return this.store.revisions(actor, parseInput(uuidSchema, itemId, requestId), parseInput(pageQuerySchema, input, requestId), requestId);
  }
  restore(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); return this.store.restore(actor, parseInput(restoreSchema, input, requestId), requestId);
  }
  async authorize(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId);
    return this.store.authorize(actor, parseInput(uploadSchema, input, requestId), requestId);
  }
  async finalize(actor: AtlasActor, input: unknown, requestId: string) {
    this.admin(actor, requestId); const parsed = parseInput(finalizeSchema, input, requestId);
    const target = await this.store.assetTarget(actor, parsed.assetId, requestId);
    if (target.status === "ready") return parseOutput(assetSchema, target, requestId);
    if (target.status !== "pending") throw new AppError("CONFLICT", "Este asset já foi processado. Envie um novo arquivo.", requestId);
    let verified: VerifiedImage;
    try { verified = await inspectAtlasImage(await this.store.assetBytes(target, requestId), target, requestId); }
    catch {
      const result = await this.store.finalize(actor, parsed, null, requestId);
      if (result.status === "ready") return result;
      throw new AppError("VALIDATION_ERROR", "Não foi possível validar o arquivo enviado. Envie uma nova imagem.", requestId, { assetId: ["Arquivo ausente, inválido ou divergente do upload autorizado."] });
    }
    const asset = await this.store.finalize(actor, parsed, verified, requestId);
    if (asset.status !== "ready") throw new AppError("VALIDATION_ERROR", "O arquivo enviado não corresponde aos metadados autorizados.", requestId, { assetId: ["Envie uma nova imagem."] });
    return asset;
  }
  private admin(actor: AtlasActor, requestId: string) {
    if (!actorSchema.safeParse(actor).success) throw new AppError("FORBIDDEN", "Acesso administrativo obrigatório.", requestId);
  }
}
function assertPublishable(detail: AdminAtlasDetail, requestId: string) {
  const errors = publicationErrors(detail);
  if (!detail.hasWorkingDraft) throw new AppError("CONFLICT", "Salve um rascunho antes de publicar.", requestId);
  if (Object.keys(errors).length) throw new AppError("VALIDATION_ERROR", "Complete o checklist antes de publicar.", requestId, errors);
}
