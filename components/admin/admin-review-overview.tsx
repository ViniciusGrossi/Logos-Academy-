"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, CircleDashed, UsersRound } from "lucide-react";
import type { ReviewOverview, ReviewOverviewStudent, ReviewRosterStatus } from "@/specs/api.contracts";
import { PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { useLiveApi } from "@/components/prototype/live-api";
import { useAdminClasses } from "./admin-data";
import styles from "./reviews-experience.module.css";

type ViewFilter = "all" | "submitted" | "not_submitted" | "revision_requested" | "approved";

const filterLabels: Record<ViewFilter, string> = {
  all: "Todos",
  submitted: "Aguardando revisão",
  not_submitted: "Não enviados",
  revision_requested: "Em correção",
  approved: "Aprovados",
};

export function AdminReviewOverview() {
  const classes = useAdminClasses("all");
  const [classId, setClassId] = useState(() => searchParam("turma"));
  const [activityId, setActivityId] = useState(() => searchParam("atividade"));
  const [filter, setFilter] = useState<ViewFilter>("all");

  useEffect(() => {
    if (!classId && classes.data?.items[0]) setClassId(classes.data.items[0].id);
  }, [classId, classes.data]);

  const overviewUrl = classId
    ? `/api/admin/reviews/overview?${new URLSearchParams({ classId, ...(activityId ? { activityId } : {}) })}`
    : null;
  const overview = useLiveApi<ReviewOverview>(overviewUrl);

  useEffect(() => {
    if (overview.data?.selectedActivityId && overview.data.selectedActivityId !== activityId) {
      setActivityId(overview.data.selectedActivityId);
    }
  }, [activityId, overview.data]);

  useEffect(() => {
    if (!classId) return;
    const query = new URLSearchParams({ turma: classId });
    if (activityId) query.set("atividade", activityId);
    window.history.replaceState(null, "", `/admin/revisoes?${query}`);
  }, [activityId, classId]);

  if (classes.loading) return <StateScene state="loading" title="Montando o mapa de evidências" description="Carregando turmas e percursos de revisão." />;
  if (classes.error) return <StateScene state="error" description={classes.error.message} action={<button className={styles.secondaryButton} onClick={() => void classes.reload()}>Tentar novamente</button>} />;
  if (!classes.data?.items.length) return <StateScene state="empty" title="Nenhuma turma para acompanhar" description="Quando uma turma for criada, o mapa mostrará os envios e as pendências de cada aluno." />;

  return <div className={styles.page}>
    <PageHeader
      eyebrow="Mapa de evidências"
      title="Acompanhe a construção da turma."
      description="Escolha uma atividade para ver quem ainda está construindo, quem enviou e quem já concluiu a revisão."
      marker="visão por atividade"
    />

    <section className={styles.controlDeck} aria-label="Escolher turma e atividade">
      <label className={styles.selectField}>
        <span>Turma</span>
        <select value={classId} onChange={(event) => { setClassId(event.target.value); setActivityId(""); setFilter("all"); }}>
          {classes.data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.selectField}>
        <span>Atividade</span>
        <select value={activityId} disabled={!overview.data?.activities.length} onChange={(event) => { setActivityId(event.target.value); setFilter("all"); }}>
          {overview.data?.activities.map((activity) => <option key={activity.id} value={activity.id}>
            {String(activity.cyclePosition).padStart(2, "0")}.{String(activity.lessonPosition).padStart(2, "0")} · {activity.title}{activity.awaitingReviewCount ? ` · ${activity.awaitingReviewCount} aguardando` : ""}
          </option>)}
        </select>
      </label>
      <div className={styles.controlSignal} aria-live="polite">
        <span className={styles.signalOrb}><UsersRound aria-hidden="true" /></span>
        <span><small>Escopo atual</small><strong>{overview.data?.classSummary.name ?? "Preparando turma"}</strong></span>
      </div>
    </section>

    {overview.loading && <StateScene state="loading" title="Lendo a rota da turma" description="Relacionando matrículas, envios e revisões desta atividade." />}
    {overview.error && <StateScene state="error" description={overview.error.message} action={<button className={styles.secondaryButton} onClick={() => void overview.reload()}>Tentar novamente</button>} />}
    {overview.data && <ReviewMap overview={overview.data} filter={filter} onFilter={setFilter} />}
  </div>;
}

function ReviewMap({ overview, filter, onFilter }: { overview: ReviewOverview; filter: ViewFilter; onFilter: (filter: ViewFilter) => void }) {
  const counts = useMemo(() => ({
    submitted: overview.students.filter((student) => student.status === "submitted").length,
    not_submitted: overview.students.filter((student) => isNotSubmitted(student.status)).length,
    revision_requested: overview.students.filter((student) => student.status === "revision_requested").length,
    approved: overview.students.filter((student) => student.status === "approved").length,
  }), [overview.students]);
  const students = overview.students.filter((student) => matchesFilter(student, filter));
  const activeActivity = overview.activities.find((activity) => activity.id === overview.selectedActivityId);

  if (!overview.activities.length) return <StateScene state="empty" title="Currículo sem atividades" description="Esta turma ainda não possui atividades disponíveis para acompanhamento." />;

  return <section className={styles.mapShell} aria-labelledby="review-map-title">
    <header className={styles.mapHeader}>
      <div>
        <span className={styles.eyebrow}>Rota da atividade</span>
        <h2 id="review-map-title">{activeActivity?.title ?? "Atividade selecionada"}</h2>
        <p>Ciclo {activeActivity?.cyclePosition ?? "—"} · aula {activeActivity?.lessonPosition ?? "—"}. Cada linha mostra onde a evidência de um aluno está agora.</p>
      </div>
      <div className={styles.priorityHalo} data-active={counts.submitted > 0 || undefined}>
        <strong>{String(counts.submitted).padStart(2, "0")}</strong>
        <span>aguardando<br />revisão</span>
      </div>
    </header>

    <div className={styles.summaryRail} aria-label="Resumo da atividade">
      <SummaryButton label="Todos" value={overview.students.length} active={filter === "all"} onClick={() => onFilter("all")} />
      <SummaryButton label="Aguardando" value={counts.submitted} active={filter === "submitted"} onClick={() => onFilter("submitted")} urgent={counts.submitted > 0} />
      <SummaryButton label="Não enviados" value={counts.not_submitted} active={filter === "not_submitted"} onClick={() => onFilter("not_submitted")} />
      <SummaryButton label="Em correção" value={counts.revision_requested} active={filter === "revision_requested"} onClick={() => onFilter("revision_requested")} />
      <SummaryButton label="Aprovados" value={counts.approved} active={filter === "approved"} onClick={() => onFilter("approved")} />
    </div>

    <div className={styles.mapLegend} aria-hidden="true">
      <span>Aluno</span>
      <span>Disponível</span>
      <span>Enviada</span>
      <span>Revisão</span>
      <span>Concluída</span>
      <span>Ação</span>
    </div>

    <div className={styles.studentList} aria-label={`${students.length} alunos em ${filterLabels[filter]}`}>
      {students.map((student, index) => <StudentRoute key={student.enrollmentId} student={student} index={index} />)}
      {!students.length && <div className={styles.inlineEmpty}><Check aria-hidden="true" /><div><strong>Nenhum aluno neste estado.</strong><span>Escolha outro filtro para continuar o acompanhamento.</span></div></div>}
    </div>
  </section>;
}

function SummaryButton({ label, value, active, urgent, onClick }: { label: string; value: number; active: boolean; urgent?: boolean; onClick: () => void }) {
  return <button type="button" className={styles.summaryButton} data-active={active || undefined} data-urgent={urgent || undefined} onClick={onClick} aria-pressed={active}>
    <span>{label}</span><strong>{String(value).padStart(2, "0")}</strong>
  </button>;
}

function StudentRoute({ student, index }: { student: ReviewOverviewStudent; index: number }) {
  const stages = stageStates(student.status);
  return <article className={styles.studentRoute} style={{ "--route-index": Math.min(index, 8) } as CSSProperties} data-priority={student.status === "submitted" || undefined}>
    <div className={styles.studentIdentity}>
      <span className={styles.avatar}>{initials(student.displayName)}</span>
      <span><strong>{student.displayName}</strong><small>{statusMeta(student)}</small></span>
    </div>
    <ol className={styles.evidenceRoute} aria-label={`Progresso de ${student.displayName}`}>
      {stages.map((stage) => <li key={stage.label} data-state={stage.state}><i>{stage.state === "complete" ? <Check aria-hidden="true" /> : stage.state === "current" ? <CircleDashed aria-hidden="true" /> : null}</i><span>{stage.label}</span></li>)}
    </ol>
    <div className={styles.routeAction}>
      <StatusBadge tone={statusTone(student.status)}>{statusLabel(student.status)}</StatusBadge>
      {student.submissionId ? <Link href={`/admin/revisoes/${student.submissionId}`} aria-label={`Abrir revisão de ${student.displayName}`}>
        {student.status === "submitted" ? "Revisar" : "Ver entrega"}<ArrowUpRight aria-hidden="true" />
      </Link> : <span className={styles.noAction}>Sem envio</span>}
    </div>
  </article>;
}

function stageStates(status: ReviewRosterStatus) {
  if (status === "approved") return ["Disponível", "Enviada", "Revisão", "Concluída"].map((label) => ({ label, state: "complete" }));
  if (status === "revision_requested") return [
    { label: "Disponível", state: "complete" }, { label: "Enviada", state: "complete" },
    { label: "Revisão", state: "current" }, { label: "Concluída", state: "idle" },
  ];
  if (status === "submitted") return [
    { label: "Disponível", state: "complete" }, { label: "Enviada", state: "complete" },
    { label: "Revisão", state: "current" }, { label: "Concluída", state: "idle" },
  ];
  if (status === "available" || status === "draft") return [
    { label: "Disponível", state: "current" }, { label: "Enviada", state: "idle" },
    { label: "Revisão", state: "idle" }, { label: "Concluída", state: "idle" },
  ];
  return ["Disponível", "Enviada", "Revisão", "Concluída"].map((label) => ({ label, state: "idle" }));
}

function matchesFilter(student: ReviewOverviewStudent, filter: ViewFilter) {
  if (filter === "all") return true;
  if (filter === "not_submitted") return isNotSubmitted(student.status);
  return student.status === filter;
}

function isNotSubmitted(status: ReviewRosterStatus) { return status === "not_assigned" || status === "locked" || status === "available" || status === "draft"; }
function initials(name: string) { return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AL"; }
function statusLabel(status: ReviewRosterStatus) {
  return ({ not_assigned: "Não liberada", locked: "Bloqueada", available: "Não enviada", draft: "Rascunho", submitted: "Em análise", revision_requested: "Em correção", approved: "Aprovada" } satisfies Record<ReviewRosterStatus, string>)[status];
}
function statusTone(status: ReviewRosterStatus): "neutral" | "success" | "warning" | "danger" {
  if (status === "approved") return "success";
  if (status === "submitted") return "warning";
  if (status === "revision_requested") return "danger";
  return "neutral";
}
function statusMeta(student: ReviewOverviewStudent) {
  if (student.status === "submitted" && student.submittedAt) return `Enviada ${relativeDate(student.submittedAt)}${student.version ? ` · versão ${student.version}` : ""}`;
  if (student.status === "approved" && student.reviewedAt) return `Aprovada ${relativeDate(student.reviewedAt)}`;
  if (student.status === "revision_requested") return `Correção em andamento${student.version ? ` · versão ${student.version}` : ""}`;
  if (student.status === "draft") return "Rascunho iniciado";
  if (student.isLate) return "Prazo encerrado sem envio";
  return "Ainda não enviou esta atividade";
}
function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.floor(diff / 3_600_000));
  if (hours < 1) return "há poucos minutos";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}
function searchParam(name: string) {
  return typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get(name) ?? "";
}
