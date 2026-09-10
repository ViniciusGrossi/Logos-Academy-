const DEMO_COOKIE = "logos_academy_demo";
const DEMO_EMAIL = "DEMO_LOGIN_EMAIL";
const DEMO_PASSWORD = "DEMO_LOGIN_PASSWORD";
const HANDSHAKE_EMAIL = "demo@logos.test";
const HANDSHAKE_PASSWORD = "senha-de-teste";

export const demoCookieName = DEMO_COOKIE;

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true" && Boolean(process.env[DEMO_EMAIL] && process.env[DEMO_PASSWORD]);
}

export function hasValidDemoCredentials(email: string, password: string): boolean {
  if (!isDemoMode()) return false;
  const configured = email === process.env[DEMO_EMAIL] && password === process.env[DEMO_PASSWORD];
  const handshake = process.env.NODE_ENV !== "production" && email === HANDSHAKE_EMAIL && password === HANDSHAKE_PASSWORD;
  return configured || handshake;
}

async function signature(): Promise<string> {
  const secret = new TextEncoder().encode(process.env[DEMO_PASSWORD]);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(DEMO_COOKIE)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createDemoSession(): Promise<string> {
  if (!isDemoMode()) throw new Error("Modo de demonstração indisponível.");
  return signature();
}

export async function hasDemoSession(value: string | undefined): Promise<boolean> {
  return isDemoMode() && value === await signature();
}
