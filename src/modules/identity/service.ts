import { AppError } from "@/src/lib/api-error";
import { AuthUserIdSchema, type IdentityContext } from "@/src/modules/identity/schema";
import { IdentityRepository } from "@/src/modules/identity/repository";

export class IdentityService {
  constructor(private readonly repository: IdentityRepository) {}

  async requireAuthenticated(authUserId: string, requestId = crypto.randomUUID()): Promise<IdentityContext> {
    const parsedAuthUserId = AuthUserIdSchema.safeParse(authUserId);
    if (!parsedAuthUserId.success) {
      throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    }

    const context = await this.repository.findContext(parsedAuthUserId.data, requestId);
    if (!context) {
      throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    }
    return context;
  }

  async requireAdmin(authUserId: string, requestId = crypto.randomUUID()): Promise<IdentityContext> {
    const context = await this.requireAuthenticated(authUserId, requestId);
    if (context.role !== "admin") {
      throw new AppError("FORBIDDEN", "Acesso administrativo obrigatório.", requestId);
    }
    return context;
  }

  assertTenantAccess(context: Pick<IdentityContext, "tenantId">, resourceTenantId: string, requestId = crypto.randomUUID()): void {
    if (context.tenantId !== resourceTenantId) {
      throw new AppError("FORBIDDEN", "Recurso não disponível.", requestId);
    }
  }
}
