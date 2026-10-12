import { describe, expect, it } from "vitest";
import { draftSchema, parseInput, listQuerySchema } from "@/src/modules/atlas-cms/schema";

const id = "9f4ba958-87cc-78bd-5519-489112aeba3a";
const draft = { kind: "concept", title: "Conceito", slug: "conceito", summary: "", tags: [], lessonTemplateIds: [], contentBlocks: [], video: null, artifact: null };

describe("atlas-cms input boundaries", () => {
  it("preserva rascunhos incompletos e aceita IDs PostgreSQL determinísticos", () => {
    expect(parseInput(draftSchema, { ...draft, lessonTemplateIds: [id] }, "req")).toMatchObject({ summary: "", lessonTemplateIds: [id] });
  });
  it("recusa HTML/props arbitrárias e IDs duplicados antes de persistir", () => {
    const block = { id, isVisible: true, type: "text", heading: "Título", body: "Texto" };
    expect(() => parseInput(draftSchema, { ...draft, contentBlocks: [{ ...block, html: "<script/>" }] }, "req")).toThrow();
    expect(() => parseInput(draftSchema, { ...draft, contentBlocks: [block, block] }, "req")).toThrow();
  });
  it("pagina com limite máximo e mantém cursor opaco do banco", () => {
    expect(parseInput(listQuerySchema, { limit: "10", cursor: "WyJjdXJzb3IiXQ==" }, "req").limit).toBe(10);
    expect(() => parseInput(listQuerySchema, { limit: 51 }, "req")).toThrow();
  });
});
