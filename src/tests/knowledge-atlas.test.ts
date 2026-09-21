import { describe, expect, it, vi } from "vitest";

import type {
  AdminKnowledgeItemDetail,
  AdminKnowledgePage,
  AtlasPage,
  AtlasConceptSummary,
  ConceptDetail,
  KnowledgeAsset,
  KnowledgeDocument,
  LibraryResourceDetail,
  LibraryResourceSummary,
} from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import {
  adminAtlasCreateController,
  adminAtlasDetailController,
  adminAtlasListController,
  adminAtlasPublishController,
  type AtlasControllerDeps,
} from "@/src/modules/knowledge-atlas/controller";
import { publishIssues } from "@/src/modules/knowledge-atlas/publish-issues";
import type { AdminWriteInput, AssetPathEntry, AtlasActor, KnowledgeAtlasStore } from "@/src/modules/knowledge-atlas/repository";
import {
  AtlasConceptsQuerySchema,
  KnowledgeAssetUploadInputSchema,
  KnowledgeDocumentSchema,
} from "@/src/modules/knowledge-atlas/schema";
import { KnowledgeAtlasService } from "@/src/modules/knowledge-atlas/service";
import { normalizeYouTubeVideoId } from "@/src/modules/knowledge-atlas/youtube";

const actor: AtlasActor = {
  tenantId: "10000000-0000-0000-0000-000000000001",
  userId: "11000000-0000-0000-0000-000000000001",
};
const itemId = "20000000-0000-0000-0000-000000000001";
const assetIdReady = "30000000-0000-0000-0000-000000000001";
const assetIdUnused = "30000000-0000-0000-0000-000000000002";
const lessonId = "40000000-0000-0000-0000-000000000001";

function conceptDocument(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    kind: "concept",
    title: "Vetores",
    slug: "vetores",
    summary: "Introdução a vetores.",
    tags: ["matematica"],
    readingMinutes: 5,
    blocks: [
      { id: "b1", type: "rich_text", content: [[{ text: "Um vetor tem direção e sentido." }]] },
      { id: "b2", type: "image", image: { assetId: assetIdReady, alt: "Diagrama de vetor", caption: null, width: 800, height: 600 } },
    ],
    artifact: {
      type: "concept",
      objective: "Entender vetores.",
      video: { provider: "youtube", videoId: "dQw4w9WgXcQ", title: "Vetores", durationSeconds: 300, transcript: "Transcrição completa.", captionsReviewed: true },
      summaryPoints: ["Vetores têm módulo, direção e sentido."],
      reviewQuestions: ["O que é um vetor?"],
    },
    ...overrides,
  };
}

function promptDocument(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    kind: "prompt",
    title: "Prompt de revisão",
    slug: "prompt-revisao",
    summary: "Revisa um texto.",
    tags: [],
    readingMinutes: 3,
    blocks: [],
    artifact: {
      type: "prompt",
      objective: "Revisar textos.",
      whenToUse: ["Ao revisar rascunhos."],
      whenNotToUse: ["Ao escrever do zero."],
      template: "Revise o texto: {{texto}} com tom {{tom}}.",
      anatomy: [],
      variables: [
        { key: "texto", label: "Texto", description: "Texto a revisar.", example: "Olá.", required: true },
        { key: "tom", label: "Tom", description: "Tom desejado.", example: "formal", required: true },
      ],
      exampleInput: "Olá, tudo bem?",
      exampleOutput: "Prezados, tudo bem?",
      cautions: [],
      adaptMinutes: 2,
    },
    ...overrides,
  };
}

function designSystemDocument(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    kind: "design_system",
    title: "Design System Logos",
    slug: "design-system-logos",
    summary: "Paleta e componentes.",
    tags: [],
    readingMinutes: 4,
    blocks: [],
    artifact: {
      type: "design_system",
      purpose: "Consistência visual.",
      context: "Usado na Academy.",
      principles: [],
      palette: [{ name: "primary", value: "#FF6600", role: "Ação principal" }],
      typography: [],
      spacing: [],
      radii: [],
      components: [{ id: "c1", kind: "button", label: "Botão", description: "Botão primário.", copy: ["Enviar"], tokens: { background: "primary", foreground: "primary", accent: null, border: null }, radius: null }],
      usageExamples: [],
      dos: [],
      donts: [],
      referenceImages: [],
    },
    ...overrides,
  };
}

const readyAsset: KnowledgeAsset = { id: assetIdReady, filename: "vetor.png", contentType: "image/png", sizeBytes: 1000, width: 800, height: 600, status: "ready", url: null };

