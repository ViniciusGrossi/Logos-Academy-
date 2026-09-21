import { z } from "zod";

export const UuidSchema = z.string().uuid();
const IsoDateTimeSchema = z.string().datetime({ offset: true });

/** `false`/`true` vindos de query string; `z.coerce.boolean()` trataria "false" como truthy. */
const QueryBooleanSchema = z.enum(["true", "false"]).transform((value) => value === "true");

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/u, "Use uma cor hex #RRGGBB.");

/** HTTPS absoluto ou caminho interno começando por um único "/" (nunca "//", que é um URL relativo a protocolo). */
const HrefSchema = z.string().trim().min(1).max(2_000).superRefine((value, context) => {
  if (value.startsWith("/") && !value.startsWith("//")) return;
  try {
    if (new URL(value).protocol !== "https:") context.addIssue({ code: z.ZodIssueCode.custom, message: "Use uma URL HTTPS ou um caminho interno." });
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL válida." });
  }
});

const BlockIdSchema = z.string().trim().min(1).max(64);

export const KnowledgeInlineSchema = z.object({
  text: z.string().max(2_000),
  marks: z.array(z.enum(["bold", "italic", "code"])).max(3).optional(),
  href: HrefSchema.optional(),
}).strict();

export const KnowledgeParagraphSchema = z.array(KnowledgeInlineSchema).max(80);

/** `url` nunca é aceito do cliente para escrita; o service sempre o descarta antes de persistir. */
export const KnowledgeImageSchema = z.object({
  assetId: UuidSchema,
  alt: z.string().max(300),
  caption: z.string().max(500).nullable(),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
  url: z.string().url().optional(),
}).strict();

const RichTextBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("rich_text"),
  content: z.array(KnowledgeParagraphSchema).max(60),
}).strict();
const HeadingBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().max(200),
}).strict();
const ListBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("list"),
  style: z.enum(["bullet", "ordered"]),
  items: z.array(KnowledgeParagraphSchema).max(40),
}).strict();
const CalloutBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("callout"),
  tone: z.enum(["info", "tip", "warning"]),
  title: z.string().max(200),
  content: z.array(KnowledgeParagraphSchema).max(40),
}).strict();
const ImageBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("image"), image: KnowledgeImageSchema,
}).strict();
const GalleryBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("gallery"),
  images: z.array(KnowledgeImageSchema).max(12),
}).strict();
/**
 * Sem `superRefine` de nó/aresta aqui: `z.discriminatedUnion` exige que todo membro seja um
 * `ZodObject` puro (não `ZodEffects`). A existência de nós referenciados por `edges` fica a
 * cargo da revisão editorial, não do schema estrutural.
 */
const DiagramBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("diagram"),
  title: z.string().max(200),
  layout: z.enum(["sequence", "cycle", "hierarchy"]),
  nodes: z.array(z.object({ id: BlockIdSchema, label: z.string().max(120), detail: z.string().max(1_000) }).strict()).max(40),
  edges: z.array(z.object({ from: BlockIdSchema, to: BlockIdSchema, label: z.string().max(120).nullable() }).strict()).max(80),
}).strict();
const CodeBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("code"),
  language: z.string().max(40),
  code: z.string().max(20_000),
  caption: z.string().max(300).nullable(),
}).strict();
const QuoteBlockSchema = z.object({
  id: BlockIdSchema, type: z.literal("quote"),
  variant: z.enum(["quote", "definition"]),
  text: z.string().max(2_000),
  attribution: z.string().max(200).nullable(),
}).strict();

export const KnowledgeBlockSchema = z.discriminatedUnion("type", [
  RichTextBlockSchema, HeadingBlockSchema, ListBlockSchema, CalloutBlockSchema,
  ImageBlockSchema, GalleryBlockSchema, DiagramBlockSchema, CodeBlockSchema, QuoteBlockSchema,
]);

export const KnowledgeVideoSchema = z.object({
  provider: z.literal("youtube"),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/u, "ID de vídeo do YouTube inválido."),
  title: z.string().max(200),
  durationSeconds: z.number().int().min(1).max(24 * 60 * 60),
  transcript: z.string().max(20_000),
  captionsReviewed: z.boolean(),
}).strict();

