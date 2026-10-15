"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, ClipboardCheck, ShieldCheck } from "lucide-react";
import { FilterBar, MetricStrip, PageHeader, SpotlightCard, StateScene, StatusBadge } from "@/components/academy";
import { AcademySelect } from "./academy-select";
import { useAdminDashboard, useAdminEnrollmentOptions } from "./admin-data";
import { useAdminUrlState } from "./use-admin-url-state";
import styles from "./admin-experience.module.css";

const riskOptions = ["all", "assignments", "makeups"] as const;

export function AdminDashboard() {
  const [classId, setClassId] = useAdminUrlState<string>("classId", "all");
  const [risk, setRisk] = useAdminUrlState("risk", "all", riskOptions);
  const options = useAdminEnrollmentOptions(true);
  const { data, error, loading, reload } = useAdminDashboard(classId);
  const students = (data?.studentsAtRisk ?? []).filter((student) => risk === "assignments" ? student.pendingAssignmentCount > 0 : risk === "makeups" ? student.pendingMakeupCount > 0 : true);
  if (loading) return <StateScene state="loading" title="Lendo a operação de hoje" description="Reunindo entregas, frequência e próximos encontros." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  if (!data) return <StateScene state="empty" title="Nenhum dado operacional disponível" description="As filas aparecerão conforme os percursos forem iniciados." />;
  return <div className={styles.stack}>
    <PageHeader eyebrow="Painel pedagógico" title="As próximas decisões da Academy." description="Acompanhe turmas e percursos individuais a partir de entregas, encontros e reposições reais." marker="operação ao vivo" action={<Link className={styles.toolbarAction} href="/admin/revisoes">Revisar entregas <ArrowUpRight className={styles.icon} /></Link>} />
    <FilterBar resultLabel={classId === "all" ? "Todos os percursos, incluindo individuais" : "Indicadores da turma selecionada"}>
      <AcademySelect ariaLabel="Filtrar painel por turma" value={classId} onValueChange={setClassId} disabled={options.loading} items={[{ value: "all", label: "Todos os percursos" }, ...(options.data?.classes ?? []).map((item) => ({ value: item.id, label: item.name }))]} />
      <AcademySelect ariaLabel="Filtrar alunos por risco" value={risk} onValueChange={(value) => setRisk(value as typeof risk)} items={[{ value: "all", label: "Toda atenção necessária" }, { value: "assignments", label: "Atividades pendentes" }, { value: "makeups", label: "Reposições pendentes" }]} />
    </FilterBar>
    {options.error && <p className={styles.warning} role="status">Não foi possível carregar o filtro de turmas. <button className={styles.secondaryAction} onClick={() => void options.reload()}>Recarregar turmas</button></p>}
    <MetricStrip metrics={[
      { id: "review", label: "Aguardando revisão", value: String(data.awaitingReviewCount), detail: "entregas submetidas", emphasis: data.awaitingReviewCount > 0 },
      { id: "feedback", label: "Feedback próximo do prazo", value: String(data.feedbackDueSoonCount), detail: "prioridade de retorno", emphasis: data.feedbackDueSoonCount > 0 },
      { id: "overdue", label: "Entregas vencidas", value: String(data.overdueAssignmentCount), detail: "acompanhar o próximo passo" },
      { id: "makeup", label: "Reposições pendentes", value: String(data.pendingMakeupCount), detail: "presença ainda não recomposta" },
      { id: "approval", label: "Taxa de aprovação", value: `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(data.deliveryApprovalRate)}%`, detail: "entregas aprovadas / enviadas" },
    ]} />
    <div className={styles.sectionGrid}><section className={styles.paper}><div className={styles.paperHeader}><div><h2>Fila de decisões</h2><p>Abra a operação certa sem perder o contexto.</p></div><ClipboardCheck aria-hidden="true" /></div><div className={styles.paperBody}><div className={styles.stack}>
      <Link className={styles.rowLink} href="/admin/revisoes"><span className={styles.rowCopy}><strong>{data.awaitingReviewCount} entrega(s) para revisar</strong><small>{data.feedbackDueSoonCount} retorno(s) próximo(s) do prazo</small></span><ArrowUpRight className={styles.icon} /></Link>
      <Link className={styles.rowLink} href="/admin/reposicoes"><span className={styles.rowCopy}><strong>{data.pendingMakeupCount} reposição(ões) para acompanhar</strong><small>Registre a recomposição sem apagar a ausência original.</small></span><ArrowUpRight className={styles.icon} /></Link>
    </div></div></section>
    <SpotlightCard className={styles.paper}><div className={styles.paperHeader}><div><h2>Próximos encontros</h2><p>Calendário coletivo e individual.</p></div><CalendarClock aria-hidden="true" /></div><div className={styles.paperBody}>{data.upcomingSessions.length ? <div className={styles.timeline}>{data.upcomingSessions.map((session) => <Link className={styles.timelineRow} href={`/admin/encontros/${session.id}`} key={session.id}><span className={styles.timelineIndex}>{String(session.lessonPosition).padStart(2, "0")}</span><span className={styles.timelineCopy}><strong>{session.lessonTitle}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(session.startsAt))}</small></span><ArrowUpRight className={styles.icon} /></Link>)}</div> : <p className={styles.emptyInline}>Nenhum encontro futuro agendado neste recorte.</p>}</div></SpotlightCard></div>
    <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Alunos a acompanhar</h2><p>Atividades e reposições pendentes em turmas e matrículas individuais.</p></div><ShieldCheck aria-hidden="true" /></div><div className={styles.paperBody}>{students.length ? students.map((student) => <Link className={styles.rowLink} href={`/admin/alunos/${student.id}`} key={student.id}><span className={styles.rowIdentity}><span className={styles.avatar}>{student.displayName.slice(0, 2).toUpperCase()}</span><span className={styles.rowCopy}><strong>{student.displayName}</strong><small>{student.pendingAssignmentCount} atividade(s) · {student.pendingMakeupCount} reposição(ões)</small></span></span><StatusBadge tone="warning">Pede atenção</StatusBadge><ArrowUpRight className={styles.icon} /></Link>) : <p className={styles.emptyInline}>Nenhum aluno neste filtro de atenção.</p>}</div></section>
  </div>;
}
