import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { AppError } from "@/src/lib/api-error";

const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/html", "text/css", "text/javascript", "application/json"]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const OFFICE_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** Bounded format validation, not an antivirus or authorization substitute. */
export async function inspectSubmissionFile(bytes: Uint8Array, expected: { contentType: string; sizeBytes: number }, requestId: string): Promise<void> {
  try {
    if (!bytes.length || bytes.length > 20 * 1024 * 1024 || bytes.length !== expected.sizeBytes) throw new Error("size");
    if (TEXT_TYPES.has(expected.contentType)) {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) throw new Error("binary");
      if (expected.contentType === "application/json") JSON.parse(text);
      return;
    }
    const detected = await fileTypeFromBuffer(bytes);
    if (detected?.mime !== expected.contentType) throw new Error("mime");
    if (IMAGE_TYPES.has(expected.contentType)) {
      const decoder = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning", animated: false }).timeout({ seconds: 5 });
      const metadata = await decoder.metadata();
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error("image");
      await decoder.raw().toBuffer();
      return;
    }
    if (expected.contentType === "application/pdf") {
      // Header detection alone accepts truncated PDFs; require the terminal marker too.
      if (!new TextDecoder("latin1").decode(bytes.slice(-1024)).includes("%%EOF")) throw new Error("pdf");
      return;
    }
    if (!OFFICE_TYPES.has(expected.contentType)) throw new Error("unsupported");
  } catch {
    throw new AppError("VALIDATION_ERROR", "O conteúdo do arquivo não corresponde ao formato e tamanho autorizados.", requestId, { fileId: ["Envie um arquivo válido, sem apenas alterar sua extensão."] });
  }
}
