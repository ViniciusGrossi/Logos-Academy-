import type { AdminDashboard } from "@/specs/api.contracts";
import { z } from "zod";

import { AppError } from "@/src/lib/api-error";
import { AdminDashboardRepository } from "@/src/modules/admin-dashboard/repository";

const QuerySchema = z.object({ classId: z.string().uuid().optional() }).strict();

export class AdminDashboardService {
  constructor(private readonly repository: AdminDashboardRepository) {}

  async dashboard(actor: { tenantId: string; userId: string }, query: unknown, requestId: string): Promise<AdminDashboard> {
    const parsedQuery = QuerySchema.safeParse(query);
    if (!parsedQuery.success) throw new AppError("VALIDATION_ERROR", "Filtro inválido.", requestId);

    const dashboard = await this.repository.findDashboard(actor, parsedQuery.data.classId ?? null, requestId);
    const students = new Map<string, AdminDashboard["studentsAtRisk"][number]>();
    for (const student of dashboard.studentsAtRisk) {
      const prior = students.get(student.id);
      students.set(student.id, prior ? {
        ...prior,
        activeEnrollmentCount: prior.activeEnrollmentCount + student.activeEnrollmentCount,
        pendingAssignmentCount: prior.pendingAssignmentCount + student.pendingAssignmentCount,
        pendingMakeupCount: prior.pendingMakeupCount + student.pendingMakeupCount,
      } : student);
    }

    return { ...dashboard, studentsAtRisk: [...students.values()] };
  }
}
