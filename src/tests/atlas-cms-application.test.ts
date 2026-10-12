// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { AdminAtlasConceptDraft, AdminAtlasDetail } from "@/specs/api.contracts";
import { AtlasCmsRepository } from "@/src/modules/atlas-cms/repository";
import { AtlasCmsService, publicationErrors } from "@/src/modules/atlas-cms/service";
import type { AtlasActor } from "@/src/modules/atlas-cms/schema";
vi.mock("server-only", () => ({}));

const tenantId = "10000000-0000-4000-8000-000000000001";
const itemId = "20000000-0000-4000-8000-000000000001";
const assetId = "30000000-0000-4000-8000-000000000001";
const actor: AtlasActor = { tenantId, userId: "40000000-0000-4000-8000-000000000001", role: "admin" };
const time = "2026-10-11T12:00:00+00:00";
const draft: AdminAtlasConceptDraft = { kind: "concept", title: "Conceito", slug: "conceito", summary: "Explicação", tags: [], lessonTemplateIds: [itemId], video: null, artifact: null, contentBlocks: [
  { id: itemId, isVisible: true, type: "text", heading: "Tema", body: "Explicação" },
  { id: assetId, isVisible: true, type: "comparison", heading: "Compare", left: { title: "A", body: "A" }, right: { title: "B", body: "B" }, emphasis: "right" },
] };
const detail: AdminAtlasDetail = { id: itemId, kind: "concept", status: "published", itemUpdatedAt: time, publishedAt: time, archivedAt: null, hasWorkingDraft: true, draftUpdatedAt: time, draft, published: draft, assets: [], resolvedAssets: [], revisionCount: 2 };
type Call = { name: string; body: Record<string, unknown> };
function fixture(reply: (call: Call) => unknown = () => detail) {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); const name = url.split("/").at(-1) ?? "";
    const body: Record<string, unknown> = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    const call = { name, body }; calls.push(call);
    if (body.p_tenant_id && body.p_tenant_id !== tenantId) return new Response(JSON.stringify({ code: "42501", message: "not available" }), { status: 403 });
    const result = reply(call);
    return new Response(JSON.stringify(result), { status: result !== null && typeof result === "object" && "code" in result ? 400 : 200, headers: { "Content-Type": "application/json" } });
  };
  const client = createClient("https://example.supabase.co", "test-only-placeholder", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { service: new AtlasCmsService(new AtlasCmsRepository(client)), calls };
}

