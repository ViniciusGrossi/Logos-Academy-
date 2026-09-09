import { reviewFeedbackController } from "@/src/modules/review-feedback-loop/controller";

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return reviewFeedbackController(async (service, actor, requestId) => {
    const body: unknown = await request.json();
    const input = typeof body === "object" && body !== null ? { ...(body as Record<string, unknown>), submissionId } : { submissionId };
    return service.publish(actor, input, requestId);
  });
}
