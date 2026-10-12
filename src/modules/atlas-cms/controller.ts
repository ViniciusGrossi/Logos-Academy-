import { NextResponse } from "next/server";
import { AppError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { AtlasCmsRepository } from "./repository";
import { AtlasCmsService } from "./service";
import type { AtlasActor } from "./schema";

export async function atlasController<T>(operation: (service: AtlasCmsService, actor: AtlasActor, requestId: string) => Promise<T>): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const context = await new IdentityService(new IdentityRepository(server)).requireAdmin(user.id, requestId);
    const actor: AtlasActor = { tenantId: context.tenantId, userId: context.userId, role: "admin" };
    return NextResponse.json({ ok: true, data: await operation(new AtlasCmsService(new AtlasCmsRepository()), actor, requestId) });
  } catch (error: unknown) {
    // Never log raw RPC payloads, upload URLs, editorial text or credentials.
    const failure = error instanceof AppError ? error : error instanceof SyntaxError ? new AppError("VALIDATION_ERROR", "JSON inválido.", requestId) : new AppError("INTERNAL_ERROR", "Não foi possível concluir a operação editorial.", requestId);
    const status = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 }[failure.code];
    return NextResponse.json(toApiResult(failure), { status });
  }
}
export function atlasQuery(request: Request) {
  const search = new URL(request.url).searchParams;
  const values: Record<string, string | string[]> = Object.fromEntries(search.entries());
  if (search.has("tags")) values.tags = search.getAll("tags").flatMap((tag) => tag.split(",")).filter(Boolean);
  return values;
}
/** Read JSON after authentication and bound memory independently of client headers. */
export async function atlasBody(request: Request, requestId: string): Promise<Record<string, unknown>> {
  if (!request.body) throw new AppError("VALIDATION_ERROR", "JSON obrigatório.", requestId);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1024 * 1024) throw new AppError("VALIDATION_ERROR", "O conteúdo excede o limite editorial.", requestId);
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new AppError("VALIDATION_ERROR", "Envie um objeto JSON.", requestId);
  return body as Record<string, unknown>;
}
