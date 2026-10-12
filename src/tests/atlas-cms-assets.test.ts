// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inspectAtlasImage } from "@/src/modules/atlas-cms/image";

describe("atlas-cms verified upload", () => {
  it("deriva MIME e dimensões de uma imagem decodificada", async () => {
    const bytes = await sharp({ create: { width: 12, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await expect(inspectAtlasImage(bytes, { contentType: "image/png", sizeBytes: bytes.length }, "req")).resolves.toEqual({ contentType: "image/png", sizeBytes: bytes.length, width: 12, height: 8 });
  });
  it("recusa declaração falsa de MIME/tamanho e arquivo não decodificável", async () => {
    const bytes = await sharp({ create: { width: 12, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await expect(inspectAtlasImage(bytes, { contentType: "image/jpeg", sizeBytes: bytes.length }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(inspectAtlasImage(bytes, { contentType: "image/png", sizeBytes: bytes.length + 1 }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(inspectAtlasImage(bytes.subarray(0, 32), { contentType: "image/png", sizeBytes: 32 }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("recusa bombas de descompressão antes de alocar imagem inteira", async () => {
    const bytes = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(inspectAtlasImage(bytes, { contentType: "image/png", sizeBytes: bytes.length }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
