"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Copy, FileText, LibraryBig, Play, Search, Sparkles, SwatchBook, Video } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLiveApi } from "@/components/prototype/live-api";
import styles from "./knowledge-atlas.module.css";

type AtlasTab = "conceitos" | "prompts" | "design-systems";
type UnknownRecord = Record<string, unknown>;

const tabs: readonly { id: AtlasTab; label: string; description: string; icon: typeof BookOpen }[] = [
  { id: "conceitos", label: "Conceitos", description: "Ideias que sustentam suas decisões.", icon: BookOpen },
  { id: "prompts", label: "Prompts", description: "Estruturas para adaptar e testar.", icon: Sparkles },
  { id: "design-systems", label: "Sistemas de Design", description: "Referências que viram escolhas visuais.", icon: SwatchBook },
];

function string(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function array(value: unknown): readonly UnknownRecord[] { return Array.isArray(value) ? value.filter((item): item is UnknownRecord => typeof item === "object" && item !== null) : []; }
function itemId(item: UnknownRecord): string { return string(item.id); }
function title(item: UnknownRecord): string { return string(item.title, "Material em preparação"); }
function summary(item: UnknownRecord): string { return string(item.summary); }
function detailPath(tab: AtlasTab, id: string): string { return tab === "conceitos" ? `/api/student/concepts/${id}` : `/api/student/library/${id}`; }

export function KnowledgeAtlas() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams(); const reduceMotion = useReducedMotion();
  const rawTab = params.get("tab"); const tab: AtlasTab = rawTab === "prompts" || rawTab === "design-systems" ? rawTab : "conceitos";
  const selectedId = params.get("item"); const [search, setSearch] = useState(params.get("q") ?? ""); const deferredSearch = useDeferredValue(search.trim());
  const endpoint = tab === "conceitos" ? "/api/student/concepts" : `/api/student/library?kind=${tab === "prompts" ? "prompt" : "design_system"}`;
  const list = useLiveApi<UnknownRecord>(`${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=50${deferredSearch ? `&search=${encodeURIComponent(deferredSearch)}` : ""}`);
  const items = useMemo(() => array(list.data?.items), [list.data]);
  const activeId = selectedId && items.some((item) => itemId(item) === selectedId) ? selectedId : items[0] ? itemId(items[0]) : null;
  const detail = useLiveApi<UnknownRecord>(activeId ? detailPath(tab, activeId) : null);
  const activeTab = tabs.find((candidate) => candidate.id === tab)!;
  const total = typeof list.data?.facets === "object" && list.data?.facets !== null ? Number((list.data.facets as UnknownRecord).totalReleased ?? items.length) : items.length;

  useEffect(() => { setSearch(params.get("q") ?? ""); }, [params]);
  function navigate(next: Partial<Record<"tab" | "item" | "q", string | null>>, replace = false) {
    const query = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => value ? query.set(key, value) : query.delete(key));
    const href = `${pathname}?${query.toString()}`;
    if (replace) router.replace(href, { scroll: false }); else router.push(href, { scroll: false });
  }
  function changeSearch(value: string) { setSearch(value); navigate({ q: value || null, item: null }, true); }

  return <section className={styles.atlas}>
    <header className={styles.hero}>
      <div className={styles.heroSignal} aria-hidden="true"><i /><i /><i /><span /></div>
      <div><span className={styles.eyebrow}>Central de conhecimento · sinal liberado</span><h1>Atlas para transformar <em>referência</em> em decisão.</h1></div>
      <p>Materiais liberados acompanhando suas aulas. Leia, adapte, teste e volte para a construção com mais repertório.</p>
      <div className={styles.materialCount}><strong>{String(total).padStart(2, "0")}</strong><span>materiais<br />disponíveis agora</span></div>
    </header>
    <nav className={styles.tabs} aria-label="Coleções do Atlas" role="tablist">
      {tabs.map((candidate) => { const Icon = candidate.icon; const active = candidate.id === tab; return <button key={candidate.id} type="button" role="tab" aria-selected={active} className={active ? styles.tabActive : ""} onClick={() => navigate({ tab: candidate.id, item: null })}><Icon aria-hidden="true" /><span><strong>{candidate.label}</strong><small>{candidate.description}</small></span><b>0{candidate.id === "conceitos" ? 1 : candidate.id === "prompts" ? 2 : 3}</b></button>; })}
    </nav>
    <div className={styles.workspace}>
      <aside className={styles.index} aria-label={`Índice de ${activeTab.label}`}>
        <div className={styles.indexTop}><span>{activeTab.label}</span><small>{total} liberado{total === 1 ? "" : "s"}</small></div>
        <label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar em {activeTab.label}</span><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder={`Buscar em ${activeTab.label.toLowerCase()}…`} /></label>
        <div className={styles.filters}><button type="button">Todos os ciclos</button><button type="button">Tags <ChevronRight size={14} /></button></div>
        <div className={styles.resourceList} aria-live="polite">
          {list.loading ? <IndexSkeleton /> : list.error ? <IndexState title="Sinal interrompido" text={list.error.message} retry={() => void list.reload()} /> : items.length === 0 ? <IndexState title="O Atlas cresce com as aulas" text={search ? "Nenhum material encontrado. Limpe a busca para ver os conteúdos liberados." : "Novos conteúdos aparecerão aqui quando forem liberados."} /> : items.map((item, index) => <button key={itemId(item)} type="button" className={activeId === itemId(item) ? styles.resourceActive : styles.resource} onClick={() => navigate({ item: itemId(item) })}>
            <span className={styles.resourceNumber}>{String(index + 1).padStart(2, "0")}</span><span><strong>{title(item)}</strong><small>{summary(item)}</small><em>{tab === "conceitos" ? (item.videoDurationSeconds || item.videoDurationMinutes ? "Vídeo disponível" : "Somente leitura") : tab === "prompts" ? `${Number(item.variableCount ?? array((item.artifact as UnknownRecord)?.variables).length)} variável(is)` : `${Number(item.colorCount ?? array((item.artifact as UnknownRecord)?.palette).length)} cores`}</em></span><ChevronRight aria-hidden="true" /></button>)}
        </div>
        {Boolean((list.data?.facets as UnknownRecord | undefined)?.hasUpcoming) && <p className={styles.upcoming}><span />Outros materiais serão liberados nas próximas aulas.</p>}
      </aside>
      <main className={styles.reader} role="tabpanel" aria-label={activeTab.label}>
        <AnimatePresence mode="wait">
          {!activeId ? <ReaderState key="empty" title="Escolha um material" text="O detalhe completo será aberto aqui." /> : detail.loading ? <ReaderState key="loading" title="Abrindo o Atlas" text="Preparando o material selecionado." loading /> : detail.error ? <ReaderState key="error" title="Material indisponível" text={detail.error.message} retry={() => void detail.reload()} /> : detail.data ? <motion.article key={`${tab}-${activeId}`} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: .3 }}><Reader tab={tab} item={detail.data} onRelated={(id, relatedTab) => navigate({ tab: relatedTab, item: id })} /></motion.article> : null}
        </AnimatePresence>
      </main>
    </div>
  </section>;
}

