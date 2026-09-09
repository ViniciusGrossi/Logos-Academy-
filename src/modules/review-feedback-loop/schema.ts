import { z } from "zod";

const Uuid = z.string().uuid();
const PageLimit = z.coerce.number().int().min(1).max(100).default(25);

export const ReviewQueueQuerySchema = z.object({
  classId: Uuid.optional(),
  overdueOnly: z.enum(["true", "false"]).optional().default("false").transform((value) => value === "true"),
  cursor: z.string().min(1).max(2_000).optional(),
  limit: PageLimit,
}).strict();

export const SubmissionPathSchema = z.object({ submissionId: Uuid }).strict();
export const ReviewPathSchema = z.object({ reviewId: Uuid }).strict();

const CriterionSchema = z.object({
  criterionId: Uuid,
  result: z.enum(["met", "needs_adjustment"]),
  comment: z.string().trim().min(1).max(4_000).optional(),
}).strict();

export const PublishReviewSchema = z.object({
  submissionId: Uuid,
  decision: z.enum(["approved", "revision_requested"]),
  feedback: z.string().trim().min(1).max(10_000),
  criteria: z.array(CriterionSchema).min(1).max(30).refine(
    (criteria) => new Set(criteria.map((criterion) => criterion.criterionId)).size === criteria.length,
    "Cada critério deve aparecer uma única vez.",
  ),
}).strict();

export type ReviewQueueQuery = z.infer<typeof ReviewQueueQuerySchema>;
export type PublishReviewInput = z.infer<typeof PublishReviewSchema>;
