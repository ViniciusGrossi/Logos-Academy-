// @vitest-environment node
import { expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/admin/sessions/[sessionId]/route";
const state = vi.hoisted(() => ({ update: vi.fn().mockResolvedValue(new Response(null, { status: 200 })) }));
vi.mock("@/app/api/admin/[...path]/route", () => ({ PATCH: state.update }));
vi.mock("@/src/modules/admin-operations-completion/controller", () => ({ adminOperationsController: vi.fn() }));
it("a rota específica preserva PATCH sem depender de fallback por método", async () => {
  const request = new Request("http://localhost/api/admin/sessions/session-id", { method: "PATCH", body: "{}" });
  expect((await PATCH(request, { params: Promise.resolve({ sessionId: "session-id" }) })).status).toBe(200);
  expect(state.update).toHaveBeenCalledWith(request, { params: expect.any(Promise) });
  expect(await state.update.mock.calls[0][1].params).toEqual({ path: ["sessions", "session-id"] });
});
