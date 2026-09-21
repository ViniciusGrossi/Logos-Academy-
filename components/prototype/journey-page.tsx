"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleDotDashed,
  Compass,
  FolderKanban,
  Hammer,
  Layers3,
  LockKeyhole,
  Radar,
  Route,
  Wrench,
} from "lucide-react";
import type { EnrollmentSummary, ProjectSummary } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./journey-page.module.css";

type Journey = {
  enrollment: EnrollmentSummary;
  projects: readonly ProjectSummary[];
  sessionsCompleted: number;
  sessionsTotal: number;
};

type TrackKey = "explorer" | "builder" | "engineer";
type RouteState = "complete" | "current" | "upcoming";
type MapNodeStyle = React.CSSProperties & { "--node-x": string; "--node-y": string };

const TRACKS = [
  {
    key: "explorer" as const,
    label: "Explorer",
    description: "Experimenta ferramentas, registra escolhas e explica o que aprendeu.",
    proof: "Fundamentos aplicados em projetos próprios.",
    icon: Compass,
  },
  {
    key: "builder" as const,
    label: "Builder",
    description: "Constrói, publica e melhora projetos a partir de feedback real.",
    proof: "Projetos publicados e decisões documentadas.",
    icon: Hammer,
  },
  {
    key: "engineer" as const,
    label: "Engineer",
    description: "Projeta sistemas, revisa soluções e sustenta o que colocou no mundo.",
    proof: "Sistemas confiáveis, revisados e mantidos.",
    icon: Wrench,
  },
] as const;

const MAP_POSITIONS = [
  { x: "8%", y: "72%" },
  { x: "35%", y: "30%" },
  { x: "65%", y: "55%" },
  { x: "91%", y: "18%" },
] as const;

function isComplete(project: ProjectSummary) {
  return project.status === "approved" || (project.activityCount > 0 && project.completedActivityCount === project.activityCount);
}

function projectState(project: ProjectSummary, index: number, activeIndex: number): RouteState {
  if (isComplete(project)) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
}

export function resolveTrack(curriculumName: string): TrackKey {
  const name = curriculumName.toLocaleLowerCase("pt-BR");
  if (name.includes("engineer")) return "engineer";
  if (name.includes("builder")) return "builder";
  return "explorer";
}

function trackStatus(index: number, currentIndex: number) {
  if (index < currentIndex) return "preservado";
  if (index === currentIndex) return "em curso";
  return "próximo nível";
}

