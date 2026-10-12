import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AtlasContentBlock, AtlasSpecimen } from "@/specs/api.contracts";
import { AtlasBlockRenderer, AtlasItemRenderer, AtlasSpecimenRenderer } from "@/components/atlas/atlas-item-renderer";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const base = { id: "00000000-0000-0000-0000-000000000001", isVisible: true };
const blocks: readonly AtlasContentBlock[] = [
  { ...base, type: "text", heading: "Texto", body: "Uma explicação" },
  { ...base, type: "callout", heading: "Chamada", body: "Uma orientação" },
  { ...base, type: "image", source: { kind: "external", url: "https://example.com/map.png", alt: "Mapa ilustrado" } },
  { ...base, type: "diagram", heading: "Fluxo", nodes: [{ label: "Decidir", detail: "Defina o objetivo" }] },
  { ...base, type: "section", heading: "Seção" },
  { ...base, type: "list", ordered: true, items: ["Referência", "Hipótese"] },
  { ...base, type: "gallery", items: [{ kind: "external", url: "https://example.com/gallery.png", alt: "Galeria de evidências" }] },
  { ...base, type: "code", language: "typescript", code: "const value = 1;" },
  { ...base, type: "quote", body: "Uma decisão explicada", attribution: "Aluno" },
  { ...base, type: "comparison", heading: "Comparação", left: { title: "Antes", body: "Sem orientação" }, right: { title: "Depois", body: "Com direção" }, emphasis: "right" },
  { ...base, type: "steps", heading: "Passos", items: [{ title: "Definir", body: "Escolha o público" }] },
  { ...base, type: "checklist", heading: "Qualidade", items: [{ label: "Objetivo claro", detail: "Especifique a necessidade" }] },
  { ...base, type: "do_dont", heading: "Faça e evite", do: ["Explique escolhas"], dont: ["Copiar sem compreender"] },
  { ...base, type: "palette", heading: "Paleta", colors: [{ name: "Ação", value: "#ff6b00", usage: "Próximo passo" }] },
  { ...base, type: "typography", heading: "Tipografia", samples: [{ role: "Título", family: "DM Serif Display", weight: "400", sample: "Construção" }] },
  { ...base, type: "specimen", heading: "Espécime", component: "button", props: { label: "Continuar", variant: "primary", disabled: false } },
];

describe("Atlas shared content renderer", () => {
  it.each(blocks.map((block) => [block.type, block] as const))("renders bounded %s content", (_, block) => {
    const { container } = render(createElement(AtlasBlockRenderer, { block }));
    expect(container.textContent?.length || container.querySelector("img")).toBeTruthy();
  });

  it("keeps hidden blocks out of both reader and preview, and escapes code/HTML as text", () => {
    const malicious = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const contentBlocks: AtlasContentBlock[] = [{ ...base, type: "text", heading: "Oculto", body: "Nota privada", isVisible: false }, { ...base, id: "visible", type: "code", language: "html", code: malicious }];
    const { container } = render(createElement(AtlasItemRenderer, { contentBlocks, mode: "preview" }));
    expect(screen.queryByText("Nota privada")).toBeNull();
    expect(screen.getByText(malicious)).toBeTruthy();
    expect(container.querySelector("script,img")).toBeNull();
  });

  it("never resolves an asset from its id or emits unsafe image schemes", () => {
    const block: AtlasContentBlock = { ...base, type: "image", source: { kind: "asset", assetId: "missing", alt: "Evidência visual" } };
    const { container, rerender } = render(createElement(AtlasBlockRenderer, { block }));
    expect(screen.getByText("Imagem indisponível")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    rerender(createElement(AtlasBlockRenderer, { block: { type: "image", url: "javascript:alert(1)", alt: "Inválida" } }));
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders authorized assets with their actual dimensions and image failure fallback", () => {
    const block: AtlasContentBlock = { ...base, type: "image", source: { kind: "asset", assetId: "asset", alt: "Uma interface responsiva" } };
    render(createElement(AtlasItemRenderer, { contentBlocks: [block], resolvedAssets: [{ id: "asset", readUrl: "https://example.com/signed.png", expiresAt: "2099-01-01T00:00:00Z", alt: "Alt do asset", caption: "Versão inicial", width: 800, height: 600, contentType: "image/png" }] }));
    const image = screen.getByAltText("Uma interface responsiva");
    expect(image.getAttribute("width")).toBe("800");
    fireEvent.error(image);
    expect(screen.getByText("Imagem indisponível")).toBeTruthy();
    expect(screen.getByText("Versão inicial")).toBeTruthy();
  });

  it("preserves identical content output in preview with only editorial selection controls added", () => {
    const block = blocks[9];
    const { container, rerender } = render(createElement(AtlasItemRenderer, { contentBlocks: [block] }));
    const reader = container.querySelector("section")?.innerHTML;
    const select = vi.fn();
    rerender(createElement(AtlasItemRenderer, { contentBlocks: [block], mode: "preview", selectedBlockId: base.id, onSelectBlock: select }));
    expect(container.querySelector("section")?.innerHTML).toBe(reader);
    fireEvent.click(screen.getByRole("button", { name: /Editar bloco 1/ }));
    expect(select).toHaveBeenCalledWith(base.id);
  });

  it("personalizes prompt locally, copies the current version and offers manual fallback", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(createElement(AtlasItemRenderer, { contentBlocks: [], artifact: { type: "prompt", template: "Ajude [PÚBLICO] a estudar.", variables: [{ token: "[PÚBLICO]", description: "Quem vai usar" }], exampleInput: null, exampleOutput: null } }));
    fireEvent.change(screen.getByRole("textbox", { name: /PÚBLICO/ }), { target: { value: "estudantes" } });
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Ajude estudantes a estudar."));
    expect(await screen.findByLabelText("Selecione e copie manualmente")).toBeTruthy();
  });
});

describe("seven safe specimens", () => {
  const specimens: readonly AtlasSpecimen[] = [
    { component: "button", props: { label: "Enviar", variant: "outline", disabled: true } },
    { component: "field", props: { label: "Projeto", placeholder: "Digite", helpText: "Descreva", state: "error" } },
    { component: "card", props: { title: "Projeto real", body: "Uma decisão", actionLabel: "Abrir projeto" } },
    { component: "badge", props: { label: "Publicado", tone: "success" } },
    { component: "callout", props: { title: "Atenção", body: "Confira o contraste", tone: "warning" } },
    { component: "navigation", props: { items: ["Tokens", "Aplicação"], activeIndex: 0 } },
    { component: "editorial", props: { title: "Construção", summary: "Aprender com evidências" } },
  ];
  it.each(specimens.map((specimen) => [specimen.component, specimen] as const))("renders %s without arbitrary markup", (_, specimen) => {
    const { container } = render(createElement(AtlasSpecimenRenderer, { specimen }));
    expect(container.textContent?.length).toBeGreaterThan(0);
    expect(container.querySelector("script,style,iframe")).toBeNull();
  });
  it("labels specimen fields, links help text, and preserves explicit disabled state", () => {
    render(createElement(AtlasSpecimenRenderer, { specimen: specimens[0] }));
    expect(screen.getByRole("button", { name: "Enviar" }).hasAttribute("disabled")).toBe(true);
    cleanup();
    render(createElement(AtlasSpecimenRenderer, { specimen: specimens[1] }));
    const field = screen.getByRole("textbox", { name: "Projeto" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(field.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Descreva");
  });
});
