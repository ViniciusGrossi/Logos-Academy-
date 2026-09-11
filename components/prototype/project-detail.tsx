"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleDotDashed, Clock3, FileStack, Layers3, LockKeyhole, Radio, RotateCcw, Send, Waypoints } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { MagneticAction } from "@/components/academy";
import type { AssignmentStatus, ProjectDetail as ProjectDto } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./project-detail.module.css";

const statusCopy: Record<AssignmentStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  draft: "Rascunho",
  submitted: "Em análise",
  revision_requested: "Revisão solicitada",
  approved: "Aprovada",
};

const statusIcon = {
  locked: LockKeyhole,
  available: CircleDotDashed,
  draft: FileStack,
  submitted: Send,
  revision_requested: RotateCcw,
  approved: Check,
} satisfies Record<AssignmentStatus, typeof Check>;

function moveFocusGrid(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--evidence-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--evidence-y", `${event.clientY - bounds.top}px`);
}

export function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const { data, error, loading, reload } = useLiveApi<ProjectDto>(params.projectId ? `/api/student/projects/${params.projectId}` : null);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data) return <EmptyState scope="projeto" />;

  const progress = data.activityCount ? Math.round((data.completedActivityCount / data.activityCount) * 100) : 0;
  const active = data.activities.find((activity) => ["revision_requested", "draft", "available"].includes(activity.status)) ?? data.activities.find((activity) => activity.status !== "locked") ?? data.activities[0];
  const versions = data.activities.reduce((sum, activity) => sum + (activity.latestVersion ?? 0), 0);

  return <div className={styles.detail}>
    <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
    <Link className={styles.back} href="/projetos"><ArrowLeft /> Voltar ao arquivo</Link>

    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <span className={styles.eyebrow}><Radio size={13} /> Projeto aberto · ciclo {String(data.cyclePosition).padStart(2, "0")}</span>
        <h1>{data.title}</h1>
        <p>Um registro vivo das decisões, tentativas e evidências construídas ao longo deste ciclo.</p>
      </div>
      <div className={styles.gauge} style={{ "--detail-progress": `${progress * 3.6}deg` } as CSSProperties}>
        <div><strong>{progress}%</strong><small>construído</small></div><i aria-hidden="true" />
      </div>
    </header>

    <section className={styles.metrics} aria-label="Resumo do projeto">
      <article><Layers3 /><span><small>Evidências</small><strong>{data.completedActivityCount}<em>/{data.activityCount}</em></strong></span><b aria-hidden="true">{data.activities.map((activity) => <i key={activity.assignmentId} data-complete={activity.status === "approved"} />)}</b></article>
      <article><FileStack /><span><small>Versões registradas</small><strong>{String(versions).padStart(2, "0")}</strong></span><b className={styles.versionSignal} aria-hidden="true"><i /><i /><i /></b></article>
      <article><Waypoints /><span><small>Estado do ciclo</small><strong>{data.status === "approved" ? "Preservado" : data.status === "locked" ? "Bloqueado" : "Em curso"}</strong></span><b className={styles.liveSignal} aria-hidden="true"><i /></b></article>
    </section>

    {active && <section className={styles.focus} aria-labelledby="focus-title" onPointerMove={moveFocusGrid}>
      <div className={styles.focusField} aria-hidden="true"><span /><span /><span /><i /></div>
      <div className={styles.focusCursorGrid} aria-hidden="true" />
      <div className={styles.focusCopy}>
        <div className={styles.focusMeta}><span>Próxima evidência</span><small>Aula {String(active.lessonPosition).padStart(2, "0")}</small></div>
        <span className={styles.status} data-status={active.status}>{statusCopy[active.status]}</span>
        <h2 id="focus-title">{active.title}</h2>
        <p>{active.status === "revision_requested" ? "O feedback já abriu uma nova direção. Revise sua decisão e registre a próxima versão." : active.status === "submitted" ? "Sua evidência está em análise. Você pode consultar o que foi enviado enquanto aguarda o retorno." : active.status === "approved" ? "Esta evidência já foi reconhecida e permanece registrada no projeto." : "Abra a atividade para compreender o objetivo e construir a próxima evidência."}</p>
        <MagneticAction><Link href={`/atividade?assignmentId=${active.assignmentId}`} className={styles.focusAction}>{active.status === "revision_requested" ? "Revisar evidência" : active.status === "submitted" || active.status === "approved" ? "Consultar evidência" : "Abrir atividade"}<ArrowRight /></Link></MagneticAction>
      </div>
      <div className={styles.focusIndex}><span>{String(data.activities.findIndex((activity) => activity.assignmentId === active.assignmentId) + 1).padStart(2, "0")}</span><i /><small>posição ativa</small></div>
    </section>}

    <section className={styles.evidenceSection} aria-labelledby="evidence-title">
      <div className={styles.sectionHeading}><div><span>Mapa de evidências</span><h2 id="evidence-title">A construção deste projeto</h2></div><small>{data.activities.length} registros</small></div>
      <ol className={styles.evidenceRoute}>
        {data.activities.map((activity, index) => {
          const Icon = statusIcon[activity.status];
          const current = active?.assignmentId === activity.assignmentId;
          return <li key={activity.assignmentId} data-status={activity.status} data-current={current}>
            <span className={styles.routeNode}>{activity.status === "approved" ? <Check /> : String(index + 1).padStart(2, "0")}</span>
            <Link href={`/atividade?assignmentId=${activity.assignmentId}`} className={styles.evidenceCard}>
              <div className={styles.evidenceTop}><span>Aula {String(activity.lessonPosition).padStart(2, "0")}</span><small><Icon /> {statusCopy[activity.status]}</small></div>
              <div className={styles.evidenceBody}><div><h3>{activity.title}</h3><p>{activity.latestVersion ? `Versão ${String(activity.latestVersion).padStart(2, "0")} registrada neste projeto.` : "A primeira versão ainda não foi registrada."}</p></div><ArrowRight /></div>
              <div className={styles.evidenceFooter}><span><Clock3 /> {current ? "Posição atual" : activity.status === "approved" ? "Etapa percorrida" : "Etapa do ciclo"}</span>{activity.latestVersion && <em>v{String(activity.latestVersion).padStart(2, "0")}</em>}</div>
            </Link>
          </li>;
        })}
      </ol>
    </section>
  </div>;
}
