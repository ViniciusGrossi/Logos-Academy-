// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { StudentAtlasAssetsRepository } from "@/src/modules/atlas-cms/student-assets.repository";
vi.mock("server-only", () => ({}));

const tenantId = "10000000-0000-4000-8000-000000000001";
const ownerId = "20000000-0000-4000-8000-000000000001";
const assetId = "30000000-0000-4000-8000-000000000001";
const path = `${tenantId}/concept/${ownerId}/${assetId}`;
const released = { id: ownerId, title: "Referência", contentBlocks: [{ id: assetId, type: "image", isVisible: true, source: { kind: "asset", assetId, alt: "Interface" } }] };
const row = { id: assetId, bucket: "knowledge-assets", bucket_path: path, alt: "Interface", caption: null, width: 600, height: 400, content_type: "image/png" };
function fixture(rows: unknown[] = [row]) {
  const calls: { url: URL; body: Record<string, unknown> | null }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    calls.push({ url, body });
    const result = url.pathname.startsWith("/rest/v1/") ? rows : [{ path, signedURL: "/object/sign/knowledge-assets/image?token=test-only" }];
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  };
  const client = createClient("https://example.supabase.co", "test-only-placeholder", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { repository: new StudentAtlasAssetsRepository(client), calls };
}
describe("published Atlas private assets", () => {
  it("filtra tenant, proprietário, status e exclusão antes de assinar por cinco minutos", async () => {
    const { repository, calls } = fixture();
    const result = await repository.resolve(tenantId, released, ownerId, "concept", "req");
    const query = calls[0].url.searchParams;
    expect(query.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(query.get("concept_id")).toBe(`eq.${ownerId}`);
    expect(query.get("status")).toBe("eq.ready");
    expect(query.get("deleted_at")).toBe("is.null");
    expect(query.get("id")).toBe(`in.(${assetId})`);
    expect(calls[1].body).toMatchObject({ expiresIn: 300, paths: [path] });
    expect(result.resolvedAssets).toEqual([expect.objectContaining({ id: assetId, readUrl: expect.stringContaining("/object/sign/") })]);
    expect(JSON.stringify(result)).not.toContain("bucket_path");
  });
  it("recusa identidade de conteúdo divergente sem consultar storage", async () => {
    const { repository, calls } = fixture();
    await expect(repository.resolve(tenantId, { ...released, id: assetId }, ownerId, "concept", "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(calls).toHaveLength(0);
  });
  it("recusa caminho de outro tenant antes de gerar URL assinada", async () => {
    const { repository, calls } = fixture([{ ...row, bucket_path: `outro-tenant/concept/${ownerId}/${assetId}` }]);
    await expect(repository.resolve(tenantId, released, ownerId, "concept", "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(calls).toHaveLength(1);
  });
  it("não assina blocos ocultos e deixa fallback para asset removido", async () => {
    const hidden = fixture();
    expect((await hidden.repository.resolve(tenantId, { ...released, contentBlocks: released.contentBlocks.map((block) => ({ ...block, isVisible: false })) }, ownerId, "concept", "req")).resolvedAssets).toEqual([]);
    expect(hidden.calls).toHaveLength(0);
    const missing = fixture([]);
    expect((await missing.repository.resolve(tenantId, released, ownerId, "concept", "req")).resolvedAssets).toEqual([]);
    expect(missing.calls).toHaveLength(1);
  });
});
