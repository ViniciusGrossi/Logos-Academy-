import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { AppError } from "@/src/lib/api-error";
import { mimeSchema } from "./schema";
import type { VerifiedImage } from "./repository";

/** Decode, rather than trusting extension, upload metadata or header alone. */
export async function inspectAtlasImage(bytes: Uint8Array, expected: { contentType: string; sizeBytes: number }, requestId: string): Promise<VerifiedImage> {
  try {
    if (!bytes.length || bytes.length > 5242880 || bytes.length !== expected.sizeBytes) throw new Error("size");
    const detected = await fileTypeFromBuffer(bytes);
    const contentType = mimeSchema.parse(detected?.mime);
    if (contentType !== expected.contentType) throw new Error("mime");
    const decoder = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning", animated: false }).timeout({ seconds: 5 });
    const metadata = await decoder.metadata();
    const formats = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" };
    if (metadata.format !== formats[contentType] || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error("dimensions");
    // metadata() only reads headers: decode all pixels to reject truncated or
    // malformed uploads. The pixel cap bounds memory independently of file size.
    await decoder.raw().toBuffer();
    return { contentType, sizeBytes: bytes.length, width: metadata.width, height: metadata.height };
  } catch {
    throw new AppError("VALIDATION_ERROR", "Envie uma imagem PNG, JPEG ou WebP válida, com o tamanho autorizado.", requestId, { assetId: ["O conteúdo real do arquivo não passou na verificação."] });
  }
}
