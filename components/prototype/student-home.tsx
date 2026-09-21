"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleGauge,
  Clock3,
  Crosshair,
  FolderKanban,
  Layers3,
  MessageCircleMore,
  Radio,
  Wrench,
} from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { GlowField, MagneticAction, Ticker, WordReveal } from "@/components/academy";
import type { MeProfile, StudentHome as StudentHomeDto } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./student-home.module.css";

const entrance = [0.16, 1, 0.3, 1] as const;

const actionCopy: Record<StudentHomeDto["primaryAction"]["kind"], string> = {
  continue_activity: "Continue exatamente do ponto em que parou e registre a próxima decisão.",
  revise_submission: "Use o retorno recebido para transformar sua entrega em uma versão mais forte.",
  view_feedback: "Leia a revisão da sua evidência antes de definir o próximo movimento.",
  setup_github: "Conecte sua identidade técnica para manter seus projetos e evidências vinculados.",
  none: "Sua próxima missão aparecerá aqui assim que for liberada.",
};

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(value));
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function StudentHome() {
  const { data, error, loading, reload } = useLiveApi<StudentHomeDto>("/api/student/home");
  const { data: profile } = useLiveApi<MeProfile>("/api/me");
  const reduceMotion = useReducedMotion();
  const mapX = useMotionValue(0);
  const mapY = useMotionValue(0);
  const x = useSpring(mapX, { stiffness: 90, damping: 28, mass: 0.7 });
  const y = useSpring(mapY, { stiffness: 90, damping: 28, mass: 0.7 });

  if (loading) return <LoadingState layout="home" />;
  if (error) return <ErrorState layout="home" retry={reload} message={error.message} />;
  if (!data || data.primaryAction.kind === "none") return <EmptyState layout="home" scope="missão disponível" />;

  const action = data.primaryAction;
  const activityHref = "assignmentId" in action ? `/atividade?assignmentId=${action.assignmentId}` : "/atividade";
  const actionHref = action.kind === "setup_github" ? "/perfil" : activityHref;
  const completed = data.currentProject?.completedActivityCount ?? 0;
  const total = data.currentProject?.activityCount ?? 0;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  const projectHref = data.currentProject ? `/projetos/${data.currentProject.id}` : "/projetos";
  const firstName = profile?.displayName.trim().split(/\s+/u)[0];
  const tickerItems = [
    "Centro de missão · sistema ativo",
    data.currentProject ? `Ciclo ${String(data.currentProject.cyclePosition).padStart(2, "0")}` : "Em preparação",
    `${completed}/${total} evidências`,
    `${percentage}% concluído`,
    "Rota 01 — 03",
  ];
  const stages = [
    { id: "explorar", number: "01", label: "Explorar", detail: "Entenda o conceito e reconheça o desafio.", state: completed > 0 ? "complete" : "current" },
    { id: "construir", number: "02", label: "Construir", detail: "Transforme decisões em uma evidência concreta.", state: completed > 0 && completed < total ? "current" : completed === total && total > 0 ? "complete" : "upcoming" },
    { id: "explicar", number: "03", label: "Explicar", detail: "Defenda escolhas, incorpore feedback e preserve.", state: total > 0 && completed === total ? "current" : "upcoming" },
  ] as const;

  function moveMap(event: ReactPointerEvent<HTMLElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mapX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 18);
    mapY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 14);
    event.currentTarget.style.setProperty("--home-spot-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--home-spot-y", `${event.clientY - bounds.top}px`);
  }

  function resetMap() {
    mapX.set(0);
    mapY.set(0);
  }

  return (
    <div className={styles.home}>
      <div className={styles.glowLayer} aria-hidden="true"><GlowField /></div>

      <motion.header className={styles.header} initial={reduceMotion ? false : "hidden"} animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
        <motion.div className={styles.headerCopy} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: entrance } } }}>
          <span className={styles.eyebrow}><Radio size={13} /> Centro de missão · sistema ativo</span>
          <p className={styles.greeting}>{firstName ? `Bem-vindo de volta, ${firstName}.` : "Bem-vindo de volta ao seu estúdio."}</p>
          <WordReveal as="h1">Construa algo que você consiga explicar.</WordReveal>
        </motion.div>
        <motion.div className={styles.headerStats} variants={{ hidden: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: entrance } } }} aria-label="Resumo e atalhos do ciclo">
          <Link href={projectHref} className={styles.statCard} aria-label="Abrir projeto atual">
            <span className={styles.statIcon}><FolderKanban /></span>
            <span className={styles.statCopy}><small>Projeto atual</small><strong>{data.currentProject ? `Ciclo ${String(data.currentProject.cyclePosition).padStart(2, "0")}` : "Em preparação"}</strong><em>{data.currentProject?.title ?? "Aguardando liberação"}</em></span>
            <ArrowRight className={styles.statArrow} />
          </Link>
          <Link href={actionHref} className={styles.statCard} aria-label="Abrir evidência atual">
            <span className={styles.statIcon}><Layers3 /></span>
            <span className={styles.statCopy}><small>Evidências</small><strong>{completed}/{total}</strong><em>{total ? `${Math.max(total - completed, 0)} restante(s)` : "Nenhuma liberada"}</em></span>
            <span className={styles.miniBars} aria-hidden="true">{Array.from({ length: Math.max(total, 4) }, (_, index) => <i key={index} data-filled={index < completed} style={{ "--bar-i": index } as CSSProperties} />)}</span>
          </Link>
          <Link href="/jornada" className={styles.statCard} aria-label="Abrir progresso da jornada">
            <span className={styles.statIcon}><CircleGauge /></span>
            <span className={styles.statCopy}><small>Progresso</small><strong>{percentage}%</strong><em>Ver jornada completa</em></span>
            <span className={styles.progressRing} style={{ "--progress": `${percentage * 3.6}deg` } as CSSProperties} aria-hidden="true"><i /></span>
          </Link>
        </motion.div>
      </motion.header>

      <motion.section
        className={styles.mission}
        onPointerMove={moveMap}
        onPointerLeave={resetMap}
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, delay: 0.12, ease: entrance }}
        aria-labelledby="mission-title"
      >
        <span className={styles.missionBeam} aria-hidden="true" />
        <motion.div className={styles.map} style={reduceMotion ? undefined : { x, y }} aria-hidden="true">
          <svg viewBox="0 0 1100 560" preserveAspectRatio="xMidYMid slice">
            <path className={styles.mapOrbit} d="M-40 430 C190 80 490 60 700 260 S1010 520 1170 140" />
            <path className={styles.mapOrbitMuted} d="M-80 500 C210 210 410 205 620 320 S950 445 1180 220" />
            <path className={styles.mapRoute} d="M55 440 C210 390 248 205 410 236 S610 430 735 275 S924 165 1060 102" />
            <path className={styles.mapPulse} d="M55 440 C210 390 248 205 410 236 S610 430 735 275 S924 165 1060 102" />
            <circle cx="735" cy="275" r="9" className={styles.mapPoint} />
            <circle cx="735" cy="275" r="24" className={styles.mapPointRing} />
            <g className={styles.mapOrbitDot} style={{ transformOrigin: "735px 275px" } as CSSProperties}>
              <circle cx="735" cy="261" r="3" className={styles.mapOrbitPoint} />
            </g>
          </svg>
        </motion.div>
        <div className={styles.missionCopy}>
          <div className={styles.missionMeta}><span>Próximo movimento</span><span>{data.currentProject?.title ?? "Jornada individual"}</span></div>
          <span className={styles.actionKind}>{action.kind.replaceAll("_", " ")}</span>
          <h2 id="mission-title">{action.label}</h2>
          <p>{actionCopy[action.kind]}</p>
          <div className={styles.progressCopy}><span>{data.currentProject ? `${completed} de ${total} evidências concluídas` : "Preparando seu primeiro projeto"}</span><strong>{percentage}%</strong></div>
          <div className={styles.progressTrack} aria-label={`${percentage}% concluído`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><motion.i initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: percentage / 100 }} transition={{ duration: reduceMotion ? 0 : 0.52, delay: 0.42, ease: entrance }} /></div>
          <div className={styles.actions}>
            <MagneticAction><Link href={actionHref} className={styles.primaryAction}>Continuar missão <ArrowRight /></Link></MagneticAction>
            <Link href={projectHref} className={styles.secondaryAction}><FolderKanban /> Abrir projeto</Link>
          </div>
        </div>
        <div className={styles.missionSignal} aria-hidden="true"><Crosshair /><span>posição atual</span></div>
      </motion.section>

      <section className={styles.routeSection} aria-labelledby="route-title">
        <div className={styles.sectionHeading}><div><span>Mapa de construção</span><h2 id="route-title">Do conceito à evidência.</h2></div><small>Rota 01 — 03</small></div>
        <ol className={styles.route}>
          {stages.map((stage, index) => <motion.li key={stage.id} data-state={stage.state} initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.7 }} transition={{ duration: reduceMotion ? 0 : 0.42, delay: index * 0.09, ease: entrance }}>
            <Link className={styles.routeLink} href={stage.id === "explorar" ? "/atlas?tab=conceitos" : stage.id === "construir" ? actionHref : projectHref}>
              <span className={styles.routeNode}>{stage.state === "complete" ? <Check size={15} /> : stage.number}</span>
              <span className={styles.routeCopy}><small>{stage.state === "complete" ? "Percorrido" : stage.state === "current" ? "Você está aqui" : "A seguir"}</small><strong>{stage.label}</strong><em>{stage.detail}</em></span>
            </Link>
          </motion.li>)}
        </ol>
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.radar} aria-labelledby="radar-title">
          <span className={styles.radarSweep} aria-hidden="true" />
          <div className={styles.sectionHeading}><div><span>Radar de atenção</span><h2 id="radar-title">Sinais do estúdio</h2></div><i className={styles.liveDot}>ao vivo</i></div>
          <div className={styles.signalList}>
            {data.pendingMakeupCount > 0 && <Signal href={activityHref} icon={<Wrench />} eyebrow="Prioridade alta" title="Reposição pendente" detail={`${data.pendingMakeupCount} item(ns) precisam ser regularizados.`} tone="warning" index={0} reduceMotion={Boolean(reduceMotion)} />}
            {data.recentFeedback && <Signal href={activityHref} icon={<MessageCircleMore />} eyebrow="Feedback recebido" title={data.recentFeedback.decision === "approved" ? "Evidência aprovada" : "Uma versão pede ajustes"} detail={`${data.recentFeedback.reviewerName}: ${data.recentFeedback.feedback}`} tone="feedback" index={1} reduceMotion={Boolean(reduceMotion)} />}
            {data.nextSession && <Signal href="/agenda" icon={<CalendarDays />} eyebrow="Próximo encontro" title={data.nextSession.lessonTitle} detail={`${formatSessionDate(data.nextSession.startsAt)} · ${formatSessionTime(data.nextSession.startsAt)}`} tone="calendar" index={2} reduceMotion={Boolean(reduceMotion)} />}
            {!data.pendingMakeupCount && !data.recentFeedback && !data.nextSession && <div className={styles.clearSignal}><Check /> Seu radar está limpo. Continue na missão atual.</div>}
          </div>
        </section>

        <section className={styles.log} aria-labelledby="log-title">
          <div className={styles.sectionHeading}><div><span>Registro recente</span><h2 id="log-title">Marcas da jornada</h2></div><Clock3 /></div>
          {data.recentFeedback ? <div className={styles.logEntry}><time dateTime={data.recentFeedback.reviewedAt}>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(data.recentFeedback.reviewedAt))}</time><span><strong>{data.recentFeedback.decision === "approved" ? "Evidência reconhecida" : "Nova direção registrada"}</strong><small>Revisão de {data.recentFeedback.reviewerName}</small></span><i data-approved={data.recentFeedback.decision === "approved"}>{data.recentFeedback.decision === "approved" ? "aprovada" : "revisar"}</i></div> : <div className={styles.emptyLog}><span>00</span><p>Seu registro começa quando a primeira evidência recebe uma revisão.</p></div>}
          <Link href="/projetos" className={styles.logLink}>Consultar arquivo de projetos <ArrowRight /></Link>
        </section>
      </div>

      <div className={styles.tickerRail}>
        <Ticker items={tickerItems} />
      </div>
    </div>
  );
}

function Signal({ href, icon, eyebrow, title, detail, tone, index, reduceMotion }: { href: string; icon: React.ReactNode; eyebrow: string; title: string; detail: string; tone: string; index: number; reduceMotion: boolean }) {
  return <motion.div initial={reduceMotion ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.42, delay: 0.28 + index * 0.08, ease: entrance }}><Link href={href} className={styles.signal} data-tone={tone}><span className={styles.signalIcon}>{icon}</span><span><small>{eyebrow}</small><strong>{title}</strong><em>{detail}</em></span><ArrowRight /></Link></motion.div>;
}
