import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasBlockPicker, AtlasTagsField } from "@/components/atlas/atlas-editor-controls";

afterEach(cleanup);
function TagsHarness({ initial = ["IA responsável", "Prompt"] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return createElement(AtlasTagsField, { value: tags, onChange: setTags });
}
describe("Atlas tags chips", () => {
  it("renders removable chips and adds a trimmed tag with Enter", () => {
    render(createElement(TagsHarness));
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "  Interface  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remover tag Interface" })).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Remover tag Prompt" }));
    expect(screen.queryByText("Prompt")).toBeNull();
  });
  it("rejects empty and case-insensitive duplicate tags", () => {
    render(createElement(TagsHarness));
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "prompt" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toContain("já foi adicionada");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
  it("removes the last chip with empty-input Backspace but preserves typed text", () => {
    render(createElement(TagsHarness));
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "Novo" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getAllByRole("button")).toHaveLength(2);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.queryByText("Prompt")).toBeNull();
  });
  it("enforces the existing thirty-tag contract", () => {
    render(createElement(TagsHarness, { initial: Array.from({ length: 30 }, (_, index) => `Tag ${index}`) }));
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "Excedente" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toContain("30 tags");
    expect(screen.getAllByRole("button")).toHaveLength(30);
  });
});
describe("Atlas visual block catalog", () => {
  it("preserves all sixteen block types in categorized visual cards and focuses search", async () => {
    render(createElement(AtlasBlockPicker, { open: true, onOpenChange: vi.fn(), onSelect: vi.fn() }));
    expect(screen.getAllByRole("button")).toHaveLength(17);
    for (const label of ["Texto", "Visual", "Processo", "Sistema", "Outros"]) expect(screen.getByRole("region", { name: label })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Buscar bloco" })));
  });
  it("filters ignoring accents and returns the real type when selecting a card", () => {
    const select = vi.fn();
    render(createElement(AtlasBlockPicker, { open: true, onOpenChange: vi.fn(), onSelect: select }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "comparacao" } });
    fireEvent.click(screen.getByRole("button", { name: /Comparação/ }));
    expect(select).toHaveBeenCalledWith("comparison");
    expect(screen.queryByRole("button", { name: /Tipografia/ })).toBeNull();
  });
  it("shows an empty result and supports closing with Escape", () => {
    const close = vi.fn();
    render(createElement(AtlasBlockPicker, { open: true, onOpenChange: close, onSelect: vi.fn() }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByRole("status").textContent).toContain("Nenhum bloco");
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
  });
});
