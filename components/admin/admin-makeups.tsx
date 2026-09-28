"use client";

import { CalendarClock, CheckCircle2, Wrench } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { Page, PendingMakeup } from "@/specs/api.contracts";
import { MagneticAction, PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import styles from "./admin-experience.module.css";

function dateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatSession(value: PendingMakeup["session"]) {
  return `${value.lessonTitle} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value.startsAt))}`;
}

export function AdminMakeups() {
  const { data, error, loading, reload } = useLiveApi<Page<PendingMakeup>>("/api/admin/makeups?limit=30");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function register(event: FormEvent<HTMLFormElement>, item: PendingMakeup) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPendingId(item.attendanceId); setNotice(null);
    try {
      await apiMutation(`/api/admin/attendance/${item.attendanceId}/makeup`, "POST", {
        completedAt: new Date(String(form.get("completedAt"))).toISOString(),
        note: String(form.get("note") ?? "").trim() || undefined,
      });
      setNotice(`${item.studentName}: reposição registrada. A falta original segue no histórico.`);
      await reload();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível registrar a reposição.");
    } finally { setPendingId(null); }
  }

  if (loading) return <StateScene state="loading" title="Lendo reposições pendentes" description="Conferindo ausências que ainda precisam de uma rota de resolução." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  const items = data?.items ?? [];
  return <div className={styles.stack}>
    <PageHeader eyebrow="Operação pedagógica · frequência" title="Cada ausência tem uma rota clara." description="Registre a reposição sem apagar o encontro original: a frequência continua um registro confiável do percurso." marker={`${items.length} pendente${items.length === 1 ? "" : "s"}`} />
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {!items.length ? <StateScene state="empty" title="Nenhuma reposição pendente" description="As faltas que exigirem recomposição aparecerão aqui com o encontro de origem." /> : <section className={styles.paper}>
      <div className={styles.paperHeader}><div><h2>Fila de recomposição</h2><p>Priorize o registro objetivo: data realizada e uma nota breve quando for necessária.</p></div><Wrench aria-hidden="true" /></div>
      <div className={styles.paperBody}>{items.map((item) => <article key={item.attendanceId} className={styles.attendanceRow}>
        <div className={styles.attendancePerson}><span className={styles.avatar}>{item.studentName.slice(0, 2).toUpperCase()}</span><span><strong>{item.studentName}</strong><small>{item.className ?? "Percurso individual"} · {formatSession(item.session)}</small></span></div>
        <form className={styles.form} onSubmit={(event) => void register(event, item)}>
          <div className={styles.formGrid}>
            <label className={styles.formField}><span className={styles.label}>Data da reposição</span><input className={styles.field} name="completedAt" type="datetime-local" defaultValue={dateTimeLocal(new Date().toISOString())} required /></label>
            <label className={styles.formField}><span className={styles.label}>Nota (opcional)</span><input className={styles.field} name="note" placeholder="Contexto mínimo necessário" /></label>
          </div>
          <div className={styles.formActions}><StatusBadge tone="warning">{item.status === "absent" ? "Falta" : "Falta justificada"}</StatusBadge><MagneticAction><button className={styles.toolbarAction} disabled={pendingId === item.attendanceId}>{pendingId === item.attendanceId ? "Registrando…" : <><CheckCircle2 className={styles.icon} /> Registrar reposição</>}</button></MagneticAction></div>
        </form>
      </article>)}</div>
    </section>}
    <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Como a rota funciona</h2><p>A reposição não substitui nem mascara a falta: ela a complementa com uma evidência de recomposição.</p></div><CalendarClock aria-hidden="true" /></div></section>
  </div>;
}
