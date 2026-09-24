"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  ExternalLink,
  FileCode2,
  Network,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  SwatchBook,
  Video,
  WandSparkles,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ConceptDetail,
  ConceptSummary,
  KnowledgeContentBlock,
  LibraryArtifact,
  LibraryResourceDetail,
  LibraryResourceSummary,
  Page,
} from "@/specs/api.contracts";
import { StateScene } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import {
  type AtlasTab,
  fillPromptTemplate,
  libraryKindForTab,
  youtubeIdFromUrl,
} from "@/src/lib/knowledge-atlas";

import styles from "./knowledge-atlas.module.css";

type KnowledgeAtlasProps = {
  initialTab: AtlasTab;
  initialItem: string | null;
  initialSearch: string;
};

type AtlasSummary = ConceptSummary | LibraryResourceSummary;

const tabs = [
  {
    id: "conceitos",
    label: "Conceitos",
    description: "Entenda a ideia",
    icon: Network,
  },
  {
    id: "prompts",
    label: "Prompts",
    description: "Adapte uma estrutura",
    icon: WandSparkles,
  },
  {
    id: "design-systems",
    label: "Sistemas de Design",
    description: "Consulte decisões visuais",
    icon: SwatchBook,
  },
] satisfies readonly {
  id: AtlasTab;
  label: string;
  description: string;
  icon: typeof Network;
}[];

const tabCopy: Record<AtlasTab, { noun: string; empty: string; search: string }> = {
  conceitos: {
    noun: "conceitos",
    empty: "Os conceitos aparecem conforme suas aulas avançam.",
    search: "Buscar conceito, ideia ou aplicação",
  },
  prompts: {
    noun: "prompts",
    empty: "Novos prompts serão liberados quando fizerem sentido na jornada.",
    search: "Buscar prompt ou problema",
  },
  "design-systems": {
    noun: "sistemas",
    empty: "As referências visuais surgem quando você começa a construir interfaces.",
    search: "Buscar sistema, princípio ou uso",
  },
};

