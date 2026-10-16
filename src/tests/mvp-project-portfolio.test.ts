import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProjectPortal } from "@/components/prototype/project-portal";
const project = { id: "project-a", cyclePosition: 1, title: "Projeto atual", status: "approved", activityCount: 4, completedActivityCount: 4, approvedAt: null };
const urls: string[] = [];
vi.mock("@/components/prototype/live-api", () => ({ useLiveApi: (url: string) => {
  urls.push(url);
  const pageTwo = url.includes("cursor=next-page");
  return { data: url.startsWith("/api/student/projects") ? [project] : { items: [{ ...project, id: pageTwo ? "archive-b" : "archive-a", title: pageTwo ? "Projeto preservado B" : "Projeto preservado A", activities: [] }], nextCursor: pageTwo ? null : "next-page" }, loading: false, error: null, reload: vi.fn() };
} }));
afterEach(cleanup);
it("permite percorrer projetos preservados além da primeira página", () => {
  window.history.replaceState(null, "", "/projetos");
  render(createElement(ProjectPortal));
  expect(screen.getByText("Projeto preservado A")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
  expect(screen.getByText("Projeto preservado B")).toBeTruthy();
  expect(urls).toContain("/api/student/portfolio?cursor=next-page");
  fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
  expect(screen.getByText("Projeto preservado A")).toBeTruthy();
});
