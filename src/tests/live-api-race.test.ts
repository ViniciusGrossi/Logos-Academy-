import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLiveApi } from "@/components/prototype/live-api";
vi.mock("@/src/mocks/demo-api", () => ({ isDemoMode: () => false, demoApi: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("does not replace a new class response with a slow previous-class response", async () => {
  let resolveFirst!: (value: Response) => void;
  const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
  const response = (name: string) => new Response(JSON.stringify({ ok: true, data: { name } }), { status: 200 });
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => first).mockResolvedValueOnce(response("Turma B")));
  const hook = renderHook(({ url }) => useLiveApi<{ name: string }>(url), { initialProps: { url: "/turma-a" } });
  hook.rerender({ url: "/turma-b" });
  await waitFor(() => expect(hook.result.current.data?.name).toBe("Turma B"));
  await act(async () => { resolveFirst(response("Turma A")); await first; });
  expect(hook.result.current.data?.name).toBe("Turma B");
});