function IndexSkeleton() { return <div className={styles.skeletons}>{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>; }
function IndexState({ title, text, retry }: { title: string; text: string; retry?: () => void }) { return <div className={styles.indexState}><LibraryBig aria-hidden="true" /><strong>{title}</strong><p>{text}</p>{retry && <button type="button" onClick={retry}>Tentar novamente</button>}</div>; }
function ReaderState({ title, text, retry, loading }: { title: string; text: string; retry?: () => void; loading?: boolean }) { return <div className={styles.readerState}>{loading && <span className={styles.loader} />}<BookOpen aria-hidden="true" /><h2>{title}</h2><p>{text}</p>{retry && <button type="button" onClick={retry}>Tentar novamente</button>}</div>; }

function Reader({ tab, item, onRelated }: { tab: AtlasTab; item: UnknownRecord; onRelated: (id: string, tab: AtlasTab) => void }) {
  const related = array(item.relatedItems ?? item.relatedConcepts); const lesson = array(item.lessons)[0];
  return <><header className={styles.readerHeader}><Link href="/atlas" className={styles.back}><ArrowLeft size={16} />Voltar ao índice</Link><span>{tab === "conceitos" ? "Conceito" : tab === "prompts" ? "Prompt aplicável" : "Sistema de design"}</span><h2>{title(item)}</h2><p>{summary(item)}</p><div className={styles.meta}><span>{lesson ? `Aula ${String((lesson as UnknownRecord).position ?? "")}` : "Material liberado"}</span><span>{Number(item.readingMinutes ?? 4)} min de leitura</span>{tab === "conceitos" && <span>{item.video || item.videoUrl ? "vídeo + leitura" : "somente leitura"}</span>}</div></header>
    {tab === "conceitos" ? <ConceptReader item={item} /> : tab === "prompts" ? <PromptReader item={item} /> : <SystemReader item={item} />}
    <Blocks blocks={array(item.blocks ?? item.contentBlocks)} />
    {related.length > 0 && <section className={styles.related}><span className={styles.eyebrow}>Continue conectando</span><h3>Explore a próxima referência.</h3><div>{related.map((relatedItem) => <button key={itemId(relatedItem)} type="button" onClick={() => onRelated(itemId(relatedItem), relatedItem.kind === "prompt" ? "prompts" : relatedItem.kind === "design_system" ? "design-systems" : "conceitos")}><span>{relatedItem.kind === "prompt" ? <Sparkles /> : relatedItem.kind === "design_system" ? <SwatchBook /> : <BookOpen />}</span><strong>{title(relatedItem)}</strong><ChevronRight /></button>)}</div></section>}
  </>;
}

function ConceptReader({ item }: { item: UnknownRecord }) { const video = (typeof item.video === "object" && item.video ? item.video as UnknownRecord : null); return <section className={styles.conceptLead}><VideoPanel videoId={string(video?.youtubeId ?? video?.id ?? item.videoUrl)} title={string(video?.title ?? item.videoTitle, title(item))} duration={Number(video?.durationSeconds ?? item.videoDurationMinutes ? Number(video?.durationSeconds ?? item.videoDurationMinutes) : 0)} /><div className={styles.conceptIntro}><span className={styles.eyebrow}>Objetivo de leitura</span><h3>{string(item.objective, "Entender a decisão por trás do conceito e reconhecer quando aplicá-lo.")}</h3><p>Use esta referência quando precisar explicar uma escolha, revisar seu processo ou fundamentar a próxima evidência.</p><dl><div><dt>Formato</dt><dd>{video || item.videoUrl ? "Vídeo + artigo" : "Artigo editorial"}</dd></div><div><dt>Ritmo</dt><dd>{Number(item.readingMinutes ?? 4)} min</dd></div></dl></div></section>; }

function VideoPanel({ videoId, title, duration }: { videoId: string; title: string; duration: number }) { const [play, setPlay] = useState(false); const youtubeId = videoId.match(/(?:youtu\.be\/|v=|embed\/)?([A-Za-z0-9_-]{11})/)?.[1]; if (!youtubeId) return <div className={styles.videoEmpty}><span className={styles.transmission} /><Video /><strong>Vídeo em preparação</strong><p>Comece pela leitura. Esta referência continua completa sem o vídeo.</p></div>; return <div className={styles.videoPanel}>{play ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1`} title={title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <button type="button" onClick={() => setPlay(true)} aria-label={`Reproduzir ${title}`}><span className={styles.videoGrid} /><span className={styles.play}><Play fill="currentColor" /></span><span className={styles.videoCopy}><b>Vídeo curto</b><small>{duration ? `${Math.ceil(duration / 60)} min` : "assistir agora"}</small></span></button>}</div>; }

function PromptReader({ item }: { item: UnknownRecord }) { const artifact = typeof item.artifact === "object" && item.artifact ? item.artifact as UnknownRecord : item; const template = string(artifact.template, "Defina {{contexto}}, o resultado esperado e as restrições antes de solicitar uma resposta."); const variables = array(artifact.variables); return <section className={styles.promptPanel}><div><span className={styles.eyebrow}>Template adaptável</span><h3>Comece pela estrutura. Depois, dê o seu contexto.</h3><p>Este prompt não é uma resposta pronta: ele ajuda a tornar o pedido mais claro e verificável.</p></div><PromptCopy template={template} variables={variables} /></section>; }
function PromptCopy({ template, variables }: { template: string; variables: readonly UnknownRecord[] }) { const [custom, setCustom] = useState(false); const [values, setValues] = useState<Record<string, string>>({}); const [copied, setCopied] = useState(false); const resolved = template.replace(/{{[^}]+}}/g, (token) => values[token] || token); async function copy() { try { await navigator.clipboard.writeText(resolved); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { window.getSelection()?.selectAllChildren(document.getElementById("atlas-prompt-template")!); } } return <div className={styles.promptCopy}><pre id="atlas-prompt-template">{resolved}</pre><div className={styles.copyActions}><button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Prompt copiado" : "Copiar prompt"}</button><button type="button" className={styles.secondary} onClick={() => setCustom((value) => !value)}>Personalizar antes de copiar</button></div>{custom && <div className={styles.personalize}>{variables.map((variable) => { const token = string(variable.token); return <label key={token}><span>{token}</span><small>{string(variable.description)}</small><input value={values[token] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [token]: event.target.value }))} placeholder="Escreva a sua versão" /></label>})}</div>}</div>; }

function SystemReader({ item }: { item: UnknownRecord }) { const artifact = typeof item.artifact === "object" && item.artifact ? item.artifact as UnknownRecord : item; const palette = array(artifact.palette); const type = array(artifact.typography); return <section className={styles.systemPanel}><div className={styles.systemIntro}><span className={styles.eyebrow}>Espécime vivo</span><h3>{string(artifact.purpose, "Uma referência visual para transformar intenção em interface.")}</h3><p>{string(item.body, "Observe a relação entre contraste, espaço, tipografia e ação antes de escolher o que levar para o seu projeto.")}</p></div><div className={styles.specimen}><div className={styles.swatches}>{palette.slice(0, 5).map((color) => <button key={string(color.value)} type="button" style={{ backgroundColor: string(color.value, "#ff6b00") }} onClick={() => void navigator.clipboard?.writeText(string(color.value))} title={`Copiar ${string(color.value)}`}><span>{string(color.name)}</span></button>)}</div><div className={styles.specimenContent}><span className={styles.specimenBadge}>Sinal ativo</span><h4>{string(type[0]?.sample, "Uma ideia com direção.")}</h4><p>Tokens controlados mantêm cada componente legível, coerente e seguro para adaptar.</p><button type="button">Ação principal <ArrowUpRight /></button></div></div></section>; }

function Blocks({ blocks }: { blocks: readonly UnknownRecord[] }) { if (!blocks.length) return null; return <div className={styles.blocks}>{blocks.map((block, index) => { const type = string(block.type); const content = block.content ?? block.body; if (type === "heading") return <h3 key={string(block.id, String(index))}>{string(block.text)}</h3>; if (type === "list") return <ul key={string(block.id, String(index))}>{array(block.items).map((item, itemIndex) => <li key={itemIndex}>{string(item.text, JSON.stringify(item))}</li>)}</ul>; if (type === "callout") return <aside key={string(block.id, String(index))}><FileText /><div><strong>{string(block.title ?? block.heading)}</strong><p>{typeof content === "string" ? content : ""}</p></div></aside>; if (type === "diagram") return <div className={styles.diagram} key={string(block.id, String(index))}><strong>{string(block.heading)}</strong><div>{array(block.nodes).map((node) => <span key={string(node.label)}><b>{string(node.label)}</b><small>{string(node.detail)}</small></span>)}</div></div>; return <section key={string(block.id, String(index))}><h3>{string(block.heading)}</h3><p>{typeof content === "string" ? content : ""}</p></section>; })}</div>; }
