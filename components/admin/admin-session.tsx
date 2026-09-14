"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, Send, UsersRound } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { AttendanceEntry, AttendanceStatus, SessionStatus, SessionSummary } from "@/specs/api.contracts";
import { MagneticAction, MetricStrip, SpotlightCard, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademySelect } from "./academy-select";
import { useAdminClass } from "./admin-data";
import { activeEnrollments, attendanceLabels, sessionStatusLabels, toIsoDateTime, toLocalDateTime } from "./admin-utils";
import styles from "./admin-experience.module.css";

type AttendanceDraft = Record<string, { status: AttendanceStatus; privateNote: string }>;

export function AdminSession({ sessionId, classId }: { sessionId: string; classId: string | null }) {
  const detail = useAdminClass(classId ?? undefined);
  const savedAttendance = useLiveApi<readonly AttendanceEntry[]>(classId ? `/api/admin/sessions/${sessionId}/attendance` : null);
  const enrollments = useMemo(() => activeEnrollments(detail.data?.enrollments ?? []), [detail.data?.enrollments]);
  const session = detail.data?.sessions.find((item) => item.id === sessionId);
  const [attendance, setAttendance] = useState<AttendanceDraft>({});

  useEffect(() => {
    if (!enrollments.length || savedAttendance.loading || !savedAttendance.data) return;
    const savedByEnrollment = new Map(savedAttendance.data.map((entry) => [entry.enrollmentId, entry]));
    setAttendance(Object.fromEntries(enrollments.map((enrollment) => {
      const entry = savedByEnrollment.get(enrollment.id);
      return [enrollment.id, entry ? { status: entry.status, privateNote: entry.privateNote ?? "" } : { status: "present" as const, privateNote: "" }];
    })));
  }, [enrollments, savedAttendance.data, savedAttendance.loading]);

  if (!classId) return <StateScene state="error" title="Turma não informada" description="Abra o encontro a partir do calendário da turma para preservar o contexto coletivo." action={<Link className={styles.secondaryAction} href="/admin/turmas">Voltar às turmas</Link>} />;
  if (detail.loading || savedAttendance.loading) return <StateScene state="loading" title="Preparando o encontro" description="Organizando aula, chamada e atividade da turma." />;
  if (detail.error || savedAttendance.error) return <StateScene state="error" description={detail.error?.message ?? savedAttendance.error?.message} action={<button className={styles.secondaryAction} onClick={() => { void detail.reload(); void savedAttendance.reload(); }}>Tentar novamente</button>} />;
  if (!detail.data || !session) return <StateScene state="empty" title="Encontro não encontrado" description="Ele pode ter sido reagendado ou removido do calendário desta turma." action={<Link className={styles.secondaryAction} href={`/admin/turmas/${classId}`}>Abrir turma</Link>} />;

  const absences = Object.values(attendance).filter((entry) => entry.status !== "present").length;
  return <div className={styles.stack}>
    <Link className={styles.backLink} href={`/admin/turmas/${classId}`}><ArrowLeft className={styles.icon} aria-hidden="true" /> Voltar à turma</Link>
    <header className={styles.sessionHero}>
      <div><span className={styles.sessionNumber}>Encontro {String(session.lessonPosition).padStart(2, "0")} · presencial</span><h1>{session.lessonTitle}</h1><p>A plataforma organiza presença, continuidade e liberação de atividade. A experiência principal continua acontecendo em sala.</p></div>
      <div className={styles.sessionDate}><strong>{formatWeekday(session.startsAt)}</strong><span>{formatDateTime(session.startsAt)}</span><StatusBadge tone={session.status === "completed" ? "success" : session.status === "cancelled" ? "danger" : session.status === "rescheduled" ? "warning" : "neutral"}>{sessionStatusLabels[session.status]}</StatusBadge></div>
    </header>
    <MetricStrip metrics={[
      { id: "students", label: "Alunos na chamada", value: String(enrollments.length), detail: "máximo de seis" },
      { id: "present", label: "Presenças marcadas", value: String(enrollments.length - absences), detail: "para esta chamada" },
      { id: "makeup", label: "Exigem reposição", value: String(absences), detail: "100% para concluir", emphasis: absences > 0 },
    ]} />
    <Tabs defaultValue="attendance" className={styles.tabShell}>
      <TabsList variant="line" className={styles.tabsList} aria-label="Operações do encontro">
        <TabsTrigger className={styles.tabTrigger} value="attendance">Frequência</TabsTrigger>
        <TabsTrigger className={styles.tabTrigger} value="schedule">Ajustar encontro</TabsTrigger>
        <TabsTrigger className={styles.tabTrigger} value="release">Liberar atividade</TabsTrigger>
      </TabsList>
      <TabsContent className={styles.tabPanel} value="attendance"><AttendancePanel session={session} enrollments={enrollments} attendance={attendance} setAttendance={setAttendance} /></TabsContent>
      <TabsContent className={styles.tabPanel} value="schedule"><SchedulePanel session={session} reload={detail.reload} /></TabsContent>
      <TabsContent className={styles.tabPanel} value="release"><ReleasePanel session={session} enrollments={enrollments} /></TabsContent>
    </Tabs>
  </div>;
}

