import { reviewFeedbackController } from "@/src/modules/review-feedback-loop/controller";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return reviewFeedbackController((service, actor, requestId) => service.page(actor, params, requestId));
}
