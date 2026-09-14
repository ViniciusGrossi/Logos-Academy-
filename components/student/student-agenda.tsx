"use client";

import { ptBR } from "date-fns/locale";
import {
  ArrowDown,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  RotateCcw,
} from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import type { AttendanceStatus, EnrollmentSummary, Page, ProjectSummary, SessionSummary } from "@/specs/api.contracts";
import { MagneticAction, StateScene } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav";
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import styles from "./student-agenda.module.css";

type Journey = { enrollment: EnrollmentSummary; projects: readonly ProjectSummary[]; sessionsCompleted: number; sessionsTotal: 16 };
type AttendanceItem = { id?: string; session: SessionSummary; status: AttendanceStatus; makeup: { completedAt: string; makeupSessionId: string | null } | null };
type CalendarData = { status: SessionSummary["status"]; lessonPosition: number };

const statusCopy: Record<AttendanceStatus, string> = {
  present: "Presença confirmada",
  absent: "Ausência registrada",
  excused_absence: "Reposição necessária",
};

const sessionStatusCopy: Record<SessionSummary["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  rescheduled: "Remarcado",
  cancelled: "Cancelado",
};

const calendarColors: Record<SessionSummary["status"], string> = {
  scheduled: "#ff6b00",
  completed: "#16a34a",
  rescheduled: "#d97706",
  cancelled: "#6b7280",
};

const calendarI18n = {
  labels: {
    today: "Hoje",
    previous: "Anterior",
    next: "Próximo",
    noEvents: "Nenhum encontro",
    loading: "Carregando encontros",
    event: "encontro",
    events: (count: number) => count === 1 ? "1 encontro" : `${count} encontros`,
    selectView: "Selecionar visualização",
    goToDate: "Ir para uma data",
    more: (count: number) => `+${count} encontros`,
  },
  viewNames: { month: "Mês", week: "Semana", day: "Dia", agenda: "Lista" },
};

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(value));
}

