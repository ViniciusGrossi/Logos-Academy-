import { atlasBody, atlasController } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
type Context = { params: Promise<{ itemId: string }> };
export async function GET(_request: Request, context: Context) { return atlasController(async (service, actor, requestId) => service.detail(actor, (await context.params).itemId, requestId)); }
export async function PATCH(request: Request, context: Context) { return atlasController(async (service, actor, requestId) => service.save(actor, { ...await atlasBody(request, requestId), itemId: (await context.params).itemId }, requestId)); }
