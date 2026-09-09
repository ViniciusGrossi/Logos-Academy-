import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { JourneyQuerySchema } from "@/src/modules/admissions/schema";
export async function GET(request: Request) { return validationBoundary(() => { const v = JourneyQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return admissionsController(request, "student_journey", { p_enrollment_id: v.enrollmentId ?? null }, true); }); }
