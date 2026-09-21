import { studentLibraryDetailController } from "@/src/modules/knowledge-atlas/controller";

type Context = { params: Promise<{ resourceId: string }> };

export async function GET(request: Request, context: Context) {
  const { resourceId } = await context.params;
  return studentLibraryDetailController(request, resourceId);
}
