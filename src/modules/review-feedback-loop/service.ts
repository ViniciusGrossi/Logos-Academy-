import type { Page, ReviewDetail, ReviewQueueSubmission } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { PublishReviewSchema, ReviewQueueQuerySchema } from "@/src/modules/review-feedback-loop/schema";
import type { AdminActor, ReviewFeedbackStore } from "@/src/modules/review-feedback-loop/repository";

export class ReviewFeedbackService {
  constructor(private readonly repository: ReviewFeedbackStore) {}

  async page(actor: AdminActor, query: unknown, requestId: string): Promise<Page<ReviewQueueSubmission>> {
    return this.repository.page(actor, parse(ReviewQueueQuerySchema, query, requestId), requestId);
  }

  async publish(actor: AdminActor, input: unknown, requestId: string): Promise<ReviewDetail> {
    return this.repository.publish(actor, parse(PublishReviewSchema, input, requestId), requestId);
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown, requestId: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados de revisão inválidos.", requestId);
  return parsed.data;
}
