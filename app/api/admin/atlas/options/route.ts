import { atlasController, atlasQuery } from "@/src/modules/atlas-cms/controller";
export async function GET(request: Request) { return atlasController((service, actor, requestId) => service.options(actor, atlasQuery(request), requestId)); }
