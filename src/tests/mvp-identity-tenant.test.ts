import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { IdentityRepository } from "@/src/modules/identity/repository";

const user = { id: "10000000-0000-4000-8000-000000000001", tenant_id: "10000000-0000-4000-8000-000000000002", auth_user_id: "10000000-0000-4000-8000-000000000003", access_enabled: true };
function fixture(deleted: boolean, failed = false) {
  const tenantQuery = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
  const memberQuery = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }) };
  const userQuery = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: user, error: null }) };
  for (const query of [tenantQuery, memberQuery, userQuery]) {
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.is.mockReturnValue(query);
  }
  tenantQuery.maybeSingle.mockImplementation(async () => ({
    data: deleted && tenantQuery.is.mock.calls.some(([key, value]) => key === "deleted_at" && value === null) ? null : { id: user.tenant_id },
    error: failed ? { code: "failure" } : null,
  }));
  const from = vi.fn((table: string) => table === "tenants" ? tenantQuery : table === "users" ? userQuery : memberQuery);
  const client = { schema: () => ({ from }) } as unknown as SupabaseClient;
  return { repository: new IdentityRepository(client), tenantQuery, memberQuery };
}
describe("identidade e tenant excluído", () => {
  it("nega identidade mesmo com usuário e membership válidos", async () => {
    const { repository, memberQuery } = fixture(true);
    expect(await repository.findContext(user.auth_user_id)).toBeNull();
    expect(memberQuery.maybeSingle).not.toHaveBeenCalled();
  });
  it("mantém identidade de tenant ativo", async () => {
    expect(await fixture(false).repository.findContext(user.auth_user_id)).toEqual({ authUserId: user.auth_user_id, tenantId: user.tenant_id, userId: user.id, role: "admin" });
  });
  it("falha fechado quando a consulta de tenant falha", async () => {
    await expect(fixture(false, true).repository.findContext(user.auth_user_id)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});
