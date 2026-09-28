"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { apiMutation } from "@/components/prototype/live-api";
import { MagneticAction } from "@/components/academy";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AcademySelect } from "./academy-select";
import { useAdminCurricula } from "./admin-data";
import styles from "./admin-experience.module.css";

const weekdays = [{ value: "1", label: "Segunda" }, { value: "2", label: "Terça" }, { value: "3", label: "Quarta" }, { value: "4", label: "Quinta" }, { value: "5", label: "Sexta" }, { value: "6", label: "Sábado" }];

function OperationSheet({ title, description, children, label }: { title: string; description: string; children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button className={styles.toolbarAction}><Plus className={styles.icon} /> {label}</button></SheetTrigger><SheetContent side="right" className="overflow-y-auto"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>{children}</SheetContent></Sheet>;
}

export function CreateClassSheet({ afterSave }: { afterSave: () => Promise<void> }) {
  const { data: curricula } = useAdminCurricula(); const [pending, setPending] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  const curriculumItems = useMemo(() => (curricula ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${item.version}` })), [curricula]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setNotice(null); try { await apiMutation("/api/admin/classes", "POST", { name: String(form.get("name")), curriculumId: String(form.get("curriculumId")), schedule: { startsOn: String(form.get("startsOn")), weekdays: [Number(form.get("weekdayA")), Number(form.get("weekdayB"))], startsAtLocal: [String(form.get("timeA")), String(form.get("timeB"))], durationMinutes: Number(form.get("durationMinutes")), timezone: "America/Sao_Paulo" } }); setNotice("Turma criada com a sequência de 16 encontros."); await afterSave(); event.currentTarget.reset(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível criar a turma."); } finally { setPending(false); } }
  return <OperationSheet label="Nova turma" title="Criar turma" description="A turma define o calendário presencial e gera os 16 encontros na ordem curricular."><form className={`${styles.form} p-4`} onSubmit={submit}><label className={styles.formField}><span className={styles.label}>Nome da turma</span><input className={styles.field} name="name" required /></label><label className={styles.formField}><span className={styles.label}>Currículo</span><AcademySelect name="curriculumId" ariaLabel="Currículo" items={curriculumItems} placeholder="Selecione" required /></label><label className={styles.formField}><span className={styles.label}>Primeiro encontro</span><input className={styles.field} name="startsOn" type="date" required /></label><div className={styles.formGrid}><label className={styles.formField}><span className={styles.label}>Dia 1</span><AcademySelect name="weekdayA" ariaLabel="Primeiro dia" items={weekdays} defaultValue="2" required /></label><label className={styles.formField}><span className={styles.label}>Hora 1</span><input className={styles.field} name="timeA" type="time" defaultValue="18:00" required /></label><label className={styles.formField}><span className={styles.label}>Dia 2</span><AcademySelect name="weekdayB" ariaLabel="Segundo dia" items={weekdays} defaultValue="4" required /></label><label className={styles.formField}><span className={styles.label}>Hora 2</span><input className={styles.field} name="timeB" type="time" defaultValue="18:00" required /></label></div><label className={styles.formField}><span className={styles.label}>Duração (minutos)</span><input className={styles.field} name="durationMinutes" type="number" min="15" max="480" defaultValue="120" required /></label><p className={styles.notice}>Fuso aplicado: America/Sao_Paulo. O servidor continua sendo a fonte final para os 16 encontros.</p>{notice && <p className={styles.notice} role="status">{notice}</p>}<MagneticAction><button className={styles.toolbarAction} disabled={pending}>{pending ? "Criando…" : "Criar turma e encontros"}</button></MagneticAction></form></OperationSheet>;
}