export function KnowledgeAtlas({
  initialTab,
  initialItem,
  initialSearch,
}: KnowledgeAtlasProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const readingProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    mass: 0.2,
  });
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search.trim());
  const query = deferredSearch
    ? `&search=${encodeURIComponent(deferredSearch)}`
    : "";
  const listUrl =
    initialTab === "conceitos"
      ? `/api/student/concepts?limit=50${query}`
      : `/api/student/library?kind=${libraryKindForTab(initialTab)}&limit=50${query}`;
  const conceptList = useLiveApi<Page<ConceptSummary>>(
    initialTab === "conceitos" ? listUrl : null,
  );
  const resourceList = useLiveApi<Page<LibraryResourceSummary>>(
    initialTab === "conceitos" ? null : listUrl,
  );
  const activeList = initialTab === "conceitos" ? conceptList : resourceList;
  const items = useMemo<readonly AtlasSummary[]>(
    () => activeList.data?.items ?? [],
    [activeList.data],
  );
  const selectedId =
    initialItem && items.some((item) => item.id === initialItem)
      ? initialItem
      : (items[0]?.id ?? null);

  const conceptDetail = useLiveApi<ConceptDetail>(
    initialTab === "conceitos" && selectedId
      ? `/api/student/concepts/${selectedId}`
      : null,
  );
  const resourceDetail = useLiveApi<LibraryResourceDetail>(
    initialTab !== "conceitos" && selectedId
      ? `/api/student/library/${selectedId}`
      : null,
  );
  const activeDetail =
    initialTab === "conceitos" ? conceptDetail : resourceDetail;

  const atlasHref = useCallback(
    (tab: AtlasTab, item?: string | null) => {
      const params = new URLSearchParams({ tab });
      if (search.trim()) params.set("q", search.trim());
      if (item) params.set("item", item);
      return `/atlas?${params.toString()}`;
    },
    [search],
  );

  useEffect(() => {
    if (!activeList.loading && selectedId && selectedId !== initialItem) {
      router.replace(atlasHref(initialTab, selectedId), { scroll: false });
    }
  }, [activeList.loading, atlasHref, initialItem, initialTab, router, selectedId]);

  function openItem(itemId: string) {
    router.push(atlasHref(initialTab, itemId), { scroll: false });
  }

  function clearSearch() {
    setSearch("");
  }

  return (
    <div className={styles.atlas} data-tab={initialTab}>
      <AtlasHeader activeTab={initialTab} count={items.length} />

      <nav className={styles.tabs} aria-label="Coleções do Atlas">
        {tabs.map(({ id, label, description, icon: Icon }) => (
          <Link
            key={id}
            href={atlasHref(id)}
            className={styles.tab}
            data-active={initialTab === id}
            aria-current={initialTab === id ? "page" : undefined}
            scroll={false}
          >
            {initialTab === id && (
              <motion.span
                className={styles.tabSurface}
                layoutId="atlas-active-tab"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                aria-hidden="true"
              />
            )}
            <Icon aria-hidden="true" />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </Link>
        ))}
      </nav>

      <AtlasKnowledgeMap
        tab={initialTab}
        count={items.length}
        selectedTitle={
          items.find((item) => item.id === selectedId)?.title ?? null
        }
      />

      <section className={styles.workspace} aria-label="Conteúdo do Atlas">
        <aside className={styles.index} aria-label={`Índice de ${tabCopy[initialTab].noun}`}>
          <div className={styles.indexTools}>
            <label className={styles.search}>
              <Search aria-hidden="true" />
              <span className="sr-only">{tabCopy[initialTab].search}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tabCopy[initialTab].search}
              />
              {search && (
                <button type="button" onClick={clearSearch} aria-label="Limpar busca">
                  <RotateCcw aria-hidden="true" />
                </button>
              )}
            </label>
          </div>

          <div className={styles.indexMeta} aria-live="polite">
            <span>{activeList.loading ? "Calculando rota" : `${items.length} ${tabCopy[initialTab].noun} liberados`}</span>
            <span>Somente o que você já viu</span>
          </div>

          {activeList.loading ? (
            <AtlasIndexSkeleton />
          ) : activeList.error ? (
            <StateScene
              layout="concepts"
              state="error"
              title="Interrupção no sinal do Atlas"
              description={activeList.error.message}
              action={
                <button className="button-secondary" onClick={() => void activeList.reload()}>
                  Tentar novamente
                </button>
              }
            />
          ) : items.length === 0 ? (
            <StateScene
              layout="concepts"
              state="empty"
              title={deferredSearch ? "Nenhuma conexão encontrada" : "O Atlas cresce com suas aulas"}
              description={
                deferredSearch
                  ? "A busca continua aqui. Tente outro termo ou limpe o campo."
                  : tabCopy[initialTab].empty
              }
              action={
                deferredSearch ? (
                  <button className="button-secondary" onClick={clearSearch}>
                    Limpar busca
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className={styles.resourceList}>
              {items.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className={styles.resourceItem}
                  data-active={item.id === selectedId}
                  aria-current={item.id === selectedId ? "true" : undefined}
                  onClick={() => openItem(item.id)}
                  whileHover={reduceMotion ? undefined : { x: 4 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className={styles.resourceCode}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.resourceCopy}>
                    <strong>{item.title}</strong>
                    <small>{item.summary}</small>
                    <span className={styles.resourceMeta}>
                      {"lessonPosition" in item ? `Aula ${item.lessonPosition}` : "Conceito liberado"}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </motion.button>
              ))}
              <div className={styles.futureCue}>
                <Sparkles aria-hidden="true" />
                <span>
                  <strong>O mapa ainda vai crescer.</strong>
                  <small>Novos pontos aparecem sem revelar o conteúdo das próximas aulas.</small>
                </span>
              </div>
            </div>
          )}
        </aside>

        <article className={styles.reader} aria-labelledby="atlas-reader-title">
          <div className={styles.readingRail} aria-hidden="true">
            <motion.span style={{ scaleX: reduceMotion ? scrollYProgress : readingProgress }} />
          </div>
          {!selectedId ? (
            <StateScene
              state="empty"
              title="Escolha um ponto do mapa"
              description="O material completo será aberto neste espaço."
            />
          ) : activeDetail.loading ? (
            <AtlasReaderSkeleton tab={initialTab} />
          ) : activeDetail.error ? (
            <StateScene
              state="error"
              title="Este material perdeu o sinal"
              description={activeDetail.error.message}
              action={
                <button className="button-secondary" onClick={() => void activeDetail.reload()}>
                  Reconectar material
                </button>
              }
            />
          ) : initialTab === "conceitos" && conceptDetail.data ? (
            <ConceptReader
              key={conceptDetail.data.id}
              detail={conceptDetail.data}
              onOpenRelated={openItem}
            />
          ) : resourceDetail.data ? (
            <ResourceReader
              key={resourceDetail.data.id}
              detail={resourceDetail.data}
              onOpenRelated={openItem}
            />
          ) : null}
        </article>
      </section>
    </div>
  );
}

