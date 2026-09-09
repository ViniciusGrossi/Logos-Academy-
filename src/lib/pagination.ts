import { z } from "zod";

import { AppError } from "@/src/lib/api-error";

const CursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export const PageQuerySchema = z.object({
  cursor: z
    .string()
    .min(1)
    .refine(isValidCursor, "Informe um cursor válido.")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Cursor = z.infer<typeof CursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(CursorSchema.parse(cursor))).toString("base64url");
}

export function decodeCursor(cursor: string, requestId = crypto.randomUUID()): Cursor {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    return CursorSchema.parse(JSON.parse(decoded));
  } catch {
    throw new AppError("VALIDATION_ERROR", "Cursor inválido.", requestId, {
      cursor: ["Informe um cursor válido."],
    });
  }
}

function isValidCursor(cursor: string): boolean {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    return CursorSchema.safeParse(JSON.parse(decoded)).success;
  } catch {
    return false;
  }
}
