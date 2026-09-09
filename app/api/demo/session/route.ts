import { NextResponse } from "next/server";
import { z } from "zod";

import { createDemoSession, demoCookieName, hasValidDemoCredentials, isDemoMode } from "@/src/lib/demo-mode";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) }).strict();

export async function POST(request: Request) {
  if (!isDemoMode()) return new NextResponse(null, { status: 404 });

  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !hasValidDemoCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(demoCookieName, await createDemoSession(), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: false,
  });
  return response;
}

export function DELETE() {
  if (!isDemoMode()) return new NextResponse(null, { status: 404 });

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(demoCookieName, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: false });
  return response;
}
