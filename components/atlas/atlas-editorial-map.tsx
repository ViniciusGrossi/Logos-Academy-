"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, BookOpenText, Layers3, Palette, Pause, Play, Sparkles, Terminal, X } from "lucide-react";
import type { AdminAtlasLessonOption, AdminAtlasOptions, AtlasItemKind } from "@/specs/api.contracts";
import styles from "./atlas-editorial-map.module.css";

type Props = {
  options: AdminAtlasOptions | null; loading: boolean; error: string | null;
  kind: string; lesson: string; onKindChange: (kind: string) => void; onLessonChange: (id: string) => void; onRetry: () => void;
};
const projectNames = ["Assistente Pessoal", "Creative Studio", "Automation Lab", "MVP · Produto Inteligente"];
const collections = [
  { kind: "concept", label: "Conceitos", detail: "Entender para construir", icon: BookOpenText },
  { kind: "prompt", label: "Prompts", detail: "Instruções com propósito", icon: Terminal },
  { kind: "design_system", label: "Sistemas de Design", detail: "Forma, função e identidade", icon: Palette },
] satisfies { kind: AtlasItemKind; label: string; detail: string; icon: typeof BookOpenText }[];
type Wire = { id: string; d: string; kind?: string; lesson?: string; group?: number; pulse: boolean };
type Point = { x: number; y: number };
const curve = (a: Point, b: Point) => {
  const bend = Math.max(24, Math.abs(b.y - a.y) * .55);
  return `M${a.x},${a.y} C${a.x},${a.y + bend} ${b.x},${b.y - bend} ${b.x},${b.y}`;
};

/** Geometry follows the actual button layout, including the mobile 2×2 projects. */
function useMapWires(scene: React.RefObject<HTMLDivElement | null>, slots: readonly (AdminAtlasLessonOption | null)[]) {
  const [geometry, setGeometry] = useState<{ width: number; height: number; wires: Wire[] }>({ width: 1, height: 1, wires: [] });
  useLayoutEffect(() => {
    const element = scene.current;
    if (!element) return;
    let frame = 0; let disposed = false;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const point = (id: string, edge: "top" | "bottom" | "center" = "center"): Point | null => {
        const anchor = element.querySelector<HTMLElement>(`[data-map-node="${id}"]`);
        if (!anchor) return null;
        const box = anchor.getBoundingClientRect();
        return { x: box.left - rect.left + box.width / 2, y: (edge === "top" ? box.top : edge === "bottom" ? box.bottom : box.top + box.height / 2) - rect.top };
      };
      const hub = point("hub", "bottom"); const ports = collections.map((collection) => point(collection.kind, "bottom"));
      if (!hub || ports.some((port) => !port)) return;
      const bus = { x: rect.width / 2, y: Math.max(...ports.map((port) => port!.y)) + 36 };
      const wires: Wire[] = [];
      collections.forEach((collection, index) => {
        const top = point(collection.kind, "top");
        if (top) wires.push({ id: `hub-${collection.kind}`, d: curve(hub, top), kind: collection.kind, pulse: index === 1 });
        wires.push({ id: `bus-${collection.kind}`, d: curve(ports[index]!, bus), kind: collection.kind, pulse: false });
      });
      for (let group = 0; group < 4; group++) {
        const port = point(`project-${group}`);
        if (!port) continue;
        wires.push({ id: `project-${group}`, d: curve(bus, port), group, pulse: group === 0 || group === 3 });
        for (let index = group * 4; index < group * 4 + 4; index++) {
          const endpoint = point(`lesson-${index}`, "top");
          if (endpoint) wires.push({ id: `lesson-${index}`, d: curve(port, endpoint), lesson: slots[index]?.id, group, pulse: index % 4 === 2 });
        }
      }
      setGeometry({ width: rect.width, height: rect.height, wires });
    };
    const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(element);
    element.querySelectorAll<HTMLElement>("[data-map-node]").forEach((anchor) => observer?.observe(anchor));
    window.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule).catch(() => undefined);
    return () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", schedule); };
  }, [scene, slots]);
  return geometry;
}

