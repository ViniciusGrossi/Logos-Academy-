import { describe, expect, it, vi } from "vitest";
import type { AdminSessionContext } from "@/specs/api.contracts";
import type { AdminOperationsStore } from "@/src/modules/admin-operations-completion/repository";
import { AdminOperationsService } from "@/src/modules/admin-operations-completion/service";

const actor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "10000000-0000-4000-8000-000000000002" };
const sessionId = "10000000-0000-4000-8000-000000000003";
const enrollmentId = "10000000-0000-4000-8000-000000000004";
const context: AdminSessionContext = {
  session: { id: sessionId, lessonPosition: 16, lessonTitle: "Apresentação", startsAt: "2026-10-15T12:00:00Z", endsAt: "2026-10-15T13:00:00Z", status: "scheduled" },
  classId: null, enrollmentId, studentId: "10000000-0000-4000-8000-000000000005", enrollments: [],
};
function fixture() {
  const repository = {
    pendingMakeups: vi.fn(), activeCurricula: vi.fn(), studentAttendance: vi.fn(),
    sessionContext: vi.fn().mockResolvedValue(context),
    enrollmentCalendar: vi.fn().mockResolvedValue([context.session]),
  } satisfies AdminOperationsStore;
  return { repository, service: new AdminOperationsService(repository) };
}
describe("contexto administrativo individual", () => {
  it("encaminha ator e encontro sem exigir turma", async () => {
    const { service, repository } = fixture();
    expect(await service.sessionContext(actor, { sessionId }, "req")).toEqual(context);
    expect(repository.sessionContext).toHaveBeenCalledWith(actor, sessionId, "req");
  });
  it("consulta calendário pela matrícula sem impersonar aluno", async () => {
    const { service, repository } = fixture();
    expect(await service.enrollmentCalendar(actor, { enrollmentId }, "req")).toEqual([context.session]);
    expect(repository.enrollmentCalendar).toHaveBeenCalledWith(actor, enrollmentId, "req");
  });
  it("rejeita IDs inválidos e parâmetros extras antes do acesso a dados", async () => {
    const { service, repository } = fixture();
    await expect(service.sessionContext(actor, { sessionId: "bad" }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.enrollmentCalendar(actor, { enrollmentId, tenantId: actor.tenantId }, "req")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repository.sessionContext).not.toHaveBeenCalled();
    expect(repository.enrollmentCalendar).not.toHaveBeenCalled();
  });
});
