import type { AdminStudentAttendanceEntry, CurriculumOption, Page, PendingMakeup } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { MakeupsQuerySchema, StudentAttendanceQuerySchema } from "@/src/modules/admin-operations-completion/schema";
import type { AdminActor, AdminOperationsStore } from "@/src/modules/admin-operations-completion/repository";

export class AdminOperationsService {
  constructor(private readonly repository: AdminOperationsStore) {}

  /** SR-A2 */
  async pendingMakeups(actor: AdminActor, query: unknown, requestId: string): Promise<Page<PendingMakeup>> {
    return this.repository.pendingMakeups(actor, parse(MakeupsQuerySchema, query, requestId), requestId);
  }

  /** SR-A3 */
  async activeCurricula(actor: AdminActor, requestId: string): Promise<readonly CurriculumOption[]> {
    return this.repository.activeCurricula(actor, requestId);
  }

  /** SR-A6 */
  async studentAttendance(actor: AdminActor, query: unknown, requestId: string): Promise<Page<AdminStudentAttendanceEntry>> {
    return this.repository.studentAttendance(actor, parse(StudentAttendanceQuerySchema, query, requestId), requestId);
  }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown, requestId: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados inválidos.", requestId);
  return parsed.data;
}
