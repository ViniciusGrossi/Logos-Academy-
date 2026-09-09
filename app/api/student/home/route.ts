import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";

export async function GET(request: Request) {
  return validationBoundary(() => admissionsController(request, "student_home", { p_encryption_key: getAdminSupabaseEnv().PII_ENCRYPTION_KEY }, true));
}
