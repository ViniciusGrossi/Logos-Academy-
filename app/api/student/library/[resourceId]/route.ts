import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { LibraryResourcePathSchema } from "@/src/modules/admissions/schema";

type Context = { params: Promise<{ resourceId: string }> };

export async function GET(request: Request, context: Context) {
  return validationBoundary(async () => {
    const { resourceId } = LibraryResourcePathSchema.parse(await context.params);
    return admissionsController(request, "student_library_detail", { p_resource_id: resourceId }, true);
  });
}
