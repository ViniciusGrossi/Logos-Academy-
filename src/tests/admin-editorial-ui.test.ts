import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAtlasDetail, AdminAtlasOptions, Page, AdminAtlasListItem, ReviewOverview } from "@/specs/api.contracts";
import { AtlasCmsLibrary } from "@/components/atlas/atlas-cms-library";
import { AtlasCmsEditor } from "@/components/atlas/atlas-cms-editor";
import { createAtlasBlock } from "@/components/atlas/atlas-block-editor";
import { AdminReviewOverview } from "@/components/admin/admin-review-overview";

const state = vi.hoisted(() => ({ mode: "loading", overview: null as ReviewOverview | null, run: vi.fn(), query: vi.fn(), classes: { loading: true, error: null as null | { message: string }, data: null as null | { items: { id: string; name: string }[] }, reload: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/hooks/use-atlas-cms", () => ({ useAtlasQuery: (url: string | null) => state.query(url), useAtlasOptions: () => ({ data: options, error: null, loading: false, reload: vi.fn() }), useAtlasMutation: () => ({ run: state.run, pending: false, error: null, clearError: vi.fn() }), useAtlasAssetUpload: () => ({ pending: false, error: null, upload: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/admin/admin-data", () => ({ useAdminClasses: () => state.classes }));
vi.mock("@/components/prototype/live-api", () => ({ useLiveApi: () => ({ loading: false, error: null, data: state.overview, reload: vi.fn() }), apiMutation: vi.fn() }));
const options: AdminAtlasOptions = { lessons: { items: [], nextCursor: null }, counts: { draft: 0, published: 0, archived: 0, concept: 0, prompt: 0, design_system: 0 } };
const empty: Page<AdminAtlasListItem> = { items: [], nextCursor: null };
const detail: AdminAtlasDetail = { id: "44000000-0000-4000-8000-000000000001", kind: "concept", status: "draft", itemUpdatedAt: "2026-10-12T00:00:00Z", draftUpdatedAt: "2026-10-12T00:00:00Z", hasWorkingDraft: true, publishedAt: null, archivedAt: null, revisionCount: 0, assets: [], resolvedAssets: [], published: null, draft: { kind: "concept", title: "Contrato do assistente", slug: "contrato-assistente", summary: "Uma referência de comportamento.", tags: [], lessonTemplateIds: [], contentBlocks: [], artifact: null, video: null } };
beforeEach(() => { state.mode = "loading"; state.overview = null; state.run.mockReset(); state.classes = { loading: true, error: null, data: null, reload: vi.fn() }; state.query.mockImplementation((url: string | null) => ({ data: state.mode === "empty" && url ? empty : state.mode === "detail" && url ? detail : null, loading: state.mode === "loading", error: state.mode === "error" ? "Falha controlada de conexão" : null, reload: vi.fn() })); window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Atlas administrative regions", () => {
  it("permite duplicar o bloco selecionado e desfazer sua remoção", async () => {
    const initial = detail.draft.contentBlocks;
    detail.draft.contentBlocks = [createAtlasBlock("text")];
    state.mode = "detail";
    try {
      render(createElement(AtlasCmsEditor, { itemId: detail.id }));
      await waitFor(() => expect(screen.getByRole("button", { name: /01 Novo título/ })).toBeTruthy());
      fireEvent.click(screen.getByRole("button", { name: /01 Novo título/ }));
      fireEvent.click(screen.getByRole("button", { name: "Duplicar bloco selecionado" }));
      expect(screen.getByText("2 blocos")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Remover bloco" }));
      fireEvent.click(screen.getByRole("button", { name: "Remover bloco" }));
      fireEvent.click(await screen.findByRole("button", { name: "Desfazer remoção do bloco" }));
      expect(screen.getByText("2 blocos")).toBeTruthy();
    } finally { detail.draft.contentBlocks = initial; }
  });
  it("shows a loading region while retaining the editorial toolbar", () => { render(createElement(AtlasCmsLibrary)); expect(screen.getByRole("heading", { name: "Atlas" })).toBeTruthy(); expect(screen.getByText("Buscando conteúdos editoriais.")).toBeTruthy(); });
  it("shows an actionable error without losing filters", () => { state.mode = "error"; render(createElement(AtlasCmsLibrary)); expect(screen.getByRole("alert").textContent).toContain("Falha controlada"); expect(screen.getByRole("searchbox", { name: "Buscar conteúdo" })).toBeTruthy(); });
  it("shows an empty collection without fabricating items", () => { state.mode = "empty"; render(createElement(AtlasCmsLibrary)); expect(screen.getByText("Comece criando um conceito, prompt ou sistema de design.")).toBeTruthy(); expect(screen.queryByRole("table")).toBeNull(); });
  it("loads the editor and keeps publication gated on real missing requirements", async () => { state.mode = "detail"; render(createElement(AtlasCmsEditor, { itemId: detail.id })); await waitFor(() => expect(screen.getByRole("textbox", { name: "Título" })).toBeTruthy()); fireEvent.click(screen.getByRole("button", { name: /Publicar/ })); expect(screen.getByText("Vincule ao menos uma aula.")).toBeTruthy(); expect(screen.getByText("Adicione um bloco visual.")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Salvar e publicar" })); expect(state.run).not.toHaveBeenCalled(); });
  it("supports the editor loading state", () => { render(createElement(AtlasCmsEditor, { itemId: detail.id })); expect(screen.getByText("Abrindo estrutura, propriedades e preview.")).toBeTruthy(); });
  it("supports the editor error and retry", () => { state.mode = "error"; render(createElement(AtlasCmsEditor, { itemId: detail.id })); expect(screen.getByRole("alert").textContent).toContain("Falha controlada"); expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy(); });
});
describe("Reviews administrative regions", () => {
  it("does not reset a newly selected activity to the previous response", async () => {
    window.history.replaceState(null, "", "/admin/revisoes?turma=class-a&atividade=activity-a");
    state.classes = { loading: false, error: null, data: { items: [{ id: "class-a", name: "Turma A" }] }, reload: vi.fn() };
    state.overview = { classSummary: { id: "class-a", name: "Turma A" }, selectedActivityId: "activity-a", activities: [{ id: "activity-a", title: "Interface", cyclePosition: 1, lessonPosition: 1, awaitingReviewCount: 0 }, { id: "activity-b", title: "Memória", cyclePosition: 1, lessonPosition: 2, awaitingReviewCount: 0 }], students: [] };
    render(createElement(AdminReviewOverview));
    const select = screen.getByRole("combobox", { name: "Atividade" });
    fireEvent.change(select, { target: { value: "activity-b" } });
    await waitFor(() => expect((select as HTMLSelectElement).value).toBe("activity-b"));
    expect(window.location.search).toContain("atividade=activity-b");
    window.history.replaceState(null, "", "/");
  });
  it("loads the class roster", () => { render(createElement(AdminReviewOverview)); expect(screen.getByText("Carregando revisões")).toBeTruthy(); });
  it("handles a failed class request", () => { state.classes.loading = false; state.classes.error = { message: "Falha controlada" }; render(createElement(AdminReviewOverview)); expect(screen.getByText("Falha controlada")).toBeTruthy(); expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy(); });
  it("does not invent a roster when there are no classes", () => { state.classes.loading = false; state.classes.data = { items: [] }; render(createElement(AdminReviewOverview)); expect(screen.getByText("Nenhuma turma para acompanhar")).toBeTruthy(); });
});
