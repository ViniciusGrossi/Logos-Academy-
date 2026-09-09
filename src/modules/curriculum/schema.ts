import { z } from "zod";

const UuidSchema = z.string().uuid();

export const CurriculumImportInputSchema = z.object({
  tenantId: UuidSchema,
  document: z.string().min(1),
});

export const ExecutionOverridesSchema = z.object({
  dueAt: z.string().datetime().optional(),
  supplementalInstructions: z.string().trim().min(1).max(4_000).optional(),
}).strict();

export const CanonicalMutationSchema = z.object({
  objective: z.string().optional(),
  criteria: z.array(z.object({ label: z.string() })).optional(),
}).strict();

export type CurriculumImportInput = z.infer<typeof CurriculumImportInputSchema>;
export type ExecutionOverrides = z.infer<typeof ExecutionOverridesSchema>;