function AttendancePanel({ session, enrollments, attendance, setAttendance }: { session: SessionSummary; enrollments: ReturnType<typeof activeEnrollments>; attendance: AttendanceDraft; setAttendance: React.Dispatch<React.SetStateAction<AttendanceDraft>> }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function save() {
    setPending(true); setNotice(null);
    try {
      const entries = enrollments.map((enrollment) => ({ enrollmentId: enrollment.id, status: attendance[enrollment.id]?.status ?? "present", privateNote: attendance[enrollment.id]?.privateNote.trim() || undefined }));
      const saved = await apiMutation<readonly AttendanceEntry[]>(`/api/admin/sessions/${session.id}/attendance`, "PUT", { entries });
      setAttendance(Object.fromEntries(saved.map((entry) => [entry.enrollmentId, { status: entry.status, privateNote: entry.privateNote ?? "" }])));
      const absentCount = entries.filter((entry) => entry.status !== "present").length;
      setNotice(absentCount ? `Chamada salva. ${absentCount} aluno(s) precisam cumprir reposição antes de concluir o módulo.` : "Chamada salva. Presença integral registrada para este encontro.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível salvar a chamada."); }
    finally { setPending(false); }
  }
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Chamada pedagógica</h2><p>Uma falta, mesmo justificada, exige remarcação ou reposição. O módulo só conclui com 100% de frequência.</p></div><UsersRound aria-hidden="true" /></div><div className={styles.paperBody}>
    {!enrollments.length ? <StateScene state="empty" title="Nenhum aluno ativo nesta turma" description="A chamada será habilitada quando houver matrículas ativas." /> : <div className={styles.attendanceList}>{enrollments.map((enrollment) => {
      const draft = attendance[enrollment.id] ?? { status: "present" as const, privateNote: "" };
      return <article className={styles.attendanceRow} key={enrollment.id}>
        <div className={styles.attendancePerson}><span className={styles.avatar}>{enrollment.studentName.slice(0, 2).toUpperCase()}</span><span><strong>{enrollment.studentName}</strong><small>{enrollment.curriculumName}</small></span></div>
        <div className={styles.attendanceControls}>
          <label className={styles.formField}><span className="sr-only">Presença de {enrollment.studentName}</span><AcademySelect ariaLabel={`Presença de ${enrollment.studentName}`} value={draft.status} onValueChange={(next) => setAttendance((current) => ({ ...current, [enrollment.id]: { ...draft, status: next as AttendanceStatus } }))} items={Object.entries(attendanceLabels).map(([value, label]) => ({ value, label }))} /></label>
          <label className={styles.formField}><span className="sr-only">Nota privada de {enrollment.studentName}</span><input className={styles.field} value={draft.privateNote} onChange={(event) => setAttendance((current) => ({ ...current, [enrollment.id]: { ...draft, privateNote: event.target.value } }))} placeholder="Nota privada opcional" /></label>
        </div>
      </article>;
    })}</div>}
    {notice && <p className={notice.includes("precisam") ? styles.warning : styles.notice} role="status">{notice}</p>}
    {!!enrollments.length && <div className={styles.formActions}><MagneticAction><button type="button" className={styles.toolbarAction} disabled={pending} onClick={() => void save()}><CheckCircle2 className={styles.icon} /> {pending ? "Salvando chamada…" : "Salvar chamada"}</button></MagneticAction></div>}
  </div></section>;
}

