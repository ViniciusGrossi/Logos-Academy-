import { afterEach, describe, expect, it, vi } from "vitest";
import { asApiError, logOperationError } from "@/src/lib/api-error";

afterEach(() => vi.restoreAllMocks());
describe("minimização de erros inesperados", () => {
  it("permite apenas códigos técnicos conhecidos do provedor", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logOperationError("admissions.rpc", "req-123", "23505");
    logOperationError("admissions.auth", "req-123", "aluno@example.com");
    expect(logger.mock.calls).toEqual([
      [{ operation: "admissions.rpc", requestId: "req-123", code: "23505" }],
      [{ operation: "admissions.auth", requestId: "req-123", code: "UNEXPECTED" }],
    ]);
  });
  it.each([new Error("aluno@example.com token=confidencial"), { email: "aluno@example.com", secret: "confidencial" }])("não registra erro bruto nem stack", (error) => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(asApiError(error, "req-123", "Falha segura")).toMatchObject({ code: "INTERNAL_ERROR", message: "Falha segura" });
    const output = JSON.stringify(logger.mock.calls);
    expect(output).not.toContain("aluno@example.com");
    expect(output).not.toContain("confidencial");
    expect(output).toContain("req-123");
  });
});