describe("atlas-cms application through real repository", () => {
  it("cria os três tipos como rascunho e preserva payload incompleto no save", async () => {
    const { service, calls } = fixture();
    for (const kind of ["concept", "prompt", "design_system"] as const) await service.create(actor, { kind, title: "Título" }, "req");
    expect(calls.map((call) => (call.body.p_payload as { kind: string }).kind)).toEqual(["concept", "prompt", "design_system"]);
    await service.save(actor, { itemId, expectedDraftUpdatedAt: time, draft: { ...draft, summary: "", lessonTemplateIds: [], contentBlocks: [] } }, "req");
    expect(calls.at(-1)?.body).toMatchObject({ p_tenant_id: tenantId, p_actor_user_id: actor.userId, p_item_id: itemId, p_expected_draft_updated_at: time, p_payload: { summary: "", contentBlocks: [] } });
  });
  it("publica conteúdo validado usando os dois relógios e deixa a transação no banco", async () => {
    const { service, calls } = fixture();
    await service.publish(actor, { itemId, expectedDraftUpdatedAt: time, expectedItemUpdatedAt: time }, "req");
    expect(calls.at(-1)?.name).toBe("admin_atlas_publish");
    expect(calls.at(-1)?.body).toMatchObject({ p_expected_item_updated_at: time, p_expected_draft_updated_at: time });
  });
  it("bloqueia publicação incompleta, vídeo sem transcrição e texto com mojibake com caminho de campo", async () => {
    const incomplete = { ...detail, draft: { ...draft, summary: "saÃ­das provÃ¡veis", contentBlocks: [], video: { youtubeId: "dQw4w9WgXcQ", title: "Tema", durationMinutes: 3, transcript: null, captionsReviewed: false } } };
    const { service, calls } = fixture(() => incomplete);
    await expect(service.publish(actor, { itemId, expectedDraftUpdatedAt: time, expectedItemUpdatedAt: time }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { summary: expect.any(Array), "video.transcript": expect.any(Array), "video.captionsReviewed": expect.any(Array), contentBlocks: expect.any(Array) } });
    expect(calls.some((call) => call.name === "admin_atlas_publish")).toBe(false);
  });
  it("rejeita versão desatualizada no service e na resposta concorrente do banco", async () => {
    const local = fixture();
    await expect(local.service.publish(actor, { itemId, expectedDraftUpdatedAt: "2026-10-10T12:00:00Z", expectedItemUpdatedAt: time }, "req")).rejects.toMatchObject({ code: "CONFLICT" });
    const remote = fixture(() => ({ code: "40001", message: "ATLAS_CONFLICT:draftUpdatedAt:STALE" }));
    await expect(remote.service.save(actor, { itemId, expectedDraftUpdatedAt: time, draft }, "req")).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { draftUpdatedAt: ["STALE"] } });
  });
  it("arquiva/restaura via RPCs autorizadas e pagina lista e histórico", async () => {
    const { service, calls } = fixture((call) => call.name === "admin_atlas_list" || call.name === "admin_atlas_revisions" ? { items: [], nextCursor: "opaque-next" } : detail);
    await service.archive(actor, { itemId, expectedItemUpdatedAt: time }, "req");
    await service.restore(actor, { itemId, revision: 1, expectedDraftUpdatedAt: null }, "req");
    expect(await service.list(actor, { kind: "concept", limit: "10", tags: ["teste"], cursor: "opaque" }, "req")).toEqual({ items: [], nextCursor: "opaque-next" });
    await service.revisions(actor, itemId, { limit: "5" }, "req");
    expect(calls.map((call) => call.name)).toEqual(["admin_atlas_archive", "admin_atlas_restore", "admin_atlas_list", "admin_atlas_revisions"]);
    expect(calls[2]?.body).toMatchObject({ p_limit: 10, p_cursor: "opaque", p_tags: ["teste"] });
  });
  it("tenant B não acessa os ids A e ator não-admin nunca chega ao banco", async () => {
    const { service, calls } = fixture();
    const other = { ...actor, tenantId: assetId };
    await expect(service.detail(other, itemId, "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.save(other, { itemId, expectedDraftUpdatedAt: time, draft }, "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.archive(other, { itemId, expectedItemUpdatedAt: time }, "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.restore(other, { itemId, revision: 1, expectedDraftUpdatedAt: null }, "req")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const before = calls.length;
    expect(() => service.list({ ...actor, role: "student" } as unknown as AtlasActor, {}, "req")).toThrow("Acesso administrativo obrigatório.");
    expect(calls).toHaveLength(before);
  });
  it("recusa DTO inesperado e não retorna conteúdo bruto do RPC", async () => {
    const { service } = fixture(() => ({ id: itemId, secret: "must-not-return" }));
    await expect(service.detail(actor, itemId, "req")).rejects.toMatchObject({ code: "INTERNAL_ERROR", message: "Resposta editorial inválida." });
  });
  it("retry de asset pronto retorna estado verificado sem download ou nova finalização", async () => {
    const ready = { id: assetId, ownerKind: "concept", ownerId: itemId, status: "ready", filename: "a.png", contentType: "image/png", sizeBytes: 100, width: 12, height: 8, alt: "Alt persistido", caption: null, createdAt: time, updatedAt: time, bucket: "knowledge-assets", bucketPath: `${tenantId}/concept/${itemId}/${assetId}` };
    const { service, calls } = fixture((call) => call.name.startsWith("knowledge_assets?") ? { id: assetId, concept_id: itemId, resource_id: null } : { ...detail, assets: [ready] });
    const result = await service.finalize(actor, { assetId, alt: "Novo alt não sobrescreve" }, "req");
    expect(result).toMatchObject({ status: "ready", alt: "Alt persistido", width: 12, height: 8 });
    expect(result).not.toHaveProperty("bucketPath");
    expect(calls).toHaveLength(2);
    expect(calls.some((call) => call.name === "admin_atlas_asset_finalize")).toBe(false);
  });
  it("não aceita dimensões/backend/path enviados pelo cliente", async () => {
    const { service, calls } = fixture();
    await expect(service.finalize(actor, { assetId, alt: "Ilustração", width: 12, height: 8 }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.authorize(actor, { ownerKind: "concept", ownerId: itemId, filename: "a.png", contentType: "image/png", sizeBytes: 12, bucketPath: "forged" }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls).toHaveLength(0);
  });
  it("exige exemplo completo de prompt e visual extra quando não há variáveis", () => {
    const prompt: AdminAtlasDetail = { ...detail, kind: "prompt", draft: { ...draft, kind: "prompt", video: null, contentBlocks: [], artifact: { type: "prompt", template: "Teste", variables: [], exampleInput: null, exampleOutput: null } }, published: null };
    expect(publicationErrors(prompt)).toMatchObject({ "artifact.exampleInput": expect.any(Array), "artifact.exampleOutput": expect.any(Array), contentBlocks: expect.any(Array) });
  });
  it("finaliza pelo conteúdo real e marca arquivo divergente failed", async () => {
    const bytes = await sharp({ create: { width: 12, height: 8, channels: 3, background: "#fff" } }).png().toBuffer();
    const path = `${tenantId}/concept/${itemId}/${assetId}`;
    const asset = { id: assetId, ownerKind: "concept", ownerId: itemId, status: "pending", filename: "a.png", contentType: "image/png", sizeBytes: bytes.length, width: null, height: null, alt: null, caption: null, createdAt: time, updatedAt: time, bucket: "knowledge-assets", bucketPath: path };
    const setup = fixture((call) => {
      if (call.name.startsWith("knowledge_assets?")) return { id: assetId, concept_id: itemId, resource_id: null };
      if (call.name === "admin_atlas_detail") return { ...detail, assets: [asset] };
      if (call.name === "admin_atlas_asset_finalize") {
        if (call.body.p_backend_derived_width === null) { asset.status = "failed"; return { id: assetId, status: "failed" }; }
        return { ...asset, status: "ready", width: 12, height: 8, alt: "Imagem" };
      }
      if (call.name === assetId) return { signedURL: "/object/sign/knowledge-assets/test?token=test" };
      return detail;
    });
    const actualFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async () => new Response(bytes));
    try {
      await expect(setup.service.finalize(actor, { assetId, alt: "Imagem" }, "req")).resolves.toMatchObject({ status: "ready", width: 12, height: 8 });
      vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1, 2, 3])));
      await expect(setup.service.finalize(actor, { assetId, alt: "Imagem" }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect(asset.status).toBe("failed");
    } finally { vi.stubGlobal("fetch", actualFetch); }
  });
});
