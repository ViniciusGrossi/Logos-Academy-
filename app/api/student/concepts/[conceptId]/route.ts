import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { PathIdSchema } from "@/src/modules/admissions/schema";
type Context = { params: Promise<{ conceptId: string }> };
export async function GET(request: Request, context: Context) { return validationBoundary(async () => { const id = PathIdSchema.parse({ id: (await context.params).conceptId }).id; return admissionsController(request, "student_concept_detail", { p_concept_id: id }, true); }); }