function AtlasHeader({ activeTab, count }: { activeTab: AtlasTab; count: number }) {
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <span className={styles.signalLabel}>
          <Network aria-hidden="true" /> Central de conhecimento · sinal ativo
        </span>
        <h1>Atlas</h1>
        <p>
          Recupere uma ideia, adapte uma estrutura e consulte decisões visuais sem sair da sua construção.
        </p>
      </div>
      <AtlasOrbitField activeTab={activeTab} />
      <div className={styles.headerStatus}>
        <span>{active.label}</span>
        <strong>{String(count).padStart(2, "0")}</strong>
        <small>materiais visíveis nesta coleção</small>
      </div>
    </header>
  );
}

function AtlasOrbitField({ activeTab }: { activeTab: AtlasTab }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.orbitField} aria-hidden="true" data-active={activeTab}>
      <svg viewBox="0 0 660 300" role="presentation">
        <defs>
          <radialGradient id="atlas-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className={styles.orbitAura} cx="378" cy="150" r="116" fill="url(#atlas-core)" />
        <ellipse className={styles.orbitRing} cx="378" cy="150" rx="205" ry="82" />
        <ellipse className={styles.orbitRing} cx="378" cy="150" rx="148" ry="118" transform="rotate(-18 378 150)" />
        <ellipse className={styles.orbitRingFine} cx="378" cy="150" rx="92" ry="92" />
        <motion.path
          className={styles.orbitRoute}
          d="M88 223 C188 94 265 218 378 150 S520 56 617 106"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle className={styles.orbitPoint} data-orbit="concepts" cx="88" cy="223" r="5" />
        <circle className={styles.orbitPoint} data-orbit="prompts" cx="378" cy="150" r="7" />
        <circle className={styles.orbitPoint} data-orbit="systems" cx="617" cy="106" r="5" />
        {!reduceMotion && (
          <circle className={styles.orbitSatellite} cx="0" cy="0" r="4">
            <animateMotion
              dur="7s"
              repeatCount="indefinite"
              path="M88 223 C188 94 265 218 378 150 S520 56 617 106"
            />
          </circle>
        )}
      </svg>
      <span className={styles.orbitLabel} data-label="concepts">conceitos</span>
      <span className={styles.orbitLabel} data-label="prompts">prompts</span>
      <span className={styles.orbitLabel} data-label="systems">sistemas</span>
    </div>
  );
}

function AtlasKnowledgeMap({
  tab,
  count,
  selectedTitle,
}: {
  tab: AtlasTab;
  count: number;
  selectedTitle: string | null;
}) {
  return (
    <section className={styles.knowledgeMap} aria-label="Mapa da coleção ativa">
      <div className={styles.mapCopy}>
        <span className={styles.signalLabel}>Mapa de domínio</span>
        <strong>{selectedTitle ?? "Escolha um material para abrir a rota"}</strong>
        <small>{count} pontos liberados · conexões futuras permanecem ocultas</small>
      </div>
      <div className={styles.mapCanvas} aria-hidden="true" data-map={tab}>
        <svg viewBox="0 0 620 150" preserveAspectRatio="none">
          <path pathLength="3" className={styles.mapLineMuted} d="M16 115 C112 28 162 120 250 75 S410 22 604 78" />
          <path pathLength="3" className={styles.mapLineActive} d="M16 115 C112 28 162 120 250 75 S410 22 604 78" />
        </svg>
        <span className={styles.mapNode} data-node="a" />
        <span className={styles.mapNode} data-node="b" />
        <span className={styles.mapNode} data-node="c" />
      </div>
    </section>
  );
}

