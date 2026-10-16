import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useAdminUrlState } from "@/components/admin/use-admin-url-state";

afterEach(cleanup);
it("troca turma e limpa atividade em uma única entrada do histórico", () => {
  window.history.replaceState({}, "", "/admin/revisoes?turma=turma-a&atividade=atividade-a");
  const { result } = renderHook(() => ({ turma: useAdminUrlState<string>("turma", ""), atividade: useAdminUrlState<string>("atividade", "") }));
  const length = window.history.length;
  act(() => result.current.turma[1]("turma-b", { atividade: null }));
  expect(result.current.turma[0]).toBe("turma-b");
  expect(result.current.atividade[0]).toBe("");
  expect(window.history.length).toBe(length + 1);
  expect(window.location.search).toBe("?turma=turma-b");
});
it("restaura a aba, preserva filtros vizinhos e responde ao histórico", () => {
  window.history.replaceState({}, "", "/admin/alunos/aluno?tab=guardian&search=Maria");
  const { result } = renderHook(() => useAdminUrlState("tab", "overview", ["overview", "guardian", "projects"]));
  expect(result.current[0]).toBe("guardian");
  act(() => result.current[1]("projects"));
  expect(window.location.search).toBe("?tab=projects&search=Maria");
  act(() => { window.history.replaceState({}, "", "?tab=guardian&search=Maria"); window.dispatchEvent(new PopStateEvent("popstate")); });
  expect(result.current[0]).toBe("guardian");
});
