// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAtlasBlock } from "@/components/atlas/atlas-block-editor";
import { duplicateAtlasBlock, restoreRemovedBlock } from "@/components/atlas/atlas-block-operations";
describe("operações editoriais preservam o conteúdo", () => {
  it("duplica com identidade nova e sem compartilhar referências", () => {
    const original = createAtlasBlock("checklist");
    const result = duplicateAtlasBlock([original], original.id);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ ...original, id: expect.any(String) });
    expect(result[1].id).not.toBe(original.id);
    expect(result[1]).not.toBe(original);
  });
  it("desfaz remoção na posição original sem apagar edições subsequentes", () => {
    const removed = createAtlasBlock("text");
    const changed = createAtlasBlock("section");
    const result = restoreRemovedBlock([changed], { block: removed, index: 0 });
    expect(result).toEqual([removed, changed]);
    expect(restoreRemovedBlock(result, { block: removed, index: 0 })).toEqual(result);
  });
});
