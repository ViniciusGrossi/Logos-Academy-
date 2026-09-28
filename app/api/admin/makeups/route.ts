import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";

/** SR-A2 (Release 2): fila de reposições pendentes. */
export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  return adminOperationsController((service, actor, requestId) => service.pendingMakeups(actor, query, requestId));
}
