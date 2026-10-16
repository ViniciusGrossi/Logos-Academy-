"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardCheck, Search } from "lucide-react";
import type { ReviewOverview, ReviewOverviewStudent, ReviewQueueSubmission, ReviewRosterStatus } from "@/specs/api.contracts";
import { StateScene, StatusBadge } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import { useAdminClasses } from "./admin-data";
import { useAdminUrlState } from "./use-admin-url-state";
import { useAdminPagination } from "./use-admin-pagination";
import { AdminPagination } from "./admin-pagination";
import styles from "./reviews-experience.module.css";
type Filter = "all" | "sent" | "submitted" | "not_submitted" | "revision_requested" | "approved" | "late";
const labels: Record<Filter, string> = { all: "Total de alunos", sent: "Enviaram", not_submitted: "Ainda não enviaram", submitted: "Aguardando revisão", revision_requested: "Precisam corrigir", approved: "Aprovados", late: "Atrasadas" };
const reviewViews = ["turmas", "fila"] as const;
const reviewFilters = Object.keys(labels) as Filter[];
const reviewDeadlines = ["all", "on_time", "late"] as const;
export function AdminReviewOverview() {
  const [view, setView] = useAdminUrlState("visao", "turmas", reviewViews);
  return <><nav className={styles.controlDeck} aria-label="Visão de revisões"><button className={styles.secondaryButton} aria-pressed={view === "turmas"} onClick={() => setView("turmas")}>Mapa das turmas</button><button className={styles.secondaryButton} aria-pressed={view === "fila"} onClick={() => setView("fila")}>Fila geral e individuais</button></nav>{view === "fila" ? <AdminSubmissionQueue /> : <ClassReviewOverview />}</>;
}

function AdminSubmissionQueue() {
  const queue = useAdminPagination<ReviewQueueSubmission>("/api/admin/reviews?limit=25");
  const entries = queue.data?.items ?? [];
  return <div className={styles.page}><header className={styles.pageHeading}><div><span className={styles.eyebrow}>Todos os percursos</span><h1>Fila de revisões</h1><p>Entregas aguardando parecer, incluindo matrículas individuais sem turma.</p></div></header>
    {queue.loading ? <StateScene state="loading" title="Buscando entregas" /> : queue.error ? <StateScene state="error" description={queue.error.message} action={<button className={styles.secondaryButton} onClick={() => void queue.reload()}>Tentar novamente</button>} /> : !entries.length ? <StateScene state="empty" title="Nenhuma entrega aguardando revisão" description="Os envios das turmas e dos alunos individuais aparecerão aqui." /> : <section className={styles.mapShell} aria-label="Entregas aguardando revisão"><div className={styles.studentList}>{entries.map((entry) => <article key={entry.id} className={styles.studentRoute} data-priority="true"><div className={styles.studentIdentity}><span><strong>{entry.student.displayName}</strong><small>{entry.classSummary?.name ?? "Percurso individual"}</small></span></div><strong>{entry.activity.title}</strong><span className={styles.versionCell}>v{entry.version}</span><span>{date(entry.submittedAt)}</span><StatusBadge tone={entry.isLate ? "warning" : "neutral"}>{entry.isLate ? "Atrasada" : "No prazo"}</StatusBadge><Link className={styles.secondaryButton} href={`/admin/revisoes/${entry.id}?visao=fila`}>Revisar entrega<ArrowRight aria-hidden="true" /></Link></article>)}</div></section>}
    <AdminPagination {...queue} />
  </div>;
}