function ConceptReader({
  detail,
  onOpenRelated,
}: {
  detail: ConceptDetail;
  onOpenRelated: (id: string) => void;
}) {
  const [leadBlock, ...deepBlocks] = detail.contentBlocks;

  return (
    <div className={styles.readerContent}>
      <ReaderHeading
        label="Conceito"
        title={detail.title}
        summary={detail.summary}
        meta={`${detail.readingMinutes} min de leitura`}
      />
      <div className={styles.conceptOpening}>
        <LazyVideo detail={detail} />
        <div className={styles.conceptBrief}>
          <span>Por que isso importa</span>
          <p>{detail.body}</p>
          <a href="#atlas-article" className={styles.inlineAction}>
            Começar pela leitura <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </div>
      <div id="atlas-article" className={styles.article}>
        {leadBlock && <ContentBlock block={leadBlock} />}
        <ConceptVisualReference slug={detail.slug} />
        {deepBlocks.length > 0 && (
          <details className={styles.deepDive}>
            <summary>
              <BookOpenText aria-hidden="true" />
              <span>
                <strong>Aprofundar conceito</strong>
                <small>{deepBlocks.length} tópicos com exemplos e aplicação</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </summary>
            <div className={styles.deepDiveContent}>
              {deepBlocks.map((block, index) => (
                <ContentBlock key={`${block.type}-${index}`} block={block} />
              ))}
            </div>
          </details>
        )}
        <section className={styles.summaryBlock}>
          <span>Em resumo</span>
          <p>{detail.body}</p>
        </section>
      </div>
      <ConceptConstellation
        center={detail.title}
        items={detail.relatedConcepts}
        onOpen={onOpenRelated}
      />
    </div>
  );
}