function SchedulePanel({ session, reload }: { session: SessionSummary; reload: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setNotice(null); const form = new FormData(event.currentTarget);
    try {
      const startsAt = toIsoDateTime(String(form.get("startsAt"))); const endsAt = toIsoDateTime(String(form.get("endsAt")));
      if (new Date(endsAt) <= new Date(startsAt)) throw new Error("O fim do encontro deve acontecer depois do início.");
      await apiMutation<SessionSummary>(`/api/admin/sessions/${session.id}`, "PATCH", { startsAt, endsAt, status: String(form.get("status")) as SessionStatus });
      setNotice("Encontro atualizado. O calendário da turma já reflete a mudança."); await reload();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível ajustar o encontro."); }
    finally { setPending(false); }
  }
  return <div className={styles.sectionGrid}><section className={styles.paper}><div className={styles.paperHeader}><div><h2>Horário e estado</h2><p>Remarcações preservam a posição da aula e a exigência de presença.</p></div><CalendarClock aria-hidden="true" /></div><div className={styles.paperBody}><form className={styles.form} onSubmit={save}><div className={styles.formGrid}>
    <label className={styles.formField}><span className={styles.label}>Início</span><input className={styles.field} name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(session.startsAt)} required /></label>
    <label className={styles.formField}><span className={styles.label}>Fim</span><input className={styles.field} name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(session.endsAt)} required /></label>
    <label className={styles.formField}><span className={styles.label}>Status</span><AcademySelect name="status" ariaLabel="Status do encontro" defaultValue={session.status} items={[{ value: "scheduled", label: "Agendada" }, { value: "rescheduled", label: "Remarcada" }, { value: "completed", label: "Concluída" }, { value: "cancelled", label: "Cancelada" }]} /></label>
  </div>{notice && <p className={styles.notice} role="status">{notice}</p>}<div className={styles.formActions}><MagneticAction><button className={styles.toolbarAction} disabled={pending}>{pending ? "Atualizando…" : "Atualizar encontro"}</button></MagneticAction></div></form></div></section>
  <SpotlightCard className={styles.paper}><div className={styles.paperHeader}><div><h2>Regra de conclusão</h2><p>Calendário flexível; presença inegociável.</p></div></div><div className={styles.paperBody}><p className={styles.warning}>Remarcar não remove a aula do percurso. Para concluir qualquer módulo, cada aluno deve participar dos 16 encontros ou cumprir a reposição correspondente.</p></div></SpotlightCard></div>;
}

function ReleasePanel({ session, enrollments }: { session: SessionSummary; enrollments: ReturnType<typeof activeEnrollments> }) {
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function release(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (target === "selected" && !selected.size) { setNotice("Selecione pelo menos um aluno para a liberação segmentada."); return; }
    const form = new FormData(event.currentTarget); setPending(true);
    try {
      const response = await apiMutation<{ assignmentIds: readonly string[]; releasedAt: string }>(`/api/admin/sessions/${session.id}/release`, "POST", {
        target: target === "all" ? { kind: "all_active_enrollments" } : { kind: "enrollments", enrollmentIds: [...selected] },
        dueAt: toIsoDateTime(String(form.get("dueAt"))), supplementalInstructions: String(form.get("instructions")).trim() || undefined,
      });
      setNotice(`${response.assignmentIds.length} atividade(s) liberada(s). O bloqueio gradual do projeto foi preservado.`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível liberar a atividade."); }
    finally { setPending(false); }
  }
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  return <div className={styles.sectionGrid}><section className={styles.paper}><div className={styles.paperHeader}><div><h2>Liberar continuidade</h2><p>A atividade reforça o conceito presencial e avança o projeto gradualmente.</p></div><Send aria-hidden="true" /></div><div className={styles.paperBody}><form className={styles.form} onSubmit={release}>
    <fieldset className={styles.form}><legend className={styles.label}>Destino da atividade</legend><div className={styles.choiceList}>
      <label className={styles.choice}><input type="radio" name="target" checked={target === "all"} onChange={() => setTarget("all")} /> Todos os alunos ativos</label>
      <label className={styles.choice}><input type="radio" name="target" checked={target === "selected"} onChange={() => setTarget("selected")} /> Selecionar alunos</label>
    </div></fieldset>
    {target === "selected" && <fieldset className={styles.form}><legend className={styles.label}>Alunos</legend><div className={styles.choiceList}>{enrollments.map((enrollment) => <label className={styles.choice} key={enrollment.id}><input type="checkbox" checked={selected.has(enrollment.id)} onChange={() => toggle(enrollment.id)} /> {enrollment.studentName}</label>)}</div></fieldset>}
    <label className={styles.formField}><span className={styles.label}>Prazo da atividade</span><input className={styles.field} name="dueAt" type="datetime-local" min={toLocalDateTime(new Date().toISOString())} required /></label>
    <label className={styles.formField}><span className={styles.label}>Orientação complementar</span><textarea className={styles.textarea} name="instructions" placeholder="Somente o que complementa a atividade base" /></label>
    {notice && <p className={notice.includes("Selecione") ? styles.warning : styles.notice} role="status">{notice}</p>}
    <div className={styles.formActions}><MagneticAction><button className={styles.toolbarAction} disabled={pending || !enrollments.length}><ClipboardCheck className={styles.icon} /> {pending ? "Liberando…" : "Liberar atividade"}</button></MagneticAction></div>
  </form></div></section>
  <SpotlightCard className={styles.paper}><div className={styles.paperHeader}><div><h2>Bloqueio pedagógico</h2><p>Uma missão por vez.</p></div></div><div className={styles.paperBody}><p className={styles.notice}>A liberação acontece a partir deste encontro. O aluno não recebe acesso antecipado ao restante do projeto e trabalha apenas a próxima evidência.</p></div></SpotlightCard></div>;
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value)); }
function formatWeekday(value: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(value)); }