function emptyPage<T>(): AtlasPage<T> {
  return { items: [], nextCursor: null, facets: { totalReleased: 0, tags: [], lessons: [], hasUpcoming: false } };
}

function adminDetailFixture(overrides: Partial<AdminKnowledgeItemDetail> = {}): AdminKnowledgeItemDetail {
  return {
    id: itemId,
    kind: "concept",
    status: "draft",
    title: "Vetores",
    slug: "vetores",
    summary: "Introdução a vetores.",
    tags: ["matematica"],
    curriculumId: "50000000-0000-0000-0000-000000000001",
    curriculumName: "Explorer",
    lessons: [],
    hasUnpublishedChanges: true,
    publishedAt: null,
    archivedAt: null,
    updatedAt: "2026-09-16T10:00:00.000Z",
    updatedBy: null,
    document: conceptDocument(),
    publishedDocument: null,
    lessonTemplateIds: [lessonId],
    assets: [readyAsset],
    publishIssues: [],
    ...overrides,
  };
}

class FakeStore implements KnowledgeAtlasStore {
  assetPathsCalls: (readonly string[])[] = [];
  signedUrlCalls: (readonly string[])[] = [];
  adminUpdateCalled = false;
  adminPublishCalled = false;
  adminDetailResult: AdminKnowledgeItemDetail = adminDetailFixture();
  adminUpdateError: AppError | null = null;

  async studentConceptsPage(): Promise<AtlasPage<AtlasConceptSummary>> { return emptyPage(); }
  async studentConceptDetail(): Promise<ConceptDetail> { throw new Error("not used"); }
  async studentLibraryPage(): Promise<AtlasPage<LibraryResourceSummary>> { return emptyPage(); }
  async studentLibraryDetail(): Promise<LibraryResourceDetail> { throw new Error("not used"); }

  async adminPage(): Promise<AdminKnowledgePage> { return { ...emptyPage<never>(), options: { curricula: [], tags: [] } } as unknown as AdminKnowledgePage; }
  async adminDetail(): Promise<AdminKnowledgeItemDetail> { return this.adminDetailResult; }
  async adminCreate(_actor: AtlasActor, _input: AdminWriteInput, _requestId: string): Promise<AdminKnowledgeItemDetail> { return this.adminDetailResult; }
  async adminUpdate(): Promise<AdminKnowledgeItemDetail> {
    this.adminUpdateCalled = true;
    if (this.adminUpdateError) throw this.adminUpdateError;
    return this.adminDetailResult;
  }
  async adminPublish(): Promise<AdminKnowledgeItemDetail> {
    this.adminPublishCalled = true;
    return { ...this.adminDetailResult, status: "published", publishedDocument: this.adminDetailResult.document };
  }
  async adminArchive(): Promise<AdminKnowledgeItemDetail> { return { ...this.adminDetailResult, status: "archived", archivedAt: "2026-09-16T12:00:00.000Z" }; }

  async createAsset(): Promise<{ asset: KnowledgeAsset; storagePath: string }> { return { asset: { ...readyAsset, status: "pending", url: null }, storagePath: `${actor.tenantId}/${assetIdReady}` }; }
  async finalizeAsset(): Promise<KnowledgeAsset> { return readyAsset; }
  async assetPaths(_tenantId: string, assetIds: readonly string[]): Promise<readonly AssetPathEntry[]> {
    this.assetPathsCalls.push(assetIds);
    return assetIds.map((id) => ({ id, storagePath: `${actor.tenantId}/${id}`, status: "ready" }));
  }
  async createSignedUploadUrl(path: string): Promise<{ signedUrl: string; expiresAt: string }> { return { signedUrl: `https://storage.example/${path}`, expiresAt: "2026-09-16T10:05:00.000Z" }; }
  async createSignedUrls(paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
    this.signedUrlCalls.push(paths);
    return new Map(paths.map((path) => [path, `https://signed.example/${path}`]));
  }
}

