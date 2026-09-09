import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DataList, SpringCard, SpotlightCard, StateScene } from "@/components/academy";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe("componentes compartilhados da Fase 8", () => {
  it("expande o SpringCard por clique e expõe o estado assistivo", () => {
    // O Vitest atual compila apenas .test.ts; createElement mantém o teste no include vigente.
    // eslint-disable-next-line react/no-children-prop
    render(React.createElement(SpringCard, { title: "Conceito RAG", children: "Conteúdo aprofundado" }));
    const trigger = screen.getByRole("button", { name: /Conceito RAG/i });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Conteúdo aprofundado")).toBeTruthy();
  });

  it("aciona SpotlightCard interativo pelo teclado", () => {
    const onClick = vi.fn();
    render(React.createElement(SpotlightCard, { interactive: true, onClick }, "Abrir missão"));

    fireEvent.keyDown(screen.getByRole("button", { name: "Abrir missão" }), { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("comunica loading, vazio e erro sem mudar a geometria base", () => {
    const { rerender } = render(React.createElement(StateScene, { state: "loading" }));
    expect(screen.getByText("Preparando seu espaço").closest("section")?.getAttribute("aria-busy")).toBe("true");

    rerender(React.createElement(StateScene, { state: "empty" }));
    expect(screen.getByText("Nada por aqui ainda")).toBeTruthy();

    rerender(React.createElement(StateScene, { state: "error" }));
    expect(screen.getByText("Não foi possível carregar").closest("section")?.getAttribute("aria-live")).toBe("assertive");
  });

  it("renderiza uma lista de dados com semântica explícita", () => {
    const items = [{ id: "1", label: "Evidência A" }, { id: "2", label: "Evidência B" }];
    const EvidenceList = DataList<(typeof items)[number]>;
    render(React.createElement(EvidenceList, { items, ariaLabel: "Evidências", renderItem: (item) => item.label }));

    expect(screen.getByRole("list", { name: "Evidências" }).children).toHaveLength(2);
  });
});
