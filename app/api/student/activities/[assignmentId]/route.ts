import { activityController } from "@/src/modules/activity-submission-files/controller";
export async function GET(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) { const { assignmentId } = await params; return activityController(request, (service, actor, requestId) => service.detail(actor, assignmentId, requestId)); }
