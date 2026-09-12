"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarClock, PencilLine, UsersRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import type { ClassSummary, EnrollmentSummary, SessionSummary } from "@/specs/api.contracts";
import { DataList, FilterBar, MagneticAction, MetricStrip, PageHeader, SpotlightCard, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation } from "@/components/prototype/live-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademySelect } from "./academy-select";
import { useAdminClass, useAdminClasses } from "./admin-data";
import { classStatusLabels, sessionStatusLabels } from "./admin-utils";
import styles from "./admin-experience.module.css";

function classTone(status: ClassSummary["status"]): "success" | "warning" | "neutral" | "danger" {
  if (status === "active") return "success";
  if (status === "planned") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function AdminClasses() {
  const [status, setStatus] = useState<ClassSummary["status"] | "all">("all");
  const { data, error, loading, reload } = useAdminClasses(status);
  const classes = data?.items ?? [];
  const active = classes.filter((item) => item.status === "active").length;
  const occupied = classes.reduce((total, item) => total + item.activeStudentCount, 0);
  const seats = classes.reduce((total, item) => total + Math.max(0, 6 - item.activeStudentCount), 0);

  if (loading) return <StateScene state="loading" title="Montando o calendário de turmas" description="Verificando capacidade, encontros e ritmo de cada grupo." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;

  return <div className={styles.stack}>
    <PageHeader eyebrow="Operação pedagógica · turmas" title="Pequenas por desenho. Próximas por método." description="Cada turma reúne no máximo seis alunos para preservar atenção, prática e feedback durante as aulas presenciais." marker="capacidade 6" />
    <MetricStrip metrics={[
      { id: "classes", label: "Turmas no recorte", value: String(classes.length), detail: `${active} ativa(s)` },
      { id: "students", label: "Alunos ativos", value: String(occupied), detail: "acompanhamento próximo" },
      { id: "seats", label: "Vagas disponíveis", value: String(seats), detail: "limite de seis por turma", emphasis: seats > 0 },
    ]} />
    <FilterBar resultLabel={`${classes.length} turma${classes.length === 1 ? "" : "s"}`}>
      <AcademySelect ariaLabel="Filtrar por status" value={status} onValueChange={(next) => setStatus(next as ClassSummary["status"] | "all")} items={[
        { value: "all", label: "Todos os status" }, { value: "planned", label: "Planejadas" }, { value: "active", label: "Ativas" }, { value: "completed", label: "Concluídas" }, { value: "cancelled", label: "Canceladas" },
      ]} />
    </FilterBar>
    {!classes.length ? <StateScene state="empty" title="Nenhuma turma neste recorte" description="Altere o status selecionado para consultar outros grupos." /> :
      <SpotlightCard className={styles.paper}>
        <div className={styles.paperHeader}><div><h2>Mapa de turmas</h2><p>Capacidade e calendário coletivo permanecem juntos.</p></div><CalendarClock aria-hidden="true" /></div>
        <DataList items={[...classes]} ariaLabel="Turmas da Academy" renderItem={(item) => <Link className={styles.rowLink} href={`/admin/turmas/${item.id}`}>
          <span className={styles.rowIdentity}><span className={styles.avatar}>{item.activeStudentCount}/6</span><span className={styles.rowCopy}><strong>{item.name}</strong><small>{item.curriculumName}</small></span></span>
          <span className={styles.rowMeta}><strong>Início em {formatDate(item.startsOn)}</strong><small>{6 - item.activeStudentCount > 0 ? `${6 - item.activeStudentCount} vaga(s) disponível(is)` : "Turma completa"}</small></span>
          <span className={styles.rowSignals}><StatusBadge tone={classTone(item.status)}>{classStatusLabels[item.status]}</StatusBadge><ArrowUpRight className={styles.rowArrow} aria-hidden="true" /></span>
        </Link>} />
      </SpotlightCard>}
  </div>;
}

export function AdminClassDetail({ classId }: { classId: string }) {
  const { data, error, loading, reload } = useAdminClass(classId);
  if (loading) return <StateScene state="loading" title="Abrindo estúdio da turma" description="Reunindo alunos e os 16 encontros presenciais." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  if (!data) return <StateScene state="empty" title="Turma não encontrada" description="O grupo pode não estar disponível neste tenant." />;

  const completedSessions = data.sessions.filter((session) => session.status === "completed").length;
  const activeStudents = data.enrollments.filter((enrollment) => enrollment.status === "active").length;
  return <div className={styles.stack}>
    <Link className={styles.backLink} href="/admin/turmas"><ArrowLeft className={styles.icon} aria-hidden="true" /> Voltar às turmas</Link>
    <PageHeader eyebrow="Estúdio da turma" title={data.class.name} description={`${data.class.curriculumName} · calendário fixo, encontros presenciais e acompanhamento coletivo.`} marker={`${activeStudents}/6 alunos`} action={<StatusBadge tone={classTone(data.class.status)}>{classStatusLabels[data.class.status]}</StatusBadge>} />
    <MetricStrip metrics={[
      { id: "students", label: "Alunos ativos", value: String(activeStudents), detail: `${Math.max(0, 6 - activeStudents)} vaga(s)` },
      { id: "sessions", label: "Encontros concluídos", value: `${completedSessions}/16`, detail: "100% exigidos" },
      { id: "next", label: "Próximo encontro", value: nextSessionLabel(data.sessions), detail: "aula presencial" },
    ]} />
    <Tabs defaultValue="overview" className={styles.tabShell}>
      <TabsList variant="line" className={styles.tabsList} aria-label="Seções da turma">
        <TabsTrigger className={styles.tabTrigger} value="overview">Visão geral</TabsTrigger>
        <TabsTrigger className={styles.tabTrigger} value="students">Alunos</TabsTrigger>
        <TabsTrigger className={styles.tabTrigger} value="sessions">Encontros</TabsTrigger>
      </TabsList>
      <TabsContent className={styles.tabPanel} value="overview"><ClassOverview classSummary={data.class} sessions={data.sessions} reload={reload} /></TabsContent>
      <TabsContent className={styles.tabPanel} value="students"><ClassStudents enrollments={data.enrollments} /></TabsContent>
      <TabsContent className={styles.tabPanel} value="sessions"><ClassSessions classId={classId} sessions={data.sessions} /></TabsContent>
    </Tabs>
  </div>;
}

function ClassOverview({ classSummary, sessions, reload }: { classSummary: ClassSummary; sessions: readonly SessionSummary[]; reload: () => Promise<void> }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = useMemo(() => sessions.filter((session) => session.status === "scheduled" || session.status === "rescheduled").sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0], [sessions]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setNotice(null); const form = new FormData(event.currentTarget);
    try { await apiMutation<ClassSummary>(`/api/admin/classes/${classSummary.id}`, "PATCH", { name: String(form.get("name")), status: String(form.get("status")) }); setNotice("Dados da turma atualizados."); await reload(); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível atualizar a turma."); }
    finally { setPending(false); }
  }
  return <div className={styles.sectionGrid}>
    <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Configuração coletiva</h2><p>O calendário pertence à turma; evidências e feedback continuam individuais.</p></div><PencilLine aria-hidden="true" /></div><div className={styles.paperBody}><form className={styles.form} onSubmit={save}><div className={styles.formGrid}>
      <label className={styles.formField}><span className={styles.label}>Nome da turma</span><input className={styles.field} name="name" defaultValue={classSummary.name} required /></label>
      <label className={styles.formField}><span className={styles.label}>Status</span><AcademySelect name="status" ariaLabel="Status da turma" defaultValue={classSummary.status} items={[{ value: "planned", label: "Planejada" }, { value: "active", label: "Ativa" }, { value: "completed", label: "Concluída" }, { value: "cancelled", label: "Cancelada" }]} /></label>
    </div>{notice && <p className={styles.notice} role="status">{notice}</p>}<div className={styles.formActions}><MagneticAction><button className={styles.toolbarAction} disabled={pending}>{pending ? "Salvando…" : "Salvar turma"}</button></MagneticAction></div></form></div></section>
    <SpotlightCard className={styles.paper}><div className={styles.paperHeader}><div><h2>Próxima presença</h2><p>A plataforma apoia o encontro; a aula acontece presencialmente.</p></div><CalendarClock aria-hidden="true" /></div><div className={styles.paperBody}>{next ? <><span className={styles.sessionNumber}>Aula {String(next.lessonPosition).padStart(2, "0")}</span><h3>{next.lessonTitle}</h3><p>{formatDateTime(next.startsAt)}</p><Link className={styles.secondaryAction} href={`/admin/encontros/${next.id}?classId=${classSummary.id}`}>Preparar encontro <ArrowUpRight className={styles.icon} /></Link></> : <p className={styles.emptyInline}>Nenhum encontro futuro agendado.</p>}</div></SpotlightCard>
  </div>;
}

function ClassStudents({ enrollments }: { enrollments: readonly EnrollmentSummary[] }) {
  if (!enrollments.length) return <StateScene state="empty" title="Turma sem alunos" description="As matrículas coletivas aparecerão aqui." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Alunos desta turma</h2><p>Máximo de seis para preservar proximidade pedagógica.</p></div><UsersRound aria-hidden="true" /></div><DataList items={[...enrollments]} ariaLabel="Alunos matriculados" renderItem={(enrollment) => <Link className={styles.rowLink} href={`/admin/alunos/${enrollment.studentId}`}><span className={styles.rowIdentity}><span className={styles.avatar}>{enrollment.studentName.slice(0, 2).toUpperCase()}</span><span className={styles.rowCopy}><strong>{enrollment.studentName}</strong><small>{enrollment.curriculumName}</small></span></span><span className={styles.rowMeta}><strong>{enrollment.kind === "class" ? "Matrícula coletiva" : "Produto individual"}</strong><small>{enrollment.activatedAt ? `Ativada em ${formatDate(enrollment.activatedAt)}` : "Aguardando ativação"}</small></span><span className={styles.rowSignals}><StatusBadge tone={enrollment.status === "active" ? "success" : enrollment.status === "paused" ? "warning" : "neutral"}>{enrollment.status}</StatusBadge><ArrowUpRight className={styles.rowArrow} /></span></Link>} /></section>;
}

function ClassSessions({ classId, sessions }: { classId: string; sessions: readonly SessionSummary[] }) {
  if (!sessions.length) return <StateScene state="empty" title="Calendário ainda não criado" description="Os 16 encontros aparecerão quando a turma for configurada." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Trilho de encontros</h2><p>Para concluir o módulo, cada aluno precisa cumprir todos os encontros — faltas exigem reposição.</p></div><CalendarClock aria-hidden="true" /></div><div className={styles.paperBody}><div className={styles.timeline}>
    {[...sessions].sort((a, b) => a.lessonPosition - b.lessonPosition).map((session) => <Link key={session.id} className={styles.timelineRow} href={`/admin/encontros/${session.id}?classId=${classId}`}><span className={styles.timelineIndex}>{String(session.lessonPosition).padStart(2, "0")}</span><span className={styles.timelineCopy}><strong>{session.lessonTitle}</strong><small>{formatDateTime(session.startsAt)} · presencial</small></span><StatusBadge tone={session.status === "completed" ? "success" : session.status === "cancelled" ? "danger" : session.status === "rescheduled" ? "warning" : "neutral"}>{sessionStatusLabels[session.status]}</StatusBadge></Link>)}
  </div></div></section>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function nextSessionLabel(sessions: readonly SessionSummary[]) { const next = sessions.filter((session) => session.status === "scheduled" || session.status === "rescheduled").sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]; return next ? `Aula ${String(next.lessonPosition).padStart(2, "0")}` : "—"; }