function ClassReviewOverview() {
  const classes = useAdminClasses("all");
  const [classId, setClassId] = useAdminUrlState<string>("turma", "");
  const [activityId, setActivityId] = useAdminUrlState<string>("atividade", "");
  const [filter, setFilter] = useAdminUrlState<Filter>("situacao", "all", reviewFilters);
  const [query, setQuery] = useAdminUrlState<string>("busca", "");
  const [late, setLate] = useAdminUrlState<string>("prazo", "all", reviewDeadlines);
  const [cycle, setCycle] = useAdminUrlState<string>("ciclo", "");
  const overview = useLiveApi<ReviewOverview>(classId ? `/api/admin/reviews/overview?${new URLSearchParams({ classId, ...(activityId ? { activityId } : {}) })}` : null);
  useEffect(() => { if (!classId && classes.data?.items[0]) setClassId(classes.data.items[0].id, undefined, "replace"); }, [classId, classes.data, setClassId]);
  useEffect(() => { if (!activityId && overview.data?.classSummary.id === classId && overview.data.selectedActivityId) setActivityId(overview.data.selectedActivityId, undefined, "replace"); }, [activityId, classId, overview.data, setActivityId]);
  const cycles = useMemo(() => Array.from(new Set(overview.data?.activities.map((a) => a.cyclePosition) ?? [])), [overview.data]);
  const href = (id: string) => `/admin/revisoes/${id}?${new URLSearchParams({ turma: classId, atividade: activityId, situacao: filter, busca: query, prazo: late, ciclo: cycle })}`;
  const first = overview.data?.students.find((s) => s.status === "submitted" && s.submissionId);
  if (classes.loading) return <StateScene state="loading" title="Carregando revisões" description="Buscando suas turmas." />;
  if (classes.error) return <StateScene state="error" description={classes.error.message} action={<button className={styles.secondaryButton} onClick={() => void classes.reload()}>Tentar novamente</button>} />;
  if (!classes.data?.items.length) return <AdminSubmissionQueue />;
  return <div className={styles.page}>
    <header className={styles.pageHeading}><div><span className={styles.eyebrow}>Acompanhamento da turma</span><h1>Revisões</h1><p>Veja quem enviou, acompanhe as pendências e devolva orientações que ajudam a construir.</p></div>{first?.submissionId ? <Link className={styles.publishButton} href={href(first.submissionId)}><ClipboardCheck aria-hidden="true" />Revisar fila<ArrowRight aria-hidden="true" /></Link> : <span className={styles.queueClear}><Check aria-hidden="true" />Fila em dia</span>}</header>
    <section className={styles.controlDeck} aria-label="Filtrar revisões">
      <label className={styles.selectField}><span>Turma</span><select value={classId} onChange={(e) => setClassId(e.target.value, { atividade: null, ciclo: null, situacao: null })}>{classes.data.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className={styles.selectField}><span>Projeto / ciclo</span><select value={cycle} onChange={(e) => { setCycle(e.target.value); const a = overview.data?.activities.find((a) => !e.target.value || a.cyclePosition === Number(e.target.value)); if (a) setActivityId(a.id); }}><option value="">Todos os ciclos</option>{cycles.map((c) => <option key={c} value={c}>Projeto {c}</option>)}</select></label>
      <label className={styles.selectField}><span>Atividade</span><select value={activityId} disabled={!overview.data?.activities.length} onChange={(e) => setActivityId(e.target.value)}>{overview.data?.activities.filter((a) => !cycle || a.cyclePosition === Number(cycle)).map((a) => <option key={a.id} value={a.id}>Aula {a.lessonPosition} · {a.title}</option>)}</select></label>
      <label className={styles.selectField}><span>Prazo</span><select value={late} onChange={(e) => setLate(e.target.value)}><option value="all">Qualquer prazo</option><option value="on_time">No prazo</option><option value="late">Atrasado</option></select></label>
    </section>
    {overview.loading && <StateScene state="loading" title="Reunindo entregas" description="Relacionando alunos, envios e feedbacks." />}
    {overview.error && <StateScene state="error" description={overview.error.message} action={<button className={styles.secondaryButton} onClick={() => void overview.reload()}>Tentar novamente</button>} />}
    {overview.data && <Roster overview={overview.data} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} late={late} href={href} />}
  </div>;
}
function Roster({ overview, filter, onFilter, query, onQuery, late, href }: { overview: ReviewOverview; filter: Filter; onFilter: (v: Filter) => void; query: string; onQuery: (v: string) => void; late: string; href: (id: string) => string }) {
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const keys = Object.keys(labels) as Filter[];
  const students = overview.students.filter((s) => matches(s, filter) && (late === "all" || (late === "late" ? s.isLate : !s.isLate)) && normalize(s.displayName).includes(normalize(query))).sort((a, b) => Number(b.status === "submitted") - Number(a.status === "submitted") || Number(b.isLate) - Number(a.isLate) || (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  useEffect(() => setPage(0), [filter, query, late, overview.selectedActivityId]);
  const current = Math.min(page, Math.max(0, Math.ceil(students.length / 20) - 1));
  if (!overview.activities.length) return <StateScene state="empty" title="Nenhuma atividade disponível" description="Libere a primeira atividade para acompanhar a turma." />;
  async function remind(s: ReviewOverviewStudent) {
    const a = overview.activities.find((a) => a.id === overview.selectedActivityId);
    try { await navigator.clipboard.writeText(`Olá, ${s.displayName}! Sua atividade ${a?.title ?? "da Logos Academy"} ainda está pendente. Acesse a plataforma para continuar. Se precisar de ajuda, me chame.`); setNotice(`Lembrete de ${s.displayName} copiado. Cole na sua conversa do WhatsApp.`); } catch { setNotice("Não foi possível copiar. Permita o acesso à área de transferência e tente novamente."); }
  }
  return <>
    <div className={styles.summaryRail} aria-label="Situações das entregas">{keys.map((key) => <button key={key} className={styles.summaryButton} data-active={filter === key || undefined} aria-pressed={filter === key} onClick={() => onFilter(key)}><strong>{overview.students.filter((s) => matches(s, key)).length}</strong><span>{labels[key]}</span></button>)}</div>
    <section className={styles.mapShell} aria-label="Entregas da atividade">
      <header className={styles.rosterToolbar}><div><strong>{overview.classSummary.name}</strong><small>{students.length} alunos neste filtro</small></div><label className={styles.searchField}><Search aria-hidden="true" /><input type="search" aria-label="Buscar aluno" placeholder="Buscar aluno…" value={query} onChange={(e) => onQuery(e.target.value)} /></label></header>
      {notice && <p className={styles.workspaceNotice} role="status">{notice}</p>}
      <div className={styles.rosterColumns} aria-hidden="true"><span>Aluno</span><span>Situação</span><span>Versão</span><span>Enviado em</span><span>Prazo</span><span>Ação</span></div>
      <div className={styles.studentList}>{students.slice(current * 20, current * 20 + 20).map((s) => <article key={s.enrollmentId} className={styles.studentRoute} data-priority={s.status === "submitted" || undefined}>
        <div className={styles.studentIdentity}><span className={styles.avatar}>{s.displayName.trim().split(/\s+/u).slice(0, 2).map((v) => v[0]).join("").toUpperCase()}</span><span><strong>{s.displayName}</strong><small>{s.isLate ? "Prazo encerrado" : s.status === "draft" ? "Rascunho iniciado" : "Aluno da turma"}</small></span></div>
        <div className={styles.rosterStatus}><StatusBadge tone={s.status === "approved" ? "success" : s.status === "revision_requested" ? "danger" : s.status === "submitted" ? "warning" : "neutral"}>{statusLabel(s.status)}</StatusBadge>{s.isLate && <small>Atrasada</small>}</div>
        <span className={styles.versionCell} data-label="Versão">{s.version ? `v${String(s.version).padStart(2, "0")}` : "—"}</span>
        <span className={styles.dateCell} data-label="Enviado em">{date(s.submittedAt)}</span><span className={styles.dateCell} data-label="Prazo">{date(s.dueAt)}</span>
        <div className={styles.routeAction}>{s.submissionId ? <Link href={href(s.submissionId)} aria-label={`Abrir revisão de ${s.displayName}`}>{s.status === "submitted" ? "Revisar" : s.status === "revision_requested" ? "Ver feedback" : "Ver histórico"}<ArrowRight aria-hidden="true" /></Link> : <button className={styles.reminderButton} onClick={() => void remind(s)}>Lembrar aluno</button>}</div>
      </article>)}{!students.length && <div className={styles.inlineEmpty}><Check aria-hidden="true" /><div><strong>Nenhum aluno neste filtro.</strong><span>Limpe a busca ou escolha outra situação.</span></div></div>}</div>
      <footer className={styles.pagination}><span>{students.length ? `${current * 20 + 1}–${Math.min((current + 1) * 20, students.length)} de ${students.length}` : "0 alunos"}</span><button disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button><button disabled={(current + 1) * 20 >= students.length} onClick={() => setPage(current + 1)}>Próxima</button></footer>
    </section>
  </>;
}
function matches(s: ReviewOverviewStudent, f: Filter) { if (f === "all") return true; if (f === "sent") return Boolean(s.submissionId); if (f === "late") return s.isLate; if (f === "not_submitted") return !s.submissionId; return s.status === f; }
function normalize(v: string) { return v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(); }
function date(v: string | null) { return v ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(v)) : "—"; }
function statusLabel(s: ReviewRosterStatus) { return ({ not_assigned: "Não liberada", locked: "Bloqueada", available: "Não enviada", draft: "Rascunho", submitted: "Aguardando revisão", revision_requested: "Precisa corrigir", approved: "Aprovada" } satisfies Record<ReviewRosterStatus, string>)[s]; }
