// @vitest-environment node
import { AuthSessionMissingError, createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atlasBody, atlasController, atlasQuery } from "@/src/modules/atlas-cms/controller";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock("@/src/lib/supabase/server", () => ({ createSupabaseServerClient: async () => state.client }));
const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  state.client = createClient("https://example.supabase.co", "test-only-placeholder", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => new Response(JSON.stringify(String(input).includes("tenant_memberships") ? { role: "student" } : { id, tenant_id: id, auth_user_id: id, access_enabled: true }), { status: 200, headers: { "Content-Type": "application/json" } }) },
  });
});
describe("atlas-cms HTTP boundaries", () => {
  it("retorna 401 sem sessão e não cria o client privilegiado", async () => {
    if (!state.client) throw new Error("fixture");
    vi.spyOn(state.client.auth, "getUser").mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
    const operation = vi.fn();
    const response = await atlasController(operation);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(operation).not.toHaveBeenCalled();
  });
  it("retorna 403 para aluno autenticado sem executar operação", async () => {
    if (!state.client) throw new Error("fixture");
    vi.spyOn(state.client.auth, "getUser").mockResolvedValue({ data: { user: { id, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-11T12:00:00Z" } }, error: null });
    const operation = vi.fn();
    expect((await atlasController(operation)).status).toBe(403);
    expect(operation).not.toHaveBeenCalled();
  });
  it("limita corpo por bytes reais, rejeita objetos malformados e mantém tags repetidas", async () => {
    await expect(atlasBody(new Request("https://example.com", { method: "POST", body: JSON.stringify({ value: "x".repeat(1048577) }) }), "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(atlasBody(new Request("https://example.com", { method: "POST", body: "[]" }), "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(atlasQuery(new Request("https://example.com?tags=a,b&tags=c&limit=10"))).toEqual({ tags: ["a", "b", "c"], limit: "10" });
  });
});
