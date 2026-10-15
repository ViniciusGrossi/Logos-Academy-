// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivitySubmissionFilesRepository, type PendingUploadInspection } from "@/src/modules/activity-submission-files/repository";
const state = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), signed: vi.fn(), row: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/env", () => ({ getAdminSupabaseEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "test-only", PII_ENCRYPTION_KEY: "test-key" }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  schema: () => ({ rpc: state.rpc, from: () => { const query = { select: () => query, eq: () => query, in: () => query, is: () => query, maybeSingle: async () => ({ data: state.row, error: null }) }; return query; } }),
  storage: { from: () => ({ upload: state.upload, remove: state.remove, createSignedUrl: state.signed }) },
}) }));
const actor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "10000000-0000-4000-8000-000000000002", email: "student@example.test", role: "student" as const };
const fileId = "10000000-0000-4000-8000-000000000003";
const profileId = "10000000-0000-4000-8000-000000000004";
const assignmentId = "10000000-0000-4000-8000-000000000005";
const base = `${actor.tenantId}/${profileId}/${assignmentId}/${fileId}`;
const verified: PendingUploadInspection = { state: "pending", bytes: new TextEncoder().encode("original"), contentType: "text/plain", sizeBytes: 8, storagePath: base };
const file = { id: fileId, assignmentId, filename: "evidencia.txt", contentType: "text/plain", sizeBytes: 8, status: "ready" };
const repository = () => new ActivitySubmissionFilesRepository({} as SupabaseClient);
beforeEach(() => { vi.clearAllMocks(); state.upload.mockResolvedValue({ error: null }); state.remove.mockResolvedValue({ error: null }); state.rpc.mockResolvedValue({ data: file, error: null }); });
afterEach(() => vi.unstubAllGlobals());
describe("snapshot de upload no repository", () => {
  it("envia a chave server-side exigida pela RPC de download administrativo", async () => {
    const metadata = { storagePath: `${base}/verified/10000000-0000-4000-8000-000000000006`, filename: "evidencia.txt", contentType: "text/plain" };
    state.rpc.mockImplementation(async (_name: string, input: Record<string, unknown>) => input.p_encryption_key === "test-key"
      ? { data: metadata, error: null }
      : { data: null, error: { code: "PGRST202" } });
    await expect(repository().adminFileMetadata(actor, fileId, "req")).resolves.toEqual(metadata);
    expect(state.rpc).toHaveBeenCalledWith("admin_file_download_target", {
      p_tenant_id: actor.tenantId, p_actor_user_id: actor.userId, p_file_id: fileId, p_encryption_key: "test-key",
    });
  });
  it("grava os bytes inspecionados em caminho novo sem permitir overwrite", async () => {
    await expect(repository().finalize(actor, fileId, "req", verified)).resolves.toEqual(file);
    const [path, bytes, options] = state.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${base}/verified/[a-f0-9-]+$`));
    expect(bytes).toBe(verified.bytes);
    expect(options).toEqual({ contentType: "text/plain", upsert: false });
    expect(state.rpc).toHaveBeenCalledWith("student_finalize_verified_upload", expect.objectContaining({ p_verified_storage_path: path, p_file_id: fileId, p_tenant_id: actor.tenantId }));
  });
  it("retry de ready não baixa nem cria outra cópia", async () => {
    const path = `${base}/verified/10000000-0000-4000-8000-000000000006`;
    state.row = { storage_path: path, student_profile_id: profileId, activity_assignment_id: assignmentId, content_type: "text/plain", size_bytes: 8, status: "ready" };
    state.rpc.mockResolvedValue({ data: { file, storagePath: path }, error: null });
    expect(await repository().uploadInspection(actor, fileId, "req")).toEqual({ state: "ready", file });
    expect(state.upload).not.toHaveBeenCalled(); expect(state.signed).not.toHaveBeenCalled();
  });
  it("remove somente o snapshot novo quando SQL rejeita a operação", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(repository().finalize(actor, fileId, "req", verified)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.remove).toHaveBeenCalledWith([state.upload.mock.calls[0][0]]);
  });
  it("não remove snapshot em falha de rede cujo commit pode ter ocorrido", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    await expect(repository().finalize(actor, fileId, "req", verified)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("uma corrida de finalização recupera o arquivo já publicado", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockResolvedValueOnce({ data: { file, storagePath: `${base}/verified/10000000-0000-4000-8000-000000000006` }, error: null });
    expect(await repository().finalize(actor, fileId, "req", verified)).toEqual(file);
    expect(state.remove).toHaveBeenCalledWith([state.upload.mock.calls[0][0]]);
  });
});
