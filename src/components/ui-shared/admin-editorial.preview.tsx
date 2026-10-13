"use client";

import { useState } from "react";
import type { AtlasContentBlock, AtlasSpecimen } from "@/specs/api.contracts";
import { AtlasItemRenderer } from "@/components/atlas/atlas-item-renderer";
import { Button } from "@/components/ui/button";
import { AdminEditorialHeader, AnimatedCollectionTabs, EditorialConfirmation, EditorialRegionState, EditorialToolbar, StatusCounterStrip } from "./admin-editorial";

const specimens: readonly AtlasSpecimen[] = [
  { component: "button", props: { label: "Continuar aula", variant: "primary", disabled: false } },
  { component: "field", props: { label: "Nome do projeto", placeholder: "Uma ideia concreta", helpText: "Campo de demonstração, sem persistência.", state: "default" } },
  { component: "card", props: { eyebrow: "Projeto", title: "Creative Studio", body: "Uma composição com hierarquia, contexto e uma ação.", actionLabel: "Ver projeto" } },
  { component: "badge", props: { label: "Publicado", tone: "success" } },
  { component: "callout", props: { title: "Contraste funcional", body: "Uma chamada explica o próximo passo.", tone: "info" } },
  { component: "navigation", props: { items: ["Visão geral", "Tokens", "Uso"], activeIndex: 0 } },
  { component: "editorial", props: { eyebrow: "Referência", title: "Uma decisão que você pode explicar", summary: "Hierarquia visual orienta a leitura." } },
];

const blocks: readonly AtlasContentBlock[] = [
  { id: "text", isVisible: true, type: "text", heading: "Texto com contexto", body: "Esta página é um laboratório isolado de componentes. Os exemplos não criam dados na plataforma." },
  { id: "section", isVisible: true, type: "section", heading: "Composições editoriais" },
  { id: "callout", isVisible: true, type: "callout", heading: "Uma orientação clara", body: "Os componentes mantêm os mesmos tokens no preview e na leitura do aluno." },
  { id: "comparison", isVisible: true, type: "comparison", heading: "Diferença decorativa × funcional", left: { eyebrow: "Sem direção", title: "Tudo disputa atenção", body: "Mesma hierarquia para mensagens diferentes." }, right: { eyebrow: "Com direção", title: "A ação se separa", body: "O contraste ajuda a identificar o próximo passo." }, emphasis: "right" },
  { id: "diagram", isVisible: true, type: "diagram", heading: "Rota de publicação", nodes: [{ label: "Rascunho", detail: "Registre a hipótese." }, { label: "Revisão", detail: "Confira o conteúdo." }, { label: "Publicação", detail: "Disponibilize para as aulas vinculadas." }] },
  { id: "steps", isVisible: true, type: "steps", heading: "Construção", items: [{ title: "Defina o objetivo", body: "Uma necessidade concreta." }, { title: "Registre a decisão", body: "Explique a escolha." }] },
  { id: "checklist", isVisible: true, type: "checklist", heading: "Qualidade antes de enviar", items: [{ label: "Clareza", detail: "Título e resumo definidos." }, { label: "Evidência", detail: "Inclua o resultado real." }] },
  { id: "list", isVisible: true, type: "list", ordered: false, items: ["Identidade", "Contraste", "Acessibilidade"] },
  { id: "do-dont", isVisible: true, type: "do_dont", heading: "Faça e evite", do: ["Nomeie a próxima ação"], dont: ["Depender apenas da cor"] },
  { id: "quote", isVisible: true, type: "quote", body: "Uma escolha vale mais quando pode ser explicada.", attribution: "Princípio da oficina" },
  { id: "code", isVisible: true, type: "code", language: "typescript", code: 'const status = "published";' },
  { id: "palette", isVisible: true, type: "palette", heading: "Tokens em contexto", colors: [{ name: "Ação", value: "#ff6b00", usage: "Próximo passo" }, { name: "Campo", value: "#101114", usage: "Área de trabalho" }] },
  { id: "typography", isVisible: true, type: "typography", heading: "Tipos com função", samples: [{ role: "Display", family: "DM Serif Display", weight: "400", sample: "Construção com evidências" }, { role: "Texto", family: "Inter", weight: "400", sample: "Explicação concreta em uma superfície de leitura." }, { role: "Metadado", family: "JetBrains Mono", weight: "500", sample: "v01 · revisão editorial" }] },
  { id: "image", isVisible: true, type: "image", source: { kind: "asset", assetId: "not-resolved", alt: "Exemplo do estado de imagem não disponível", caption: "O renderer nunca inventa uma URL para um asset." } },
  { id: "gallery", isVisible: true, type: "gallery", items: [{ kind: "asset", assetId: "gallery-a", alt: "Primeira evidência" }, { kind: "asset", assetId: "gallery-b", alt: "Segunda evidência" }] },
  ...specimens.map((specimen, index): AtlasContentBlock => ({ id: `specimen-${index}`, isVisible: true, type: "specimen", heading: `Espécime: ${specimen.component}`, ...specimen })),
];

