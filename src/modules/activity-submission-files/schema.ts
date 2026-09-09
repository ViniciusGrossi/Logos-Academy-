import { z } from "zod";

const UuidSchema = z.string().uuid();
const HttpsUrlSchema = z.string().trim().min(1).max(2_000).superRefine((value, context) => {
  try { if (new URL(value).protocol !== "https:") context.addIssue({ code: z.ZodIssueCode.custom, message: "Use uma URL HTTPS." }); }
  catch { context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL válida." }); }
});
const GithubUrlSchema = HttpsUrlSchema.superRefine((value, context) => {
  try { if (new URL(value).hostname !== "github.com") context.addIssue({ code: z.ZodIssueCode.custom, message: "Use um repositório github.com." }); }
  catch { /* HttpsUrlSchema reports malformed URLs. */ }
});

export const AssignmentPathSchema = z.object({ assignmentId: UuidSchema }).strict();
export const FilePathSchema = z.object({ fileId: UuidSchema }).strict();
export const ProfilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  githubUsername: z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u).nullable().optional(),
}).strict().refine((input) => input.displayName !== undefined || input.githubUsername !== undefined, "Informe ao menos um campo.");

const SubmissionItemSchema = z.discriminatedUnion("kind", [
  z.object({ requirementId: UuidSchema, kind: z.literal("text"), textValue: z.string().trim().min(1).max(10_000) }).strict(),
  z.object({ requirementId: UuidSchema, kind: z.literal("file"), fileId: UuidSchema }).strict(),
  z.object({ requirementId: UuidSchema, kind: z.literal("external_link"), urlValue: HttpsUrlSchema }).strict(),
  z.object({ requirementId: UuidSchema, kind: z.literal("github_repository"), urlValue: GithubUrlSchema }).strict(),
]);

export const DraftInputSchema = z.object({ assignmentId: UuidSchema, items: z.array(SubmissionItemSchema).max(20).refine((items) => new Set(items.map((item) => item.requirementId)).size === items.length, "Requisitos não podem se repetir.") }).strict();
export const SubmitInputSchema = z.object({ assignmentId: UuidSchema, expectedDraftId: UuidSchema }).strict();
export const UploadInputSchema = z.object({ assignmentId: UuidSchema, filename: z.string().trim().min(1).max(255).refine((name) => !/[\\/\u0000]/u.test(name), "Nome de arquivo inválido."), contentType: z.enum(["application/pdf", "text/plain", "text/markdown", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]), sizeBytes: z.number().int().min(1).max(20 * 1024 * 1024) }).strict();

export type DraftInput = z.infer<typeof DraftInputSchema>;
export type ProfilePatchInput = z.infer<typeof ProfilePatchSchema>;
export type UploadInput = z.infer<typeof UploadInputSchema>;
