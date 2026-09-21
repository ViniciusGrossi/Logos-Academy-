import type {
  KnowledgeAsset,
  KnowledgeBlock,
  KnowledgeDocument,
  KnowledgeImage,
  KnowledgePublishIssue,
} from "@/specs/api.contracts";

const VARIABLE_PLACEHOLDER_PATTERN = /\{\{\s*([a-z][a-z0-9_]{0,39})\s*\}\}/gu;

/**
 * Fonte única das pendências de publicação (spec: `service.publishIssues`). Usada tanto no
 * detail administrativo (para exibir o que falta) quanto antes de chamar a RPC de publish
 * (para bloquear com `VALIDATION_ERROR` + `fieldErrors` sem round-trip ao banco).
 * Nunca lança — sempre retorna a lista (vazia = publicável do ponto de vista do service;
 * a RPC ainda revalida no banco).
 */
export function publishIssues(
  document: KnowledgeDocument,
  lessonTemplateIds: readonly string[],
  assets: readonly KnowledgeAsset[],
): KnowledgePublishIssue[] {
  const issues: KnowledgePublishIssue[] = [];

  if (lessonTemplateIds.length === 0) {
    issues.push({ path: "lessonTemplateIds", message: "Vincule ao menos uma aula." });
  }
  if (!document.title.trim()) {
    issues.push({ path: "title", message: "Informe um título." });
  }
  if (!document.slug.trim()) {
    issues.push({ path: "slug", message: "Informe um slug." });
  }
  if (!document.summary.trim()) {
    issues.push({ path: "summary", message: "Informe um resumo." });
  }

  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));
  for (const { path, image } of collectImages(document)) {
    if (!image.alt.trim()) {
      issues.push({ path: `${path}.alt`, message: "Adicione um texto alternativo." });
    }
    const asset = assetById.get(image.assetId);
    if (!asset || asset.status !== "ready") {
      issues.push({ path: `${path}.assetId`, message: "A imagem precisa de um arquivo pronto." });
    }
  }

  if (document.artifact.type === "concept") {
    const video = document.artifact.video;
    if (video) {
      if (!video.transcript.trim()) {
        issues.push({ path: "artifact.video.transcript", message: "Adicione a transcrição do vídeo." });
      }
      if (!video.captionsReviewed) {
        issues.push({ path: "artifact.video.captionsReviewed", message: "Revise as legendas antes de publicar." });
      }
    }
  }

  if (document.artifact.type === "prompt") {
    const { template, variables } = document.artifact;
    if (!template.trim()) {
      issues.push({ path: "artifact.template", message: "Informe o template do prompt." });
    }
    const declared = new Set(variables.map((variable) => variable.key));
    const used = new Set<string>();
    for (const match of template.matchAll(VARIABLE_PLACEHOLDER_PATTERN)) used.add(match[1]);
    for (const key of used) {
      if (!declared.has(key)) {
        issues.push({ path: "artifact.template", message: `Variável {{${key}}} não declarada.` });
      }
    }
  }

  if (document.artifact.type === "design_system") {
    const { palette, components } = document.artifact;
    if (palette.length === 0) {
      issues.push({ path: "artifact.palette", message: "Cadastre ao menos uma cor na paleta." });
    }
    const paletteNames = new Set(palette.map((color) => color.name));
    components.forEach((component, index) => {
      (["background", "foreground", "accent", "border"] as const).forEach((tokenKey) => {
        const value = component.tokens[tokenKey];
        if (value && !paletteNames.has(value)) {
          issues.push({
            path: `artifact.components[${index}].tokens.${tokenKey}`,
            message: `A cor "${value}" não existe na paleta.`,
          });
        }
      });
    });
  }

  return issues;
}

function collectImages(document: KnowledgeDocument): { path: string; image: KnowledgeImage }[] {
  const images: { path: string; image: KnowledgeImage }[] = [];
  document.blocks.forEach((block: KnowledgeBlock, index: number) => {
    if (block.type === "image") images.push({ path: `blocks[${index}].image`, image: block.image });
    if (block.type === "gallery") {
      block.images.forEach((image, imageIndex) => images.push({ path: `blocks[${index}].images[${imageIndex}]`, image }));
    }
  });
  if (document.artifact.type === "design_system") {
    document.artifact.referenceImages.forEach((image, index) => images.push({ path: `artifact.referenceImages[${index}]`, image }));
  }
  return images;
}
