"use client";

import { Dialog } from "radix-ui";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Inbox, LoaderCircle, X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import styles from "./admin-editorial.module.css";

export function AdminEditorialHeader({ eyebrow, title, description, actions, display = false }: { eyebrow: string; title: string; description?: string; actions?: ReactNode; display?: boolean }) {
  return <header className={styles.header}><div><span className={styles.eyebrow}>{eyebrow}</span><h1 data-display={display}>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className={styles.headerActions}>{actions}</div>}</header>;
}

export interface EditorialCounter { id: string; label: string; value: number | null; tone?: "neutral" | "accent" | "success" | "warning"; }
export function StatusCounterStrip({ items, selected, onSelect, label = "Filtrar por situação" }: { items: readonly EditorialCounter[]; selected?: string | null; onSelect?: (id: string) => void; label?: string }) {
  return <div className={styles.counters} role="group" aria-label={label}>{items.map((item) => {
    const content = <><span className={styles.counterValue}>{item.value === null ? "—" : item.value}</span><span>{item.label}</span>{item.value === null && <span className="sr-only">Carregando quantidade</span>}</>;
    return onSelect ? <button key={item.id} type="button" data-tone={item.tone ?? "neutral"} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)}>{content}</button> : <div key={item.id} data-tone={item.tone ?? "neutral"}>{content}</div>;
  })}</div>;
}

export interface EditorialCollectionTab { id: string; label: string; panelId: string; count?: number; }
export function AnimatedCollectionTabs({ items, value, onChange, label = "Coleções" }: { items: readonly EditorialCollectionTab[]; value: string; onChange: (value: string) => void; label?: string }) {
  const groupId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  function move(index: number) { const next = (index + items.length) % items.length; buttons.current[next]?.focus(); onChange(items[next].id); }
  return <div className={styles.tabs} role="tablist" aria-label={label}>{items.map((item, index) => <button key={item.id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab" id={`${groupId}-${item.id}`} aria-controls={item.panelId} aria-selected={item.id === value} tabIndex={item.id === value ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={(event) => {
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (next !== null) { event.preventDefault(); move(next); }
  }}><span>{item.label}{item.count !== undefined && <small>{item.count}</small>}</span>{item.id === value && <motion.i aria-hidden="true" className={styles.tabIndicator} layoutId={`editorial-tabs-${groupId}`} transition={reducedMotion ? { duration: 0 } : { duration: .26, ease: [.2, .8, .2, 1] }} />}</button>)}</div>;
}

export function EditorialToolbar({ children, label = "Filtros e ações" }: { children: ReactNode; label?: string }) {
  return <section className={styles.toolbar} aria-label={label}>{children}</section>;
}

export function EditorialRegionState({ state, title, description, action }: { state: "loading" | "empty" | "error"; title?: string; description?: string; action?: ReactNode }) {
  const Icon = state === "error" ? AlertTriangle : state === "loading" ? LoaderCircle : Inbox;
  return <div className={styles.regionState} data-state={state} role={state === "error" ? "alert" : "status"} aria-live={state === "error" ? "assertive" : "polite"} aria-busy={state === "loading"}>
    <span className={styles.stateIcon}><Icon aria-hidden="true" /></span><strong>{title ?? (state === "loading" ? "Carregando conteúdo" : state === "error" ? "Não foi possível carregar esta área" : "Nenhum conteúdo neste recorte")}</strong>{description && <p>{description}</p>}{state === "loading" && <div className={styles.skeletons} aria-hidden="true"><span /><span /><span /></div>}{action}
  </div>;
}

export interface EditorialConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  secondaryAction?: ReactNode;
  returnFocusRef?: { current: HTMLElement | null };
}

export function EditorialConfirmation({ open, onOpenChange, title, description, children, confirmLabel, onConfirm, cancelLabel = "Continuar editando", pending = false, confirmDisabled = false, error, secondaryAction, returnFocusRef }: EditorialConfirmationProps) {
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.dialog} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => event.preventDefault()} onCloseAutoFocus={(event) => { if (returnFocusRef?.current) { event.preventDefault(); returnFocusRef.current.focus(); } }}>
    <div className={styles.dialogHead}><div><Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title><Dialog.Description className={styles.dialogDescription}>{description}</Dialog.Description></div><Dialog.Close asChild><Button type="button" variant="ghost" className={styles.close} aria-label="Fechar confirmação" disabled={pending}><X aria-hidden="true" /></Button></Dialog.Close></div>
    {children && <div className={styles.dialogBody}>{children}</div>}{error && <p className={styles.dialogError} role="alert">{error}</p>}
    <div className={styles.dialogActions}>{secondaryAction}<Button type="button" variant="outline" className={styles.control} onClick={() => onOpenChange(false)} disabled={pending}>{cancelLabel}</Button><Button type="button" className={styles.confirm} onClick={onConfirm} disabled={pending || confirmDisabled}>{pending && <LoaderCircle aria-hidden="true" className={styles.spinner} />}{pending ? "Concluindo…" : confirmLabel}</Button></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
