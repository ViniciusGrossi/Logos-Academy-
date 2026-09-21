import { reviewFeedbackController } from "@/src/modules/review-feedback-loop/controller";

/** SR-A5 (Release 2): workspace único de revisão. */
export async function GET(_request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return reviewFeedbackController((service, actor, requestId) => service.workspace(actor, submissionId, requestId));
}
