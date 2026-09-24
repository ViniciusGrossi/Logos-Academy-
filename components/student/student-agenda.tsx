"use client";

import { addDays, differenceInCalendarDays, endOfWeek, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlarmClock,
  ArrowDown,
  BadgeCheck,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crosshair,
  LockKeyhole,
  Mail,
  Radio,
  RotateCcw,
  Timer,
  UsersRound,
} from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
type UpcomingFilter = "todos" | "scheduled" | "rescheduled" | "completed";

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

const upcomingFilters: readonly { id: UpcomingFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "scheduled", label: "Agendados" },
  { id: "rescheduled", label: "Remarcados" },
  { id: "completed", label: "Concluídos" },
];

const weekdayLabels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"] as const;

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
  formats: {
    eventTime: "HH:mm",
    timeGutter: "HH'h'",
    timeGutterMinute: "HH:mm",
    dayTitle: "EEEE, d 'de' MMMM 'de' yyyy",
    agendaDayHeader: "EEEE, d 'de' MMMM",
    moreDayHeader: "EEEE, d 'de' MMMM",
  },
};

function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(value));
}

function durationHours(session: SessionSummary) {
  return Math.max(0, (+new Date(session.endsAt) - +new Date(session.startsAt)) / 3_600_000);
}

/** "4h30" para 4.5, "45min" abaixo de uma hora — o formato que o aluno já lê no resto da agenda. */
function formatSpan(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours}h${String(minutes).padStart(2, "0")}` : `${wholeHours}h`;
}

function countdownCopy(target: Date, reference: Date) {
  const days = differenceInCalendarDays(target, reference);
  if (days < 0) return "encerrado";
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function StudentAgenda() {
  const [tab, setTab] = useState<"agenda" | "frequencia">("agenda");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showMakeupGuide, setShowMakeupGuide] = useState(false);
  const [upcomingFilter, setUpcomingFilter] = useState<UpcomingFilter>("todos");
  const [weekOffset, setWeekOffset] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const journey = useLiveApi<Journey>("/api/student/journey");
  const enrollmentId = journey.data?.enrollment.id;
  const calendar = useLiveApi<readonly SessionSummary[]>(enrollmentId ? `/api/student/calendar?enrollmentId=${enrollmentId}` : null);
  const attendance = useLiveApi<Page<AttendanceItem>>(enrollmentId ? `/api/student/attendance?enrollmentId=${enrollmentId}&limit=50` : null);
  const loading = journey.loading || (Boolean(enrollmentId) && (calendar.loading || attendance.loading));
  const error = journey.error ?? calendar.error ?? attendance.error;

  const sessions = useMemo(() => [...(calendar.data ?? [])].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [calendar.data]);
  const now = new Date();
  const nextSession = sessions.find((session) => new Date(session.startsAt) > now && session.status !== "cancelled") ?? null;
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? nextSession ?? sessions[0] ?? null;
  const attendanceItems = attendance.data?.items ?? [];
  const attended = attendanceItems.filter((item) => item.status === "present" || item.makeup).length;
  const pendingMakeups = attendanceItems.filter((item) => item.status !== "present" && !item.makeup);
  const attendancePercent = attendanceItems.length ? Math.round((attended / attendanceItems.length) * 100) : 0;

  // A semana navegável sai do calendário já carregado: trocar de semana não dispara request.
  const weekStart = useMemo(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekSessions = useMemo(
    () => sessions.filter((session) => {
      const start = new Date(session.startsAt);
      return start >= weekStart && start <= weekEnd && session.status !== "cancelled";
    }),
    [sessions, weekStart, weekEnd],
  );
  const weekHours = useMemo(() => weekSessions.reduce((total, session) => total + durationHours(session), 0), [weekSessions]);

  // O quadro desenha só as horas que a semana ocupa — nada de uma grade de 00h a 24h vazia.
  const hourRange = useMemo(() => {
    if (!weekSessions.length) return null;
    let first = 23;
    let last = 1;
    for (const session of weekSessions) {
      const start = new Date(session.startsAt);
      const end = new Date(session.endsAt);
      first = Math.min(first, start.getHours());
      last = Math.max(last, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
    }
    return { first, last: Math.min(Math.max(last, first + 1), 24) };
  }, [weekSessions]);

  const upcoming = useMemo(() => {
    const reference = new Date();
    const future = sessions.filter((session) => new Date(session.endsAt) >= reference && session.status !== "cancelled");
    const pool = future.length ? future : [...sessions].reverse();
    return pool.filter((session) => upcomingFilter === "todos" || session.status === upcomingFilter).slice(0, 6);
  }, [sessions, upcomingFilter]);

  const calendarEvents = useMemo<CalendarEvent<CalendarData>[]>(() => sessions.map((session) => ({
    id: session.id,
    title: `${String(session.lessonPosition).padStart(2, "0")} · ${session.lessonTitle}`,
    start: new Date(session.startsAt),
    end: new Date(session.endsAt),
    color: calendarColors[session.status],
    readOnly: true,
    data: { status: session.status, lessonPosition: session.lessonPosition },
  })), [sessions]);

  function moveFieldSpot(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    event.currentTarget.style.setProperty("--spot-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  }

  function revealCalendar() {
    setTab("agenda");
    requestAnimationFrame(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function revealBoard() {
    setTab("agenda");
    requestAnimationFrame(() => boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function revealMakeup() {
    setTab("frequencia");
    setShowMakeupGuide(true);
    requestAnimationFrame(() => attendanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function inspectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    revealCalendar();
  }

  if (loading) return <StateScene layout="agenda" state="loading" title="Ritmo presencial sendo calculado" description="Organizando encontros, remarcações e registros de presença." />;
  if (error) return <StateScene layout="agenda" state="error" title="Sinal interrompido na agenda" description={error.message} action={<button type="button" onClick={() => { void journey.reload(); void calendar.reload(); void attendance.reload(); }}>Tentar novamente</button>} />;

  const weekLabel = `${formatDate(weekStart, { day: "2-digit", month: "short" }).replace(".", "")} – ${formatDate(weekEnd, { day: "2-digit", month: "short" }).replace(".", "")}`;
  const hourCount = hourRange ? hourRange.last - hourRange.first : 0;

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

    <section className={styles.nextField} aria-labelledby="next-session-title" onPointerMove={moveFieldSpot}>
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
          <ul className={styles.heroFacts}>
            <li><Timer size={14} /> {countdownCopy(new Date(nextSession.startsAt), now)}</li>
            <li><CalendarDays size={14} /> {weekSessions.length} {weekSessions.length === 1 ? "encontro" : "encontros"} nesta semana</li>
            <li><Clock3 size={14} /> {formatSpan(weekHours)} reservadas</li>
          </ul>
          <div className={styles.nextActions}>
            <MagneticAction className={styles.calendarMagnetic}><button type="button" className={styles.primaryAction} onClick={revealCalendar}>Ver no calendário <ArrowDown size={16} /></button></MagneticAction>
            <button type="button" className={styles.secondaryAction} onClick={revealBoard}>Abrir a semana <ChevronRight size={16} /></button>
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

    {tab === "agenda" ? <section className={styles.tabPanel} aria-label="Agenda de encontros">
      {sessions.length ? <div className={styles.agendaStack}>
        <section ref={boardRef} className={styles.weekBoard} aria-labelledby="week-board-title">
          <div className={styles.frameHead}>
            <div>
              <span className={styles.sectionLabel}>{weekLabel}</span>
              <h2 id="week-board-title">Sua semana em blocos</h2>
            </div>
            <div className={styles.weekNav}>
              <button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
              <button type="button" className={styles.weekNow} onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Semana atual</button>
              <button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Próxima semana"><ChevronRight size={16} /></button>
            </div>
          </div>

          {hourRange ? <div className={styles.board} style={{ "--hour-rows": hourCount } as CSSProperties}>
            <span className={styles.boardCorner} aria-hidden="true" />
            {weekdayLabels.map((label, index) => {
              const day = addDays(weekStart, index);
              return <span key={label} className={styles.boardDay} data-today={isSameDay(day, now)}>
                <b>{label}</b><i>{formatDate(day, { day: "2-digit" })}</i>
              </span>;
            })}
            {Array.from({ length: hourCount }, (_, index) => <span key={`hour-${index}`} className={styles.boardHour} style={{ gridRow: index + 2 }}>
              {String(hourRange.first + index).padStart(2, "0")}h
            </span>)}
            {Array.from({ length: hourCount * 7 }, (_, index) => <i
              key={`cell-${index}`}
              className={styles.boardCell}
              aria-hidden="true"
              style={{ gridColumn: (index % 7) + 2, gridRow: Math.floor(index / 7) + 2 }}
            />)}
            {weekSessions.map((session) => {
              const start = new Date(session.startsAt);
              const columnIndex = (start.getDay() + 6) % 7;
              const rowStart = Math.max(0, start.getHours() - hourRange.first);
              const span = Math.min(Math.max(1, Math.round(durationHours(session))), Math.max(1, hourCount - rowStart));
              return <button
                key={session.id}
                type="button"
                className={styles.boardBlock}
                data-status={session.status}
                style={{ gridColumn: columnIndex + 2, gridRow: `${rowStart + 2} / span ${span}` }}
                onClick={() => inspectSession(session.id)}
              >
                <strong>{session.lessonTitle}</strong>
                <small>{formatDate(session.startsAt, { hour: "2-digit", minute: "2-digit" })} · {formatSpan(durationHours(session))}</small>
              </button>;
            })}
          </div> : <p className={styles.panelEmpty}>Nenhum encontro nesta semana. Use as setas para percorrer o calendário.</p>}

          <div className={styles.legend}><span data-tone="scheduled">Agendado</span><span data-tone="completed">Concluído</span><span data-tone="rescheduled">Remarcado</span></div>
        </section>

        <section className={styles.upcoming} aria-labelledby="upcoming-title">
          <div className={styles.frameHead}>
            <div>
              <span className={styles.sectionLabel}>Próximos compromissos</span>
              <h2 id="upcoming-title">O que vem primeiro</h2>
            </div>
            <div className={styles.filterGroup} role="group" aria-label="Filtrar encontros por estado">
              {upcomingFilters.map((filter) => <button
                key={filter.id}
                type="button"
                aria-pressed={upcomingFilter === filter.id}
                onClick={() => setUpcomingFilter(filter.id)}
              >{filter.label}</button>)}
            </div>
          </div>
          {upcoming.length ? <ul className={styles.upcomingList}>
            {upcoming.map((session) => <li key={session.id} data-status={session.status}>
              <span className={styles.upcomingWhen}>
                <strong>{formatDate(session.startsAt, { weekday: "short" }).replace(".", "")} {formatDate(session.startsAt, { day: "2-digit" })}</strong>
                <small>{formatDate(session.startsAt, { hour: "2-digit", minute: "2-digit" })}</small>
              </span>
              <span className={styles.upcomingCopy}>
                <span className={styles.upcomingKind}><CalendarClock size={13} /> Encontro {String(session.lessonPosition).padStart(2, "0")} · {formatSpan(durationHours(session))}</span>
                <strong>{session.lessonTitle}</strong>
                <small>{sessionStatusCopy[session.status]} · {countdownCopy(new Date(session.startsAt), now)}</small>
              </span>
              <button type="button" onClick={() => inspectSession(session.id)}>Detalhes</button>
            </li>)}
          </ul> : <p className={styles.panelEmpty}>Nenhum encontro com esse estado.</p>}
        </section>

        <div ref={calendarRef} className={styles.calendarLayout}>
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
            <span className={styles.sectionLabel}><Crosshair size={14} /> Encontro selecionado</span>
            {selectedSession && <>
              <div className={styles.inspectorIndex}>{String(selectedSession.lessonPosition).padStart(2, "0")}</div>
              <h3>{selectedSession.lessonTitle}</h3>
              <dl>
                <div><dt>Data</dt><dd>{formatDate(selectedSession.startsAt, { weekday: "long", day: "2-digit", month: "long" })}</dd></div>
                <div><dt>Horário</dt><dd>{formatDate(selectedSession.startsAt, { hour: "2-digit", minute: "2-digit" })}–{formatDate(selectedSession.endsAt, { hour: "2-digit", minute: "2-digit" })}</dd></div>
                <div><dt>Duração</dt><dd>{formatSpan(durationHours(selectedSession))}</dd></div>
                <div><dt>Estado</dt><dd data-status={selectedSession.status}>{sessionStatusCopy[selectedSession.status]}</dd></div>
                <div><dt>Quando</dt><dd>{countdownCopy(new Date(selectedSession.startsAt), now)}</dd></div>
              </dl>
              <p>Selecione outro encontro no calendário para manter o contexto sem sair da página.</p>
            </>}
          </aside>
        </div>

        <section className={styles.comingSoon} aria-labelledby="mentoria-title">
          <div className={styles.soonCopy}>
            <span className={styles.soonLabel}><LockKeyhole size={13} /> Em breve</span>
            <h2 id="mentoria-title">Mentoria 1:1</h2>
            <p>Reservar trinta minutos com o mentor direto por aqui. Depende de uma agenda de mentoria no backend — os horários ao lado são ilustrativos e não reservam nada.</p>
          </div>
          <div className={styles.soonPreview}>
            <span className={styles.soonMentor}><i aria-hidden="true">VG</i><b>Vinicius</b><small>Mentor de trilha</small></span>
            <div className={styles.soonSlots}>
              {["qua · 11h", "qua · 15h30", "qui · 09h", "sex · 14h"].map((slot) => <button key={slot} type="button" disabled>{slot}</button>)}
            </div>
            <button type="button" className={styles.soonConfirm} disabled><UsersRound size={15} /> Reservar mentoria</button>
          </div>
        </section>
      </div> : <StateScene layout="agenda" state="empty" title="Espaço para o próximo encontro" description="Assim que as datas forem confirmadas, elas aparecerão aqui." />}
    </section> : <section ref={attendanceRef} className={styles.tabPanel} aria-label="Histórico de frequência">
      <div className={styles.attendanceGrid}>
        <aside className={styles.presenceArc}>
          <span className={styles.sectionLabel}>Presença comprovada</span>
          <div className={styles.ring} style={{ "--attendance": attendancePercent } as CSSProperties}>
            <svg viewBox="0 0 180 180" aria-hidden="true"><circle className={styles.ringBase} cx="90" cy="90" r="72" /><circle className={styles.ringValue} cx="90" cy="90" r="72" /></svg>
            <div><strong>{attendancePercent}%</strong><span>{attended} de {attendanceItems.length}</span></div>
          </div>
          <p>O arco representa somente registros já realizados. Encontros futuros não reduzem sua frequência.</p>
          <div className={styles.presenceStats}><span><Check size={15} /> {attended} confirmados</span><span><RotateCcw size={15} /> {pendingMakeups.length} {pendingMakeups.length === 1 ? "pendente" : "pendentes"}</span></div>
        </aside>

        <div className={styles.historyPanel}>
          <div className={styles.frameHead}><div><span className={styles.sectionLabel}>Histórico de campo</span><h2>Registro de frequência</h2></div></div>

          {attendanceItems.length > 0 && <div className={styles.cadence}>
            <span className={styles.cadenceLabel}>Cadência</span>
            <span className={styles.cadenceTrack} role="img" aria-label={`Sequência de ${attendanceItems.length} registros: ${attended} confirmados, ${pendingMakeups.length} pendentes`}>
              {attendanceItems.map((entry) => <i
                key={entry.id ?? entry.session.id}
                data-attendance={entry.makeup ? "made-up" : entry.status}
                title={`${formatDate(entry.session.startsAt, { day: "2-digit", month: "short" })} · ${entry.makeup ? "Reposição concluída" : statusCopy[entry.status]}`}
              />)}
            </span>
            <span className={styles.cadenceScale}><small>primeiro</small><small>mais recente</small></span>
          </div>}

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
          </Timeline> : <StateScene layout="agenda" state="empty" title="Espaço para o próximo registro" description="A frequência será registrada após cada encontro presencial." />}
        </div>
      </div>

      {pendingMakeups.length > 0 && <section className={styles.makeupRoute} data-expanded={showMakeupGuide}>
        <div>
          <span className={styles.sectionLabel}><RotateCcw size={14} /> Rota de resolução</span>
          <h2>{pendingMakeups.length} {pendingMakeups.length === 1 ? "reposição pendente" : "reposições pendentes"}</h2>
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

      <section className={styles.comingSoon} aria-labelledby="lembretes-title">
        <div className={styles.soonCopy}>
          <span className={styles.soonLabel}><LockKeyhole size={13} /> Em breve</span>
          <h2 id="lembretes-title">Lembretes</h2>
          <p>Escolher como ser avisado antes de cada encontro. Depende de preferências salvas por aluno e de um serviço de envio — os controles ao lado estão desativados.</p>
          <p className={styles.soonNote}><BadgeCheck size={13} /> Até lá, o calendário desta página fica disponível a qualquer momento.</p>
        </div>
        <ul className={styles.soonReminders}>
          <li><span className={styles.soonIcon}><Bell size={15} /></span><span><b>1h antes</b><small>Aviso no navegador</small></span><i data-on="true" aria-hidden="true" /></li>
          <li><span className={styles.soonIcon}><Mail size={15} /></span><span><b>Resumo da semana</b><small>Domingo, por e-mail</small></span><i data-on="true" aria-hidden="true" /></li>
          <li><span className={styles.soonIcon}><AlarmClock size={15} /></span><span><b>Véspera de prazo</b><small>18h do dia anterior</small></span><i data-on="false" aria-hidden="true" /></li>
        </ul>
      </section>
    </section>}
  </main>;
}
