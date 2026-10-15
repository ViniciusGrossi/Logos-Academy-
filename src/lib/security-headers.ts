import { ACADEMY_SUPABASE_ORIGIN, academySupabaseOrigin, isIsolatedAcademyTest } from "@/src/lib/public-site";

export function applySecurityHeaders(headers: Headers, production: boolean): void {
  const isolated = !production && isIsolatedAcademyTest();
  const provider = isolated ? academySupabaseOrigin() : ACADEMY_SUPABASE_ORIGIN;
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    `form-action 'self' ${provider}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src https://www.youtube-nocookie.com",
    `img-src 'self' data: blob: ${provider} https://i.ytimg.com`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isolated ? " http://127.0.0.1:54321 ws://127.0.0.1:54321" : ""}`,
  ].join("; "));
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (production) headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}