describe("knowledge-atlas/schema", () => {
  it("aceita um KnowledgeDocument de concept válido", () => {
    expect(() => KnowledgeDocumentSchema.parse(conceptDocument())).not.toThrow();
  });

  it("rejeita href javascript: em texto inline", () => {
    const document = conceptDocument({ blocks: [{ id: "b1", type: "rich_text", content: [[{ text: "clique", href: "javascript:alert(1)" }]] }] });
    expect(() => KnowledgeDocumentSchema.parse(document)).toThrow();
  });

  it("rejeita URL protocolo-relativa (//) como se fosse caminho interno", () => {
    const document = conceptDocument({ blocks: [{ id: "b1", type: "rich_text", content: [[{ text: "clique", href: "//evil.example.com" }]] }] });
    expect(() => KnowledgeDocumentSchema.parse(document)).toThrow();
  });

  it("aceita href https e caminho interno começando por um único /", () => {
    const document = conceptDocument({ blocks: [{ id: "b1", type: "rich_text", content: [[{ text: "a", href: "https://example.com" }, { text: "b", href: "/atlas" }]] }] });
    expect(() => KnowledgeDocumentSchema.parse(document)).not.toThrow();
  });

  it("rejeita hex inválido na paleta do design system", () => {
    const document = designSystemDocument();
    if (document.artifact.type !== "design_system") throw new Error("fixture inválida");
    document.artifact.palette[0].value = "orange";
    expect(() => KnowledgeDocumentSchema.parse(document)).toThrow();
  });

  it("rejeita blocos com IDs duplicados e artifact.type divergente do kind", () => {
    const duplicated = conceptDocument({ blocks: [{ id: "dup", type: "heading", level: 2, text: "A" }, { id: "dup", type: "heading", level: 2, text: "B" }] });
    expect(() => KnowledgeDocumentSchema.parse(duplicated)).toThrow();
    const mismatched = { ...conceptDocument(), kind: "prompt" as const };
    expect(() => KnowledgeDocumentSchema.parse(mismatched)).toThrow();
  });

  it("permite rascunho estruturalmente incompleto (GWT-08): título, slug e resumo vazios", () => {
    const draft = conceptDocument({ title: "", slug: "", summary: "" });
    expect(() => KnowledgeDocumentSchema.parse(draft)).not.toThrow();
  });

  it("trata query boolean de string sem o efeito colateral de z.coerce.boolean()", () => {
    expect(AtlasConceptsQuerySchema.parse({ hasVideo: "false", limit: "10" }).hasVideo).toBe(false);
    expect(AtlasConceptsQuerySchema.parse({ hasVideo: "true" }).hasVideo).toBe(true);
    expect(() => AtlasConceptsQuerySchema.parse({ unknown: "1" })).toThrow();
  });

  it("rejeita asset acima de 5 MB e com largura/altura zero", () => {
    expect(() => KnowledgeAssetUploadInputSchema.parse({ filename: "a.png", contentType: "image/png", sizeBytes: 5 * 1024 * 1024 + 1, width: 10, height: 10 })).toThrow();
    expect(() => KnowledgeAssetUploadInputSchema.parse({ filename: "a.png", contentType: "image/png", sizeBytes: 100, width: 0, height: 10 })).toThrow();
  });
});

