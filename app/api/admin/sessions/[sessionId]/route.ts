import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const input = await params;
  return adminOperationsController((service, actor, requestId) => service.sessionContext(actor, input, requestId));
}
