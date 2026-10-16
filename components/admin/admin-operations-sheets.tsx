"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { ScheduleInput } from "@/specs/api.contracts";
import { apiMutation } from "@/components/prototype/live-api";
import { MagneticAction, StateScene } from "@/components/academy";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AcademySelect } from "./academy-select";
import { useAdminCurricula } from "./admin-data";
import { initialAdminSchedule, previewMeetingDates } from "./admin-schedule-preview";
import styles from "./admin-experience.module.css";

const weekdays = [{ value: "0", label: "Domingo" }, { value: "1", label: "Segunda" }, { value: "2", label: "Terça" }, { value: "3", label: "Quarta" }, { value: "4", label: "Quinta" }, { value: "5", label: "Sexta" }, { value: "6", label: "Sábado" }];

export function AdminScheduleFields({ schedule, onChange, disabled }: { schedule: ScheduleInput; onChange: (next: ScheduleInput) => void; disabled: boolean }) {
  const dates = useMemo(() => previewMeetingDates(schedule), [schedule]);
  function setDay(index: 0 | 1, value: string) { const days: [number, number] = [...schedule.weekdays]; days[index] = Number(value); onChange({ ...schedule, weekdays: days }); }
  function setTime(index: 0 | 1, value: string) { const times: [string, string] = [...schedule.startsAtLocal]; times[index] = value; onChange({ ...schedule, startsAtLocal: times }); }
  return <>
    <label className={styles.formField}><span className={styles.label}>Primeiro encontro a partir de</span><input className={styles.field} name="startsOn" type="date" required disabled={disabled} value={schedule.startsOn} onChange={(event) => onChange({ ...schedule, startsOn: event.target.value })} /></label>
    <div className={styles.formGrid}>{([0, 1] as const).map((index) => <div className={styles.form} key={index}>
      <label className={styles.formField}><span className={styles.label}>Dia {index + 1}</span><AcademySelect ariaLabel={`Dia ${index + 1}`} value={String(schedule.weekdays[index])} onValueChange={(value) => setDay(index, value)} items={weekdays} disabled={disabled} /></label>
      <label className={styles.formField}><span className={styles.label}>Hora {index + 1}</span><input className={styles.field} type="time" value={schedule.startsAtLocal[index]} onChange={(event) => setTime(index, event.target.value)} required disabled={disabled} /></label>
    </div>)}</div>
    <label className={styles.formField}><span className={styles.label}>Duração (minutos)</span><input className={styles.field} type="number" min="15" max="480" value={schedule.durationMinutes} onChange={(event) => onChange({ ...schedule, durationMinutes: Number(event.target.value) })} required disabled={disabled} /></label>
    <label className={styles.formField}><span className={styles.label}>Fuso horário (IANA)</span><input className={styles.field} value={schedule.timezone} onChange={(event) => onChange({ ...schedule, timezone: event.target.value })} required disabled={disabled} placeholder="America/Sao_Paulo" /></label>
    <details className={styles.notice}><summary>Prévia dos 16 encontros</summary>{dates.length ? <ol>{dates.map((date, index) => <li key={date}>Aula {String(index + 1).padStart(2, "0")} · {date.slice(0, 10).split("-").reverse().join("/")} às {date.slice(11)} · {schedule.timezone}</li>)}</ol> : <p>Preencha uma data, dois dias distintos e um fuso válido para ver a prévia.</p>}<p>Datas locais no fuso escolhido. O servidor valida e confirma o calendário.</p></details>
  </>;
}

export function CreateClassSheet({ afterSave }: { afterSave: () => Promise<void> }) {
  const { data: curricula, loading, error, reload } = useAdminCurricula();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleInput>(initialAdminSchedule);
  const [open, setOpen] = useState(false);
  const curriculumItems = useMemo(() => (curricula ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${item.version}` })), [curricula]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true); setNotice(null);
    try {
      if (previewMeetingDates(schedule).length !== 16) throw new Error("Confira a data, os dias e o fuso do calendário.");
      await apiMutation("/api/admin/classes", "POST", { name: String(form.get("name")), curriculumId: String(form.get("curriculumId")), schedule });
      formElement.reset(); setSchedule(initialAdminSchedule);
      setNotice("Turma criada com a sequência de 16 encontros.");
      try { await afterSave(); } catch { setNotice("Turma criada. Atualize a lista para visualizar os novos encontros."); }
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível criar a turma."); }
    finally { setPending(false); }
  }
  return <Sheet open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}><SheetTrigger asChild><button className={styles.toolbarAction}><Plus className={styles.icon} /> Nova turma</button></SheetTrigger><SheetContent side="right" className={`${styles.paperBody} overflow-y-auto`}><SheetHeader><SheetTitle>Criar turma</SheetTitle><SheetDescription>A turma define o calendário presencial e gera os 16 encontros na ordem curricular.</SheetDescription></SheetHeader>
    {loading ? <StateScene state="loading" title="Lendo currículos" /> : error ? <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} /> : !curricula?.length ? <StateScene state="empty" title="Nenhum currículo disponível" /> : <form className={styles.form} onSubmit={submit}>
      <label className={styles.formField}><span className={styles.label}>Nome da turma</span><input className={styles.field} name="name" required disabled={pending} /></label>
      <label className={styles.formField}><span className={styles.label}>Currículo</span><AcademySelect name="curriculumId" ariaLabel="Currículo" items={curriculumItems} placeholder="Selecione" required disabled={pending} /></label>
      <AdminScheduleFields schedule={schedule} onChange={setSchedule} disabled={pending} />
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <MagneticAction><button className={styles.toolbarAction} disabled={pending}>{pending ? "Criando…" : "Criar turma e encontros"}</button></MagneticAction>
    </form>}
  </SheetContent></Sheet>;
}
