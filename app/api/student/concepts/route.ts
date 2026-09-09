import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { ConceptsQuerySchema } from "@/src/modules/admissions/schema";
export async function GET(request: Request) { return validationBoundary(() => { const v = ConceptsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return admissionsController(request, "student_concepts_page", { p_search: v.search ?? null, p_cursor: v.cursor ?? null, p_limit: v.limit }, true); }); }
