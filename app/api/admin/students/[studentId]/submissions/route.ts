import { reviewFeedbackController } from "@/src/modules/review-feedback-loop/controller";

/** SR-A6 (Release 2): aba Entregas da ficha do aluno. */
export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const query = { ...Object.fromEntries(new URL(request.url).searchParams.entries()), studentId };
  return reviewFeedbackController((service, actor, requestId) => service.studentSubmissions(actor, query, requestId));
}
