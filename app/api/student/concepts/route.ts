import { studentConceptsController } from "@/src/modules/knowledge-atlas/controller";

export async function GET(request: Request) {
  return studentConceptsController(request);
}
