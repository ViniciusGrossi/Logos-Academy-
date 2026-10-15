import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";
import { PATCH as updateAdmission } from "@/app/api/admin/[...path]/route";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const input = await params;
  return adminOperationsController((service, actor, requestId) => service.sessionContext(actor, input, requestId));
}

/** The explicit GET route also owns PATCH: preserve the validated existing operation. */
export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return updateAdmission(request, { params: Promise.resolve({ path: ["sessions", sessionId] }) });
}
