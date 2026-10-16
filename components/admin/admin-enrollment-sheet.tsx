"use client";

import { type FormEvent, useState } from "react";
import type { EnrollmentSummary, ScheduleInput } from "@/specs/api.contracts";
import { apiMutation } from "@/components/prototype/live-api";
import { StateScene } from "@/components/academy";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AcademySelect } from "./academy-select";
import { useAdminEnrollmentOptions } from "./admin-data";
import { AdminScheduleFields } from "./admin-operations-sheets";
import { initialAdminSchedule, previewMeetingDates } from "./admin-schedule-preview";
import styles from "./admin-experience.module.css";

export function AdminEnrollmentSheet({ studentId, studentName, afterSave }: { studentId: string; studentName: string; afterSave: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const options = useAdminEnrollmentOptions(open);
  const [kind, setKind] = useState<"class" | "individual">("class");
  const [classId, setClassId] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [schedule, setSchedule] = useState<ScheduleInput>(initialAdminSchedule);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const selectedClass = options.data?.classes.find((item) => item.id === classId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (created || pending) return;
    setPending(true); setNotice(null);
    try {
      if (kind === "class" && (!selectedClass || selectedClass.occupiedSeats >= selectedClass.capacity)) throw new Error("Selecione uma turma com vaga disponível.");
      if (kind === "individual" && (!curriculumId || previewMeetingDates(schedule).length !== 16)) throw new Error("Selecione um currículo e confira o calendário individual.");
      await apiMutation<EnrollmentSummary>("/api/admin/enrollments", "POST", kind === "class" && selectedClass ? { studentId, curriculumId: selectedClass.curriculumId, kind, classId } : { studentId, curriculumId, kind: "individual", individualSchedule: schedule });
      setCreated(true);
      setNotice("Matrícula criada. O histórico anterior foi preservado.");
      try { await afterSave(); setOpen(false); } catch { setNotice("Matrícula criada. Atualize a página para visualizar o novo percurso."); }
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível criar a matrícula."); }
    finally { setPending(false); }
  }
  return <Sheet open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); if (next) { setCreated(false); setNotice(null); } } }}><SheetTrigger asChild><button type="button" className={styles.toolbarAction}>Adicionar matrícula</button></SheetTrigger><SheetContent className={`${styles.paperBody} overflow-y-auto`}><SheetHeader><SheetTitle>Nova matrícula</SheetTitle><SheetDescription>Abra outro percurso para {studentName}, preservando as matrículas e evidências anteriores.</SheetDescription></SheetHeader>
    {options.loading ? <StateScene state="loading" title="Lendo percursos disponíveis" /> : options.error ? <StateScene state="error" description={options.error.message} action={<button className={styles.secondaryAction} onClick={() => void options.reload()}>Tentar novamente</button>} /> : !options.data?.curricula.length ? <StateScene state="empty" title="Nenhum currículo disponível" /> : <form className={styles.form} onSubmit={submit}><fieldset className={styles.form} disabled={pending}>
      <legend className={styles.label}>Modalidade</legend><div className={styles.choiceList}><label className={styles.choice}><input type="radio" name="kind" checked={kind === "class"} onChange={() => setKind("class")} /> Turma</label><label className={styles.choice}><input type="radio" name="kind" checked={kind === "individual"} onChange={() => setKind("individual")} /> Individual</label></div>
      {kind === "class" ? <><label className={styles.formField}><span className={styles.label}>Turma</span><AcademySelect ariaLabel="Turma da nova matrícula" value={classId} onValueChange={setClassId} required disabled={pending} placeholder="Selecione uma turma" items={options.data.classes.map((item) => ({ value: item.id, label: `${item.name} · ${Math.max(0, item.capacity - item.occupiedSeats)} vaga(s)` }))} /></label>{selectedClass && <p className={selectedClass.occupiedSeats >= selectedClass.capacity ? styles.warning : styles.notice}>{selectedClass.occupiedSeats}/{selectedClass.capacity} vagas ocupadas. O servidor confirma a disponibilidade ao salvar.</p>}</> : <><label className={styles.formField}><span className={styles.label}>Currículo</span><AcademySelect ariaLabel="Currículo da matrícula" value={curriculumId} onValueChange={setCurriculumId} required disabled={pending} placeholder="Selecione um currículo" items={options.data.curricula.map((item) => ({ value: item.id, label: `${item.name} · ${item.version}` }))} /></label><AdminScheduleFields schedule={schedule} onChange={setSchedule} disabled={pending} /></>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.formActions}><button type="button" className={styles.secondaryAction} onClick={() => setOpen(false)} disabled={pending}>{created ? "Fechar" : "Voltar"}</button><button className={styles.toolbarAction} disabled={pending || created || (kind === "class" && (!selectedClass || selectedClass.occupiedSeats >= selectedClass.capacity))}>{pending ? "Matriculando…" : created ? "Matrícula criada" : "Criar matrícula"}</button></div>
    </fieldset></form>}
  </SheetContent></Sheet>;
}
