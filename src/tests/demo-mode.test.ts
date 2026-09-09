import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoSession, hasDemoSession, hasValidDemoCredentials, isDemoMode } from "@/src/lib/demo-mode";

afterEach(() => vi.unstubAllEnvs());

describe("modo de demonstração", () => {
  it("aceita somente a credencial do ambiente e emite sessão verificável fora de produção", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_LOGIN_EMAIL", "demo@logos.test");
    vi.stubEnv("DEMO_LOGIN_PASSWORD", "senha-de-teste");

    expect(isDemoMode()).toBe(true);
    expect(hasValidDemoCredentials("demo@logos.test", "senha-de-teste")).toBe(true);
    expect(hasValidDemoCredentials("demo@logos.test", "outra")).toBe(false);
    expect(await hasDemoSession(await createDemoSession())).toBe(true);
  });

  it("nunca habilita o modo em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_LOGIN_EMAIL", "demo@logos.test");
    vi.stubEnv("DEMO_LOGIN_PASSWORD", "senha-de-teste");
    expect(isDemoMode()).toBe(false);
  });

  it("exige opt-in explícito", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEMO_LOGIN_EMAIL", "demo@logos.test");
    vi.stubEnv("DEMO_LOGIN_PASSWORD", "senha-de-teste");
    expect(isDemoMode()).toBe(false);
  });
});
