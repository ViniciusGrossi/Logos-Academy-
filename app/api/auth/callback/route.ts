import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
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

  return NextResponse.redirect(destination);
}
