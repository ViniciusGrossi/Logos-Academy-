import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useAdminUrlState } from "@/components/admin/use-admin-url-state";

afterEach(cleanup);
it("restaura a aba, preserva filtros vizinhos e responde ao histórico", () => {
  window.history.replaceState({}, "", "/admin/alunos/aluno?tab=guardian&search=Maria");
  const { result } = renderHook(() => useAdminUrlState("tab", "overview", ["overview", "guardian", "projects"]));
  expect(result.current[0]).toBe("guardian");
  act(() => result.current[1]("projects"));
  expect(window.location.search).toBe("?tab=projects&search=Maria");
  act(() => { window.history.replaceState({}, "", "?tab=guardian&search=Maria"); window.dispatchEvent(new PopStateEvent("popstate")); });
  expect(result.current[0]).toBe("guardian");
});