const ConceptArtifactSchema = z.object({
  type: z.literal("concept"),
  objective: z.string().max(2_000),
  video: KnowledgeVideoSchema.nullable(),
  summaryPoints: z.array(z.string().max(500)).max(20),
  reviewQuestions: z.array(z.string().max(500)).max(20),
}).strict();

const PromptVariableSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/u, "Use minúsculas, números e _ , começando por letra."),
  label: z.string().max(120),
  description: z.string().max(1_000),
  example: z.string().max(1_000),
  required: z.boolean(),
}).strict();

const PromptArtifactSchema = z.object({
  type: z.literal("prompt"),
  objective: z.string().max(2_000),
  whenToUse: z.array(z.string().max(500)).max(20),
  whenNotToUse: z.array(z.string().max(500)).max(20),
  template: z.string().max(20_000),
  anatomy: z.array(z.object({ label: z.string().max(200), excerpt: z.string().max(2_000), explanation: z.string().max(2_000) }).strict()).max(30),
  variables: z.array(PromptVariableSchema).max(30).refine((variables) => new Set(variables.map((variable) => variable.key)).size === variables.length, "Chaves de variável duplicadas."),
  exampleInput: z.string().max(5_000),
  exampleOutput: z.string().max(5_000),
  cautions: z.array(z.string().max(500)).max(20),
  adaptMinutes: z.number().int().min(0).max(600),
}).strict();

const DesignFontRoleSchema = z.enum(["sans", "serif", "mono", "display"]);
const DesignPreviewKindSchema = z.enum(["button", "field", "card", "badge", "callout", "navigation", "editorial_block"]);

const DesignComponentPreviewSchema = z.object({
  id: BlockIdSchema,
  kind: DesignPreviewKindSchema,
  label: z.string().max(120),
  description: z.string().max(1_000),
  copy: z.array(z.string().max(300)).max(10),
  tokens: z.object({
    background: z.string().max(60),
    foreground: z.string().max(60),
    accent: z.string().max(60).nullable(),
    border: z.string().max(60).nullable(),
  }).strict(),
  radius: z.string().max(60).nullable(),
}).strict();

const DesignSystemArtifactSchema = z.object({
  type: z.literal("design_system"),
  purpose: z.string().max(2_000),
  context: z.string().max(2_000),
  principles: z.array(z.object({ title: z.string().max(120), detail: z.string().max(1_000) }).strict()).max(20),
  palette: z.array(z.object({ name: z.string().min(1).max(60), value: HexColorSchema, role: z.string().max(200) }).strict()).max(40),
  typography: z.array(z.object({
    name: z.string().max(60),
    fontRole: DesignFontRoleSchema,
    weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]),
    sizePx: z.number().int().min(1).max(200),
    sample: z.string().max(300),
    role: z.string().max(200),
  }).strict()).max(20),
  spacing: z.array(z.object({ name: z.string().max(60), valuePx: z.number().int().min(0).max(400) }).strict()).max(20),
  radii: z.array(z.object({ name: z.string().max(60), valuePx: z.number().int().min(0).max(400) }).strict()).max(20),
  components: z.array(DesignComponentPreviewSchema).max(30),
  usageExamples: z.array(z.object({ title: z.string().max(120), description: z.string().max(1_000) }).strict()).max(20),
  dos: z.array(z.string().max(300)).max(20),
  donts: z.array(z.string().max(300)).max(20),
  referenceImages: z.array(KnowledgeImageSchema).max(20),
}).strict();

export const KnowledgeArtifactSchema = z.discriminatedUnion("type", [ConceptArtifactSchema, PromptArtifactSchema, DesignSystemArtifactSchema]);

/**
 * Espelha `KnowledgeDocument` do contrato. Validação é apenas estrutural para permitir
 * rascunhos incompletos (GWT-08); completude para publicar é responsabilidade de `publishIssues`.
 */
