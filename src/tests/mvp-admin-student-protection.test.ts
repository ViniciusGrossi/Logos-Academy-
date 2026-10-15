import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminStudentDetail } from "@/components/admin/admin-students";

const api = vi.hoisted(() => ({ mutation: vi.fn(), reload: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/components/prototype/live-api", () => ({ apiMutation: api.mutation, apiQuery: vi.fn(), useLiveApi: () => ({ data: null, loading: false, error: null, reload: api.reload }) }));
const detail = { student: { id: "student", displayName: "Aluno", email: "aluno@example.test", activeEnrollmentCount: 1, pendingAssignmentCount: 0, pendingMakeupCount: 0, githubUsername: null }, guardian: { id: "guardian", name: "Responsável", relationship: "Mãe", email: "guardian@example.test", phone: null }, consent: { id: "consent", status: "verified", termVersion: "2026.1", signedAt: "2026-10-01", physicalCopyArchived: true, verifiedAt: null, revokedAt: null, revocationReason: null }, enrollments: [{ id: "enrollment", studentId: "student", studentName: "Aluno", curriculumName: "Explorer", kind: "class", classId: "class", status: "active", activatedAt: null, completedAt: null }], projects: [] };
vi.mock("@/components/admin/admin-data", () => ({ useAdminStudent: () => ({ data: detail, loading: false, error: null, reload: api.reload }), useAdminEnrollmentOptions: () => ({ data: null, loading: false, error: null, reload: api.reload }), useEnrollmentCompletion: () => ({ data: null, loading: false, error: null, reload: api.reload }), useAdminStudentAttendance: () => ({ data: { items: [], nextCursor: null }, loading: false, error: null, reload: api.reload }), useAdminStudentSubmissions: () => ({ data: { items: [], nextCursor: null }, loading: false, error: null, reload: api.reload }) }));
beforeEach(() => {
  api.mutation.mockReset(); api.mutation.mockResolvedValue({});
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
});
afterEach(cleanup);
describe("proteção administrativa do aluno", () => {
  it("exige confirmação explícita da via física mesmo com termo já verificado", async () => {
    window.history.replaceState({}, "", "/admin/alunos/student?tab=guardian");
    render(React.createElement(AdminStudentDetail, { studentId: "student" }));
    const confirmation = await screen.findByRole("checkbox", { name: /Confirmo que a via física/ });
    expect((confirmation as HTMLInputElement).checked).toBe(false);
    const submit = screen.getByRole("button", { name: "Salvar registro" });
    fireEvent.submit(submit.closest("form")!);
    expect(api.mutation).not.toHaveBeenCalled();
    fireEvent.click(confirmation);
    fireEvent.submit(submit.closest("form")!);
    await waitFor(() => expect(api.mutation).toHaveBeenCalledWith("/api/admin/students/student/consent", "PUT", expect.objectContaining({ physicalCopyArchived: true })));
  });
  it("não cancela a matrícula antes da segunda confirmação", async () => {
    window.history.replaceState({}, "", "/admin/alunos/student?tab=enrollments");
    render(React.createElement(AdminStudentDetail, { studentId: "student" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar matrícula" }));
    expect(api.mutation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manter matrícula" }));
    expect(api.mutation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar matrícula" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(api.mutation).toHaveBeenCalledWith("/api/admin/enrollments/enrollment", "PATCH", { status: "cancelled" }));
  });
});
