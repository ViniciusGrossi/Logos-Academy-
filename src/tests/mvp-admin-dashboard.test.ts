import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const query = vi.hoisted(() => ({ dashboard: vi.fn(), options: vi.fn() }));
vi.mock("@/components/admin/admin-data", () => ({ useAdminDashboard: query.dashboard, useAdminEnrollmentOptions: query.options }));
const data = { awaitingReviewCount: 3, feedbackDueSoonCount: 1, overdueAssignmentCount: 2, pendingMakeupCount: 1, deliveryApprovalRate: 75.5, upcomingSessions: [{ id: "individual-session", lessonPosition: 9, lessonTitle: "Automação real", startsAt: "2026-10-19T15:00:00Z", endsAt: "2026-10-19T17:00:00Z", status: "scheduled" }], studentsAtRisk: [{ id: "student", displayName: "Aluno individual", pendingAssignmentCount: 2, pendingMakeupCount: 0 }] };
beforeEach(() => {
  window.history.replaceState({}, "", "/admin");
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  query.dashboard.mockReturnValue({ data, loading: false, error: null, reload: vi.fn() });
  query.options.mockReturnValue({ data: { classes: [], curricula: [] }, loading: false, error: null, reload: vi.fn() });
});
afterEach(cleanup);
describe("painel administrativo real", () => {
  it("mostra aprovação, fila e encontro individual acionável sem classId", () => {
    render(React.createElement(AdminDashboard));
    expect(screen.getByText("75,5%")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Automação real/ }).getAttribute("href")).toBe("/admin/encontros/individual-session");
    expect(screen.getByRole("link", { name: /Aluno individual/ }).getAttribute("href")).toBe("/admin/alunos/student");
    expect(screen.getByRole("combobox", { name: "Filtrar painel por turma" })).toBeTruthy();
  });
  it("restaura filtro turma e risco pela URL", () => {
    window.history.replaceState({}, "", "/admin?classId=class&risk=makeups");
    render(React.createElement(AdminDashboard));
    expect(query.dashboard).toHaveBeenLastCalledWith("class");
    expect(screen.queryByText("Aluno individual")).toBeNull();
    expect(screen.getByText("Nenhum aluno neste filtro de atenção.")).toBeTruthy();
  });
  it.each(["loading", "error", "empty"])("comunica estado %s", (state) => {
    query.dashboard.mockReturnValue({ data: null, loading: state === "loading", error: state === "error" ? new Error("Falha do painel") : null, reload: vi.fn() });
    render(React.createElement(AdminDashboard));
    expect(screen.getByText(state === "loading" ? "Lendo a operação de hoje" : state === "error" ? "Falha do painel" : "Nenhum dado operacional disponível")).toBeTruthy();
  });
});
