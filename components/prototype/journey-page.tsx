"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
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
type RouteState = "complete" | "current" | "available" | "upcoming";
type MapNodeStyle = React.CSSProperties & { "--node-x": string; "--node-y": string; "--node-delay": string };

const REVEAL_VARIANTS = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  { x: "10%", y: "74%" },
  { x: "35%", y: "32%" },
  { x: "62%", y: "56%" },
  { x: "88%", y: "22%" },
] as const;

function isComplete(project: ProjectSummary) {
  return project.status === "approved" || (project.activityCount > 0 && project.completedActivityCount === project.activityCount);
}

function projectState(project: ProjectSummary, index: number, activeIndex: number): RouteState {
  if (isComplete(project)) return "complete";
  if (project.status === "locked") return "upcoming";
  if (index === activeIndex) return "current";
  return "available";
}

export function resolveTrack(curriculumName: string): TrackKey {
  const name = curriculumName.toLocaleLowerCase("pt-BR");
  if (name.includes("engineer")) return "engineer";
  if (name.includes("builder")) return "builder";
  return "explorer";
}

export function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function trackStatus(index: number, currentIndex: number) {
  if (index < currentIndex) return "preservado";
  if (index === currentIndex) return "em curso";
  return "próximo nível";
}

export function JourneyPage() {
  const enrollmentId = useSearchParams().get("enrollmentId");
  const { data, error, loading, reload } = useLiveApi<Journey>(enrollmentId ? `/api/student/journey?enrollmentId=${enrollmentId}` : "/api/student/journey");
  const reduceMotion = useReducedMotion();
  const mapX = useMotionValue(0);
  const mapY = useMotionValue(0);
  const mapSpringX = useSpring(mapX, { stiffness: 90, damping: 28, mass: 0.7 });
  const mapSpringY = useSpring(mapY, { stiffness: 90, damping: 28, mass: 0.7 });

  function moveGlow(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const style = event.currentTarget.style;
    style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    style.setProperty("--spot-o", "1");
  }

  function leaveGlow(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--spot-o", "0");
  }

  function moveMap(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mapX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 16);
    mapY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 12);
  }

  function resetMap() {
    mapX.set(0);
    mapY.set(0);
  }

  if (loading) return <LoadingState layout="journey" />;
  if (error) return <ErrorState layout="journey" retry={reload} message={error.message} />;
  if (!data) return <EmptyState layout="journey" scope="jornada ativa" />;

  const activeIndex = data.projects.findIndex((project) => project.status === "in_progress" && !isComplete(project));
  const activeProject = activeIndex >= 0 ? data.projects[activeIndex] : undefined;
  const sessionsPercentage = percentage(data.sessionsCompleted, data.sessionsTotal);
  const completedProjects = data.projects.filter(isComplete).length;
  const completedActivities = data.projects.reduce((total, project) => total + project.completedActivityCount, 0);
  const activityCount = data.projects.reduce((total, project) => total + project.activityCount, 0);
  const journeyPercentage = percentage(completedActivities, activityCount);
  const reachedIndex = activeIndex >= 0 ? activeIndex : Math.max(0, completedProjects - 1);
  const trailTarget = MAP_POSITIONS[Math.min(reachedIndex, MAP_POSITIONS.length - 1)] ?? MAP_POSITIONS[0];
  const trailProgress = data.projects.length ? Math.round(Number.parseFloat(trailTarget.x)) : 0;
  const currentTrack = resolveTrack(data.enrollment.curriculumName);
  const currentTrackIndex = TRACKS.findIndex((track) => track.key === currentTrack);
  const currentTrackLabel = TRACKS[currentTrackIndex]?.label ?? "Explorer";

  return (
    <div className={styles.journey} data-current-track={currentTrack} onPointerMove={moveGlow} onPointerLeave={leaveGlow}>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.spotlight} aria-hidden="true" />

      <motion.header className={styles.hero} initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
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

        <figure className={styles.mapPanel}>
          <figcaption className={styles.mapHeading}>
            <span>Mapa da trilha</span>
            <strong>{journeyPercentage}%</strong>
          </figcaption>
          <div className={styles.mapCanvas} onPointerMove={moveMap} onPointerLeave={resetMap}>
            <motion.div className={styles.mapParallax} style={reduceMotion ? undefined : { x: mapSpringX, y: mapSpringY, scale: 1.04 }}>
            <svg viewBox="0 0 640 270" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.mapRouteBase} pathLength="100" d="M42 210 C132 72 208 76 254 98 S365 202 438 142 S545 42 598 54" />
              <path className={styles.mapRouteProgress} pathLength="100" strokeDasharray={`${trailProgress} 100`} d="M42 210 C132 72 208 76 254 98 S365 202 438 142 S545 42 598 54" />
              <path className={styles.mapRouteTracer} pathLength="100" d="M42 210 C132 72 208 76 254 98 S365 202 438 142 S545 42 598 54" />
            </svg>
            {data.projects.map((project, index) => {
              const position = MAP_POSITIONS[index] ?? { x: `${10 + index * 26}%`, y: "50%" };
              const state = projectState(project, index, activeIndex);
              const align = Number.parseFloat(position.x) > 55 ? "end" : "start";
              const style = { "--node-x": position.x, "--node-y": position.y, "--node-delay": `${180 + index * 110}ms` } as MapNodeStyle;
              const node = <>
                <i>{state === "complete" ? <Check /> : state === "upcoming" ? <LockKeyhole /> : <CircleDotDashed />}</i>
                <span><small>Ciclo {String(project.cyclePosition).padStart(2, "0")}</small><strong>{project.title}</strong></span>
              </>;
              return project.status === "locked" ? (
                <span key={project.id} className={styles.mapNode} data-state={state} data-align={align} style={style} aria-label={`Ciclo ${project.cyclePosition}: ${project.title}, bloqueado`}>{node}</span>
              ) : (
                <Link key={project.id} href={`/projetos/${project.id}`} className={styles.mapNode} data-state={state} data-align={align} style={style} aria-current={state === "current" ? "step" : undefined} aria-label={`Ciclo ${project.cyclePosition}: ${project.title}`}>{node}</Link>
              );
            })}
            </motion.div>
          </div>
          <div className={styles.mapFooter}>
            <span><i data-tone="done" /> concluído</span>
            <span><i data-tone="current" /> agora</span>
            <span><i data-tone="available" /> disponível</span>
            <span><i data-tone="future" /> próximo</span>
          </div>
        </figure>
      </motion.header>

      <motion.section className={styles.levels} aria-labelledby="levels-title" variants={REVEAL_VARIANTS} initial={reduceMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.22 }}>
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
      </motion.section>

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
                const projectPercentage = percentage(project.completedActivityCount, project.activityCount);
                const card = <>
                  <div className={styles.projectMeta}><span>Ciclo {String(project.cyclePosition).padStart(2, "0")}</span><small>{state === "complete" ? "Evidência preservada" : state === "current" ? "Construção em curso" : state === "available" ? "Disponível" : "Próxima estação"}</small></div>
                  <div className={styles.projectBody}><div><h3>{project.title}</h3><p>{state === "complete" ? "Este ciclo já compõe seu arquivo de formação." : state === "current" ? "Continue a atividade que move este projeto agora." : state === "available" ? "Este ciclo está disponível para continuar sua construção." : "O destino está visível; os detalhes abrem no momento certo."}</p></div>{state !== "upcoming" && <ArrowRight className={styles.projectArrow} />}</div>
                  {state !== "upcoming" && <>
                    <div className={styles.projectProgress}><span><Layers3 size={14} /> {project.completedActivityCount}/{project.activityCount} evidências</span><strong>{projectPercentage}%</strong></div>
                    <div className={styles.track} role="progressbar" aria-label={`${projectPercentage}% de ${project.title} concluído`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={projectPercentage}><i style={{ transform: `scaleX(${projectPercentage / 100})` }} /></div>
                  </>}
                </>;
                return (
                  <li key={project.id} data-state={state}>
                    <span className={styles.node}>{state === "complete" ? <Check size={16} /> : state === "upcoming" ? <LockKeyhole size={14} /> : <CircleDotDashed size={17} />}</span>
                    {project.status === "locked" ? <div className={styles.projectCard} aria-disabled="true">{card}</div> : <Link href={`/projetos/${project.id}`} className={styles.projectCard} aria-current={state === "current" ? "step" : undefined} aria-label={`Abrir projeto ${project.title}`}>{card}</Link>}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.emptyRoute}><FolderKanban /><p>Os ciclos da sua formação aparecerão aqui quando forem liberados.</p></div>
          )}

          <motion.aside className={styles.rhythmPanel} aria-label="Ritmo da jornada" initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.58, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}>
            <div className={styles.rhythmGauge} role="progressbar" aria-label="Progresso dos encontros presenciais" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sessionsPercentage} style={{ "--journey-target": `${sessionsPercentage * 3.6}deg` } as React.CSSProperties}>
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
          </motion.aside>
        </div>
      </section>

      <motion.section className={styles.footerPanel} variants={REVEAL_VARIANTS} initial={reduceMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.28 }}>
        <div><span className={styles.signalLabel}>Arquivo de formação</span><h2>Sua jornada continua legível depois da entrega.</h2><p>Projetos, versões e decisões formam um registro cumulativo do que você construiu e já consegue explicar.</p></div>
        <Link href={`/projetos${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}><FolderKanban /> Abrir arquivo de projetos <ArrowRight /></Link>
      </motion.section>
    </div>
  );
}
