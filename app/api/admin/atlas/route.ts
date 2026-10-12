import { atlasBody, atlasController, atlasQuery } from "@/src/modules/atlas-cms/controller";
export const runtime = "nodejs";
export async function GET(request: Request) { return atlasController((service, actor, requestId) => service.list(actor, atlasQuery(request), requestId)); }
export async function POST(request: Request) { return atlasController(async (service, actor, requestId) => service.create(actor, await atlasBody(request, requestId), requestId)); }
