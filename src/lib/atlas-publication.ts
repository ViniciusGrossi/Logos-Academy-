import type { AdminAtlasDetail, AtlasContentBlock } from "@/specs/api.contracts";

const visuals = new Set(["image", "diagram", "gallery", "comparison", "steps", "checklist", "do_dont", "palette", "typography", "specimen"]);
const textual = new Set(["text", "callout", "list", "code", "quote"]);
/** Pure shared checklist: the editor and publish service use identical rules. */
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
function mojibakePaths(value: unknown, path = ""): string[] {
  if (typeof value === "string") return /Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|Ãƒ|Ã‚|â€|\uFFFD/.test(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((entry: unknown, index) => mojibakePaths(entry, path ? `${path}.${index}` : `${index}`));
  if (value !== null && typeof value === "object") return Object.entries(value).flatMap(([key, entry]) => mojibakePaths(entry, path ? `${path}.${key}` : key));
  return [];
}
