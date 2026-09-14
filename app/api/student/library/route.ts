import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { LibraryQuerySchema } from "@/src/modules/admissions/schema";

export async function GET(request: Request) {
  return validationBoundary(() => {
    const query = LibraryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return admissionsController(request, "student_library_page", {
      p_kind: query.kind,
      p_search: query.search ?? null,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, true);
  });
}