export function StudentAgenda() {
  const [tab, setTab] = useState<"agenda" | "frequencia">("agenda");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showMakeupGuide, setShowMakeupGuide] = useState(false);
  const calendarRef = useRef<HTMLElement>(null);
  const attendanceRef = useRef<HTMLElement>(null);
  const journey = useLiveApi<Journey>("/api/student/journey");
  const enrollmentId = journey.data?.enrollment.id;
  const calendar = useLiveApi<readonly SessionSummary[]>(enrollmentId ? `/api/student/calendar?enrollmentId=${enrollmentId}` : null);
  const attendance = useLiveApi<Page<AttendanceItem>>(enrollmentId ? `/api/student/attendance?enrollmentId=${enrollmentId}&limit=50` : null);
  const loading = journey.loading || (Boolean(enrollmentId) && (calendar.loading || attendance.loading));
  const error = journey.error ?? calendar.error ?? attendance.error;

  const sessions = useMemo(() => [...(calendar.data ?? [])].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [calendar.data]);
  const nextSession = sessions.find((session) => new Date(session.startsAt) > new Date() && session.status !== "cancelled") ?? null;
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? nextSession ?? sessions[0] ?? null;
  const attendanceItems = attendance.data?.items ?? [];
  const attended = attendanceItems.filter((item) => item.status === "present" || item.makeup).length;
  const pendingMakeups = attendanceItems.filter((item) => item.status !== "present" && !item.makeup);
  const attendancePercent = attendanceItems.length ? Math.round((attended / attendanceItems.length) * 100) : 0;
  const calendarEvents = useMemo<CalendarEvent<CalendarData>[]>(() => sessions.map((session) => ({
    id: session.id,
    title: `${String(session.lessonPosition).padStart(2, "0")} · ${session.lessonTitle}`,
    start: new Date(session.startsAt),
    end: new Date(session.endsAt),
    color: calendarColors[session.status],
    readOnly: true,
    data: { status: session.status, lessonPosition: session.lessonPosition },
  })), [sessions]);

  function revealCalendar() {
    setTab("agenda");
    requestAnimationFrame(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function revealMakeup() {
    setTab("frequencia");
    setShowMakeupGuide(true);
    requestAnimationFrame(() => attendanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (loading) return <StateScene state="loading" title="Sincronizando calendário" description="Organizando encontros, remarcações e registros de presença." />;
  if (error) return <StateScene state="error" title="Não foi possível abrir sua agenda" description={error.message} action={<button type="button" onClick={() => { void journey.reload(); void calendar.reload(); void attendance.reload(); }}>Tentar novamente</button>} />;

  return <main className={styles.fieldPage}>
    <header className={styles.heading}>
      <div>
        <span className={styles.eyebrow}><Radio size={13} /> Calendário de campo · ciclo ativo</span>
        <h1>Seu ritmo,<br /><em>em perspectiva.</em></h1>
      </div>
      <div className={styles.headingContext}>
        <span>{journey.data?.enrollment.curriculumName ?? "Formação"}</span>
        <strong>{journey.data?.sessionsCompleted ?? 0} de {journey.data?.sessionsTotal ?? 16}</strong>
        <small>encontros realizados</small>
      </div>
    </header>

    <section className={styles.nextField} aria-labelledby="next-session-title">
      <div className={styles.fieldGrid} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true">
        <svg viewBox="0 0 620 330" role="presentation">
          <path className={styles.orbitGhost} d="M38 275C154 92 342 18 592 74" />
          <path className={styles.orbitTrack} d="M38 275C154 92 342 18 592 74" />
          <circle className={styles.orbitPoint} r="6"><animateMotion dur="7s" repeatCount="indefinite" path="M38 275C154 92 342 18 592 74" /></circle>
        </svg>
        <span className={styles.orbitLabel}>janela de encontro</span>
      </div>
      <div className={styles.nextCopy}>
        <span className={styles.sectionLabel}><CalendarClock size={15} /> Próximo encontro</span>
        {nextSession ? <>
          <h2 id="next-session-title">{nextSession.lessonTitle}</h2>
          <p>Encontro {String(nextSession.lessonPosition).padStart(2, "0")} da formação. Reserve este intervalo para construir, testar e registrar.</p>
          <div className={styles.nextActions}>
            <MagneticAction className={styles.calendarMagnetic}><button type="button" className={styles.primaryAction} onClick={revealCalendar}>Ver no calendário <ArrowDown size={16} /></button></MagneticAction>
            {pendingMakeups.length > 0 && <button type="button" className={styles.secondaryAction} onClick={revealMakeup}>Resolver reposição <ChevronRight size={16} /></button>}
          </div>
        </> : <>
          <h2 id="next-session-title">Calendário em preparação.</h2>
          <p>Assim que uma nova data for confirmada, ela aparecerá neste campo.</p>
        </>}
      </div>
      {nextSession && <div className={styles.dateMonolith}>
        <span>{formatDate(nextSession.startsAt, { month: "short" }).replace(".", "")}</span>
        <strong>{formatDate(nextSession.startsAt, { day: "2-digit" })}</strong>
        <div><Clock3 size={15} /> {formatDate(nextSession.startsAt, { hour: "2-digit", minute: "2-digit" })}</div>
        <small data-status={nextSession.status}>{sessionStatusCopy[nextSession.status]}</small>
      </div>}
    </section>

    <nav className={styles.viewSwitch} aria-label="Alternar entre agenda e frequência">
      <span className={styles.switchRail} data-tab={tab} aria-hidden="true" />
      <button type="button" aria-pressed={tab === "agenda"} onClick={() => setTab("agenda")}><CalendarDays size={16} /> Agenda</button>
      <button type="button" aria-pressed={tab === "frequencia"} onClick={() => setTab("frequencia")}><CheckCircle2 size={16} /> Frequência</button>
    </nav>

    {tab === "agenda" ? <section ref={calendarRef} className={styles.tabPanel} aria-label="Agenda de encontros">
      {sessions.length ? <div className={styles.calendarLayout}>
        <div className={styles.calendarFrame}>
          <div className={styles.frameHead}>
            <div><span className={styles.sectionLabel}>Mapa mensal</span><h2>Encontros e remarcações</h2></div>
            <div className={styles.legend}><span data-tone="scheduled">Agendado</span><span data-tone="completed">Concluído</span><span data-tone="rescheduled">Remarcado</span></div>
          </div>
          <EventCalendar<CalendarData>
            events={calendarEvents}
            defaultDate={nextSession ? new Date(nextSession.startsAt) : new Date()}
            defaultView="month"
            views={["month", "week", "agenda"]}
            locale={ptBR}
            weekStartsOn={1}
            interactions={{ drag: false, resize: false, selectSlot: false }}
            showDayAddButton={false}
            scrollbars="native"
            i18n={calendarI18n}
            onEventClick={(occurrence) => setSelectedSessionId(occurrence.eventId)}
            className={styles.reuiCalendar}
          >
            <EventCalendarNav />
            <EventCalendarContent />
          </EventCalendar>
        </div>
        <aside className={styles.sessionInspector}>
          <span className={styles.sectionLabel}><MapPin size={14} /> Encontro selecionado</span>
          {selectedSession && <>
            <div className={styles.inspectorIndex}>{String(selectedSession.lessonPosition).padStart(2, "0")}</div>
            <h3>{selectedSession.lessonTitle}</h3>
            <dl>
              <div><dt>Data</dt><dd>{formatDate(selectedSession.startsAt, { weekday: "long", day: "2-digit", month: "long" })}</dd></div>
              <div><dt>Horário</dt><dd>{formatDate(selectedSession.startsAt, { hour: "2-digit", minute: "2-digit" })}–{formatDate(selectedSession.endsAt, { hour: "2-digit", minute: "2-digit" })}</dd></div>
              <div><dt>Estado</dt><dd data-status={selectedSession.status}>{sessionStatusCopy[selectedSession.status]}</dd></div>
            </dl>
            <p>Selecione outro encontro no calendário para manter o contexto sem sair da página.</p>
          </>}
        </aside>
      </div> : <StateScene state="empty" title="Calendário em preparação" description="Assim que as datas forem confirmadas, elas aparecerão aqui." />}
    </section> : <section ref={attendanceRef} className={styles.tabPanel} aria-label="Histórico de frequência">
      <div className={styles.attendanceGrid}>
        <aside className={styles.presenceArc}>
          <span className={styles.sectionLabel}>Presença comprovada</span>
          <div className={styles.ring} style={{ "--attendance": attendancePercent } as CSSProperties}>
            <svg viewBox="0 0 180 180" aria-hidden="true"><circle className={styles.ringBase} cx="90" cy="90" r="72" /><circle className={styles.ringValue} cx="90" cy="90" r="72" /></svg>
            <div><strong>{attendancePercent}%</strong><span>{attended} de {attendanceItems.length}</span></div>
          </div>
          <p>O arco representa somente registros já realizados. Encontros futuros não reduzem sua frequência.</p>
          <div className={styles.presenceStats}><span><Check size={15} /> {attended} confirmados</span><span><RotateCcw size={15} /> {pendingMakeups.length} pendentes</span></div>
        </aside>

        <div className={styles.historyPanel}>
          <div className={styles.frameHead}><div><span className={styles.sectionLabel}>Histórico de campo</span><h2>Registro de frequência</h2></div></div>
          {attendanceItems.length ? <Timeline value={attendanceItems.length} className={styles.reuiTimeline}>
            {attendanceItems.map((entry, index) => <TimelineItem step={index + 1} key={entry.id ?? entry.session.id} data-attendance={entry.makeup ? "made-up" : entry.status}>
              <TimelineHeader>
                <TimelineDate dateTime={entry.session.startsAt}>{formatDate(entry.session.startsAt, { day: "2-digit", month: "short", year: "numeric" })}</TimelineDate>
                <TimelineTitle>{String(entry.session.lessonPosition).padStart(2, "0")} · {entry.session.lessonTitle}</TimelineTitle>
              </TimelineHeader>
              <TimelineIndicator>{entry.status === "present" || entry.makeup ? <Check size={11} /> : <RotateCcw size={11} />}</TimelineIndicator>
              <TimelineSeparator />
              <TimelineContent>{entry.makeup ? "Reposição concluída e registro regularizado." : statusCopy[entry.status]}</TimelineContent>
            </TimelineItem>)}
          </Timeline> : <StateScene state="empty" title="Nenhum registro ainda" description="A frequência será registrada após cada encontro presencial." />}
        </div>
      </div>

      {pendingMakeups.length > 0 && <section className={styles.makeupRoute} data-expanded={showMakeupGuide}>
        <div>
          <span className={styles.sectionLabel}><RotateCcw size={14} /> Rota de resolução</span>
          <h2>{pendingMakeups.length} reposição pendente</h2>
          <p>A falta continua no histórico até a coordenação registrar a reposição concluída.</p>
        </div>
        <button type="button" onClick={() => setShowMakeupGuide((current) => !current)} aria-expanded={showMakeupGuide}>{showMakeupGuide ? "Ocultar orientação" : "Ver como resolver"}<ChevronRight size={16} /></button>
        <div className={styles.makeupDisclosure} data-expanded={showMakeupGuide} aria-hidden={!showMakeupGuide}>
          <ol>
            <li><span>01</span><strong>Combine uma nova data</strong><small>Solicite à coordenação uma janela disponível.</small></li>
            <li><span>02</span><strong>Participe da reposição</strong><small>Cumpra o encontro referente à ausência registrada.</small></li>
            <li><span>03</span><strong>Aguarde a confirmação</strong><small>O registro será atualizado aqui pela equipe.</small></li>
          </ol>
        </div>
      </section>}
    </section>}
  </main>;
}
