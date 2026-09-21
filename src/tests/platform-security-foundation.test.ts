import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { decodeCursor, encodeCursor, PageQuerySchema } from "@/src/lib/pagination";
import { applySecurityHeaders } from "@/src/lib/security-headers";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { AuditEventInputSchema } from "@/src/modules/identity/schema";
import { IdentityService } from "@/src/modules/identity/service";
import { securityFixture } from "@/src/tests/fixtures/security";

const { authUserA, tenantA, tenantB, userA } = securityFixture;

describe("platform-security", () => {
  it("rejeita cursor inválido como VALIDATION_ERROR", () => {
    expect(() => PageQuerySchema.parse({ cursor: "nao-e-um-cursor" })).toThrow();

    try {
      decodeCursor("nao-e-um-cursor");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("classifica JSON inválido como erro de validação", () => {
    expect(asApiError(new SyntaxError("invalid JSON"), "request-id", "falhou")).toMatchObject({
      code: "VALIDATION_ERROR",
      requestId: "request-id",
    });
  });

  it("aplica cabeçalhos de segurança sem quebrar o ambiente local", () => {
    const developmentHeaders = new Headers();
    applySecurityHeaders(developmentHeaders, false);
    expect(developmentHeaders.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(developmentHeaders.get("Content-Security-Policy")).toContain("frame-src https://www.youtube-nocookie.com");
    expect(developmentHeaders.get("X-Frame-Options")).toBe("DENY");
    expect(developmentHeaders.get("Strict-Transport-Security")).toBeNull();

    const productionHeaders = new Headers();
    applySecurityHeaders(productionHeaders, true);
    expect(productionHeaders.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("preserva cursor estável para paginação sem repetir registros", () => {
    const cursor = encodeCursor({ createdAt: "2026-09-05T12:00:00.000Z", id: userA });
    expect(decodeCursor(cursor)).toEqual({ createdAt: "2026-09-05T12:00:00.000Z", id: userA });
    expect(PageQuerySchema.parse({ limit: 50 })).toEqual({ limit: 50 });
  });

  it("retorna UNAUTHENTICATED sem payload de domínio quando não há contexto", async () => {
    const repository = new IdentityRepository();
    vi.spyOn(repository, "findContext").mockResolvedValue(null);
    const service = new IdentityService(repository);

    await expect(service.requireAuthenticated(authUserA)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });

    const result = toApiResult(new AppError("UNAUTHENTICATED", "Sessão obrigatória.", "request-id"));
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Sessão obrigatória.", requestId: "request-id" },
    });
  });

  it("nega uma conta cujo acesso foi revogado", async () => {
    const repository = new IdentityRepository();
    vi.spyOn(repository, "findContext").mockResolvedValue(null);

    await expect(new IdentityService(repository).requireAuthenticated(authUserA)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });

    const source = readFileSync(path.resolve("src/modules/identity/repository.ts"), "utf8");
    expect(source).toContain("access_enabled");
    expect(source).toContain("!row.access_enabled");
  });

  it("impede aluno autenticado de executar operação administrativa", async () => {
    const repository = new IdentityRepository();
    vi.spyOn(repository, "findContext").mockResolvedValue({
      authUserId: authUserA,
      tenantId: tenantA,
      userId: userA,
      role: "student",
    });
    const service = new IdentityService(repository);

    await expect(service.requireAdmin(authUserA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede acesso cruzado entre tenants mesmo com UUID válido", () => {
    const service = new IdentityService(new IdentityRepository());

    try {
      service.assertTenantAccess({ tenantId: tenantA }, tenantB);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("rejeita PII na auditoria e conserva apenas metadados técnicos", () => {
    expect(() =>
      AuditEventInputSchema.parse({
        tenantId: tenantA,
        actorUserId: userA,
        action: "student.invited",
        entityType: "student",
        entityId: userA,
        requestId: "55555555-5555-4555-8555-555555555555",
        metadata: { email: "aluno@example.com" },
      }),
    ).toThrow();

    expect(
      AuditEventInputSchema.parse({
        tenantId: tenantA,
        actorUserId: userA,
        action: "submission.submitted",
        entityType: "submission",
        entityId: userA,
        requestId: "55555555-5555-4555-8555-555555555555",
        metadata: { assignment_id: userA, version: 1 },
      }).metadata,
    ).toEqual({ assignment_id: userA, version: 1 });
  });

  it("expõe somente o adapter de auditoria server-only, sem cliente privilegiado bruto", () => {
    const source = readFileSync(path.resolve("src/lib/supabase/admin.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain("SUPABASE_SECRET_KEY");
    expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
    expect(source).toContain("writeAuditEvent");
    expect(source).not.toContain("createSupabaseAdminClient");

    const repositorySource = readFileSync(path.resolve("src/modules/identity/audit.repository.ts"), "utf8");
    expect(repositorySource).toContain("writeAuditEvent(event)");
    expect(repositorySource).not.toContain('.from("audit_events").insert');
  });
});
