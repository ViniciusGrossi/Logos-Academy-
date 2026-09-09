import { NextResponse } from "next/server";

import { AdmissionsAdminAdapter } from "@/src/lib/supabase/admissions-admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { ActivationService } from "@/src/modules/admissions/service";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { safeInternalPath } from "@/src/lib/safe-internal-path";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const safeNext = safeInternalPath(requestedNext, url.origin);
  const destination = new URL(safeNext, url.origin);
  if (!code) return NextResponse.redirect(destination);

  const client = await createSupabaseServerClient();
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error || !exchanged.data.user) return NextResponse.redirect(destination);

  try {
    const requestId = crypto.randomUUID();
    const identity = await new IdentityService(new IdentityRepository(client)).requireAuthenticated(exchanged.data.user.id, requestId);
    await new ActivationService(new AdmissionsAdminAdapter()).activate(identity.tenantId, exchanged.data.user.id, requestId);
  } catch {
    return NextResponse.redirect(destination);
  }
  return NextResponse.redirect(destination);
}
