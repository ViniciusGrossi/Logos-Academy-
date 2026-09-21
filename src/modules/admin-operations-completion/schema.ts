import { z } from "zod";

const Uuid = z.string().uuid();
const PageLimit = z.coerce.number().int().min(1).max(100).default(25);
const Cursor = z.string().min(1).max(2_000).optional();

/** SR-A2 (Release 2): fila de reposições pendentes. */
export const MakeupsQuerySchema = z.object({
  classId: Uuid.optional(),
  studentId: Uuid.optional(),
  cursor: Cursor,
  limit: PageLimit,
}).strict();

/** SR-A3 (Release 2): esta rota não aceita parâmetros. */
export const CurriculaQuerySchema = z.object({}).strict();

export const StudentPathSchema = z.object({ studentId: Uuid }).strict();

/** SR-A6 (Release 2): aba Frequência da ficha do aluno. */
export const StudentAttendanceQuerySchema = StudentPathSchema.extend({
  enrollmentId: Uuid.optional(),
  cursor: Cursor,
  limit: PageLimit,
}).strict();

export type MakeupsQuery = z.infer<typeof MakeupsQuerySchema>;
export type StudentAttendanceQuery = z.infer<typeof StudentAttendanceQuerySchema>;
