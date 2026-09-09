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
  return PublicEnvSchema.parse(process.env);
}

export function getAdminSupabaseEnv() {
  return AdminEnvSchema.parse(process.env);
}
