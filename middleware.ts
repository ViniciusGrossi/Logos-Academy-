import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { applySecurityHeaders } from "@/src/lib/security-headers";
import { demoCookieName, hasDemoSession } from "@/src/lib/demo-mode";

const publicPages = new Set(["/login", "/ativar", "/recuperar-senha"]);

function finish(response: NextResponse): NextResponse {
  applySecurityHeaders(response.headers, process.env.NODE_ENV === "production");
  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (process.env.NODE_ENV === "development" && request.nextUrl.searchParams.get("preview") === "phase8") return finish(response);
  const isPublic = publicPages.has(request.nextUrl.pathname);
  const demoSession = await hasDemoSession(request.cookies.get(demoCookieName)?.value);
  if (demoSession) {
    if (request.nextUrl.pathname === "/login") {
      const destination = request.nextUrl.clone();
      destination.pathname = "/";
      destination.search = "";
      return finish(NextResponse.redirect(destination));
    }
    return finish(response);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (isPublic) return finish(response);
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return finish(NextResponse.redirect(login));
  }
  const client = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await client.auth.getUser();
  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return finish(NextResponse.redirect(login));
  }
  if (user && request.nextUrl.pathname === "/login") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/";
    destination.search = "";
    return finish(NextResponse.redirect(destination));
  }
  return finish(response);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
