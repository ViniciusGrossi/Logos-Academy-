const DEMO_COOKIE = "logos_academy_demo";
const DEMO_EMAIL = "DEMO_LOGIN_EMAIL";
const DEMO_PASSWORD = "DEMO_LOGIN_PASSWORD";
const HANDSHAKE_EMAIL = "demo@logos.test";
const HANDSHAKE_PASSWORD = "senha-de-teste";
const STUDENT_HANDSHAKE_EMAIL = "aluno@logos.test";
const STUDENT_HANDSHAKE_PASSWORD = "aluno-demo-2026";
const DEMO_ROLE_STORAGE = "logos_academy_demo_role";

export type DemoRole = "admin" | "student";

export const demoCookieName = DEMO_COOKIE;

export function demoRoleForCredentials(email: string, password: string): DemoRole | null {
  if (!isDemoMode()) return null;
  if (email === process.env[DEMO_EMAIL] && password === process.env[DEMO_PASSWORD]) return "admin";
  if (email === HANDSHAKE_EMAIL && password === HANDSHAKE_PASSWORD) return "admin";
  if (email === STUDENT_HANDSHAKE_EMAIL && password === STUDENT_HANDSHAKE_PASSWORD) return "student";
  return null;
}

export function setDemoRole(role: DemoRole): void {
  if (typeof window !== "undefined") window.localStorage.setItem(DEMO_ROLE_STORAGE, role);
}

export function getDemoRole(): DemoRole {
  if (typeof window === "undefined") return "admin";
  return window.localStorage.getItem(DEMO_ROLE_STORAGE) === "student" ? "student" : "admin";
}

export function clearDemoRole(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_ROLE_STORAGE);
}

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true" && Boolean(process.env[DEMO_EMAIL] && process.env[DEMO_PASSWORD]);
}

export function hasValidDemoCredentials(email: string, password: string): boolean {
  return demoRoleForCredentials(email, password) !== null;
}

async function signature(role: DemoRole): Promise<string> {
  const secret = new TextEncoder().encode(process.env[DEMO_PASSWORD]);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${DEMO_COOKIE}:${role}`)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createDemoSession(role: DemoRole): Promise<string> {
  if (!isDemoMode()) throw new Error("Modo de demonstração indisponível.");
  return `${role}.${await signature(role)}`;
}

export async function hasDemoSession(value: string | undefined): Promise<boolean> {
  if (!isDemoMode() || !value) return false;
  const [role, token] = value.split(".");
  return (role === "admin" || role === "student") && token === await signature(role);
}
