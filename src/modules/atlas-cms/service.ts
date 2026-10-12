import type { AdminAtlasDraftInput, AdminAtlasDetail, AtlasContentBlock } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { inspectAtlasImage } from "./image";
import type { AtlasCmsStore, VerifiedImage } from "./repository";
import { actorSchema, archiveSchema, createSchema, finalizeSchema, listQuerySchema, pageQuerySchema, parseInput, publishSchema, restoreSchema, saveSchema, uploadSchema, uuidSchema, type AtlasActor } from "./schema";

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
    if (target.status !== "pending") throw new AppError("CONFLICT", "Este asset já foi processado. Envie um novo arquivo.", requestId);
    let verified: VerifiedImage;
    try { verified = await inspectAtlasImage(await this.store.assetBytes(target, requestId), target, requestId); }
    catch {
      await this.store.finalize(actor, parsed, null, requestId);
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
const visuals = new Set(["image", "diagram", "gallery", "comparison", "steps", "checklist", "do_dont", "palette", "typography", "specimen"]);
const textual = new Set(["text", "callout", "list", "code", "quote"]);
/** Stable field paths serve both the publish API and editor's checklist. */
export function publicationErrors(detail: AdminAtlasDetail): Record<string, string[]> {
  const draft = detail.draft; const errors: Record<string, string[]> = {};
  const require = (valid: boolean, path: string, message: string) => { if (!valid) (errors[path] ??= []).push(message); };
  require(!!draft.title.trim(), "title", "Informe o título.");
  require(!!draft.summary.trim(), "summary", "Informe o resumo.");
  require(draft.lessonTemplateIds.length > 0, "lessonTemplateIds", "Vincule ao menos uma aula.");
  for (const path of mojibakePaths(draft)) require(false, path, "Revise os caracteres deste texto.");
  const blocks = draft.contentBlocks.filter((block) => block.isVisible);
  if (draft.kind === "concept") {
    require(blocks.some((block) => textual.has(block.type)), "contentBlocks", "Adicione um bloco explicativo.");
    require(blocks.some((block) => visuals.has(block.type)), "contentBlocks", "Adicione um bloco visual.");
    if (draft.video) { require(!!draft.video.transcript?.trim(), "video.transcript", "Adicione a transcrição."); require(draft.video.captionsReviewed, "video.captionsReviewed", "Confirme a revisão das legendas."); }
  } else if (draft.kind === "prompt") {
    require(!!draft.artifact.template.trim(), "artifact.template", "Preencha o template.");
    require(!!draft.artifact.exampleInput?.trim(), "artifact.exampleInput", "Preencha a entrada de exemplo.");
    require(!!draft.artifact.exampleOutput?.trim(), "artifact.exampleOutput", "Preencha a saída de exemplo.");
    require(draft.artifact.variables.length > 0 || blocks.some((block) => visuals.has(block.type)), "contentBlocks", "Um prompt sem variáveis precisa de um bloco visual.");
  } else {
    require(blocks.some((block) => block.type === "palette"), "contentBlocks.palette", "Adicione uma paleta.");
    require(blocks.some((block) => block.type === "specimen"), "contentBlocks.specimen", "Adicione um espécime.");
  }
  for (const block of blocks) for (const source of imageSources(block)) {
    if (source.kind === "asset") require(detail.assets.some((asset) => asset.id === source.assetId && asset.status === "ready" && !!asset.alt && !!asset.width && !!asset.height && asset.ownerId === detail.id), `contentBlocks.${draft.contentBlocks.indexOf(block)}.source`, "Finalize o asset antes de publicar.");
  }
  return errors;
}
function imageSources(block: AtlasContentBlock) { return block.type === "image" ? [block.source] : block.type === "gallery" ? [...block.items] : []; }
function assertPublishable(detail: AdminAtlasDetail, requestId: string) {
  const errors = publicationErrors(detail);
  if (!detail.hasWorkingDraft) throw new AppError("CONFLICT", "Salve um rascunho antes de publicar.", requestId);
  if (Object.keys(errors).length) throw new AppError("VALIDATION_ERROR", "Complete o checklist antes de publicar.", requestId, errors);
}
function mojibakePaths(value: unknown, path = ""): string[] {
  if (typeof value === "string") return /Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|Ãƒ|Ã‚|â€|\uFFFD/.test(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((entry: unknown, index) => mojibakePaths(entry, path ? `${path}.${index}` : `${index}`));
  if (value !== null && typeof value === "object") return Object.entries(value).flatMap(([key, entry]) => mojibakePaths(entry, path ? `${path}.${key}` : key));
  return [];
}
