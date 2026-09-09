import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
import { StudentAttendanceQuerySchema } from "@/src/modules/admissions/schema";

export async function GET(request: Request) {
  return validationBoundary(async () => {
    const value = StudentAttendanceQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return admissionsController(request, "student_attendance_page", { p_enrollment_id: value.enrollmentId ?? null, p_cursor: value.cursor ?? null, p_limit: value.limit }, true);
  });
}
