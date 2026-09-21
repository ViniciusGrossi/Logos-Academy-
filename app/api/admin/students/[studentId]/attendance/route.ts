import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";

/** SR-A6 (Release 2): aba Frequência da ficha do aluno. */
export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const query = { ...Object.fromEntries(new URL(request.url).searchParams.entries()), studentId };
  return adminOperationsController((service, actor, requestId) => service.studentAttendance(actor, query, requestId));
}