export function AtlasEditorialMap({ options, loading, error, kind, lesson, onKindChange, onLessonChange, onRetry }: Props) {
  const scene = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const slots = useMemo(() => {
    const all = options?.lessons.items ?? [];
    const curriculumId = all.find((item) => item.id === lesson)?.curriculumId ?? all[0]?.curriculumId;
    const result: (AdminAtlasLessonOption | null)[] = Array.from({ length: 16 }, () => null);
    for (const item of all.filter((row) => row.curriculumId === curriculumId)) {
      if (item.cyclePosition < 1 || item.cyclePosition > 4 || item.position < 1) continue;
      const index = (item.cyclePosition - 1) * 4 + (item.position - 1) % 4;
      if (!result[index]) result[index] = item;
    }
    return result;
  }, [options, lesson]);
  const geometry = useMapWires(scene, slots);
  const selected = slots.find((item) => item?.id === (hovered ?? lesson));
  const selectedGroup = slots.findIndex((item) => item?.id === lesson);
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <section ref={root} className={styles.map} aria-label="Mapa editorial" data-motion={paused || !visible ? "paused" : "running"}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}><Sparkles aria-hidden="true" />Mapa editorial</span><h2>O conhecimento ganha conexão.</h2><p>Três coleções. Quatro projetos. Um percurso de construção.</p></div>
      <div className={styles.headerTools}><span className={styles.meta}><strong>16</strong> aulas <i /> <strong>04</strong> projetos</span><button type="button" className={styles.motionControl} onClick={() => setPaused(!paused)} aria-label={paused ? "Retomar animações do mapa" : "Pausar animações do mapa"} aria-pressed={paused}>{paused ? <Play /> : <Pause />}</button></div>
    </header>
    <div className={styles.scene} ref={scene}>
      <div className={styles.ambient} aria-hidden="true" />
      <svg className={styles.wires} viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {geometry.wires.map((wire, index) => <g key={wire.id} data-selected={Boolean(wire.kind && wire.kind === kind || wire.lesson && wire.lesson === (hovered ?? lesson) || wire.group !== undefined && selectedGroup >= 0 && wire.group === Math.floor(selectedGroup / 4))}>
          <path d={wire.d} className={styles.wire} />
          {wire.pulse && <path d={wire.d} pathLength={1000} className={styles.energy} style={{ "--pulse-phase": `${index * -.63}s` } as CSSProperties} />}
        </g>)}
      </svg>
      <div className={styles.hubStage}>
        <button type="button" data-map-node="hub" className={styles.hub} aria-label="Mostrar todo o Atlas" onClick={() => { onKindChange(""); onLessonChange(""); }}><span className={styles.hubRings} aria-hidden="true"><i /><i /><i /></span><span className={styles.hubCore}><Layers3 aria-hidden="true" /><strong>ATLAS</strong><small>NÚCLEO EDITORIAL</small></span></button>
        <span className={styles.coordinate}>LA / KNOWLEDGE NETWORK</span>
      </div>
      <div className={styles.collections}>{collections.map(({ kind: collection, label, detail, icon: Icon }, index) => <button type="button" key={collection} data-map-node={collection} className={styles.collection} aria-pressed={kind === collection} onClick={() => onKindChange(kind === collection ? "" : collection)}>
        <span className={styles.collectionIcon}><Icon aria-hidden="true" /></span><span><small>0{index + 1} / COLEÇÃO</small><strong>{label}</strong><span>{detail}</span></span><b>{options?.counts[collection] ?? "—"}</b>
      </button>)}</div>
      <div className={styles.projects}>{Array.from({ length: 4 }, (_, group) => {
        const items = slots.slice(group * 4, group * 4 + 4);
        const title = items.find(Boolean)?.cycleTitle ?? projectNames[group];
        return <section key={group} className={styles.project} aria-label={`Projeto ${group + 1}: ${title}`} data-selected={selectedGroup >= group * 4 && selectedGroup < group * 4 + 4}>
          <span className={styles.port} data-map-node={`project-${group}`} aria-hidden="true" />
          <div className={styles.lessonNodes}>{items.map((item, offset) => {
            const index = group * 4 + offset;
            const number = String(index + 1).padStart(2, "0");
            return <button type="button" key={index} data-map-node={`lesson-${index}`} className={styles.lesson} style={{ "--node-index": index } as CSSProperties} disabled={!item || loading} aria-label={item ? `Aula ${index + 1}: ${item.title}` : `Aula ${index + 1}: ${loading ? "carregando" : "não disponível neste currículo"}`} aria-pressed={Boolean(item && lesson === item.id)} title={item?.title ?? "Aula não disponível"} onMouseEnter={() => setHovered(item?.id ?? null)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(item?.id ?? null)} onBlur={() => setHovered(null)} onClick={() => { if (item) onLessonChange(lesson === item.id ? "" : item.id); }}><span>{number}</span><i aria-hidden="true" /></button>;
          })}</div>
          <div className={styles.projectTitle}><span>PROJETO 0{group + 1}</span><h3>{title}</h3><small>AULAS {String(group * 4 + 1).padStart(2, "0")} — {String(group * 4 + 4).padStart(2, "0")}</small></div>
        </section>;
      })}</div>
    </div>
    <footer className={styles.footer}>
      <div className={styles.signal}><span aria-hidden="true" /><p>{selected ? <><strong>{selected.title}</strong><small>{selected.cycleTitle} · clique no número para filtrar</small></> : <><strong>Do conceito à construção.</strong><small>Selecione uma aula ou coleção para explorar suas referências.</small></>}</p></div>
      {kind || lesson ? <button type="button" className={styles.clear} onClick={() => { onKindChange(""); onLessonChange(""); }}><X aria-hidden="true" />Limpar seleção</button> : <span className={styles.legend}>NAVEGAÇÃO CURRICULAR <ArrowUpRight aria-hidden="true" /></span>}
    </footer>
    {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={onRetry}>Tentar novamente</button></div>}
    {!loading && !error && !options?.lessons.items.length && <p className={styles.empty}>Nenhuma aula ativa disponível. As conexões serão habilitadas quando houver um currículo ativo.</p>}
  </section>;
}
