import type { AdminSubmissionWorkspace, Page, ReviewDetail, ReviewQueueSubmission } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { PublishReviewSchema, ReviewQueueQuerySchema, StudentSubmissionsQuerySchema, SubmissionPathSchema } from "@/src/modules/review-feedback-loop/schema";
import type { AdminActor, ReviewFeedbackStore } from "@/src/modules/review-feedback-loop/repository";

export class ReviewFeedbackService {
  constructor(private readonly repository: ReviewFeedbackStore) {}

  async page(actor: AdminActor, query: unknown, requestId: string): Promise<Page<ReviewQueueSubmission>> {
    return this.repository.page(actor, parse(ReviewQueueQuerySchema, query, requestId), requestId);
  }

  async publish(actor: AdminActor, input: unknown, requestId: string): Promise<ReviewDetail> {
    const parsed = parse(PublishReviewSchema, input, requestId);
    const needsAdjustment = parsed.criteria.some((criterion) => criterion.result === "needs_adjustment");
    if ((parsed.decision === "approved" && needsAdjustment) || (parsed.decision === "revision_requested" && !needsAdjustment)) {
      throw new AppError("VALIDATION_ERROR", "A decisão deve corresponder aos resultados da rubrica.", requestId, { decision: ["Use revisão solicitada quando houver ajuste; aprove somente quando todos os critérios forem atendidos."] });
    }
    return this.repository.publish(actor, parsed, requestId);
  }

  /** SR-A5 */
  async workspace(actor: AdminActor, submissionId: unknown, requestId: string): Promise<AdminSubmissionWorkspace> {
    const parsed = parse(SubmissionPathSchema, { submissionId }, requestId);
    return this.repository.workspace(actor, parsed.submissionId, requestId);
  }

  /** SR-A6 */
  async studentSubmissions(actor: AdminActor, query: unknown, requestId: string): Promise<Page<ReviewQueueSubmission>> {
    return this.repository.studentSubmissions(actor, parse(StudentSubmissionsQuerySchema, query, requestId), requestId);
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown, requestId: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados de revisão inválidos.", requestId);
  return parsed.data;
}
