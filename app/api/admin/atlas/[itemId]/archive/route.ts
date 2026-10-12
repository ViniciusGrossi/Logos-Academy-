import { atlasBody, atlasController } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) { return atlasController(async (service, actor, requestId) => service.archive(actor, { ...await atlasBody(request, requestId), itemId: (await context.params).itemId }, requestId)); }
