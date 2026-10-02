export const ACADEMY_PUBLIC_ORIGIN = "https://logos-academy-three.vercel.app";

export function academyActivationUrl(): string {
  return `${ACADEMY_PUBLIC_ORIGIN}/ativar`;
}

export function academyInvitationUrl(code: string): string {
  return `${ACADEMY_PUBLIC_ORIGIN}/c/${code}`;
}

export function isAcademySupabaseVerificationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === "https://nqubjiosnlaatxxamiut.supabase.co"
      && url.pathname === "/auth/v1/verify"
      && url.searchParams.get("redirect_to") === academyActivationUrl();
  } catch {
    return false;
  }
}
