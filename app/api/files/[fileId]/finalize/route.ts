import { activityController } from "@/src/modules/activity-submission-files/controller";
export async function POST(request: Request, { params }: { params: Promise<{ fileId: string }> }) { const { fileId } = await params; return activityController(request, (service, actor, requestId) => service.finalize(actor, fileId, requestId)); }
