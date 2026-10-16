export const ACADEMY_PUBLIC_ORIGIN = "https://logos-academy-three.vercel.app";
export const ACADEMY_SUPABASE_ORIGIN = "https://nqubjiosnlaatxxamiut.supabase.co";

/** No arbitrary redirect overrides: loopback is reserved for the isolated CI. */
export function isIsolatedAcademyTest(): boolean {
  return process.env.NODE_ENV === "development" && process.env.CI === "true" && process.env.ACADEMY_E2E_LOCAL === "true";
}

export function academySupabaseOrigin(): string {
  return isIsolatedAcademyTest() ? "http://127.0.0.1:54321" : ACADEMY_SUPABASE_ORIGIN;
}

export function academyActivationUrl(): string {
  return `${isIsolatedAcademyTest() ? "http://localhost:3000" : ACADEMY_PUBLIC_ORIGIN}/ativar`;
}

export function academyInvitationUrl(code: string): string {
  return `${isIsolatedAcademyTest() ? "http://localhost:3000" : ACADEMY_PUBLIC_ORIGIN}/c/${code}`;
}

export function isAcademyInvitationPath(pathname: string): boolean {
  return /^\/c\/[A-Za-z0-9_-]{22}$/u.test(pathname);
}

export function isAcademySupabaseVerificationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === academySupabaseOrigin()
      && url.pathname === "/auth/v1/verify"
      && url.searchParams.get("redirect_to") === academyActivationUrl();
  } catch {
    return false;
  }
}
