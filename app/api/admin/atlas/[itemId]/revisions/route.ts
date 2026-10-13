import { atlasController, atlasQuery } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) { return atlasController(async (service, actor, requestId) => service.revisions(actor, (await context.params).itemId, atlasQuery(request), requestId)); }
