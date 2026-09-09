import { NextResponse, type NextRequest } from "next/server";

const publicPages = new Set(["/login", "/ativar", "/recuperar-senha"]);
const demoCookieName = "logos_academy_demo";

function applySecurityHeaders(headers: Headers, production: boolean): void {
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ].join("; "));
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (production) headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

async function hasDemoSession(value: string | undefined): Promise<boolean> {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return false;
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!password) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(demoCookieName)));
  const signature = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return value === signature;
}

function readAccessToken(request: NextRequest, supabaseUrl: string): string | null {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const session = request.cookies.getAll()
    .filter(({ name }) => name === cookieName || name.startsWith(`${cookieName}.`))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map(({ value }) => value)
    .join("");
  if (!session) return null;
  try {
    const encoded = session.startsWith("base64-") ? session.slice("base64-".length) : session;
    const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { access_token?: unknown };
    return typeof parsed.access_token === "string" ? parsed.access_token : null;
  } catch {
    return null;
  }
}

async function hasAuthenticatedUser(request: NextRequest, url: string, key: string): Promise<boolean> {
  const accessToken = readAccessToken(request, url);
  if (!accessToken) return false;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${accessToken}` },
  });
  return response.ok;
}

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
  const authenticated = await hasAuthenticatedUser(request, url, key);
  if (!authenticated && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return finish(NextResponse.redirect(login));
  }
  if (authenticated && request.nextUrl.pathname === "/login") {
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
