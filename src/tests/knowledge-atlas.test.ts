import { describe, expect, it } from "vitest";

import {
  fillPromptTemplate,
  libraryKindForTab,
  normalizeAtlasTab,
  youtubeIdFromUrl,
} from "@/src/lib/knowledge-atlas";

describe("knowledge atlas helpers", () => {
  it("normaliza tabs e converte a coleção para o tipo da API", () => {
    expect(normalizeAtlasTab("prompts")).toBe("prompts");
    expect(normalizeAtlasTab("desconhecida")).toBe("conceitos");
    expect(libraryKindForTab("design-systems")).toBe("design_system");
  });

  it("personaliza somente variáveis preenchidas", () => {
    expect(
      fillPromptTemplate("Para [PÚBLICO], crie [SAÍDA].", {
        "[PÚBLICO]": "estudantes",
        "[SAÍDA]": " ",
      }),
    ).toBe("Para estudantes, crie [SAÍDA].");
  });

  it("aceita apenas URLs conhecidas do YouTube com id válido", () => {
    expect(youtubeIdFromUrl("https://youtu.be/abcdefghijk")).toBe(
      "abcdefghijk",
    );
    expect(
      youtubeIdFromUrl("https://www.youtube.com/embed/abcdefghijk"),
    ).toBe("abcdefghijk");
    expect(youtubeIdFromUrl("https://example.com/abcdefghijk")).toBeNull();
  });
});
