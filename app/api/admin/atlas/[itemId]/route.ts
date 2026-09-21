import { adminAtlasDetailController, adminAtlasUpdateController } from "@/src/modules/knowledge-atlas/controller";

type Context = { params: Promise<{ itemId: string }> };

export async function GET(request: Request, context: Context) {
  const { itemId } = await context.params;
  return adminAtlasDetailController(request, itemId);
}

export async function PATCH(request: Request, context: Context) {
  const { itemId } = await context.params;
  return adminAtlasUpdateController(request, itemId);
}
