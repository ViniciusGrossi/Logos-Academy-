"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleDotDashed, FolderKanban, Layers3, LockKeyhole, MoveUpRight, Radio, ScanLine } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { ProjectDetail, ProjectSummary } from "@/specs/api.contracts";
import { MagneticAction } from "@/components/academy";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./project-portal.module.css";

const stateCopy = {
  in_progress: "Em construção",
  approved: "Preservado",
  locked: "Próximo ciclo",
} as const;

function percentage(project: ProjectSummary) {
  return project.activityCount ? Math.round((project.completedActivityCount / project.activityCount) * 100) : 0;
}

function moveProjectCard(event: ReactPointerEvent<HTMLAnchorElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;
  event.currentTarget.style.setProperty("--spot-x", `${x * 100}%`);
  event.currentTarget.style.setProperty("--spot-y", `${y * 100}%`);
  event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
}

function resetProjectCard(event: ReactPointerEvent<HTMLAnchorElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg");
  event.currentTarget.style.setProperty("--tilt-y", "0deg");
}

function moveFocusField(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--focus-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--focus-y", `${event.clientY - bounds.top}px`);
}

export function ProjectPortal() {
  const enrollmentId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("enrollmentId");
  const query = enrollmentId ? `?enrollmentId=${enrollmentId}` : "";
  const { data, error, loading, reload } = useLiveApi<readonly ProjectSummary[]>(`/api/student/projects${query}`);
  const portfolio = useLiveApi<{ items: readonly ProjectDetail[] }>(`/api/student/portfolio${query}`);

  if (loading || portfolio.loading) return <LoadingState layout="projects" />;
  if (error || portfolio.error) return <ErrorState layout="projects" retry={() => { void reload(); void portfolio.reload(); }} message={error?.message ?? portfolio.error?.message ?? "Erro"} />;

  const projects = data ?? [];
  const approved = portfolio.data?.items ?? [];
  if (!projects.length) return <EmptyState layout="projects" scope="projeto iniciado" />;

  const active = projects.find((project) => project.status === "in_progress") ?? projects.find((project) => project.status !== "locked") ?? projects[0];
  const totalEvidence = projects.reduce((sum, project) => sum + project.activityCount, 0);
  const completedEvidence = projects.reduce((sum, project) => sum + project.completedActivityCount, 0);
  const overall = totalEvidence ? Math.round((completedEvidence / totalEvidence) * 100) : 0;

  return <div className={styles.portal}>
    <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>

    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}><Radio size={13} /> Acervo operacional · sincronizado</span>
        <p>Projetos e evidências</p>
        <h1>Seu trabalho deixa <em>rastros.</em></h1>
      </div>
      <div className={styles.headerIndex}>
        <span><i><FolderKanban /></i><small>Ciclos</small><strong>{String(projects.length).padStart(2, "0")}</strong><b aria-hidden="true">{projects.map((project) => <em key={project.id} data-active={project.status !== "locked"} />)}</b></span>
        <span><i><Layers3 /></i><small>Evidências</small><strong>{completedEvidence}<em>/{totalEvidence}</em></strong><b className={styles.indexTrack} aria-hidden="true"><em style={{ width: `${overall}%` }} /></b></span>
        <span><i><Check /></i><small>Preservados</small><strong>{String(approved.length).padStart(2, "0")}</strong><b className={styles.indexSeal} aria-hidden="true"><em /><em /></b></span>
      </div>
    </header>

    {active && <section className={styles.activeProject} aria-labelledby="active-project-title" onPointerMove={moveFocusField}>
      <div className={styles.blueprint} aria-hidden="true"><span /><span /><span /><i /></div>
      <div className={styles.cursorGrid} aria-hidden="true" />
      <svg className={styles.elasticMesh} aria-hidden="true" viewBox="0 0 600 420" preserveAspectRatio="none">
        {[60, 120, 180, 240, 300, 360].map((y) => <path key={`h-${y}`} d={`M0 ${y} Q150 ${y - 18} 300 ${y} T600 ${y}`} />)}
        {[70, 150, 230, 310, 390, 470, 550].map((x) => <path key={`v-${x}`} d={`M${x} 0 Q${x + 18} 105 ${x} 210 T${x} 420`} />)}
      </svg>
      <div className={styles.focusRipple} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.activeCopy}>
        <div className={styles.activeMeta}><span>Projeto em foco</span><small>Ciclo {String(active.cyclePosition).padStart(2, "0")}</small></div>
        <div className={styles.activeSignal}><ScanLine /><span>Leitura do projeto</span></div>
        <h2 id="active-project-title">{active.title}</h2>
        <p>Continue registrando escolhas, versões e evidências. O resultado importa; o caminho que você consegue explicar importa ainda mais.</p>
        <div className={styles.activeProgress}>
          <div><span><Layers3 /> {active.completedActivityCount} de {active.activityCount} evidências</span><strong>{percentage(active)}%</strong></div>
          <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage(active)} aria-label={`Progresso de ${active.title}`}><i style={{ width: `${percentage(active)}%` }} /></div>
        </div>
        <MagneticAction><Link href={`/projetos/${active.id}`} className={styles.primaryAction}>Entrar no projeto <ArrowRight /></Link></MagneticAction>
      </div>
      <div className={styles.activeGauge} style={{ "--project-progress": `${percentage(active) * 3.6}deg` } as CSSProperties}>
        <span><strong>{percentage(active)}%</strong><small>construído</small></span>
        <i aria-hidden="true" />
      </div>
    </section>}

    <section className={styles.cycles} aria-labelledby="cycles-title">
      <div className={styles.sectionHeading}><div><span>Mapa de projetos</span><h2 id="cycles-title">Ciclos da formação</h2></div><small>{overall}% do acervo construído</small></div>
      <div className={styles.projectGrid}>
        {projects.map((project, index) => {
          const progress = percentage(project);
          const Icon = project.status === "approved" ? Check : project.status === "locked" ? LockKeyhole : CircleDotDashed;
          return <Link href={`/projetos/${project.id}`} className={styles.projectCard} data-state={project.status} key={project.id} style={{ "--card-index": index } as CSSProperties} onPointerMove={moveProjectCard} onPointerLeave={resetProjectCard}>
            <div className={styles.cardTop}><span className={styles.cardNumber}>{String(project.cyclePosition).padStart(2, "0")}</span><span className={styles.cardState}><Icon /> {stateCopy[project.status]}</span></div>
            <div className={styles.cardGraphic} aria-hidden="true"><i style={{ "--card-progress": `${progress * 3.6}deg` } as CSSProperties} /><span>{progress}</span></div>
            <h3>{project.title}</h3>
            <div className={styles.cardTelemetry}>
              <div><small>Mapa de evidências</small><strong>{Math.max(project.activityCount - project.completedActivityCount, 0)} restante(s)</strong></div>
              <span aria-hidden="true">{Array.from({ length: project.activityCount }, (_, evidenceIndex) => <i key={evidenceIndex} data-filled={evidenceIndex < project.completedActivityCount} />)}</span>
            </div>
            <div className={styles.cardFooter}><span>{project.completedActivityCount}/{project.activityCount} evidências</span><em>Abrir registro</em><MoveUpRight /></div>
          </Link>;
        })}
      </div>
    </section>

    <section className={styles.archive} aria-labelledby="archive-title">
      <div className={styles.sectionHeading}><div><span>Arquivo de evidências</span><h2 id="archive-title">Projetos preservados</h2></div><FolderKanban /></div>
      {approved.length ? <div className={styles.archiveList}>{approved.map((project) => <Link href={`/projetos/${project.id}`} key={project.id}><span className={styles.archiveSeal}><Check /></span><span><small>Ciclo {String(project.cyclePosition).padStart(2, "0")} · coleção privada</small><strong>{project.title}</strong><em>{project.activities.length} evidência(s) preservada(s)</em></span><ArrowRight /></Link>)}</div> : <div className={styles.emptyArchive}><span>00</span><div><strong>O arquivo ainda está aberto.</strong><p>Quando um projeto for aprovado, ele aparecerá aqui como parte permanente da sua coleção.</p></div></div>}
    </section>
  </div>;
}
