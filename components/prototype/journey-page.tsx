"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CircleDotDashed, FolderKanban, Layers3, LockKeyhole, Radar } from "lucide-react";
import type { EnrollmentSummary, ProjectSummary } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./journey-page.module.css";

type Journey = { enrollment: EnrollmentSummary; projects: readonly ProjectSummary[]; sessionsCompleted: number; sessionsTotal: number };

function projectState(project: ProjectSummary, index: number, activeIndex: number) {
  if (project.status === "approved" || (project.activityCount > 0 && project.completedActivityCount === project.activityCount)) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
}

export function JourneyPage() {
  const enrollmentId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("enrollmentId");
  const { data, error, loading, reload } = useLiveApi<Journey>(enrollmentId ? `/api/student/journey?enrollmentId=${enrollmentId}` : "/api/student/journey");

  if (loading) return <LoadingState layout="journey" />;
  if (error) return <ErrorState layout="journey" retry={reload} message={error.message} />;
  if (!data) return <EmptyState layout="journey" scope="jornada ativa" />;

  const activeIndex = Math.max(0, data.projects.findIndex((project) => project.status === "in_progress"));
  const sessionsPercentage = data.sessionsTotal ? Math.round((data.sessionsCompleted / data.sessionsTotal) * 100) : 0;
  const completedProjects = data.projects.filter((project) => project.status === "approved" || (project.activityCount > 0 && project.completedActivityCount === project.activityCount)).length;

  return <div className={styles.journey}>
    <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>

    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}><Radar size={14} /> Arquivo de formação · rota ativa</span>
        <p className={styles.kicker}>Jornada de formação</p>
        <h1>{data.enrollment.curriculumName}</h1>
        <p className={styles.intro}>O presencial abre o problema. Aqui, cada ciclo registra como você o transforma em evidência.</p>
      </div>
      <div className={styles.sessionCard} aria-label="Progresso dos encontros presenciais">
        <CalendarDays />
        <span><small>Encontros presenciais</small><strong>{data.sessionsCompleted}<em>/{data.sessionsTotal}</em></strong><i>{sessionsPercentage}% percorrido</i></span>
        <div className={styles.sessionRing} style={{ "--journey-progress": `${sessionsPercentage * 3.6}deg` } as React.CSSProperties} aria-hidden="true" />
      </div>
    </header>

    <section className={styles.overview} aria-label="Resumo da formação">
      <div><span>01</span><small>Projetos na trilha</small><strong>{String(data.projects.length).padStart(2, "0")}</strong></div>
      <div><span>02</span><small>Ciclos concluídos</small><strong>{String(completedProjects).padStart(2, "0")}</strong></div>
      <div><span>03</span><small>Posição atual</small><strong>{data.projects[activeIndex] ? `Ciclo ${String(data.projects[activeIndex].cyclePosition).padStart(2, "0")}` : "Aguardando"}</strong></div>
    </section>

    <section className={styles.routeSection} aria-labelledby="route-title">
      <div className={styles.sectionHeading}><div><span>Rota de construção</span><h2 id="route-title">Projetos deixam marcas.</h2></div><small>{String(completedProjects).padStart(2, "0")} — {String(data.projects.length).padStart(2, "0")} ciclos</small></div>
      {data.projects.length ? <ol className={styles.route}>
        {data.projects.map((project, index) => {
          const state = projectState(project, index, activeIndex);
          const percentage = project.activityCount ? Math.round((project.completedActivityCount / project.activityCount) * 100) : 0;
          return <li key={project.id} data-state={state}>
            <span className={styles.node}>{state === "complete" ? <Check size={16} /> : state === "upcoming" ? <LockKeyhole size={14} /> : <CircleDotDashed size={17} />}</span>
            <Link href={`/projetos/${project.id}`} className={styles.projectCard} aria-label={`Abrir projeto ${project.title}`}>
              <div className={styles.projectMeta}><span>Ciclo {String(project.cyclePosition).padStart(2, "0")}</span><small>{state === "complete" ? "Evidência reconhecida" : state === "current" ? "Construção em curso" : "Próxima estação"}</small></div>
              <div className={styles.projectBody}><div><h3>{project.title}</h3><p>{state === "complete" ? "Este ciclo já compõe seu arquivo de formação." : state === "current" ? "O que você decidir aqui se torna a próxima marca da sua jornada." : "Este ciclo será aberto quando a rota anterior estiver consolidada."}</p></div><ArrowRight className={styles.projectArrow} /></div>
              <div className={styles.projectProgress}><span><Layers3 size={14} /> {project.completedActivityCount}/{project.activityCount} evidências</span><strong>{percentage}%</strong></div>
              <div className={styles.track} role="progressbar" aria-label={`${percentage}% de ${project.title} concluído`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><i style={{ width: `${percentage}%` }} /></div>
            </Link>
          </li>;
        })}
      </ol> : <div className={styles.emptyRoute}><FolderKanban /><p>Os ciclos da sua formação aparecerão aqui quando forem liberados.</p></div>}
    </section>

    <section className={styles.footerPanel}>
      <div><span>Leitura da rota</span><h2>Não é uma lista de aulas.</h2><p>É o registro cumulativo de projetos, decisões e evidências que você poderá explicar.</p></div>
      <Link href={`/projetos${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}><FolderKanban /> Abrir arquivo de projetos <ArrowRight /></Link>
    </section>
  </div>;
}
