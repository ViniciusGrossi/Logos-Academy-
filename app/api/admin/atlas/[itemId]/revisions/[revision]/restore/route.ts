import { atlasBody, atlasController } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ itemId: string; revision: string }> }) { return atlasController(async (service, actor, requestId) => service.restore(actor, { ...await atlasBody(request, requestId), ...await context.params }, requestId)); }
