import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateClassSheet } from "@/components/admin/admin-operations-sheets";
import { AdminEnrollmentSheet } from "@/components/admin/admin-enrollment-sheet";

const api = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/components/prototype/live-api", () => ({ apiMutation: api.mutate }));
vi.mock("@/components/admin/admin-data", () => ({
  useAdminCurricula: () => ({ data: [{ id: "curriculum", name: "Explorer", version: "v3" }], loading: false, error: null, reload: vi.fn() }),
  useAdminEnrollmentOptions: () => ({ data: { curricula: [{ id: "curriculum", name: "Explorer", version: "v3" }], classes: [{ id: "class", name: "Manhã", curriculumId: "curriculum", occupiedSeats: 2, capacity: 6 }] }, loading: false, error: null, reload: vi.fn() }),
}));
vi.mock("@/components/admin/academy-select", () => ({ AcademySelect: (props: { ariaLabel: string; value?: string; defaultValue?: string; name?: string; required?: boolean; disabled?: boolean; onValueChange?: (value: string) => void; items: readonly { value: string; label: string }[] }) => React.createElement("select", { "aria-label": props.ariaLabel, name: props.name, required: props.required, disabled: props.disabled, ...(props.value === undefined ? { defaultValue: props.defaultValue ?? "" } : { value: props.value }), onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onValueChange?.(event.target.value) }, React.createElement("option", { value: "" }, "Selecione"), ...props.items.map((item) => React.createElement("option", { value: item.value, key: item.value }, item.label))) }));
beforeEach(() => {
  api.mutate.mockReset(); api.mutate.mockResolvedValue({ id: "created" });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
});
afterEach(cleanup);
describe("admissões administrativas", () => {
  it("cria turma, usa fuso escolhido e reseta o formulário capturado após await", async () => {
    const afterSave = vi.fn().mockResolvedValue(undefined);
    render(React.createElement(CreateClassSheet, { afterSave }));
    fireEvent.click(screen.getByRole("button", { name: "Nova turma" }));
    fireEvent.change(screen.getByLabelText("Nome da turma"), { target: { value: "Manhã" } });
    fireEvent.change(screen.getByLabelText("Currículo"), { target: { value: "curriculum" } });
    fireEvent.change(screen.getByLabelText("Primeiro encontro a partir de"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("Fuso horário (IANA)"), { target: { value: "America/Manaus" } });
    fireEvent.submit(screen.getByRole("button", { name: "Criar turma e encontros" }).closest("form")!);
    await screen.findByText("Turma criada com a sequência de 16 encontros.");
    expect(api.mutate).toHaveBeenCalledWith("/api/admin/classes", "POST", expect.objectContaining({ schedule: expect.objectContaining({ timezone: "America/Manaus" }) }));
    expect(afterSave).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("Nome da turma") as HTMLInputElement).value).toBe("");
  });
  it("matricula aluno existente em turma sem recriar identidade nem convite", async () => {
    const afterSave = vi.fn().mockResolvedValue(undefined);
    render(React.createElement(AdminEnrollmentSheet, { studentId: "student", studentName: "Aluno", afterSave }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar matrícula" }));
    fireEvent.change(screen.getByLabelText("Turma da nova matrícula"), { target: { value: "class" } });
    fireEvent.submit(screen.getByRole("button", { name: "Criar matrícula" }).closest("form")!);
    await waitFor(() => expect(api.mutate).toHaveBeenCalledWith("/api/admin/enrollments", "POST", { studentId: "student", curriculumId: "curriculum", kind: "class", classId: "class" }));
    expect(afterSave).toHaveBeenCalledOnce();
  });
  it("cria calendário individual próprio para nova matrícula", async () => {
    render(React.createElement(AdminEnrollmentSheet, { studentId: "student", studentName: "Aluno", afterSave: vi.fn().mockResolvedValue(undefined) }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar matrícula" }));
    fireEvent.click(screen.getByRole("radio", { name: "Individual" }));
    fireEvent.change(screen.getByLabelText("Currículo da matrícula"), { target: { value: "curriculum" } });
    fireEvent.change(screen.getByLabelText("Primeiro encontro a partir de"), { target: { value: "2026-10-15" } });
    fireEvent.submit(screen.getByRole("button", { name: "Criar matrícula" }).closest("form")!);
    await waitFor(() => expect(api.mutate).toHaveBeenCalledWith("/api/admin/enrollments", "POST", expect.objectContaining({ studentId: "student", curriculumId: "curriculum", kind: "individual", individualSchedule: expect.objectContaining({ startsOn: "2026-10-15" }) })));
  });
});
