import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import type { AtlasActor } from "@/src/modules/knowledge-atlas/repository";
import { KnowledgeAtlasRepository } from "@/src/modules/knowledge-atlas/repository";
import { KnowledgeAtlasService } from "@/src/modules/knowledge-atlas/service";

export type AtlasIdentityResolver = (requestId: string) => Promise<AtlasActor>;

/** Injetável em teste (401/403 sem rede) e substituído pela implementação real via `createAtlasControllerDeps`. */
export interface AtlasControllerDeps {
  resolveStudent: AtlasIdentityResolver;
  resolveAdmin: AtlasIdentityResolver;
  service: KnowledgeAtlasService;
}

async function resolveActor(role: "admin" | "student", requestId: string): Promise<AtlasActor> {
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
  const identity = new IdentityService(new IdentityRepository(server));
  const context = role === "admin" ? await identity.requireAdmin(user.id, requestId) : await identity.requireAuthenticated(user.id, requestId);
  return { tenantId: context.tenantId, userId: context.userId };
}

export function createAtlasControllerDeps(): AtlasControllerDeps {
  return {
    resolveStudent: (requestId) => resolveActor("student", requestId),
    resolveAdmin: (requestId) => resolveActor("admin", requestId),
    service: new KnowledgeAtlasService(new KnowledgeAtlasRepository()),
  };
}

function statusFor(code: AppError["code"]): number {
  return ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[code];
}

async function respond<T>(requestId: string, run: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json({ ok: true, data: await run() });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível concluir a operação.");
    return NextResponse.json(toApiResult(appError), { status: statusFor(appError.code) });
  }
}

function query(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function studentConceptsController(request: Request, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveStudent(requestId);
    return deps.service.studentConcepts(actor, query(request), requestId);
  });
}

export async function studentConceptDetailController(request: Request, conceptId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveStudent(requestId);
    return deps.service.studentConceptDetail(actor, conceptId, requestId);
  });
}

export async function studentLibraryController(request: Request, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveStudent(requestId);
    return deps.service.studentLibrary(actor, query(request), requestId);
  });
}

export async function studentLibraryDetailController(request: Request, resourceId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveStudent(requestId);
    return deps.service.studentLibraryDetail(actor, resourceId, requestId);
  });
}

export async function adminAtlasListController(request: Request, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    return deps.service.adminList(actor, query(request), requestId);
  });
}

export async function adminAtlasCreateController(request: Request, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    const body: unknown = await request.json();
    return deps.service.adminCreate(actor, body, requestId);
  });
}

export async function adminAtlasDetailController(request: Request, itemId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    return deps.service.adminDetail(actor, itemId, requestId);
  });
}

export async function adminAtlasUpdateController(request: Request, itemId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    const body: unknown = await request.json();
    const input = isRecord(body) ? { ...body, itemId } : { itemId };
    return deps.service.adminUpdate(actor, input, requestId);
  });
}

export async function adminAtlasPublishController(request: Request, itemId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    const body: unknown = await request.json();
    const input = isRecord(body) ? { ...body, itemId } : { itemId };
    return deps.service.adminPublish(actor, input, requestId);
  });
}

export async function adminAtlasArchiveController(request: Request, itemId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    const body: unknown = await request.json();
    const input = isRecord(body) ? { ...body, itemId } : { itemId };
    return deps.service.adminArchive(actor, input, requestId);
  });
}

export async function adminAtlasUploadUrlController(request: Request, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    const body: unknown = await request.json();
    return deps.service.createUploadUrl(actor, body, requestId);
  });
}

export async function adminAtlasFinalizeController(request: Request, assetId: string, deps: AtlasControllerDeps = createAtlasControllerDeps()): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  return respond(requestId, async () => {
    const actor = await deps.resolveAdmin(requestId);
    return deps.service.finalizeAsset(actor, assetId, requestId);
  });
}
