import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";

export async function GET(_request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const input = await params;
  return adminOperationsController((service, actor, requestId) => service.enrollmentCalendar(actor, input, requestId));
}
