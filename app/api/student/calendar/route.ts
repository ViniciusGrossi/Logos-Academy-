import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { CalendarQuerySchema } from "@/src/modules/admissions/schema";
export async function GET(request: Request) { return validationBoundary(async () => { const q = new URL(request.url).searchParams; const value = CalendarQuerySchema.parse(Object.fromEntries(q)); return admissionsController(request, "student_calendar", { p_enrollment_id: value.enrollmentId, p_from: value.from ?? null, p_to: value.to ?? null }, true); }); }
