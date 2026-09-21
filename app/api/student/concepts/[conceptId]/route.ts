import { studentConceptDetailController } from "@/src/modules/knowledge-atlas/controller";

type Context = { params: Promise<{ conceptId: string }> };

export async function GET(request: Request, context: Context) {
  const { conceptId } = await context.params;
  return studentConceptDetailController(request, conceptId);
}
