import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdminReviewOverview } from "@/components/admin/admin-review-overview";
const classes = { data: { items: [] }, loading: false, error: null };
vi.mock("@/components/admin/admin-data", () => ({ useAdminClasses: () => classes }));
vi.mock("@/components/prototype/live-api", () => ({ useLiveApi: (url: string | null) => ({
  loading: false, error: null, reload: vi.fn(), data: url?.startsWith("/api/admin/reviews?") ? { items: [{ id: url.includes("cursor=") ? "submission-b" : "submission-a", student: { displayName: "Aluno individual" }, activity: { title: "Contrato do assistente" }, classSummary: null, version: 1, submittedAt: null, isLate: false }], nextCursor: url.includes("cursor=") ? null : "cursor-next" } : null,
}) }));
afterEach(cleanup);
it("abre entregas individuais sem turma e percorre a fila", () => {
  window.history.replaceState(null, "", "/admin/revisoes?visao=fila");
  render(createElement(AdminReviewOverview));
  expect(screen.getByText("Percurso individual")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Revisar entrega" }).getAttribute("href")).toContain("submission-a");
  fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
  expect(screen.getByRole("link", { name: "Revisar entrega" }).getAttribute("href")).toContain("submission-b");
  window.history.replaceState(null, "", "/");
});
