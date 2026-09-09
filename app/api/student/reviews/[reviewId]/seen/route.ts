import { PathIdSchema } from "@/src/modules/admissions/schema";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { admissionsController, validationBoundary } from "@/src/modules/admissions/controller";
type Context = { params: Promise<{ reviewId: string }> };
export async function POST(request: Request, context: Context) {
  return validationBoundary(async () => {
    const id = PathIdSchema.parse({ id: (await context.params).reviewId }).id;
    return admissionsController(request, "mark_review_seen", { p_review_id: id, p_encryption_key: getAdminSupabaseEnv().PII_ENCRYPTION_KEY }, true);
  });
}
