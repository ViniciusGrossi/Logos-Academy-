import { z } from "zod";

const uuid = z.string().uuid();
export const EnrollmentQuerySchema = z.object({ enrollmentId: uuid.optional() }).strict();
export const ProjectPathSchema = z.object({ projectId: uuid }).strict();
export const EnrollmentPathSchema = z.object({ enrollmentId: uuid }).strict();
export const PortfolioQuerySchema = z.object({ enrollmentId: uuid.optional(), cursor: z.string().min(1).max(2000).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
export const PresentationSchema = z.object({ kind: z.enum(["demo_day", "substitute"]), performedAt: z.string().datetime(), contextualNote: z.string().trim().min(1).max(4000).optional() }).strict();
export type PortfolioQuery = z.infer<typeof PortfolioQuerySchema>;
export type PresentationInput = z.infer<typeof PresentationSchema>;