describe("knowledge-atlas/youtube", () => {
  it("normaliza os formatos aceitos pela spec", () => {
    expect(normalizeYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toBe("dQw4w9WgXcQ");
    expect(normalizeYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(normalizeYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(normalizeYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(normalizeYouTubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(normalizeYouTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejeita outros domínios, protocolo não HTTPS e IDs malformados", () => {
    expect(normalizeYouTubeVideoId("https://vimeo.com/123456789")).toBeNull();
    expect(normalizeYouTubeVideoId("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(normalizeYouTubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(normalizeYouTubeVideoId("https://www.youtube.com/watch?v=has spaces")).toBeNull();
    expect(normalizeYouTubeVideoId("not a url")).toBeNull();
  });
});

describe("knowledge-atlas/publish-issues", () => {
  it("GWT-09 acusa ausência de aulas, resumo e título/slug", () => {
    const document = conceptDocument({ title: "", slug: "", summary: "" });
    const issues = publishIssues(document, [], [readyAsset]);
    expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(["lessonTemplateIds", "title", "slug", "summary"]));
  });

  it("GWT-10 acusa vídeo sem transcrição e sem legenda revisada; aceita quando completo", () => {
    const incomplete = conceptDocument();
    if (incomplete.artifact.type !== "concept" || !incomplete.artifact.video) throw new Error("fixture inválida");
    incomplete.artifact.video.transcript = "";
    incomplete.artifact.video.captionsReviewed = false;
    const issues = publishIssues(incomplete, [lessonId], [readyAsset]);
    expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(["artifact.video.transcript", "artifact.video.captionsReviewed"]));

    const complete = conceptDocument();
    expect(publishIssues(complete, [lessonId], [readyAsset])).toEqual([]);
  });

  it("GWT-11 acusa imagem sem alt e asset que não está pronto", () => {
    const noAlt = conceptDocument({ blocks: [{ id: "b1", type: "image", image: { assetId: assetIdReady, alt: "", caption: null, width: 10, height: 10 } }] });
    const issuesNoAlt = publishIssues(noAlt, [lessonId], [readyAsset]);
    expect(issuesNoAlt.some((issue) => issue.path === "blocks[0].image.alt")).toBe(true);

    const notReady = conceptDocument({ blocks: [{ id: "b1", type: "image", image: { assetId: assetIdReady, alt: "Alt", caption: null, width: 10, height: 10 } }] });
    const issuesNotReady = publishIssues(notReady, [lessonId], [{ ...readyAsset, status: "pending" }]);
    expect(issuesNotReady.some((issue) => issue.path === "blocks[0].image.assetId")).toBe(true);

    const missingAsset = publishIssues(notReady, [lessonId], []);
    expect(missingAsset.some((issue) => issue.path === "blocks[0].image.assetId")).toBe(true);
  });

  it("acusa prompt sem template e variável do template não declarada", () => {
    const empty = promptDocument({ artifact: { ...promptDocument().artifact as Extract<KnowledgeDocument["artifact"], { type: "prompt" }>, template: "" } });
    expect(publishIssues(empty, [lessonId], []).some((issue) => issue.path === "artifact.template")).toBe(true);

    const undeclared = promptDocument();
    if (undeclared.artifact.type !== "prompt") throw new Error("fixture inválida");
    undeclared.artifact.template = "Use {{texto}} e {{estilo}}.";
    const issues = publishIssues(undeclared, [lessonId], []);
    expect(issues.some((issue) => issue.path === "artifact.template" && issue.message.includes("estilo"))).toBe(true);

    expect(publishIssues(promptDocument(), [lessonId], [])).toEqual([]);
  });

  it("acusa design system sem paleta e preview referenciando cor inexistente", () => {
    const noPalette = designSystemDocument();
    if (noPalette.artifact.type !== "design_system") throw new Error("fixture inválida");
    noPalette.artifact.palette = [];
    expect(publishIssues(noPalette, [lessonId], []).some((issue) => issue.path === "artifact.palette")).toBe(true);

    const badToken = designSystemDocument();
    if (badToken.artifact.type !== "design_system") throw new Error("fixture inválida");
    badToken.artifact.components[0].tokens.background = "cor-inexistente";
    const issues = publishIssues(badToken, [lessonId], []);
    expect(issues.some((issue) => issue.path === "artifact.components[0].tokens.background")).toBe(true);

    expect(publishIssues(designSystemDocument(), [lessonId], [])).toEqual([]);
  });
});

describe("knowledge-atlas/service", () => {
  it("assina URL somente para assets referenciados no documento (não para assets não usados)", async () => {
    const store = new FakeStore();
    store.adminDetailResult = adminDetailFixture({ assets: [readyAsset, { ...readyAsset, id: assetIdUnused }] });
    const service = new KnowledgeAtlasService(store);
    const detail = await service.adminDetail(actor, itemId, "req-1");
    expect(store.assetPathsCalls[0]).toEqual([assetIdReady]);
    expect(detail.assets.find((asset) => asset.id === assetIdReady)?.url).toBe(`https://signed.example/${actor.tenantId}/${assetIdReady}`);
    expect(detail.assets.find((asset) => asset.id === assetIdUnused)?.url).toBeNull();
    const imageBlock = detail.document.blocks.find((block) => block.type === "image");
    if (imageBlock?.type !== "image") throw new Error("bloco de imagem ausente");
    expect(imageBlock.image.url).toBe(`https://signed.example/${actor.tenantId}/${assetIdReady}`);
  });

  it("bloqueia publish com VALIDATION_ERROR + fieldErrors antes de chamar a RPC quando há pendências", async () => {
    const store = new FakeStore();
    store.adminDetailResult = adminDetailFixture({ lessonTemplateIds: [], document: conceptDocument({ summary: "" }) });
    const service = new KnowledgeAtlasService(store);
    await expect(service.adminPublish(actor, { itemId, expectedUpdatedAt: "2026-09-16T10:00:00.000Z" }, "req-2")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: expect.objectContaining({ lessonTemplateIds: expect.any(Array), summary: expect.any(Array) }),
    });
    expect(store.adminPublishCalled).toBe(false);
  });

  it("publica quando não há pendências e propaga o documento assinado", async () => {
    const store = new FakeStore();
    const service = new KnowledgeAtlasService(store);
    const detail = await service.adminPublish(actor, { itemId, expectedUpdatedAt: "2026-09-16T10:00:00.000Z" }, "req-3");
    expect(store.adminPublishCalled).toBe(true);
    expect(detail.status).toBe("published");
  });

  it("propaga CONFLICT do repositório (edição concorrente) sem mascarar o código", async () => {
    const store = new FakeStore();
    store.adminUpdateError = new AppError("CONFLICT", "Editado por outra pessoa.", "req-4");
    const service = new KnowledgeAtlasService(store);
    await expect(service.adminUpdate(actor, {
      itemId,
      expectedUpdatedAt: "2026-09-16T10:00:00.000Z",
      curriculumId: "50000000-0000-0000-0000-000000000001",
      lessonTemplateIds: [lessonId],
      document: conceptDocument(),
    }, "req-4")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("arquiva e retorna o item fora da visão estudantil sem exigir publishIssues vazio", async () => {
    const store = new FakeStore();
    const service = new KnowledgeAtlasService(store);
    const detail = await service.adminArchive(actor, { itemId, expectedUpdatedAt: "2026-09-16T10:00:00.000Z" }, "req-5");
    expect(detail.status).toBe("archived");
    expect(detail.archivedAt).not.toBeNull();
  });

  it("descarta qualquer url enviada pelo cliente antes de gravar o documento", async () => {
    const store = new FakeStore();
    const adminCreateSpy = vi.spyOn(store, "adminCreate");
    const service = new KnowledgeAtlasService(store);
    const documentWithUrl = conceptDocument();
    const imageBlock = documentWithUrl.blocks.find((block) => block.type === "image");
    if (imageBlock?.type !== "image") throw new Error("fixture inválida");
    (imageBlock.image as { url?: string }).url = "https://attacker.example/leak.png";
    await service.adminCreate(actor, { curriculumId: "50000000-0000-0000-0000-000000000001", lessonTemplateIds: [lessonId], document: documentWithUrl }, "req-6");
    const sentInput = adminCreateSpy.mock.calls[0][1];
    const sentImageBlock = sentInput.document.blocks.find((block) => block.type === "image");
    if (sentImageBlock?.type !== "image") throw new Error("bloco de imagem ausente no payload enviado");
    expect(sentImageBlock.image.url).toBeUndefined();
  });
});

describe("knowledge-atlas/controller", () => {
  function depsWith(overrides: Partial<AtlasControllerDeps>): AtlasControllerDeps {
    const store = new FakeStore();
    return {
      resolveStudent: async () => actor,
      resolveAdmin: async () => actor,
      service: new KnowledgeAtlasService(store),
      ...overrides,
    };
  }

  it("retorna 401 quando não há sessão (UNAUTHENTICATED)", async () => {
    const deps = depsWith({ resolveAdmin: async (requestId) => { throw new AppError("UNAUTHENTICATED", "Sessão obrigatória.", requestId); } });
    const response = await adminAtlasListController(new Request("https://app.example/api/admin/atlas"), deps);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("retorna 403 quando o usuário autenticado não é admin (sem admin)", async () => {
    const deps = depsWith({ resolveAdmin: async (requestId) => { throw new AppError("FORBIDDEN", "Acesso administrativo obrigatório.", requestId); } });
    const response = await adminAtlasDetailController(new Request("https://app.example/api/admin/atlas/" + itemId), itemId, deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("retorna 400 para corpo inválido (VALIDATION_ERROR) no create administrativo", async () => {
    const deps = depsWith({});
    const request = new Request("https://app.example/api/admin/atlas", { method: "POST", body: JSON.stringify({ curriculumId: "não-é-uuid" }) });
    const response = await adminAtlasCreateController(request, deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("retorna 400 quando publish é bloqueado por pendências (fieldErrors preservados no envelope HTTP)", async () => {
    const store = new FakeStore();
    store.adminDetailResult = adminDetailFixture({ lessonTemplateIds: [] });
    const deps = depsWith({ service: new KnowledgeAtlasService(store) });
    const request = new Request("https://app.example/api/admin/atlas/" + itemId + "/publish", { method: "POST", body: JSON.stringify({ expectedUpdatedAt: "2026-09-16T10:00:00.000Z" }) });
    const response = await adminAtlasPublishController(request, itemId, deps);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors.lessonTemplateIds).toBeDefined();
  });

  it("200 no caminho feliz de listagem administrativa", async () => {
    const deps = depsWith({});
    const response = await adminAtlasListController(new Request("https://app.example/api/admin/atlas"), deps);
    expect(response.status).toBe(200);
  });
});
