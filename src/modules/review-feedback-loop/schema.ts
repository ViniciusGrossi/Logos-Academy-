import { z } from "zod";

const POSTGRES_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** PostgreSQL accepts UUID-shaped values without enforcing RFC version/variant bits. */
export function isPostgresUuid(value: unknown): value is string {
  return typeof value === "string" && POSTGRES_UUID_PATTERN.test(value);
}

const Uuid = z.string().regex(POSTGRES_UUID_PATTERN, "Identificador UUID inválido.");
const PageLimit = z.coerce.number().int().min(1).max(100).default(25);

export const ReviewQueueQuerySchema = z.object({
  classId: Uuid.optional(),
  overdueOnly: z.enum(["true", "false"]).optional().default("false").transform((value) => value === "true"),
  cursor: z.string().min(1).max(2_000).optional(),
  limit: PageLimit,
}).strict();

export const ReviewOverviewQuerySchema = z.object({
  classId: Uuid,
  activityId: Uuid.optional(),
}).strict();

export const SubmissionPathSchema = z.object({ submissionId: Uuid }).strict();
export const ReviewPathSchema = z.object({ reviewId: Uuid }).strict();

/** SR-A6 (Release 2): entregas do aluno na ficha administrativa. */
export const StudentSubmissionsQuerySchema = z.object({
  studentId: Uuid,
  cursor: z.string().min(1).max(2_000).optional(),
  limit: PageLimit,
}).strict();

const CriterionSchema = z.object({
  criterionId: Uuid,
  result: z.enum(["met", "needs_adjustment"]),
  comment: z.string().trim().min(1).max(4_000).optional(),
}).strict();

export const PublishReviewSchema = z.object({
  submissionId: Uuid,
  decision: z.enum(["approved", "revision_requested"]),
  feedback: z.string().trim().max(10_000),
  criteria: z.array(CriterionSchema).min(1).max(30).refine(
    (criteria) => new Set(criteria.map((criterion) => criterion.criterionId)).size === criteria.length,
    "Cada critério deve aparecer uma única vez.",
  ),
}).strict();

export type ReviewQueueQuery = z.infer<typeof ReviewQueueQuerySchema>;
export type ReviewOverviewQuery = z.infer<typeof ReviewOverviewQuerySchema>;
export type PublishReviewInput = z.infer<typeof PublishReviewSchema>;
export type StudentSubmissionsQuery = z.infer<typeof StudentSubmissionsQuerySchema>;
