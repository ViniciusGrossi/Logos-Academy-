import type { AdminAtlasDetail, AdminAtlasDraftInput, AdminAtlasListItem, AdminAtlasOptions, AdminAtlasRevisionListItem, AtlasItemKind, Page } from "@/specs/api.contracts";
import { draftSchema } from "@/src/modules/atlas-cms/schema";
import { publicationErrors } from "@/src/lib/atlas-publication";
import { getDemoRole } from "@/src/lib/demo-mode";

/** Local visual QA only. The caller's demo-mode gate is disabled in production.
 * No database record, invitation, user account or external request is created. */
const lessonId = "43000000-0000-4000-8000-000000000001";
const demoProjects = ["Assistente Pessoal Inteligente", "Creative Studio", "Automation Lab", "MVP: Produto Inteligente"];
const demoLessons: AdminAtlasOptions["lessons"]["items"] = Array.from({ length: 16 }, (_, index) => ({
  id: `43000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  title: index === 0 ? "Contrato e interface do meu assistente" : `${demoProjects[Math.floor(index / 4)]} · construção ${index % 4 + 1}`,
  position: index % 4 + 1, cycleId: `42000000-0000-4000-8000-${String(Math.floor(index / 4) + 1).padStart(12, "0")}`,
  cycleTitle: demoProjects[Math.floor(index / 4)], cyclePosition: Math.floor(index / 4) + 1, curriculumId: "41000000-0000-4000-8000-000000000001",
}));
const records = new Map<string, AdminAtlasDetail>();
const revisions = new Map<string, { summary: AdminAtlasRevisionListItem; draft: AdminAtlasDraftInput }[]>();
let tick = Date.now();
function clock() { tick = Math.max(tick + 1, Date.now()); return new Date(tick).toISOString(); }
function initial(kind: AtlasItemKind, title: string, id = crypto.randomUUID()): AdminAtlasDetail {
  const common = { title, slug: `conteudo-${id.slice(0, 8)}`, summary: "Uma referência para transformar decisões de interface em evidências claras e explicáveis.", tags: ["Interface", "Acessibilidade"], lessonTemplateIds: [lessonId], contentBlocks: [{ id: crypto.randomUUID(), isVisible: true, type: "text" as const, heading: "Quando a cor não basta", body: "Uma diferença é funcional quando ajuda alguém a decidir. Observe o estado, o rótulo e a ação antes de escolher o tratamento visual." }, { id: crypto.randomUUID(), isVisible: true, type: "comparison" as const, heading: "Mesmo componente, duas intenções", left: { title: "Decorativa", body: "Apenas a cor muda. O estado depende de perceber pequenas diferenças." }, right: { title: "Funcional", body: "Cor, forma e rótulo trabalham juntos. A ação continua compreensível sem depender apenas da cor." }, emphasis: "right" as const }] };
  const base = { id, status: "draft" as const, itemUpdatedAt: clock(), draftUpdatedAt: clock(), publishedAt: null, archivedAt: null, hasWorkingDraft: true, revisionCount: 0, assets: [], resolvedAssets: [] };
  if (kind === "concept") return { ...base, kind, draft: { ...common, kind, video: null, artifact: null }, published: null };
  if (kind === "prompt") return { ...base, kind, draft: { ...common, kind, video: null, artifact: { type: "prompt", template: "Oriente a construção de {{tema}} sem fornecer a resposta pronta.", variables: [{ token: "tema", description: "Problema que o aluno quer explorar" }], exampleInput: "Uma interface de assistente", exampleOutput: "Quais estados precisam ficar claros para o usuário?" } }, published: null };
  return { ...base, kind, draft: { ...common, kind, video: null, contentBlocks: [...common.contentBlocks, { id: crypto.randomUUID(), isVisible: true, type: "palette", heading: "Cores com propósito", colors: [{ name: "Ação", value: "#ff6b00" }, { name: "Superfície", value: "#101114" }] }, { id: crypto.randomUUID(), isVisible: true, type: "specimen", heading: "Botão funcional", component: "button", props: { label: "Continuar", variant: "primary", disabled: false } }], artifact: { type: "design_system", palette: [], typography: [], principles: ["Clareza antes de decoração"], components: [] } }, published: null };
}
for (const [kind, title, id] of [["concept", "Diferença decorativa × diferença funcional", "44000000-0000-4000-8000-000000000001"], ["prompt", "Como orientar sem entregar a resposta", "44000000-0000-4000-8000-000000000002"], ["design_system", "Sistema visual do Assistente Pessoal", "44000000-0000-4000-8000-000000000003"]] as const) records.set(id, initial(kind, title, id));

export function atlasCmsDemo(url: URL, method: string, body?: Record<string, unknown>): unknown {
  if (getDemoRole() !== "admin") throw new Error("Acesso administrativo obrigatório.");
  const path = url.pathname; const part = path.split("/"); const id = part[4];
  if (path === "/api/admin/atlas/options") {
    const counts = { draft: 0, published: 0, archived: 0, concept: 0, prompt: 0, design_system: 0 };
    for (const item of records.values()) { counts[item.kind]++; counts[item.status]++; }
    return { lessons: { items: [...demoLessons], nextCursor: null }, counts } satisfies AdminAtlasOptions;
  }
  if (path === "/api/admin/atlas" && method === "GET") {
    const items = [...records.values()].filter((r) => (!url.searchParams.get("kind") || r.kind === url.searchParams.get("kind")) && (!url.searchParams.get("status") || r.status === url.searchParams.get("status")) && (!url.searchParams.get("lesson") || r.draft.lessonTemplateIds.includes(url.searchParams.get("lesson")!)) && `${r.draft.title} ${r.draft.tags.join(" ")}`.toLowerCase().includes((url.searchParams.get("search") ?? "").toLowerCase())).map((r) => ({ id: r.id, kind: r.kind, title: r.draft.title, summary: r.draft.summary, status: r.status, tags: r.draft.tags, linkedLessonCount: r.draft.lessonTemplateIds.length, hasWorkingDraft: r.hasWorkingDraft, itemUpdatedAt: r.itemUpdatedAt, draftUpdatedAt: r.draftUpdatedAt, updatedByUserId: null } satisfies AdminAtlasListItem));
    const offset = Number(url.searchParams.get("cursor") ?? 0); const limit = Number(url.searchParams.get("limit") ?? 25);
    return { items: items.slice(offset, offset + limit), nextCursor: offset + limit < items.length ? String(offset + limit) : null } satisfies Page<AdminAtlasListItem>;
  }
  if (path === "/api/admin/atlas" && method === "POST") { if (!["concept", "prompt", "design_system"].includes(String(body?.kind)) || !String(body?.title ?? "").trim()) throw new Error("Informe um título e uma coleção."); const item = initial(body!.kind as AtlasItemKind, String(body!.title)); records.set(item.id, item); return structuredClone(item); }
  const record = records.get(id); if (!record) throw new Error("Conteúdo não encontrado.");
  if (method === "GET" && part.length === 5) return structuredClone(record);
  if (method === "GET" && part[5] === "revisions") return { items: (revisions.get(id) ?? []).map((r) => r.summary).reverse(), nextCursor: null };
  if (method === "PATCH") {
    if (body?.expectedDraftUpdatedAt !== record.draftUpdatedAt) throw new Error("O conteúdo mudou em outra sessão. Recarregue antes de continuar.");
    const draft = draftSchema.parse(body?.draft); if (record.kind !== draft.kind) throw new Error("Coleção inválida."); record.draft = draft as typeof record.draft; record.draftUpdatedAt = clock(); record.hasWorkingDraft = true; append(record, "save"); return structuredClone(record);
  }
  if (method === "POST" && part[5] === "publish") { if (body?.expectedDraftUpdatedAt !== record.draftUpdatedAt || body?.expectedItemUpdatedAt !== record.itemUpdatedAt) throw new Error("O conteúdo mudou em outra sessão."); if (Object.values(publicationErrors(record)).flat().length) throw new Error("Resolva as pendências editoriais."); record.published = structuredClone(record.draft); record.status = "published"; record.publishedAt = clock(); record.itemUpdatedAt = clock(); record.hasWorkingDraft = false; append(record, "publish"); return structuredClone(record); }
  if (method === "POST" && part[5] === "archive") { if (body?.expectedItemUpdatedAt !== record.itemUpdatedAt) throw new Error("O conteúdo mudou em outra sessão."); record.status = "archived"; record.archivedAt = clock(); record.itemUpdatedAt = clock(); append(record, "archive"); return structuredClone(record); }
  if (method === "POST" && part[5] === "revisions" && part[7] === "restore") { if (body?.expectedDraftUpdatedAt !== record.draftUpdatedAt) throw new Error("O conteúdo mudou em outra sessão."); const version = revisions.get(id)?.find((r) => r.summary.revision === Number(part[6])); if (!version) throw new Error("Versão não encontrada."); record.draft = structuredClone(version.draft) as typeof record.draft; record.draftUpdatedAt = clock(); record.hasWorkingDraft = true; append(record, "restore"); return structuredClone(record); }
  throw new Error("Operação indisponível no modo de demonstração local.");
}
function append(item: AdminAtlasDetail, reason: AdminAtlasRevisionListItem["reason"]) { const list = revisions.get(item.id) ?? []; list.push({ summary: { revision: ++item.revisionCount, reason, title: item.draft.title, createdByUserId: "11000000-0000-4000-8000-000000000001", createdAt: clock() }, draft: structuredClone(item.draft) }); revisions.set(item.id, list); }