function ConceptVisualReference({ slug }: { slug: string }) {
  if (slug === "rag") {
    return (
      <figure className={styles.visualReference} aria-labelledby="rag-reference-title">
        <figcaption className={styles.visualReferenceHead}>
          <span>Referência visual</span>
          <strong id="rag-reference-title">Onde o contexto entra na resposta</strong>
        </figcaption>
        <div className={styles.ragComparison}>
          <div className={styles.ragLane} data-state="without">
            <span>Sem RAG</span>
            <FlowSequence nodes={["Pergunta", "Modelo", "Resposta provável"]} />
            <small>O modelo depende apenas do que já sabe e do texto da conversa.</small>
          </div>
          <div className={styles.ragLane} data-state="with">
            <span>Com RAG</span>
            <FlowSequence nodes={["Pergunta", "Busca", "Fontes", "Resposta"]} accentNodeIndexes={[1, 2]} />
            <small>A resposta recebe evidências recuperadas antes de ser escrita.</small>
          </div>
        </div>
      </figure>
    );
  }

  if (slug === "hierarquia-visual") {
    return (
      <figure className={styles.visualReference} aria-labelledby="hierarchy-reference-title">
        <figcaption className={styles.visualReferenceHead}>
          <span>Referência visual</span>
          <strong id="hierarchy-reference-title">A mesma informação, duas leituras</strong>
        </figcaption>
        <div className={styles.posterComparison}>
          <div className={styles.miniPoster} data-state="without">
            <span>Sem direção</span><b>OFICINA CRIATIVA</b><em>Sábado · 14h</em><strong>Inscreva-se agora</strong>
          </div>
          <div className={styles.miniPoster} data-state="with">
            <span>Com hierarquia</span><b>OFICINA<br />CRIATIVA</b><em>Sábado · 14h</em><strong>Inscreva-se</strong>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className={styles.visualReference} aria-labelledby="contrast-reference-title">
      <figcaption className={styles.visualReferenceHead}>
        <span>Referência visual</span>
        <strong id="contrast-reference-title">Diferença decorativa × diferença funcional</strong>
      </figcaption>
      <div className={styles.contrastComparison}>
        <div data-state="without"><span>Baixo contraste</span><b>Continuar leitura</b><small>A ação desaparece na superfície.</small></div>
        <div data-state="with"><span>Contraste funcional</span><b>Continuar leitura</b><small>A ação se separa sem depender só da cor.</small></div>
      </div>
    </figure>
  );
}

function FlowSequence({
  nodes,
  accentNodeIndexes = [],
}: {
  nodes: readonly string[];
  accentNodeIndexes?: readonly number[];
}) {
  return (
    <div className={styles.flowNodes}>
      {nodes.map((node, index) => (
        <span key={node} className={styles.flowStep}>
          {index > 0 && <i aria-hidden="true">→</i>}
          <span className={styles.flowNode} data-accent={accentNodeIndexes.includes(index) || undefined}>{node}</span>
        </span>
      ))}
    </div>
  );
}

function ResourceReader({
  detail,
  onOpenRelated,
}: {
  detail: LibraryResourceDetail;
  onOpenRelated: (id: string) => void;
}) {
  return (
    <div className={styles.readerContent}>
      <ReaderHeading
        label={detail.kind === "prompt" ? "Prompt reutilizável" : "Sistema de Design"}
        title={detail.title}
        summary={detail.summary}
        meta={`Aula ${detail.lessonPosition} · ${detail.readingMinutes} min`}
      />
      <div className={styles.article}>
        {detail.contentBlocks.map((block, index) => (
          <ContentBlock key={`${block.type}-${index}`} block={block} />
        ))}
      </div>
      {detail.artifact.type === "prompt" ? (
        <PromptWorkbench artifact={detail.artifact} />
      ) : (
        <DesignSystemSpecimen artifact={detail.artifact} />
      )}
      <RelatedItems
        label="Materiais da mesma rota"
        items={detail.relatedResources}
        onOpen={onOpenRelated}
      />
    </div>
  );
}

function ReaderHeading({
  label,
  title,
  summary,
  meta,
}: {
  label: string;
  title: string;
  summary: string;
  meta: string;
}) {
  return (
    <header className={styles.readerHeading}>
      <div className={styles.readerLabel}>
        <BookOpenText aria-hidden="true" /> {label}
      </div>
      <h2 id="atlas-reader-title" tabIndex={-1}>{title}</h2>
      <p>{summary}</p>
      <span>{meta}</span>
    </header>
  );
}

/**
 * Player do Atlas. Fachada: o iframe do YouTube só entra depois do clique.
 *
 * A composição separa as zonas de propósito. Miniatura do YouTube é arte que grita
 * (tipografia própria, rosto, cor saturada); deitar nosso título em cima dela foi o
 * que deixava o bloco ilegível. Agora o metadado mora em barras nossas — uma acima,
 * uma abaixo — e a arte fica inteira no meio, com o play sozinho no centro.
 */
function LazyVideo({ detail }: { detail: ConceptDetail }) {
  const [playing, setPlaying] = useState(false);
  // maxresdefault é 1280x720 (16:9 real). hqdefault é 480x360 (4:3) e precisa ser
  // cortado para caber, o que amassava a imagem. Nem todo vídeo tem maxres: cai no
  // mqdefault, que é 16:9 e sempre existe.
  const [thumbQuality, setThumbQuality] = useState<"maxresdefault" | "mqdefault">("maxresdefault");
  const videoId = youtubeIdFromUrl(detail.videoUrl);
  const title = detail.videoTitle ?? `Vídeo sobre ${detail.title}`;

  if (!detail.videoUrl || !videoId) {
    return (
      <div className={styles.videoPlaceholder}>
        <span className={styles.broadcastIcon}><Video aria-hidden="true" /></span>
        <span>Transmissão em preparação</span>
        <strong>Vídeo em preparação</strong>
        <small>{detail.readingMinutes} min de leitura disponíveis agora</small>
        <a href="#atlas-article">Começar pela leitura</a>
      </div>
    );
  }

  const duration = detail.videoDurationMinutes;

  return (
    <figure className={styles.videoFrame}>
      <div className={styles.videoTopBar}>
        <span className={styles.videoKind}>
          <Video aria-hidden="true" /> Vídeo{duration ? ` · ${duration} min` : ""}
        </span>
        <a
          className={styles.videoExternal}
          href={detail.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir no YouTube"
        >
          <ExternalLink aria-hidden="true" />
          <span className={styles.srOnly}>Abrir no YouTube</span>
        </a>
      </div>

      <div className={styles.videoStage}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&iv_load_policy=3&cc_load_policy=1&color=white`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className={styles.videoPoster} onClick={() => setPlaying(true)}>
            <Image
              className={styles.videoPosterImage}
              src={`https://i.ytimg.com/vi/${videoId}/${thumbQuality}.jpg`}
              alt=""
              fill
              sizes="(max-width: 840px) 100vw, 460px"
              onError={() => setThumbQuality("mqdefault")}
            />
            <span className={styles.videoPosterShade} aria-hidden="true" />
            <span className={styles.playButton} aria-hidden="true"><Play /></span>
            <span className={styles.srOnly}>Assistir: {title}</span>
          </button>
        )}
      </div>

      <figcaption className={styles.videoMeta}>
        <strong>{title}</strong>
        <small>{playing ? "Reproduzindo no player do YouTube" : "O vídeo só é carregado quando você toca em reproduzir"}</small>
      </figcaption>
    </figure>
  );
}

