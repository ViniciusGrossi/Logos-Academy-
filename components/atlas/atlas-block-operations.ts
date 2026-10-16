import type { AtlasContentBlock } from "@/specs/api.contracts";

export function duplicateAtlasBlock(blocks: readonly AtlasContentBlock[], id: string): AtlasContentBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0 || blocks.length >= 100) return [...blocks];
  const copy = structuredClone(blocks[index]);
  copy.id = crypto.randomUUID();
  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
}

export function restoreRemovedBlock(blocks: readonly AtlasContentBlock[], removed: { block: AtlasContentBlock; index: number }): AtlasContentBlock[] {
  if (blocks.length >= 100 || blocks.some((block) => block.id === removed.block.id)) return [...blocks];
  const index = Math.min(removed.index, blocks.length);
  return [...blocks.slice(0, index), structuredClone(removed.block), ...blocks.slice(index)];
}
