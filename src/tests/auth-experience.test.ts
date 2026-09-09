import { describe, expect, it } from "vitest";
import { authErrorMessage, passwordScore } from "@/components/auth/auth-experience";
import { safeInternalPath } from "@/src/lib/safe-internal-path";

describe("experiência de autenticação", () => {
  it("classifica a senha por comprimento e variedade", () => {
    expect(passwordScore("curta")).toBe(0);
    expect(passwordScore("oitoLetras")).toBe(1);
    expect(passwordScore("dozeLetras12")).toBe(3);
    expect(passwordScore("dozeLetras12!")).toBe(4);
  });

  it("aceita apenas retornos internos após a autenticação", () => {
    const origin = "https://academy.logos.tech";
    expect(safeInternalPath("/agenda?tab=frequencia#registro", origin)).toBe("/agenda?tab=frequencia#registro");
    expect(safeInternalPath("//evil.example", origin)).toBe("/");
    expect(safeInternalPath("/\\evil.example", origin)).toBe("/");
    expect(safeInternalPath("https://evil.example", origin)).toBe("/");
  });

  it("não expõe a validação interna da configuração ao usuário", () => {
    const error = new Error("NEXT_PUBLIC_SUPABASE_URL: Required");
    error.name = "ZodError";
    expect(authErrorMessage(error)).toBe("A plataforma ainda não está configurada. Tente novamente em alguns instantes.");
  });
});
