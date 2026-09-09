"use client";

import { CalendarDays, CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import type { AttendanceStatus, EnrollmentSummary, Page, ProjectSummary, SessionSummary } from "@/specs/api.contracts";
import { MetricStrip, PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import styles from "./student-pages.module.css";

type Journey = { enrollment: EnrollmentSummary; projects: readonly ProjectSummary[]; sessionsCompleted: number; sessionsTotal: 16 };
type AttendanceItem = { id?: string; session: SessionSummary; status: AttendanceStatus; makeup: { completedAt: string; makeupSessionId: string | null } | null };

const statusCopy: Record<AttendanceStatus, { label: string; tone: "success" | "warning" | "danger" }> = { present: { label: "Presente", tone: "success" }, absent: { label: "Ausência", tone: "danger" }, excused_absence: { label: "Reposição necessária", tone: "warning" } };

export function StudentAgenda() {
  const [tab, setTab] = useState<"agenda"|"frequencia">("agenda");
  const agendaTabRef = useRef<HTMLButtonElement>(null);
  const attendanceTabRef = useRef<HTMLButtonElement>(null);
  function activateTab(next: "agenda" | "frequencia") {
    setTab(next);
    requestAnimationFrame(() => (next === "agenda" ? agendaTabRef : attendanceTabRef).current?.focus());
  }
  const journey = useLiveApi<Journey>("/api/student/journey");
  const enrollmentId = journey.data?.enrollment.id;
  const calendar = useLiveApi<readonly SessionSummary[]>(enrollmentId ? `/api/student/calendar?enrollmentId=${enrollmentId}` : null);
  const attendance = useLiveApi<Page<AttendanceItem>>(enrollmentId ? `/api/student/attendance?enrollmentId=${enrollmentId}&limit=50` : null);
  const absences = attendance.data?.items.filter((item) => item.status !== "present" && !item.makeup).length ?? 0;
  const percent = journey.data ? Math.round((journey.data.sessionsCompleted / journey.data.sessionsTotal) * 100) : 0;
  const loading = journey.loading || (Boolean(enrollmentId) && (calendar.loading || attendance.loading));
  const error = journey.error ?? calendar.error ?? attendance.error;

  return <div className={styles.page}>
    <PageHeader eyebrow="Ritmo presencial" marker="Frequência obrigatória · 100%" title="Agenda e frequência" description="As aulas acontecem presencialmente. Aqui você acompanha datas, remarcações e o registro necessário para concluir cada módulo." />
    <MetricStrip metrics={[{id:"progress",label:"Ciclo concluído",value:`${percent}%`,detail:`${journey.data?.sessionsCompleted ?? 0} de ${journey.data?.sessionsTotal ?? 16} encontros`,emphasis:true},{id:"next",label:"Próximos encontros",value:String(calendar.data?.filter((item)=>new Date(item.startsAt)>new Date()).length ?? 0),detail:"no calendário atual"},{id:"makeup",label:"Reposições pendentes",value:String(absences),detail:absences ? "necessárias para concluir" : "frequência em dia"}]} />
    <div className={styles.tabs} role="tablist" aria-label="Agenda e frequência"><button ref={agendaTabRef} id="agenda-tab" role="tab" aria-selected={tab === "agenda"} aria-controls="agenda-panel" tabIndex={tab === "agenda" ? 0 : -1} data-active={tab === "agenda"} onClick={() => activateTab("agenda")} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); activateTab("frequencia"); } }}><CalendarDays size={16} /> Agenda</button><button ref={attendanceTabRef} id="frequencia-tab" role="tab" aria-selected={tab === "frequencia"} aria-controls="frequencia-panel" tabIndex={tab === "frequencia" ? 0 : -1} data-active={tab === "frequencia"} onClick={() => activateTab("frequencia")} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); activateTab("agenda"); } }}><CheckCircle2 size={16} /> Frequência</button></div>
    <div id={tab === "agenda" ? "agenda-panel" : "frequencia-panel"} role="tabpanel" aria-labelledby={tab === "agenda" ? "agenda-tab" : "frequencia-tab"}>{loading ? <StateScene state="loading" title="Sincronizando calendário" description="Organizando encontros e registros." /> : error ? <StateScene state="error" title="Não foi possível abrir sua agenda" description={error.message} action={<button onClick={() => { void journey.reload(); void calendar.reload(); void attendance.reload(); }}>Tentar novamente</button>} /> : tab === "agenda" ? calendar.data?.length ? <div className={styles.timeline}>{calendar.data.map((session) => <article className={styles.session} key={session.id}><div className={styles.date}>{new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).format(new Date(session.startsAt))}</div><div><strong>{session.lessonPosition.toString().padStart(2,"0")} · {session.lessonTitle}</strong><small><Clock3 size={14} /> {new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date(session.startsAt))}–{new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date(session.endsAt))}</small></div><StatusBadge tone={session.status === "rescheduled" ? "warning" : session.status === "completed" ? "success" : "neutral"}>{session.status === "rescheduled" ? "Remarcado" : session.status === "completed" ? "Concluído" : "Agendado"}</StatusBadge></article>)}</div> : <StateScene state="empty" title="Calendário em preparação" description="Assim que as datas forem confirmadas, elas aparecerão aqui." /> : attendance.data?.items.length ? <div className={styles.attendance}>{attendance.data.items.map((entry) => { const status=statusCopy[entry.status]; return <div className={styles.attendanceRow} key={entry.session.id}><div><strong>{entry.session.lessonPosition.toString().padStart(2,"0")} · {entry.session.lessonTitle}</strong><small>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(entry.session.startsAt))}</small></div><StatusBadge tone={entry.makeup ? "success" : status.tone}>{entry.makeup ? "Reposta" : status.label}</StatusBadge><span>{entry.makeup ? <><CheckCircle2 size={16} /> Regularizada</> : entry.status !== "present" ? <><RotateCcw size={16} /> Reposição pendente</> : "Registro confirmado"}</span></div>; })}</div> : <StateScene state="empty" title="Nenhum registro ainda" description="A frequência será registrada após cada encontro presencial." />}</div>
  </div>;
}