export const KnowledgeDocumentSchema = z.object({
  kind: z.enum(["concept", "prompt", "design_system"]),
  title: z.string().max(200),
  slug: z.string().max(200).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use letras minúsculas, números e hífens."),
  summary: z.string().max(600),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  readingMinutes: z.number().int().min(0).max(600),
  blocks: z.array(KnowledgeBlockSchema).max(200),
  artifact: KnowledgeArtifactSchema,
}).strict().superRefine((document, context) => {
  if (document.kind !== document.artifact.type) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "O tipo do artefato deve corresponder ao kind do documento.", path: ["artifact", "type"] });
  }
  const ids = document.blocks.map((block) => block.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "IDs de bloco devem ser únicos.", path: ["blocks"] });
  }
});

/* ----- Query (aluno) ----- */

export const AtlasConceptsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  cycle: z.coerce.number().int().min(1).max(50).optional(),
  lesson: z.coerce.number().int().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  hasVideo: QueryBooleanSchema.optional(),
  maxReadingMinutes: z.coerce.number().int().min(1).max(600).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const AtlasLibraryQuerySchema = z.object({
  kind: z.enum(["prompt", "design_system"]),
  search: z.string().trim().min(1).max(120).optional(),
  cycle: z.coerce.number().int().min(1).max(50).optional(),
  lesson: z.coerce.number().int().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const AtlasConceptPathSchema = z.object({ conceptId: UuidSchema }).strict();
export const AtlasResourcePathSchema = z.object({ resourceId: UuidSchema }).strict();

/* ----- Query e input (admin) ----- */

export const AdminAtlasQuerySchema = z.object({
  kind: z.enum(["concept", "prompt", "design_system"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  curriculumId: UuidSchema.optional(),
  cycle: z.coerce.number().int().min(1).max(50).optional(),
  lesson: z.coerce.number().int().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const AdminAtlasItemPathSchema = z.object({ itemId: UuidSchema }).strict();

export const AdminAtlasCreateInputSchema = z.object({
  curriculumId: UuidSchema,
  lessonTemplateIds: z.array(UuidSchema).max(50),
  document: KnowledgeDocumentSchema,
}).strict();

export const AdminAtlasUpdateInputSchema = AdminAtlasCreateInputSchema.extend({
  itemId: UuidSchema,
  expectedUpdatedAt: IsoDateTimeSchema,
}).strict();

export const AdminAtlasPublishInputSchema = z.object({
  itemId: UuidSchema,
  expectedUpdatedAt: IsoDateTimeSchema,
}).strict();
export const AdminAtlasArchiveInputSchema = AdminAtlasPublishInputSchema;

export const KnowledgeAssetUploadInputSchema = z.object({
  filename: z.string().trim().min(1).max(255).refine((name) => !/[\\/]/u.test(name), "Nome de arquivo inválido."),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
}).strict();

export const KnowledgeAssetFinalizePathSchema = z.object({ assetId: UuidSchema }).strict();

export type KnowledgeInline = z.infer<typeof KnowledgeInlineSchema>;
export type KnowledgeImageInput = z.infer<typeof KnowledgeImageSchema>;
export type KnowledgeBlockInput = z.infer<typeof KnowledgeBlockSchema>;
export type KnowledgeVideoInput = z.infer<typeof KnowledgeVideoSchema>;
export type KnowledgeArtifactInput = z.infer<typeof KnowledgeArtifactSchema>;
export type KnowledgeDocumentInput = z.infer<typeof KnowledgeDocumentSchema>;
export type AtlasConceptsQuery = z.infer<typeof AtlasConceptsQuerySchema>;
export type AtlasLibraryQuery = z.infer<typeof AtlasLibraryQuerySchema>;
export type AdminAtlasQuery = z.infer<typeof AdminAtlasQuerySchema>;
export type AdminAtlasCreateInput = z.infer<typeof AdminAtlasCreateInputSchema>;
export type AdminAtlasUpdateInput = z.infer<typeof AdminAtlasUpdateInputSchema>;
export type AdminAtlasPublishInput = z.infer<typeof AdminAtlasPublishInputSchema>;
export type KnowledgeAssetUploadInput = z.infer<typeof KnowledgeAssetUploadInputSchema>;
