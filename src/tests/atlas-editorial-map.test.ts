import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasEditorialMap } from "@/components/atlas/atlas-editorial-map";
import type { AdminAtlasOptions } from "@/specs/api.contracts";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const options: AdminAtlasOptions = {
  lessons: { items: Array.from({ length: 16 }, (_, index) => ({ id: `lesson-${index + 1}`, title: `Tema ${index + 1}`, position: index % 4 + 1, cycleId: `cycle-${Math.floor(index / 4) + 1}`, cyclePosition: Math.floor(index / 4) + 1, cycleTitle: `Projeto ${Math.floor(index / 4) + 1}`, curriculumId: "curriculum" })), nextCursor: null },
  counts: { concept: 12, prompt: 7, design_system: 4, draft: 10, published: 13, archived: 0 },
};
function setup(overrides: Partial<Parameters<typeof AtlasEditorialMap>[0]> = {}) {
  const onKindChange = vi.fn(); const onLessonChange = vi.fn(); const onRetry = vi.fn();
  const result = render(createElement(AtlasEditorialMap, { options, loading: false, error: null, kind: "", lesson: "", onKindChange, onLessonChange, onRetry, ...overrides }));
  return { ...result, onKindChange, onLessonChange, onRetry };
}
describe("Atlas premium editorial navigation", () => {
  it("renders sixteen numbered lessons across four projects with actual collection counts", () => {
    setup();
    expect(screen.getAllByRole("button", { name: /^Aula / })).toHaveLength(16);
    expect(screen.getAllByRole("region", { name: /^Projeto / })).toHaveLength(4);
    expect(screen.getByRole("button", { name: /Conceitos/ }).textContent).toContain("12");
    expect(screen.getByRole("button", { name: "Aula 16: Tema 16" }).textContent).toBe("16");
  });
  it("filters by real lesson and collection IDs and resets both from the hub", () => {
    const { onKindChange, onLessonChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Aula 16: Tema 16" }));
    expect(onLessonChange).toHaveBeenCalledWith("lesson-16");
    fireEvent.click(screen.getByRole("button", { name: /Prompts/ }));
    expect(onKindChange).toHaveBeenCalledWith("prompt");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todo o Atlas" }));
    expect(onKindChange).toHaveBeenLastCalledWith("");
    expect(onLessonChange).toHaveBeenLastCalledWith("");
  });
  it("preserves numbered gaps instead of fabricating lessons or shifting their indices", () => {
    const sparse = { ...options, lessons: { items: [options.lessons.items[15]], nextCursor: null } };
    const { onLessonChange } = setup({ options: sparse });
    expect((screen.getByRole("button", { name: /Aula 1:/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Aula 1:/ }));
    expect(onLessonChange).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Aula 16: Tema 16" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("handles loading, failed options and an empty curriculum without fake counts", () => {
    const { rerender, onRetry } = setup({ options: null, loading: true });
    expect((screen.getByRole("button", { name: "Aula 16: carregando" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(createElement(AtlasEditorialMap, { options: null, loading: false, error: "Falha ao carregar", kind: "", lesson: "", onKindChange: vi.fn(), onLessonChange: vi.fn(), onRetry }));
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(createElement(AtlasEditorialMap, { options: null, loading: false, error: null, kind: "", lesson: "", onKindChange: vi.fn(), onLessonChange: vi.fn(), onRetry }));
    expect(screen.getByText(/Nenhuma aula ativa/)).toBeTruthy();
  });
  it("supports pausing energy pulses without disabling navigation", () => {
    const { container, onLessonChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Pausar animações do mapa" }));
    expect(container.querySelector("[data-motion]")?.getAttribute("data-motion")).toBe("paused");
    fireEvent.click(screen.getByRole("button", { name: "Aula 1: Tema 1" }));
    expect(onLessonChange).toHaveBeenCalledWith("lesson-1");
    fireEvent.click(screen.getByRole("button", { name: "Retomar animações do mapa" }));
    expect(container.querySelector("[data-motion]")?.getAttribute("data-motion")).toBe("running");
  });
  it("draws twenty-six responsive connections and highlights a selected lesson", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 1000, height: 400, left: 0, top: 0, right: 1000, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
    const { container } = setup({ lesson: "lesson-16" });
    expect(container.querySelectorAll("svg[aria-hidden=true] g")).toHaveLength(26);
    expect(container.querySelectorAll("g[data-selected=true]")).toHaveLength(5);
  });
});
