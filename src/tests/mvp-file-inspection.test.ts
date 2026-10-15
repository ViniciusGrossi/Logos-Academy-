// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { inspectSubmissionFile } from "@/src/modules/activity-submission-files/inspection";
import { ActivitySubmissionFilesService } from "@/src/modules/activity-submission-files/service";
import type { ActivitySubmissionFilesStore } from "@/src/modules/activity-submission-files/repository";
const encode = (text: string) => new TextEncoder().encode(text);
describe("conteúdo real de anexos", () => {
  it("não finaliza o upload quando os bytes falham na inspeção", async () => {
    const bytes = encode("MZ executable");
    const store = { uploadInspection: vi.fn().mockResolvedValue({ state: "pending", bytes, contentType: "application/pdf", sizeBytes: bytes.length, storagePath: "unused" }), finalize: vi.fn() };
    const service = new ActivitySubmissionFilesService(store as unknown as ActivitySubmissionFilesStore);
    const actor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "10000000-0000-4000-8000-000000000002", email: "test@example.test", role: "student" as const };
    await expect(service.finalize(actor, "10000000-0000-4000-8000-000000000003", "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(store.finalize).not.toHaveBeenCalled();
  });
  it("rejeita executável declarado como PDF", async () => {
    const bytes = encode("MZ executable pretending to be PDF");
    await expect(inspectSubmissionFile(bytes, { contentType: "application/pdf", sizeBytes: bytes.length }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejeita conteúdo binário e JSON inválido declarados texto", async () => {
    for (const [bytes, contentType] of [[new Uint8Array([0xff, 0, 0xfe]), "text/plain"], [encode("{invalid}"), "application/json"]] as const) {
      await expect(inspectSubmissionFile(bytes, { contentType, sizeBytes: bytes.length }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("aceita texto UTF-8 de atividade e imagem decodificável", async () => {
    const text = encode("# Minha decisão\nInterface com intenção.");
    await expect(inspectSubmissionFile(text, { contentType: "text/markdown", sizeBytes: text.length }, "req")).resolves.toBeUndefined();
    const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: "orange" } }).png().toBuffer();
    await expect(inspectSubmissionFile(image, { contentType: "image/png", sizeBytes: image.length }, "req")).resolves.toBeUndefined();
    await expect(inspectSubmissionFile(image, { contentType: "image/jpeg", sizeBytes: image.length }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejeita tamanho diferente ou acima do limite antes de analisar", async () => {
    await expect(inspectSubmissionFile(encode("abc"), { contentType: "text/plain", sizeBytes: 5 }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
