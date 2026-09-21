import { adminAtlasFinalizeController } from "@/src/modules/knowledge-atlas/controller";

type Context = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: Context) {
  const { assetId } = await context.params;
  return adminAtlasFinalizeController(request, assetId);
}