export function AdminEditorialPreview() {
  const [tab, setTab] = useState("components");
  const [filter, setFilter] = useState("draft");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return <main className="mx-auto grid max-w-5xl gap-8 p-8">
    <AdminEditorialHeader eyebrow="Laboratório editorial" title="Componentes compartilhados" description="Demonstrações isoladas, sem acesso a dados reais." actions={<Button onClick={() => setOpen(true)}>Abrir confirmação</Button>} />
    <StatusCounterStrip items={[{ id: "draft", label: "Rascunhos", value: 3 }, { id: "published", label: "Publicados", value: 8 }, { id: "archived", label: "Arquivados", value: 2 }, { id: "loading", label: "Carregando", value: null }]} selected={filter} onSelect={setFilter} />
    <EditorialToolbar><AnimatedCollectionTabs items={[{ id: "components", label: "Componentes", panelId: "dev-components" }, { id: "states", label: "Estados", panelId: "dev-states" }, { id: "prompt", label: "Prompt", panelId: "dev-prompt" }]} value={tab} onChange={setTab} /></EditorialToolbar>
    {tab === "components" && <section id="dev-components" role="tabpanel" aria-label="Componentes"><AtlasItemRenderer contentBlocks={blocks} mode="preview" selectedBlockId={selected} onSelectBlock={setSelected} /></section>}
    {tab === "states" && <section id="dev-states" role="tabpanel" aria-label="Estados" className="grid gap-6"><EditorialRegionState state="loading" /><EditorialRegionState state="empty" description="Experimente outro filtro." action={<Button variant="outline">Limpar filtros</Button>} /><EditorialRegionState state="error" description="O formulário permanece disponível." action={<Button variant="outline">Tentar novamente</Button>} /></section>}
    {tab === "prompt" && <section id="dev-prompt" role="tabpanel" aria-label="Prompt"><AtlasItemRenderer contentBlocks={[]} artifact={{ type: "prompt", template: "Ajude [PÚBLICO] a construir [PROJETO]. Faça uma pergunta antes de sugerir.", variables: [{ token: "[PÚBLICO]", description: "Quem usará o resultado" }, { token: "[PROJETO]", description: "Qual resultado deseja" }], exampleInput: "Estudantes criando um assistente.", exampleOutput: "Qual problema o assistente vai resolver?" }} /></section>}
    <EditorialConfirmation open={open} onOpenChange={setOpen} title="Confirmar publicação" description="Esta é apenas uma demonstração de foco, teclado e resumo." confirmLabel="Concluir demonstração" onConfirm={() => setOpen(false)}><p>O conteúdo real permanece inalterado.</p></EditorialConfirmation>
  </main>;
}
