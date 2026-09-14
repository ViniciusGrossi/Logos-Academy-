import { z } from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const AdminEnvSchema = PublicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  PII_ENCRYPTION_KEY: z.string().min(1),
});

export function getPublicSupabaseEnv() {
  // Client bundles only expose statically referenced NEXT_PUBLIC variables.
  // Parsing the dynamic process.env object works on the server but appears empty
  // in the browser, producing a misleading Zod configuration error at login.
  return PublicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getAdminSupabaseEnv() {
  return AdminEnvSchema.parse(process.env);
}
