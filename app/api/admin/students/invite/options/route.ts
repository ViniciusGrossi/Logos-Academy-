import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";

export async function GET(): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  try {
    const server = await createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId);
    const identity = await new IdentityService(new IdentityRepository(server)).requireAdmin(user.id, requestId);

    const env = getAdminSupabaseEnv();
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      db: { schema: "logos_academy" },
    });
    const [curriculaResult, classesResult, enrollmentsResult] = await Promise.all([
      admin.from("curricula").select("id, name, version").eq("tenant_id", identity.tenantId).eq("status", "active").is("deleted_at", null).order("name"),
      admin.from("classes").select("id, name, curriculum_id, starts_on, status").eq("tenant_id", identity.tenantId).in("status", ["planned", "active"]).is("deleted_at", null).order("starts_on"),
      admin.from("enrollments").select("class_id").eq("tenant_id", identity.tenantId).in("status", ["invited", "active", "paused"]).is("deleted_at", null).not("class_id", "is", null),
    ]);
    if (curriculaResult.error || classesResult.error || enrollmentsResult.error) {
      throw new AppError("INTERNAL_ERROR", "Não foi possível preparar o convite.", requestId);
    }

    const counts = new Map<string, number>();
    for (const enrollment of enrollmentsResult.data ?? []) {
      if (typeof enrollment.class_id === "string") counts.set(enrollment.class_id, (counts.get(enrollment.class_id) ?? 0) + 1);
    }
    const curricula = (curriculaResult.data ?? []).map((curriculum) => ({ id: curriculum.id, name: curriculum.name, version: curriculum.version }));
    const curriculumNames = new Map(curricula.map((curriculum) => [curriculum.id, curriculum.name]));
    const classes = (classesResult.data ?? []).map((classroom) => ({
      id: classroom.id,
      name: classroom.name,
      curriculumId: classroom.curriculum_id,
      curriculumName: curriculumNames.get(classroom.curriculum_id) ?? "Formação",
      startsOn: classroom.starts_on,
      status: classroom.status,
      occupiedSeats: counts.get(classroom.id) ?? 0,
      capacity: 6,
    }));
    return NextResponse.json({ ok: true, data: { curricula, classes } });
  } catch (error: unknown) {
    const appError = asApiError(error, requestId, "Não foi possível preparar o convite.");
    const status = ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 })[appError.code];
    return NextResponse.json(toApiResult(appError), { status });
  }
}
