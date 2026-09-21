import { adminOperationsController } from "@/src/modules/admin-operations-completion/controller";
import { CurriculaQuerySchema } from "@/src/modules/admin-operations-completion/schema";
import { AppError } from "@/src/lib/api-error";

/** SR-A3 (Release 2): currículos ativos para convite, turma e matrícula. */
export async function GET(request: Request) {
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  return adminOperationsController(async (service, actor, requestId) => {
    if (!CurriculaQuerySchema.safeParse(query).success) {
      throw new AppError("VALIDATION_ERROR", "Esta rota não aceita parâmetros.", requestId);
    }
    return service.activeCurricula(actor, requestId);
  });
}
