import { z } from "zod";

const ActivationSessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  type: z.enum(["invite", "recovery"]),
});

export function activationSessionFromHash(hash: string): { access_token: string; refresh_token: string } | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const parsed = ActivationSessionSchema.safeParse({
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  });
  return parsed.success
    ? { access_token: parsed.data.access_token, refresh_token: parsed.data.refresh_token }
    : null;
}
