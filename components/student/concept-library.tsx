"use client";

import { BookOpenText, ChevronRight, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ConceptDetail, ConceptSummary, Page } from "@/specs/api.contracts";
import { PageHeader, StateScene } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import styles from "./student-pages.module.css";

export function ConceptLibrary() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const url = `/api/student/concepts?limit=50${deferredSearch ? `&search=${encodeURIComponent(deferredSearch)}` : ""}`;
  const list = useLiveApi<Page<ConceptSummary>>(url);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => [...(list.data?.items ?? [])], [list.data]);
  useEffect(() => { if (items.length && !items.some((item) => item.id === selectedId)) setSelectedId(items[0].id); }, [items, selectedId]);
  const detail = useLiveApi<ConceptDetail>(selectedId ? `/api/student/concepts/${selectedId}` : null);

  return <div className={styles.page}>
    <PageHeader eyebrow="Biblioteca de conceitos" marker="Consulta rápida · v01" title="Lembre o conceito. Volte à construção." description="Um dicionário vivo das ideias trabalhadas presencialmente — curto para localizar, profundo quando você precisar." />
    <div className={styles.twoPane}>
      <aside className={styles.index} aria-label="Índice de conceitos">
        <label className={styles.search}><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar conceito</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou ideia…" /></label>
        {list.loading ? <StateScene layout="concepts" state="loading" title="Trajetória conceitual sendo calculada" description="Preparando o índice da sua turma." /> : list.error ? <StateScene layout="concepts" state="error" title="Sinal interrompido no glossário" description={list.error.message} action={<button onClick={() => void list.reload()}>Tentar novamente</button>} /> : items.length === 0 ? <StateScene layout="concepts" state="empty" title="Espaço para o próximo conceito" description={search ? "Tente uma palavra diferente." : "Os conceitos aparecem conforme as aulas presenciais avançam."} /> : <div className={styles.conceptList}>{items.map((concept,index) => <button key={concept.id} type="button" className={styles.concept} data-active={selectedId === concept.id} onClick={() => setSelectedId(concept.id)}><span className={styles.conceptIndex}>{String(index+1).padStart(2,"0")}</span><span><strong>{concept.title}</strong><small>{concept.summary}</small></span><ChevronRight aria-hidden="true" /></button>)}</div>}
      </aside>
      <article className={styles.reader} aria-live="polite">
        {!selectedId ? <StateScene state="empty" title="Escolha um conceito" description="O conteúdo completo será aberto aqui." /> : detail.loading ? <StateScene state="loading" title="Abrindo caderno" description="Carregando a explicação completa." /> : detail.error ? <StateScene state="error" title="Conceito indisponível" description={detail.error.message} action={<button onClick={() => void detail.reload()}>Tentar novamente</button>} /> : detail.data && <><div className={styles.readerMeta}><BookOpenText size={17} /> Conceito liberado</div><h2>{detail.data.title}</h2><p className={styles.readerLead}>{detail.data.summary}</p><div className={styles.body}>{detail.data.body}</div>{detail.data.relatedConcepts.length > 0 && <div className={styles.related}><span>Continue conectando</span><div className={styles.chips}>{detail.data.relatedConcepts.map((concept) => <button key={concept.id} onClick={() => setSelectedId(concept.id)}>{concept.title}</button>)}</div></div>}</>}
      </article>
    </div>
  </div>;
}
