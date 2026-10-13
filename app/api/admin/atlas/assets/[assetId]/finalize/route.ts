import { atlasBody, atlasController } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ assetId: string }> }) { return atlasController(async (service, actor, requestId) => service.finalize(actor, { ...await atlasBody(request, requestId), assetId: (await context.params).assetId }, requestId)); }
