"use client";

import { useId, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Search, X } from "lucide-react";
import type { AtlasContentBlock } from "@/specs/api.contracts";
import styles from "./atlas-editor-controls.module.css";

export function AtlasTagsField({ value, onChange }: { value: readonly string[]; onChange: (tags: string[]) => void }) {
  const id = useId();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  function add() {
    const tag = input.trim();
    if (!tag) return;
    if (value.some((existing) => existing.toLocaleLowerCase("pt-BR") === tag.toLocaleLowerCase("pt-BR"))) { setMessage("Esta tag já foi adicionada."); return; }
    if (value.length >= 30) { setMessage("Você pode adicionar até 30 tags."); return; }
    onChange([...value, tag]); setInput(""); setMessage("");
  }
  return <div className={styles.tagsField}>
    <label htmlFor={id}>Tags</label>
    <div className={styles.tagsBox}>
      {value.length > 0 && <ul aria-label="Tags adicionadas">{value.map((tag, index) => <li key={`${tag}-${index}`}><span>{tag}</span><button type="button" aria-label={`Remover tag ${tag}`} onClick={() => { onChange(value.filter((_, i) => i !== index)); setMessage(""); }}><X aria-hidden="true" /></button></li>)}</ul>}
      <input id={id} value={input} placeholder="Adicionar tag e Enter" aria-describedby={`${id}-help ${id}-status`} onChange={(event) => { setInput(event.target.value); setMessage(""); }} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter") { event.preventDefault(); add(); }
        if (event.key === "Backspace" && !input && value.length) { event.preventDefault(); onChange(value.slice(0, -1)); setMessage(""); }
      }} />
    </div>
    <small id={`${id}-help`}>Pressione Enter para adicionar uma tag.</small>
    <span id={`${id}-status`} className={styles.tagsStatus} role="status">{message}</span>
  </div>;
}

type BlockType = AtlasContentBlock["type"];
type Thumbnail = "text" | "list" | "image" | "gallery" | "split" | "palette" | "typography" | "specimen" | "code" | "quote";
type CatalogEntry = { type: BlockType; label: string; description: string; thumbnail: Thumbnail };
const groups: readonly { label: string; items: readonly CatalogEntry[] }[] = [
  { label: "Texto", items: [
    { type: "section", label: "Seção", description: "Título e abertura de uma nova parte.", thumbnail: "text" },
    { type: "text", label: "Texto", description: "Parágrafos de explicação, sem formatação livre.", thumbnail: "text" },
    { type: "callout", label: "Callout", description: "Destaque curto: princípio, dica ou atenção.", thumbnail: "list" },
  ] },
  { label: "Visual", items: [
    { type: "image", label: "Imagem", description: "Uma imagem com alt obrigatório e legenda.", thumbnail: "image" },
    { type: "gallery", label: "Galeria", description: "Imagens lado a lado, com suas descrições.", thumbnail: "gallery" },
    { type: "diagram", label: "Diagrama", description: "Etapas conectadas, com explicação de cada relação.", thumbnail: "image" },
    { type: "comparison", label: "Comparação", description: "Dois lados com rótulos e explicações.", thumbnail: "split" },
  ] },
  { label: "Processo", items: [
    { type: "steps", label: "Passos", description: "Sequência numerada de construção.", thumbnail: "list" },
    { type: "checklist", label: "Checklist", description: "Itens para o aluno conferir.", thumbnail: "list" },
    { type: "do_dont", label: "Faça / evite", description: "Dois lados com exemplos de conduta.", thumbnail: "split" },
  ] },
  { label: "Sistema", items: [
    { type: "palette", label: "Paleta", description: "Cores nomeadas pelo que comunicam.", thumbnail: "palette" },
    { type: "typography", label: "Tipografia", description: "Escala tipográfica com frase de exemplo.", thumbnail: "typography" },
    { type: "specimen", label: "Espécime de componente", description: "Componente seguro com propriedades editáveis.", thumbnail: "specimen" },
  ] },
  { label: "Outros", items: [
    { type: "list", label: "Lista", description: "Itens ordenados ou livres para organizar ideias.", thumbnail: "list" },
    { type: "code", label: "Código", description: "Exemplo de código que o aluno pode copiar.", thumbnail: "code" },
    { type: "quote", label: "Citação", description: "Uma ideia em destaque com sua autoria.", thumbnail: "quote" },
  ] },
];
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function AtlasBlockPicker({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (type: BlockType) => void }) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const filtered = groups.map((group) => ({ ...group, items: group.items.filter((item) => normalize(`${group.label} ${item.label} ${item.description}`).includes(normalize(query.trim()))) })).filter((group) => group.items.length);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className={styles.overlay} />
    <Dialog.Content className={styles.picker} onOpenAutoFocus={(event) => { event.preventDefault(); setQuery(""); search.current?.focus(); }}>
      <header className={styles.pickerHeader}>
        <div><Dialog.Title>Adicionar bloco</Dialog.Title><Dialog.Close className={styles.close} aria-label="Fechar seletor de blocos"><X aria-hidden="true" /></Dialog.Close></div>
        <Dialog.Description className={styles.srOnly}>Escolha uma composição para adicionar ao conteúdo. Todos os blocos podem ser editados depois.</Dialog.Description>
        <label className={styles.search}><Search aria-hidden="true" /><input ref={search} type="search" aria-label="Buscar bloco" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar bloco: comparação, paleta, passos..." /></label>
      </header>
      <div className={styles.pickerBody}>
        {filtered.map((group) => <section className={styles.group} key={group.label} aria-label={group.label}><h3>{group.label}</h3><div className={styles.catalog}>
          {group.items.map((item) => <button type="button" key={item.type} className={styles.blockCard} onClick={() => onSelect(item.type)}>
            <BlockThumbnail variant={item.thumbnail} /><strong>{item.label}</strong><span>{item.description}</span>
          </button>)}
        </div></section>)}
        {!filtered.length && <p className={styles.empty} role="status">Nenhum bloco com esse nome. Tente “texto”, “imagem” ou “passos”.</p>}
      </div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function BlockThumbnail({ variant }: { variant: Thumbnail }) {
  return <span aria-hidden="true" className={styles.thumbnail} data-variant={variant}>
    {["text", "list", "code"].includes(variant) && <><i /><i /><i /></>}
    {["image", "gallery", "split", "palette"].includes(variant) && <><i /><i />{variant === "palette" && <><i /><i /></>}</>}
    {variant === "typography" && <span>Aa <small>Aa</small></span>}
    {variant === "specimen" && <span>Botão</span>}
    {variant === "quote" && <span>“<i /><i /></span>}
  </span>;
}
