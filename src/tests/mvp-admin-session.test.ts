import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSession } from "@/components/admin/admin-session";

const api = vi.hoisted(() => ({ read: vi.fn(), mutation: vi.fn() }));
vi.mock("@/components/prototype/live-api", () => ({ useLiveApi: api.read, apiMutation: api.mutation }));
const enrollment = { id: "enrollment", studentId: "student", studentName: "Aluno individual", curriculumName: "Explorer", kind: "individual", status: "active", classId: null, activatedAt: null, completedAt: null };
const session = { id: "session", lessonPosition: 1, lessonTitle: "Meu assistente", startsAt: "2026-10-19T12:00:00Z", endsAt: "2026-10-19T14:00:00Z", status: "scheduled" };
const context = { session, classId: null, enrollmentId: enrollment.id, studentId: enrollment.studentId, enrollments: [enrollment] };
const attendance: readonly unknown[] = [];
beforeEach(() => {
  window.history.replaceState({}, "", "/admin/encontros/session");
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  api.mutation.mockReset(); api.read.mockReset();
  api.read.mockImplementation((url: string) => ({ data: url.endsWith("/attendance") ? attendance : context, loading: false, error: null, reload: vi.fn() }));
});
afterEach(cleanup);
describe("encontro individual", () => {
  it("abre sem turma e registra a chamada na matrícula individual", async () => {
    api.mutation.mockResolvedValue([{ enrollmentId: enrollment.id, status: "present", privateNote: null }]);
    render(React.createElement(AdminSession, { sessionId: session.id, classId: null }));
    expect(screen.getByText("Aluno individual")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Voltar ao aluno/ }).getAttribute("href")).toBe("/admin/alunos/student");
    fireEvent.click(screen.getByRole("button", { name: /Salvar chamada/ }));
    await waitFor(() => expect(api.mutation).toHaveBeenCalledWith("/api/admin/sessions/session/attendance", "PUT", { entries: [{ enrollmentId: "enrollment", status: "present", privateNote: undefined }] }));
  });
  it.each(["loading", "error", "empty"])("expõe o estado %s sem exigir turma", (state) => {
    api.read.mockReturnValue({ data: null, loading: state === "loading", error: state === "error" ? new Error("Falha segura") : null, reload: vi.fn() });
    render(React.createElement(AdminSession, { sessionId: session.id, classId: null }));
    expect(screen.getByText(state === "loading" ? "Preparando o encontro" : state === "error" ? "Falha segura" : "Encontro não encontrado")).toBeTruthy();
  });
});
