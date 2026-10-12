"use client";

import Image from "next/image";
import { Check, Copy, ImageOff, Info } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import type { AtlasImageSource, AtlasSpecimen, KnowledgeContentBlock, LibraryArtifact, ResolvedAtlasAsset } from "@/specs/api.contracts";
import { Button } from "@/components/ui/button";
import { fillPromptTemplate } from "@/src/lib/knowledge-atlas";
import styles from "./atlas-item-renderer.module.css";

export interface AtlasItemRendererProps {
  contentBlocks: readonly KnowledgeContentBlock[];
  body?: string;
  artifact?: LibraryArtifact | null;
  resolvedAssets?: readonly ResolvedAtlasAsset[];
  mode?: "reader" | "preview";
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}

/** The same bounded content tree is used by the student and editorial preview. */
export function AtlasItemRenderer({ contentBlocks, body, artifact, resolvedAssets = [], mode = "reader", selectedBlockId, onSelectBlock }: AtlasItemRendererProps) {
  const visible = contentBlocks.filter((block) => !("isVisible" in block) || block.isVisible);
  return <div className={styles.renderer} data-mode={mode}>
    {body && <div className={styles.body}>{body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
    {visible.map((block, index) => {
      const id = "id" in block ? block.id : `legacy-${index}`;
      return <div key={id} data-atlas-block-id={id} data-selected={mode === "preview" && id === selectedBlockId} className={styles.blockFrame}>
        {mode === "preview" && onSelectBlock && <button type="button" className={styles.selectBlock} aria-label={`Editar bloco ${index + 1}${"heading" in block && block.heading ? `: ${block.heading}` : ""}`} aria-pressed={id === selectedBlockId} onClick={() => onSelectBlock(id)}><span>{String(index + 1).padStart(2, "0")}</span> Editar bloco</button>}
        <AtlasBlockRenderer block={block} resolvedAssets={resolvedAssets} />
      </div>;
    })}
    {artifact && <AtlasArtifactRenderer artifact={artifact} />}
  </div>;
}

export function AtlasBlockRenderer({ block, resolvedAssets = [] }: { block: KnowledgeContentBlock; resolvedAssets?: readonly ResolvedAtlasAsset[] }) {
  if ("isVisible" in block && !block.isVisible) return null;
  switch (block.type) {
    case "text": return <section className={styles.text}><Heading>{block.heading}</Heading><p>{block.body}</p></section>;
    case "callout": return <aside className={styles.callout}><Info aria-hidden="true" /><div><Heading>{block.heading}</Heading><p>{block.body}</p></div></aside>;
    case "section": return <h2 className={styles.section}>{block.heading}</h2>;
    case "image": return <AtlasImage source={"source" in block ? block.source : { kind: "external", url: block.url as `https://${string}`, alt: block.alt, caption: block.caption }} assets={resolvedAssets} />;
    case "gallery": return <div className={styles.gallery}>{block.items.map((source, index) => <AtlasImage key={index} source={source} assets={resolvedAssets} />)}</div>;
    case "list": return block.ordered ? <ol className={styles.list}>{block.items.map((item, index) => <li key={index}>{item}</li>)}</ol> : <ul className={styles.list}>{block.items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
    case "code": return <section className={styles.code}><div className={styles.codeHead}><span>{block.language || "Código"}</span><CopyControl value={block.code} label="Copiar código" /></div><pre tabIndex={0}><code>{block.code}</code></pre></section>;
    case "quote": return <figure className={styles.quote}><blockquote>{block.body}</blockquote>{block.attribution && <figcaption>{block.attribution}</figcaption>}</figure>;
    case "diagram": return <section className={styles.diagram}><Heading>{block.heading}</Heading><ol>{block.nodes.map((node, index) => <li key={index}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><div><strong>{node.label}</strong><p>{node.detail}</p></div></li>)}</ol></section>;
    case "comparison": return <section className={styles.comparison}><Heading>{block.heading}</Heading><div className={styles.columns}>{(["left", "right"] as const).map((side) => <div key={side} className={styles.comparisonSide} data-emphasis={block.emphasis === side || block.emphasis === "balanced"}>{block[side].eyebrow && <small>{block[side].eyebrow}</small>}<h4>{block[side].title}</h4><p>{block[side].body}</p></div>)}</div></section>;
    case "steps": return <section className={styles.steps}><Heading>{block.heading}</Heading><ol>{block.items.map((item, index) => <li key={index}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}</div></li>)}</ol></section>;
    case "checklist": return <section className={styles.checklist}><Heading>{block.heading}</Heading><ul>{block.items.map((item, index) => <li key={index}><Check aria-hidden="true" /><div><strong>{item.label}</strong>{item.detail && <p>{item.detail}</p>}</div></li>)}</ul></section>;
    case "do_dont": return <section className={styles.comparison}><Heading>{block.heading}</Heading><div className={styles.columns}><div className={styles.comparisonSide} data-emphasis="true"><h4>Faça</h4><ul>{block.do.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div className={styles.comparisonSide}><h4>Evite</h4><ul>{block.dont.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div></section>;
    case "palette": return <section className={styles.palette}><Heading>{block.heading}</Heading><div className={styles.swatches}>{block.colors.map((color, index) => <PaletteColor key={index} name={color.name} value={color.value} usage={color.usage} />)}</div></section>;
    case "typography": return <section className={styles.typography}><Heading>{block.heading}</Heading>{block.samples.map((sample, index) => <div key={index}><small>{sample.role} · {sample.family} · {sample.weight}</small><p style={{ fontFamily: fontFamily(sample.family), fontWeight: fontWeight(sample.weight) }}>{sample.sample}</p></div>)}</section>;
    case "specimen": return <section className={styles.specimen}><Heading>{block.heading}</Heading><div className={styles.specimenStage}><AtlasSpecimenRenderer specimen={block} /></div></section>;
    default: return null;
  }
}

function Heading({ children }: { children: ReactNode }) { return children ? <h3 className={styles.heading}>{children}</h3> : null; }

function safeHttps(value: string): string | null {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

function AtlasImage({ source, assets }: { source: AtlasImageSource; assets: readonly ResolvedAtlasAsset[] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const asset = source.kind === "asset" ? assets.find((candidate) => candidate.id === source.assetId) : undefined;
  const url = source.kind === "external" ? safeHttps(source.url) : asset ? safeHttps(asset.readUrl) : null;
  const alt = source.alt || asset?.alt || "";
  const caption = source.caption ?? asset?.caption;
  return <figure className={styles.image}>
    {url && url !== failedUrl ? <Image src={url} alt={alt} width={asset?.width ?? 1200} height={asset?.height ?? 675} sizes="(max-width: 768px) 100vw, 760px" unoptimized onError={() => setFailedUrl(url)} /> : <div className={styles.imageUnavailable} role="status"><ImageOff aria-hidden="true" /><span>Imagem indisponível</span>{alt && <small>{alt}</small>}</div>}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

function PaletteColor({ name, value, usage }: { name: string; value: string; usage?: string }) {
  const safeColor = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : null;
  return <div className={styles.swatch}><div className={styles.colorSample} style={safeColor ? { backgroundColor: safeColor } : undefined} aria-label={safeColor ? `${name}: ${value}` : "Cor inválida"} /><div><strong>{name}</strong>{usage && <p>{usage}</p>}<code>{value}</code><CopyControl value={value} label={`Copiar cor ${name}`} /></div></div>;
}

function fontFamily(family: string) {
  if (/mono|consolas|courier/i.test(family)) return "var(--font-mono)";
  if (/serif|georgia|display/i.test(family)) return "var(--font-display)";
  return "var(--font-sans)";
}
function fontWeight(weight: string): number { const parsed = Number(weight); return Number.isInteger(parsed) && parsed >= 100 && parsed <= 900 ? parsed : /bold/i.test(weight) ? 700 : 400; }

export function AtlasSpecimenRenderer({ specimen }: { specimen: AtlasSpecimen }) {
  const id = useId();
  switch (specimen.component) {
    case "button": return <Button type="button" className={specimen.props.variant === "primary" ? styles.primary : styles.specimenButton} variant={specimen.props.variant === "primary" ? "default" : specimen.props.variant} disabled={specimen.props.disabled}>{specimen.props.label}</Button>;
    case "field": return <div className={styles.field} data-state={specimen.props.state}><label htmlFor={id}>{specimen.props.label}</label><input id={id} placeholder={specimen.props.placeholder} aria-invalid={specimen.props.state === "error"} aria-describedby={specimen.props.helpText ? `${id}-help` : undefined} />{specimen.props.helpText && <small id={`${id}-help`}>{specimen.props.helpText}</small>}</div>;
    case "card": return <div className={styles.demoCard}>{specimen.props.eyebrow && <small>{specimen.props.eyebrow}</small>}<h4>{specimen.props.title}</h4><p>{specimen.props.body}</p>{specimen.props.actionLabel && <Button type="button" className={styles.specimenButton} variant="outline">{specimen.props.actionLabel}</Button>}</div>;
    case "badge": return <span className={styles.badge} data-tone={specimen.props.tone}>{specimen.props.label}</span>;
    case "callout": return <aside className={styles.callout} data-tone={specimen.props.tone}><Info aria-hidden="true" /><div><h4>{specimen.props.title}</h4><p>{specimen.props.body}</p></div></aside>;
    case "navigation": return <SpecimenNavigation items={specimen.props.items} activeIndex={specimen.props.activeIndex} />;
    case "editorial": return <div className={styles.demoEditorial}>{specimen.props.eyebrow && <small>{specimen.props.eyebrow}</small>}<h4>{specimen.props.title}</h4><p>{specimen.props.summary}</p></div>;
    default: return null;
  }
}

function SpecimenNavigation({ items, activeIndex }: { items: readonly string[]; activeIndex: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  return <nav className={styles.demoNavigation} aria-label="Espécime de navegação">{items.map((item, index) => <button type="button" key={index} aria-pressed={index === (selected ?? activeIndex)} onClick={() => setSelected(index)}>{item}</button>)}</nav>;
}

export function AtlasArtifactRenderer({ artifact }: { artifact: LibraryArtifact }) {
  if (artifact.type === "prompt") return <AtlasPromptWorkbench artifact={artifact} />;
  return <section className={styles.designSystem}>
    <Heading>Decisões que podem ser testadas.</Heading>
    <p>Observe a função de cada token e experimente os componentes controlados.</p>
    <section className={styles.palette}><h4>Paleta e função</h4><div className={styles.swatches}>{artifact.palette.map((color, index) => <PaletteColor key={index} name={color.name} value={color.value} usage={color.role} />)}</div></section>
    <section className={styles.typography}><h4>Tipografia em contexto</h4>{artifact.typography.map((sample, index) => <div key={index}><small>{sample.name} · {sample.role}</small><p data-display={index === 0}>{sample.sample}</p></div>)}</section>
    <section><h4>Princípios</h4><ol className={styles.list}>{artifact.principles.map((principle, index) => <li key={index}>{principle}</li>)}</ol></section>
    <section><h4>Componentes controlados</h4><div className={styles.specimenGrid}>{artifact.components.map((component, index) => <div key={index}><div className={styles.specimenStage}><AtlasSpecimenRenderer specimen={legacySpecimen(component.name, index)} /></div><strong>{component.name}</strong><p>{component.description}</p></div>)}</div></section>
  </section>;
}

function legacySpecimen(name: string, index: number): AtlasSpecimen {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/chamada|botao|button/.test(normalized)) return { component: "button", props: { label: "Explorar sistema", variant: "primary", disabled: false } };
  if (/campo|input/.test(normalized)) return { component: "field", props: { label: "Nome do projeto", placeholder: "Creative Studio", state: "default" } };
  if (/status|badge|selo/.test(normalized)) return { component: "badge", props: { label: "Em construção", tone: "accent" } };
  if (/navega/.test(normalized)) return { component: "navigation", props: { items: ["Visão", "Tokens", "Uso"], activeIndex: 0 } };
  if (/contexto|callout|alerta/.test(normalized)) return { component: "callout", props: { title: "Contraste funcional", body: "Contraste indica a próxima decisão.", tone: "info" } };
  if (/card|cartao/.test(normalized)) return { component: "card", props: { title: name, body: "Conteúdo organizado com hierarquia e uma ação clara." } };
  return { component: "editorial", props: { eyebrow: `${String(index + 1).padStart(2, "0")} · direção`, title: name, summary: "Mensagem principal com espaço para respirar." } };
}

export function AtlasPromptWorkbench({ artifact }: { artifact: Extract<LibraryArtifact, { type: "prompt" }> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const id = useId();
  const customizedPrompt = useMemo(() => fillPromptTemplate(artifact.template, values), [artifact.template, values]);
  return <section className={styles.prompt}>
    <div className={styles.promptHeader}><div><small>Mesa de prompt</small><Heading>Uma estrutura para adaptar, não uma fórmula pronta.</Heading></div><CopyControl value={customizedPrompt} label="Copiar prompt" /></div>
    <pre tabIndex={0}><code>{customizedPrompt}</code></pre>
    {artifact.variables.length > 0 && <details className={styles.customizer}><summary>Personalizar antes de copiar</summary><div>{artifact.variables.map((variable, index) => <label key={variable.token} htmlFor={`${id}-${index}`}><strong>{variable.token}</strong><small>{variable.description}</small><input id={`${id}-${index}`} value={values[variable.token] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [variable.token]: event.target.value }))} placeholder="Escreva sua versão" /></label>)}</div><p>Nada é salvo ou enviado para uma IA.</p></details>}
    {(artifact.exampleInput || artifact.exampleOutput) && <div className={styles.columns}>{artifact.exampleInput && <div><h4>Exemplo de entrada</h4><p>{artifact.exampleInput}</p></div>}{artifact.exampleOutput && <div><h4>Exemplo de saída</h4><p>{artifact.exampleOutput}</p></div>}</div>}
  </section>;
}

function CopyControl({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const id = useId();
  async function copy() { try { await navigator.clipboard.writeText(value); setStatus("copied"); } catch { setStatus("fallback"); } }
  return <div className={styles.copyControl}><Button type="button" className={styles.specimenButton} variant="outline" onClick={() => void copy()} aria-label={label}>{status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{status === "copied" ? "Copiado" : label}</Button><span className="sr-only" role="status" aria-live="polite">{status === "copied" ? "Texto copiado para a área de transferência." : status === "fallback" ? "Cópia automática indisponível. Selecione o texto abaixo." : ""}</span>{status === "fallback" && <label htmlFor={id} className={styles.copyFallback}>Selecione e copie manualmente<textarea id={id} readOnly value={value} onFocus={(event) => event.currentTarget.select()} /></label>}</div>;
}
