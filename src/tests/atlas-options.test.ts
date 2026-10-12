// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AtlasCmsRepository } from "@/src/modules/atlas-cms/repository";
vi.mock("server-only", () => ({}));
const id = "10000000-0000-4000-8000-000000000001";
const actor = { tenantId: id, userId: id, role: "admin" as const };
function fixture(authorized = true) {
  const calls: { url: URL; method: string }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, method: init?.method ?? "GET" });
    if (url.pathname.includes("/rpc/")) return new Response(JSON.stringify(authorized ? { items: [], nextCursor: null } : { code: "42501", message: "forbidden" }), { status: authorized ? 200 : 403, headers: { "Content-Type": "application/json" } });
    if (init?.method === "HEAD") return new Response(null, { headers: { "Content-Range": "0-0/3" } });
    return new Response(JSON.stringify([1, 2, 3].map((position) => ({ id, title: `Aula ${position}`, position, cycles: { id, title: "Assistente pessoal", position: 1, curriculum_id: id, curricula: { status: "active" } } }))), { headers: { "Content-Type": "application/json" } });
  };
  const client = createClient("https://example.supabase.co", "test-only-placeholder", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { repository: new AtlasCmsRepository(client), calls };
}
describe("Atlas editorial options", () => {
  it("revalida admin antes de listar aulas ativas e calcula totais globais paginados", async () => {
    const { repository, calls } = fixture();
    const result = await repository.options(actor, { limit: 2 }, "req");
    expect(calls[0].url.pathname).toContain("/rpc/admin_atlas_list");
    expect(calls[1].url.searchParams.get("tenant_id")).toBe(`eq.${id}`);
    expect(calls[1].url.searchParams.get("cycles.curricula.status")).toBe("eq.active");
    expect(result.lessons.items).toHaveLength(2);
    expect(result.lessons.nextCursor).toBe("2");
    expect(result.counts).toEqual({ draft: 6, published: 6, archived: 6, concept: 9, prompt: 3, design_system: 3 });
    expect(calls.filter((call) => call.method === "HEAD")).toHaveLength(8);
  });
  it("não consulta tabelas privilegiadas quando a autorização do banco falha", async () => {
    const { repository, calls } = fixture(false);
    await expect(repository.options(actor, { limit: 2 }, "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(calls).toHaveLength(1);
  });
  it("rejeita cursor negativo antes de ler conteúdo", async () => {
    const { repository, calls } = fixture();
    await expect(repository.options(actor, { limit: 2, cursor: "-1" }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls).toHaveLength(1);
  });
});