function ContentBlock({ block }: { block: KnowledgeContentBlock }) {
  if (block.type === "text") {
    return <section className={styles.textBlock}><h3>{block.heading}</h3><p>{block.body}</p></section>;
  }
  if (block.type === "callout") {
    return <aside className={styles.calloutBlock}><Sparkles aria-hidden="true" /><div><h3>{block.heading}</h3><p>{block.body}</p></div></aside>;
  }
  if (block.type === "image") {
    return <figure className={styles.imageBlock}><Image src={block.url} alt={block.alt} width={1200} height={675} sizes="(max-width: 900px) 100vw, 760px" unoptimized />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
  }
  return (
    <section className={styles.diagramBlock}>
      <h3>{block.heading}</h3>
      <ol>
        {block.nodes.map((node, index) => (
          <li key={`${node.label}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{node.label}</strong><p>{node.detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PromptWorkbench({ artifact }: { artifact: Extract<LibraryArtifact, { type: "prompt" }> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [customizing, setCustomizing] = useState(false);
  const customizedPrompt = useMemo(
    () => fillPromptTemplate(artifact.template, values),
    [artifact.template, values],
  );
  const copy = useCopyText();

  return (
    <section className={styles.promptWorkbench}>
      <div className={styles.workbenchHead}>
        <div>
          <span className={styles.signalLabel}>Mesa de prompt</span>
          <h3>Uma estrutura para adaptar, não uma fórmula pronta.</h3>
        </div>
        <button type="button" className={styles.primaryAction} onClick={() => void copy.copy(customizing ? customizedPrompt : artifact.template)}>
          {copy.status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copy.status === "copied" ? "Prompt copiado" : "Copiar prompt"}
        </button>
      </div>

      <pre className={styles.promptTemplate} tabIndex={0}><code>{customizing ? customizedPrompt : artifact.template}</code></pre>

      <div className={styles.promptAnatomy}>
        {artifact.variables.map((variable) => (
          <div key={variable.token}>
            <code>{variable.token}</code>
            <p>{variable.description}</p>
          </div>
        ))}
      </div>

      <details className={styles.customizer} open={customizing} onToggle={(event) => setCustomizing(event.currentTarget.open)}>
        <summary><FileCode2 aria-hidden="true" />Personalizar antes de copiar<ChevronRight aria-hidden="true" /></summary>
        <div className={styles.customizerBody}>
          <div className={styles.variableFields}>
            {artifact.variables.map((variable, index) => {
              const id = `atlas-variable-${index}`;
              return (
                <label key={variable.token} htmlFor={id}>
                  <span>{variable.token}</span>
                  <small>{variable.description}</small>
                  <input
                    id={id}
                    value={values[variable.token] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [variable.token]: event.target.value }))}
                    placeholder="Escreva sua versão"
                  />
                </label>
              );
            })}
          </div>
          <div className={styles.promptPreview}>
            <span>Prévia local</span>
            <p>{customizedPrompt}</p>
            <small>Nada é salvo ou enviado para uma IA.</small>
          </div>
        </div>
      </details>

      {(artifact.exampleInput || artifact.exampleOutput) && (
        <div className={styles.promptExamples}>
          {artifact.exampleInput && <div><span>Exemplo de entrada</span><p>{artifact.exampleInput}</p></div>}
          {artifact.exampleOutput && <div><span>Exemplo de saída</span><p>{artifact.exampleOutput}</p></div>}
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">{copy.status === "copied" ? "Prompt copiado para a área de transferência." : copy.status === "fallback" ? "A cópia automática foi bloqueada. Use a seleção manual." : ""}</p>
      {copy.status === "fallback" && <ManualCopyFallback value={customizing ? customizedPrompt : artifact.template} />}
    </section>
  );
}

function DesignSystemSpecimen({ artifact }: { artifact: Extract<LibraryArtifact, { type: "design_system" }> }) {
  return (
    <section className={styles.designSpecimen} style={{ "--specimen-accent": artifact.palette.at(-1)?.value ?? "#ff6b00", "--specimen-ink": artifact.palette[0]?.value ?? "#101114" } as React.CSSProperties}>
      <div className={styles.specimenHead}>
        <span className={styles.signalLabel}>Espécime vivo</span>
        <h3>Decisões que podem ser testadas.</h3>
        <p>Observe a função de cada token e experimente componentes construídos com uma lista segura.</p>
      </div>

      <section className={styles.paletteSection}>
        <h4>Paleta e função</h4>
        <div className={styles.paletteGrid}>
          {artifact.palette.map((color) => <PaletteSwatch key={`${color.name}-${color.value}`} color={color} />)}
        </div>
      </section>

      <section className={styles.typeSection}>
        <h4>Tipografia em contexto</h4>
        {artifact.typography.map((type, index) => (
          <div key={`${type.name}-${index}`}>
            <span>{type.name} · {type.role}</span>
            <p data-display={index === 0}>{type.sample}</p>
          </div>
        ))}
      </section>

      <section className={styles.principlesSection}>
        <h4>Princípios</h4>
        <ol>{artifact.principles.map((principle, index) => <li key={principle}><span>{String(index + 1).padStart(2, "0")}</span>{principle}</li>)}</ol>
      </section>

      <section className={styles.componentsSection}>
        <h4>Componentes controlados</h4>
        <div className={styles.specimenGrid}>
          {artifact.components.map((component, index) => (
            <div className={styles.specimenItem} key={`${component.name}-${index}`}>
              <SafeSpecimen name={component.name} index={index} />
              <div><strong>{component.name}</strong><p>{component.description}</p></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function PaletteSwatch({ color }: { color: { name: string; value: string; role: string } }) {
  const copy = useCopyText();
  return (
    <button type="button" className={styles.swatch} onClick={() => void copy.copy(color.value)}>
      <span style={{ backgroundColor: color.value }} aria-hidden="true" />
      <span><strong>{color.name}</strong><small>{color.role}</small><code>{copy.status === "copied" ? "Copiada" : color.value}</code></span>
    </button>
  );
}

function SafeSpecimen({ name, index }: { name: string; index: number }) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/chamada|botao|button/.test(normalized)) return <button className={styles.demoButton} type="button">Explorar sistema <ArrowRight /></button>;
  if (/campo|input/.test(normalized)) return <label className={styles.demoField}><span>Nome do projeto</span><input defaultValue="Creative Studio" /></label>;
  if (/status|badge|selo/.test(normalized)) return <span className={styles.demoBadge}>Em construção</span>;
  if (/navega/.test(normalized)) return <nav className={styles.demoNav} aria-label="Exemplo de navegação"><span data-active="true">Visão</span><span>Tokens</span><span>Uso</span></nav>;
  if (/contexto|callout|alerta/.test(normalized)) return <div className={styles.demoCallout}><Sparkles /><span>Contraste indica a próxima decisão.</span></div>;
  return <div className={styles.demoEditorial}><small>0{index + 1} · direção</small><strong>{name}</strong><span>Mensagem principal com espaço para respirar.</span></div>;
}

/**
 * Constelação de conceitos: o conceito aberto no centro, os relacionados em órbita.
 * Hub-e-raios com dado real (`ConceptDetail.relatedConcepts`) — não é diagrama decorativo.
 * O pulso que percorre cada aresta usa o mesmo `stroke-dasharray` da rota da Jornada,
 * em vez de trazer uma biblioteca de animação nova.
 */
function ConceptConstellation({
  center,
  items,
  onOpen,
}: {
  center: string;
  items: readonly { id: string; title: string; summary: string }[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;

  // A caixa é larga, então a órbita começa na horizontal (0°) e não no topo:
  // com 2 relacionados isso dá esquerda/direita em vez de uma linha vertical,
  // que desperdiçaria a largura e cruzaria o rótulo do centro.
  const nodes = items.map((item, index) => {
    const angle = (index / items.length) * Math.PI * 2;
    return {
      ...item,
      x: 50 + Math.cos(angle) * 30,
      y: 50 + Math.sin(angle) * 32,
    };
  });

  return (
    <section className={styles.constellation} aria-labelledby="constellation-title">
      <div className={styles.constellationHead}>
        <span className={styles.signalLabel}>Continue conectando</span>
        <strong id="constellation-title">A partir de {center}</strong>
        <small>{items.length} {items.length === 1 ? "conceito liberado se conecta" : "conceitos liberados se conectam"} a este.</small>
      </div>

      <div className={styles.constellationCanvas}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {nodes.map((node, index) => (
            <g key={node.id}>
              <line className={styles.edge} x1="50" y1="50" x2={node.x} y2={node.y} />
              <line
                className={styles.edgePulse}
                x1="50"
                y1="50"
                x2={node.x}
                y2={node.y}
                style={{ animationDelay: `${index * 0.9}s` } as React.CSSProperties}
              />
            </g>
          ))}
        </svg>

        <span className={styles.constellationCore} aria-hidden="true">
          <i />
          <b>{center}</b>
        </span>

        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={styles.constellationNode}
            style={{ left: `${node.x}%`, top: `${node.y}%` } as React.CSSProperties}
            onClick={() => onOpen(node.id)}
          >
            <strong>{node.title}</strong>
            <small>{node.summary}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function RelatedItems({
  label,
  items,
  onOpen,
}: {
  label: string;
  items: readonly { id: string; title: string; summary: string }[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.related}>
      <span>{label}</span>
      <div>
        {items.map((item) => (
          <button type="button" key={item.id} onClick={() => onOpen(item.id)}>
            <span><strong>{item.title}</strong><small>{item.summary}</small></span>
            <ArrowRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function ManualCopyFallback({ value }: { value: string }) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className={styles.manualCopy}>
      <label htmlFor="atlas-manual-copy">Selecione e copie manualmente</label>
      <textarea id="atlas-manual-copy" ref={fieldRef} readOnly value={value} />
      <button type="button" className="button-secondary" onClick={() => fieldRef.current?.select()}>
        <Clipboard aria-hidden="true" /> Selecionar texto
      </button>
    </div>
  );
}

function useCopyText() {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(async (value: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      timeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("fallback");
    }
  }, []);

  return { status, copy };
}

function AtlasIndexSkeleton() {
  return <div className={styles.indexSkeleton} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>;
}

function AtlasReaderSkeleton({ tab }: { tab: AtlasTab }) {
  return (
    <div className={styles.readerSkeleton} data-kind={tab} aria-hidden="true">
      <span /><span /><div><span /><span /></div><span /><span /><span />
    </div>
  );
}
