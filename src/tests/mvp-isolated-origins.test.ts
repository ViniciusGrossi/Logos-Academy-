// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { academyActivationUrl, academyInvitationUrl, isAcademySupabaseVerificationUrl } from "@/src/lib/public-site";
import { applySecurityHeaders } from "@/src/lib/security-headers";
afterEach(() => vi.unstubAllEnvs());
describe("origens do ensaio isolado", () => {
  it("habilita loopback apenas no CI de desenvolvimento explicitamente ativado", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("CI", "true"); vi.stubEnv("ACADEMY_E2E_LOCAL", "true");
    expect(academyActivationUrl()).toBe("http://localhost:3000/ativar");
    expect(academyInvitationUrl("abc")).toBe("http://localhost:3000/c/abc");
    expect(isAcademySupabaseVerificationUrl("http://127.0.0.1:54321/auth/v1/verify?redirect_to=http://localhost:3000/ativar")).toBe(true);
    const headers = new Headers(); applySecurityHeaders(headers, false);
    expect(headers.get("Content-Security-Policy")).toContain("http://127.0.0.1:54321");
  });
  it("produção ignora a flag e permanece fixa no domínio público", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CI", "true"); vi.stubEnv("ACADEMY_E2E_LOCAL", "true");
    expect(academyActivationUrl()).toBe("https://logos-academy-three.vercel.app/ativar");
    const headers = new Headers(); applySecurityHeaders(headers, true);
    expect(headers.get("Content-Security-Policy")).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(isAcademySupabaseVerificationUrl("http://127.0.0.1:54321/auth/v1/verify?redirect_to=http://localhost:3000/ativar")).toBe(false);
  });
  it("desenvolvimento comum não gera convites locais", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("CI", "false"); vi.stubEnv("ACADEMY_E2E_LOCAL", "true");
    expect(academyActivationUrl()).toBe("https://logos-academy-three.vercel.app/ativar");
  });
});
