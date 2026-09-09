import { activityController } from "@/src/modules/activity-submission-files/controller";
export async function POST(request: Request) { return activityController(request, (service, actor, requestId) => request.json().then((body: unknown) => service.createUpload(actor, body, requestId))); }
