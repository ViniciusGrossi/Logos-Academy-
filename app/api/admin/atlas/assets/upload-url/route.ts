import { atlasBody, atlasController } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function POST(request: Request) { return atlasController(async (service, actor, requestId) => service.authorize(actor, await atlasBody(request, requestId), requestId)); }
