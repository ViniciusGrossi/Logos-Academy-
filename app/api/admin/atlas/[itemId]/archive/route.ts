import { adminAtlasArchiveController } from "@/src/modules/knowledge-atlas/controller";

type Context = { params: Promise<{ itemId: string }> };

export async function POST(request: Request, context: Context) {
  const { itemId } = await context.params;
  return adminAtlasArchiveController(request, itemId);
}