export function JourneyPage() {
  const enrollmentId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("enrollmentId");
  const { data, error, loading, reload } = useLiveApi<Journey>(enrollmentId ? `/api/student/journey?enrollmentId=${enrollmentId}` : "/api/student/journey");

  if (loading) return <LoadingState layout="journey" />;
  if (error) return <ErrorState layout="journey" retry={reload} message={error.message} />;
  if (!data) return <EmptyState layout="journey" scope="jornada ativa" />;

  const activeIndex = data.projects.findIndex((project) => project.status === "in_progress" && !isComplete(project));
  const activeProject = activeIndex >= 0 ? data.projects[activeIndex] : undefined;
  const sessionsPercentage = data.sessionsTotal ? Math.round((data.sessionsCompleted / data.sessionsTotal) * 100) : 0;
  const completedProjects = data.projects.filter(isComplete).length;
  const completedActivities = data.projects.reduce((total, project) => total + project.completedActivityCount, 0);
  const activityCount = data.projects.reduce((total, project) => total + project.activityCount, 0);
  const journeyPercentage = activityCount ? Math.round((completedActivities / activityCount) * 100) : 0;
  const currentTrack = resolveTrack(data.enrollment.curriculumName);
  const currentTrackIndex = TRACKS.findIndex((track) => track.key === currentTrack);
  const currentTrackLabel = TRACKS[currentTrackIndex]?.label ?? "Explorer";

  return (
    <div className={styles.journey} data-current-track={currentTrack}>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.signalLabel}><Radar size={14} /> Trilha Youth · nível {String(currentTrackIndex + 1).padStart(2, "0")}</span>
          <p className={styles.kicker}>{data.enrollment.curriculumName}</p>
          <h1>Transforme cada ciclo em algo que você consegue <em>explicar.</em></h1>
          <p className={styles.intro}>Sua jornada reúne encontros, projetos e evidências em uma rota única. O próximo passo permanece visível sem antecipar o conteúdo que ainda não foi liberado.</p>

          <div className={styles.heroFacts} aria-label="Resumo da jornada">
            <span><BadgeCheck size={14} /> {completedActivities} de {activityCount} evidências</span>
            <span><CalendarDays size={14} /> {data.sessionsCompleted} de {data.sessionsTotal} encontros</span>
            <span><Route size={14} /> {currentTrackLabel} em curso</span>
          </div>

          <div className={styles.heroActions}>
            {activeProject ? (
              <Link className={styles.primaryAction} href={`/projetos/${activeProject.id}`}>
                Continuar {activeProject.title} <ArrowRight />
              </Link>
            ) : (
              <Link className={styles.primaryAction} href={`/projetos${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}>
                Rever projetos <FolderKanban />
              </Link>
            )}
            <Link className={styles.secondaryAction} href="/agenda">Ver ritmo presencial <CalendarDays /></Link>
          </div>
        </div>

        <div className={styles.mapPanel} aria-label={`Mapa da jornada com ${journeyPercentage}% das evidências concluídas`}>
          <div className={styles.mapHeading}>
            <span>Mapa da trilha</span>
            <strong>{journeyPercentage}%</strong>
          </div>
          <div className={styles.mapCanvas}>
            <svg viewBox="0 0 640 270" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.mapRouteBase} pathLength="100" d="M42 210 C132 72 208 76 254 98 S365 202 438 142 S545 42 598 54" />
              <path className={styles.mapRouteProgress} pathLength="100" strokeDasharray={`${journeyPercentage} 100`} d="M42 210 C132 72 208 76 254 98 S365 202 438 142 S545 42 598 54" />
            </svg>
            {data.projects.map((project, index) => {
              const position = MAP_POSITIONS[index] ?? { x: `${8 + index * 27}%`, y: "50%" };
              const state = projectState(project, index, activeIndex);
              const style = { "--node-x": position.x, "--node-y": position.y } as MapNodeStyle;
              return (
                <Link
                  key={project.id}
                  href={`/projetos/${project.id}`}
                  className={styles.mapNode}
                  data-state={state}
                  style={style}
                  aria-label={`Ciclo ${project.cyclePosition}: ${project.title}`}
                >
                  <i>{state === "complete" ? <Check /> : state === "upcoming" ? <LockKeyhole /> : <CircleDotDashed />}</i>
                  <span><small>Ciclo {String(project.cyclePosition).padStart(2, "0")}</small><strong>{project.title}</strong></span>
                </Link>
              );
            })}
          </div>
          <div className={styles.mapFooter}>
            <span><i data-tone="done" /> concluído</span>
            <span><i data-tone="current" /> agora</span>
            <span><i data-tone="future" /> próximo</span>
          </div>
        </div>
      </header>

      <section className={styles.levels} aria-labelledby="levels-title">
        <div className={styles.sectionIntro}>
          <span className={styles.signalLabel}>Progressão Youth</span>
          <h2 id="levels-title">Três níveis, uma construção contínua.</h2>
          <p>O visual se adapta ao nível da matrícula. O que já foi concluído fica preservado; o próximo aparece como direção, sem liberar aulas antes da hora.</p>
        </div>
        <ol className={styles.levelRail}>
          {TRACKS.map((track, index) => {
            const Icon = track.icon;
            const status = trackStatus(index, currentTrackIndex);
            return (
              <li key={track.key} data-track={track.key} data-state={status === "em curso" ? "current" : index < currentTrackIndex ? "complete" : "locked"}>
                <div className={styles.levelTop}><span>Nível {String(index + 1).padStart(2, "0")}</span><Icon /></div>
                <strong>{track.label}</strong>
                <p>{track.description}</p>
                <small>{status}</small>
                <div className={styles.levelProof}>{track.proof}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.routeSection} aria-labelledby="route-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.signalLabel}>Rota de construção</span><h2 id="route-title">Projetos deixam marcas.</h2></div>
          <p>{String(completedProjects).padStart(2, "0")} de {String(data.projects.length).padStart(2, "0")} ciclos preservados</p>
        </div>

        <div className={styles.routeLayout}>
          {data.projects.length ? (
            <ol className={styles.route}>
              {data.projects.map((project, index) => {
                const state = projectState(project, index, activeIndex);
                const percentage = project.activityCount ? Math.round((project.completedActivityCount / project.activityCount) * 100) : 0;
                return (
                  <li key={project.id} data-state={state}>
                    <span className={styles.node}>{state === "complete" ? <Check size={16} /> : state === "upcoming" ? <LockKeyhole size={14} /> : <CircleDotDashed size={17} />}</span>
                    <Link href={`/projetos/${project.id}`} className={styles.projectCard} aria-label={`Abrir projeto ${project.title}`}>
                      <div className={styles.projectMeta}><span>Ciclo {String(project.cyclePosition).padStart(2, "0")}</span><small>{state === "complete" ? "Evidência preservada" : state === "current" ? "Construção em curso" : "Próxima estação"}</small></div>
                      <div className={styles.projectBody}><div><h3>{project.title}</h3><p>{state === "complete" ? "Este ciclo já compõe seu arquivo de formação." : state === "current" ? "Continue a atividade que move este projeto agora." : "O destino está visível; os detalhes abrem no momento certo."}</p></div><ArrowRight className={styles.projectArrow} /></div>
                      <div className={styles.projectProgress}><span><Layers3 size={14} /> {project.completedActivityCount}/{project.activityCount} evidências</span><strong>{percentage}%</strong></div>
                      <div className={styles.track} role="progressbar" aria-label={`${percentage}% de ${project.title} concluído`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><i style={{ transform: `scaleX(${percentage / 100})` }} /></div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.emptyRoute}><FolderKanban /><p>Os ciclos da sua formação aparecerão aqui quando forem liberados.</p></div>
          )}

          <aside className={styles.rhythmPanel} aria-label="Ritmo da jornada">
            <div className={styles.rhythmGauge} style={{ "--journey-progress": `${sessionsPercentage * 3.6}deg` } as React.CSSProperties}>
              <span><strong>{sessionsPercentage}%</strong><small>presencial</small></span>
            </div>
            <div>
              <span className={styles.signalLabel}>Ritmo presencial</span>
              <h3>{data.sessionsCompleted} encontros vividos</h3>
              <p>Presença e projetos avançam juntos. Se houver reposição, ela aparece na Agenda sem apagar seu progresso.</p>
            </div>
            <dl>
              <div><dt>Próximo marco</dt><dd>{activeProject ? `Concluir ciclo ${String(activeProject.cyclePosition).padStart(2, "0")}` : "Revisar portfólio"}</dd></div>
              <div><dt>Evidências</dt><dd>{completedActivities}/{activityCount}</dd></div>
              <div><dt>Nível atual</dt><dd>{currentTrackLabel}</dd></div>
            </dl>
            <Link href="/agenda">Abrir Agenda <ArrowRight /></Link>
          </aside>
        </div>
      </section>

      <section className={styles.footerPanel}>
        <div><span className={styles.signalLabel}>Arquivo de formação</span><h2>Sua jornada continua legível depois da entrega.</h2><p>Projetos, versões e decisões formam um registro cumulativo do que você construiu e já consegue explicar.</p></div>
        <Link href={`/projetos${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}><FolderKanban /> Abrir arquivo de projetos <ArrowRight /></Link>
      </section>
    </div>
  );
}
