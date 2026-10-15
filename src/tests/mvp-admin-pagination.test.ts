import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAdminPagination } from "@/components/admin/use-admin-pagination";

const read = vi.hoisted(() => vi.fn());
vi.mock("@/components/prototype/live-api", () => ({ useLiveApi: read }));
afterEach(cleanup);
it("percorre cursores codificados, volta e reinicia ao trocar o filtro", () => {
  read.mockImplementation((url: string) => ({ data: { items: [url], nextCursor: url.includes("cursor") ? null : "next/a+=" }, loading: false, error: null, reload: vi.fn() }));
  const { result, rerender } = renderHook(({ base }) => useAdminPagination<string>(base), { initialProps: { base: "/api/admin/students?limit=30" } });
  expect(result.current.page).toBe(1);
  act(() => result.current.nextPage());
  expect(result.current.data?.items).toEqual(["/api/admin/students?limit=30&cursor=next%2Fa%2B%3D"]);
  expect(result.current.hasNext).toBe(false);
  act(() => result.current.previousPage());
  expect(result.current.page).toBe(1);
  act(() => result.current.nextPage());
  rerender({ base: "/api/admin/students?limit=30&search=Ana" });
  expect(result.current.page).toBe(1);
  expect(result.current.hasPrevious).toBe(false);
  expect(result.current.data?.items).toEqual(["/api/admin/students?limit=30&search=Ana"]);
});
