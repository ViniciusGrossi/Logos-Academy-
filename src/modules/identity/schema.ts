import { z } from "zod";

export const AuthUserIdSchema = z.string().uuid();

export const IdentityContextSchema = z.object({
  authUserId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "student"]),
});

const AuditMetadataKeySchema = z.enum([
  "assignment_id",
  "decision",
  "entries",
  "makeup_id",
  "paused_enrollment_ids",
  "submission_id",
  "target_count",
  "version",
]);

const SafeMetadataValueSchema = z.union([
  z.string().uuid(),
  z.number().int().nonnegative(),
  z.boolean(),
  z.null(),
  z.enum(["approved", "changes_requested"]),
  z.array(z.string().uuid()).max(100),
]);

export const AuditEventInputSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  action: z.string().trim().min(1).max(120),
  entityType: z.string().trim().min(1).max(120),
  entityId: z.string().uuid().nullable(),
  requestId: z.string().uuid(),
  metadata: z.record(AuditMetadataKeySchema, SafeMetadataValueSchema),
});

export type IdentityContext = z.infer<typeof IdentityContextSchema>;
export type AuditEventInput = z.infer<typeof AuditEventInputSchema>;
