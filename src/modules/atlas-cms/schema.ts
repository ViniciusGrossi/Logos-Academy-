import { z } from "zod";
import { AppError } from "@/src/lib/api-error";

export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const timestamp = z.string().datetime({ offset: true });
const text = z.string().max(100_000);
const nonempty = text.refine((value) => value.trim().length > 0, "Preencha este campo.");
const kind = z.enum(["concept", "prompt", "design_system"]);
const status = z.enum(["draft", "published", "archived"]);
export const mimeSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
const base = { id: uuidSchema, isVisible: z.boolean() };
const image = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("asset"), assetId: uuidSchema, alt: nonempty, caption: text.optional() }).strict(),
  z.object({ kind: z.literal("external"), url: z.string().url().max(2048).refine((value) => new URL(value).protocol === "https:").transform((value) => value as `https://${string}`), alt: nonempty, caption: text.optional() }).strict(),
]);
const side = z.object({ eyebrow: text.optional(), title: nonempty, body: nonempty }).strict();
const specimens = z.discriminatedUnion("component", [
  z.object({ component: z.literal("button"), props: z.object({ label: nonempty, variant: z.enum(["primary", "secondary", "outline"]), disabled: z.boolean() }).strict() }).strict(),
  z.object({ component: z.literal("field"), props: z.object({ label: nonempty, placeholder: text, helpText: text.optional(), state: z.enum(["default", "error", "success"]) }).strict() }).strict(),
  z.object({ component: z.literal("card"), props: z.object({ eyebrow: text.optional(), title: nonempty, body: nonempty, actionLabel: text.optional() }).strict() }).strict(),
  z.object({ component: z.literal("badge"), props: z.object({ label: nonempty, tone: z.enum(["neutral", "accent", "success", "warning"]) }).strict() }).strict(),
  z.object({ component: z.literal("callout"), props: z.object({ title: nonempty, body: nonempty, tone: z.enum(["info", "warning", "success"]) }).strict() }).strict(),
  z.object({ component: z.literal("navigation"), props: z.object({ items: z.array(nonempty).min(1).max(12), activeIndex: z.number().int().min(0) }).strict() }).strict(),
  z.object({ component: z.literal("editorial"), props: z.object({ eyebrow: text.optional(), title: nonempty, summary: nonempty }).strict() }).strict(),
]);
const specimenBlock = z.object({ ...base, type: z.literal("specimen"), heading: nonempty, component: z.string(), props: z.unknown() }).strict().superRefine((block, ctx) => {
  const parsed = specimens.safeParse({ component: block.component, props: block.props });
  if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue }));
  else if (parsed.data.component === "navigation" && parsed.data.props.activeIndex >= parsed.data.props.items.length) ctx.addIssue({ code: "custom", path: ["props", "activeIndex"], message: "Selecione uma aba existente." });
}).transform((block) => ({ ...block, ...specimens.parse({ component: block.component, props: block.props }) }));
export const blockSchema = z.union([
  z.object({ ...base, type: z.enum(["text", "callout"]), heading: nonempty, body: nonempty }).strict(),
  z.object({ ...base, type: z.literal("image"), source: image }).strict(),
  z.object({ ...base, type: z.literal("diagram"), heading: nonempty, nodes: z.array(z.object({ label: nonempty, detail: nonempty }).strict()).min(1).max(12) }).strict(),
  z.object({ ...base, type: z.literal("section"), heading: nonempty }).strict(),
  z.object({ ...base, type: z.literal("list"), ordered: z.boolean(), items: z.array(nonempty).min(1).max(30) }).strict(),
  z.object({ ...base, type: z.literal("gallery"), items: z.array(image).min(1).max(6) }).strict(),
  z.object({ ...base, type: z.literal("code"), language: nonempty, code: nonempty }).strict(),
  z.object({ ...base, type: z.literal("quote"), body: nonempty, attribution: text.optional() }).strict(),
  z.object({ ...base, type: z.literal("comparison"), heading: nonempty, left: side, right: side, emphasis: z.enum(["left", "right", "balanced"]) }).strict(),
  z.object({ ...base, type: z.literal("steps"), heading: nonempty, items: z.array(z.object({ title: nonempty, body: text.optional() }).strict()).min(2).max(6) }).strict(),
  z.object({ ...base, type: z.literal("checklist"), heading: nonempty, items: z.array(z.object({ label: nonempty, detail: text.optional() }).strict()).min(2).max(8) }).strict(),
  z.object({ ...base, type: z.literal("do_dont"), heading: nonempty, do: z.array(nonempty).min(1).max(12), dont: z.array(nonempty).min(1).max(12) }).strict(),
  z.object({ ...base, type: z.literal("palette"), heading: nonempty, colors: z.array(z.object({ name: nonempty, value: z.string().regex(/^#[0-9a-f]{6}$/i), usage: text.optional() }).strict()).min(2).max(8) }).strict(),
  z.object({ ...base, type: z.literal("typography"), heading: nonempty, samples: z.array(z.object({ role: nonempty, family: nonempty, weight: nonempty, sample: nonempty }).strict()).min(1).max(12) }).strict(),
  specimenBlock,
]);
const promptArtifact = z.object({ type: z.literal("prompt"), template: text, variables: z.array(z.object({ token: nonempty, description: nonempty }).strict()).max(30), exampleInput: text.nullable(), exampleOutput: text.nullable() }).strict();
const designArtifact = z.object({ type: z.literal("design_system"), palette: z.array(z.object({ name: nonempty, value: z.string().regex(/^#[0-9a-f]{6}$/i), role: nonempty }).strict()).max(30), typography: z.array(z.object({ name: nonempty, sample: nonempty, role: nonempty }).strict()).max(30), principles: z.array(nonempty).max(30), components: z.array(z.object({ name: nonempty, description: nonempty }).strict()).max(30) }).strict();
const video = z.object({ youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/), title: nonempty, durationMinutes: z.number().int().positive(), transcript: text.nullable(), captionsReviewed: z.boolean() }).strict();
const common = { title: text, slug: z.string().max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), summary: text, tags: z.array(nonempty).max(30), lessonTemplateIds: z.array(uuidSchema), contentBlocks: z.array(blockSchema).max(100) };
export const conceptDraftSchema = z.object({ ...common, kind: z.literal("concept"), video: video.nullable(), artifact: z.null() }).strict();
export const promptDraftSchema = z.object({ ...common, kind: z.literal("prompt"), video: z.null(), artifact: promptArtifact }).strict();
export const designDraftSchema = z.object({ ...common, kind: z.literal("design_system"), video: z.null(), artifact: designArtifact }).strict();
export const draftSchema = z.discriminatedUnion("kind", [conceptDraftSchema, promptDraftSchema, designDraftSchema]).superRefine((draft, ctx) => {
  const ids = new Set<string>();
  draft.contentBlocks.forEach((block, index) => {
    if (ids.has(block.id)) ctx.addIssue({ code: "custom", path: ["contentBlocks", index, "id"], message: "Cada bloco precisa de um identificador próprio." });
    ids.add(block.id);
  });
});
export const pageQuerySchema = z.object({ cursor: z.string().min(1).max(4096).optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict();
export const listQuerySchema = pageQuerySchema.extend({ kind: kind.optional(), status: status.optional(), curriculum: uuidSchema.optional(), cycle: uuidSchema.optional(), lesson: uuidSchema.optional(), tags: z.preprocess((value) => typeof value === "string" ? value.split(",").filter(Boolean) : value, z.array(nonempty).max(30).optional()), search: z.string().max(200).optional() });
export const createSchema = z.object({ kind, title: z.string().trim().min(1).max(255) }).strict();
export const saveSchema = z.object({ itemId: uuidSchema, expectedDraftUpdatedAt: timestamp.nullable(), draft: draftSchema }).strict();
export const publishSchema = z.object({ itemId: uuidSchema, expectedDraftUpdatedAt: timestamp, expectedItemUpdatedAt: timestamp }).strict();
export const archiveSchema = z.object({ itemId: uuidSchema, expectedItemUpdatedAt: timestamp }).strict();
export const restoreSchema = z.object({ itemId: uuidSchema, revision: z.coerce.number().int().positive(), expectedDraftUpdatedAt: timestamp.nullable() }).strict();
export const uploadSchema = z.object({ ownerKind: z.enum(["concept", "resource"]), ownerId: uuidSchema, filename: z.string().trim().min(1).max(255).refine((value) => !/[\u0000-\u001f]/.test(value)), contentType: mimeSchema, sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024) }).strict();
export const finalizeSchema = z.object({ assetId: uuidSchema, alt: z.string().trim().min(1).max(2000), caption: z.string().trim().max(5000).optional() }).strict();
export const actorSchema = z.object({ tenantId: uuidSchema, userId: uuidSchema, role: z.literal("admin") }).strict();
export type AtlasActor = z.infer<typeof actorSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
export type SaveInput = z.infer<typeof saveSchema>;
export type PublishInput = z.infer<typeof publishSchema>;
export type ArchiveInput = z.infer<typeof archiveSchema>;
export type RestoreInput = z.infer<typeof restoreSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
export type FinalizeInput = z.infer<typeof finalizeSchema>;
export function parseInput<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown, requestId: string): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".") || "input"] ??= []).push(issue.message);
  throw new AppError("VALIDATION_ERROR", "Confira os campos indicados.", requestId, fieldErrors);
}
export function parseOutput<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, output: unknown, requestId: string): T {
  const parsed = schema.safeParse(output);
  if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Resposta editorial inválida.", requestId);
  return parsed.data;
}
export const assetSchema = z.object({ id: uuidSchema, ownerKind: z.enum(["concept", "resource"]), ownerId: uuidSchema, status: z.enum(["pending", "ready", "failed"]), filename: z.string(), contentType: mimeSchema, sizeBytes: z.number().int().min(1).max(5242880), width: z.number().int().positive().nullable(), height: z.number().int().positive().nullable(), alt: z.string().nullable(), caption: z.string().nullable(), createdAt: timestamp, updatedAt: timestamp });
export const assetTargetSchema = assetSchema.extend({ bucket: z.literal("knowledge-assets"), bucketPath: z.string() });
export const listItemSchema = z.object({ id: uuidSchema, kind, title: text, summary: text, status, tags: z.array(text), linkedLessonCount: z.number().int().nonnegative(), hasWorkingDraft: z.boolean(), itemUpdatedAt: timestamp, draftUpdatedAt: timestamp.nullable(), updatedByUserId: uuidSchema.nullable() });
const detailBase = { id: uuidSchema, status, itemUpdatedAt: timestamp, publishedAt: timestamp.nullable(), archivedAt: timestamp.nullable(), hasWorkingDraft: z.boolean(), draftUpdatedAt: timestamp.nullable(), assets: z.array(assetTargetSchema), revisionCount: z.number().int().nonnegative() };
export const detailSchema = z.discriminatedUnion("kind", [
  z.object({ ...detailBase, kind: z.literal("concept"), draft: conceptDraftSchema, published: conceptDraftSchema.nullable() }),
  z.object({ ...detailBase, kind: z.literal("prompt"), draft: promptDraftSchema, published: promptDraftSchema.nullable() }),
  z.object({ ...detailBase, kind: z.literal("design_system"), draft: designDraftSchema, published: designDraftSchema.nullable() }),
]);
export const revisionSchema = z.object({ revision: z.number().int().positive(), reason: z.enum(["save", "publish", "archive", "restore"]), title: text, createdByUserId: uuidSchema, createdAt: timestamp });
export const pageSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export type AssetTarget = z.infer<typeof assetTargetSchema>;
export type RawDetail = z.infer<typeof detailSchema>;
