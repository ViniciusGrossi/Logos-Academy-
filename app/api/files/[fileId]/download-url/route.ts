import { activityController } from "@/src/modules/activity-submission-files/controller";
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) { const { fileId } = await params; return activityController(request, (service, actor, requestId) => service.download(actor, fileId, requestId)); }
