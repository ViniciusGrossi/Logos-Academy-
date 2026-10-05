"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleDotDashed, Clock3, Code2, ExternalLink, FileStack, GitBranch, Layers3, Lightbulb, ListChecks, LockKeyhole, MessageSquareQuote, Radio, RotateCcw, Send, Sparkles, Target, UsersRound, Waypoints } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { MagneticAction } from "@/components/academy";
import type { AssignmentStatus, ProjectBuildArtifact, ProjectDetail as ProjectDto } from "@/specs/api.contracts";
import { apiQuery, useLiveApi } from "./live-api";
import { activityActionCopy, activityFlowSteps, activityPositionCopy, getActivityFlowState } from "./project-activity-flow";
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

const buildIcons = {
  frontend: Code2,
  api: Code2,
  prompt: MessageSquareQuote,
  tests: ListChecks,
  deploy: ExternalLink,
  repository: GitBranch,
} satisfies Record<ProjectBuildArtifact["slot"], typeof Code2>;

async function openBuildFile(fileId: string) {
  const file = await apiQuery<{ signedDownloadUrl: string }>(`/api/files/${fileId}/download-url`);
  window.open(file.signedDownloadUrl, "_blank", "noopener,noreferrer");
}

export function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const { data, error, loading, reload } = useLiveApi<ProjectDto>(params.projectId ? `/api/student/projects/${params.projectId}` : null);
  if (loading) return <LoadingState layout="detail" />;
  if (error) return <ErrorState layout="detail" retry={reload} message={error.message} />;
  if (!data) return <EmptyState layout="detail" scope="projeto" />;

  const progress = data.activityCount ? Math.round((data.completedActivityCount / data.activityCount) * 100) : 0;
  const active = data.activities.find((activity) => ["revision_requested", "draft", "available"].includes(activity.status)) ?? data.activities.find((activity) => activity.status !== "locked") ?? data.activities[0];
  const versions = data.activities.reduce((sum, activity) => sum + (activity.latestVersion ?? 0), 0);
  const brief = data.brief ?? {
    challenge: `Construir ${data.title} e tornar visíveis as decisões que fazem o projeto evoluir.`,
    problem: "O problema deste projeto ainda será registrado pelo mentor.",
    audience: "O público deste projeto ainda será registrado pelo mentor.",
    expectedResult: "Concluir as evidências do ciclo e explicar as decisões tomadas.",
    qualityCriteria: ["Evidências completas", "Decisões explicadas", "Evolução entre versões"],
    concepts: [],
  };

  return <div className={styles.detail}>
    <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
    <Link className={styles.back} href="/projetos"><ArrowLeft /> Voltar ao arquivo</Link>

    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <span className={styles.eyebrow}><Radio size={13} /> Projeto aberto · ciclo {String(data.cyclePosition).padStart(2, "0")}</span>
        <h1>{data.title}</h1>
        <p>{brief.challenge}</p>
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

    <section className={styles.north} aria-labelledby="north-title">
      <div className={styles.sectionHeading}><div><span><Target size={13} /> Norte do projeto</span><h2 id="north-title">O que estamos construindo — e por quê</h2></div><small>brief vivo</small></div>
      <p className={styles.challenge}>{brief.challenge}</p>
      <div className={styles.northGrid}>
        <article><Target /><small>Problema</small><p>{brief.problem}</p></article>
        <article><UsersRound /><small>Público ou situação</small><p>{brief.audience}</p></article>
        <article><Sparkles /><small>Resultado esperado</small><p>{brief.expectedResult}</p></article>
      </div>
      <div className={styles.northFoot}>
        <div><span><ListChecks /> Critérios de qualidade</span><ul>{brief.qualityCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></div>
        <div><span><Lightbulb /> Conceitos explorados</span><div className={styles.concepts}>{brief.concepts.length ? brief.concepts.map((concept) => <em key={concept}>{concept}</em>) : <p>Os conceitos aparecerão conforme as atividades forem liberadas.</p>}</div></div>
      </div>
    </section>

    {active && <section className={styles.focus} aria-labelledby="focus-title" onPointerMove={moveFocusGrid}>
      <div className={styles.focusField} aria-hidden="true"><span /><span /><span /><i /></div>
      <div className={styles.focusCopy}>
        <div className={styles.focusMeta}><span>Próxima evidência</span><small>Aula {String(active.lessonPosition).padStart(2, "0")}</small></div>
        <span className={styles.status} data-status={active.status}>{statusCopy[active.status]}</span>
        <h2 id="focus-title">{active.title}</h2>
        <p>{active.status === "revision_requested" ? "O feedback já abriu uma nova direção. Revise sua decisão e registre a próxima versão." : active.status === "submitted" ? "Sua evidência está em análise. Você pode consultar o que foi enviado enquanto aguarda o retorno." : active.status === "approved" ? "Esta evidência já foi reconhecida e permanece registrada no projeto." : "Abra a atividade para compreender o objetivo e construir a próxima evidência."}</p>
        <MagneticAction><Link href={`/atividade?assignmentId=${active.assignmentId}`} className={styles.focusAction}>{active.status === "revision_requested" ? "Revisar evidência" : active.status === "submitted" || active.status === "approved" ? "Consultar evidência" : "Abrir atividade"}<ArrowRight /></Link></MagneticAction>
      </div>
      <div className={styles.focusIndex}><span>{String(data.activities.findIndex((activity) => activity.assignmentId === active.assignmentId) + 1).padStart(2, "0")}</span><i /><small>posição ativa</small></div>
    </section>}

    {data.build.length > 0 && <section className={styles.build} aria-labelledby="build-title">
      <div className={styles.sectionHeading}><div><span><Code2 size={13} /> Construção atual</span><h2 id="build-title">Peças aprovadas do assistente</h2></div><small>fora da Academy, visível aqui</small></div>
      <p className={styles.buildLead}>Este é o retrato aprovado do que você está construindo. O app continua no seu GitHub e na sua Vercel; aqui ficam as versões, decisões e o caminho para retomá-las.</p>
      <div className={styles.buildGrid}>
        {data.build.map((artifact) => {
          const Icon = buildIcons[artifact.slot];
          const external = artifact.kind === "external_link" || artifact.kind === "github_repository";
          return <article key={artifact.slot} className={styles.buildArtifact}>
            <div><Icon /><span><small>Atividade {String(artifact.sourceActivityPosition).padStart(2, "0")} · v{artifact.version}</small><h3>{artifact.label}</h3></span></div>
            {artifact.value && <details><summary>Ver conteúdo</summary><p>{artifact.value}</p></details>}
            {artifact.fileName && <p className={styles.fileName}>{artifact.fileName}</p>}
            {external && artifact.value ? <a href={artifact.value} target="_blank" rel="noreferrer">Abrir referência <ExternalLink /></a> : artifact.fileId ? <button type="button" onClick={() => void openBuildFile(artifact.fileId!)}>Baixar arquivo <ArrowRight /></button> : <span className={styles.filePending}>Arquivo registrado</span>}
          </article>;
        })}
      </div>
    </section>}

    <section className={styles.evidenceSection} aria-labelledby="evidence-title">
      <div className={styles.sectionHeading}><div><span>Evolução do projeto</span><h2 id="evidence-title">Atividades, versões e retornos</h2></div><small>{data.activities.length} atividades vinculadas</small></div>
      <p className={styles.flowHelp}><strong>Como funciona:</strong> você não precisa navegar pelas etapas abaixo. A régua mostra o estado da atividade em destaque e avança automaticamente quando você salva, envia ou recebe o retorno do orientador.</p>
      {active?.status === "locked" ? <p className={styles.flowLocked}><LockKeyhole /> A primeira atividade ainda aguarda liberação.</p> : active && <div className={styles.flowPanel}>
        <div className={styles.flowContext}><span>Fluxo da atividade em destaque</span><small>Aula {String(active.lessonPosition).padStart(2, "0")} · {active.title}</small></div>
        <ol className={styles.decisionFlow} aria-label="Estado da atividade em destaque">{activityFlowSteps.map((step, index) => {
          const flowState = getActivityFlowState(index, active.status);
          return <li key={step.status} data-state={flowState} aria-current={flowState === "current" ? "step" : undefined}>{flowState === "complete" && <Check aria-hidden="true" />}{step.label}</li>;
        })}</ol>
      </div>}
      <ol className={styles.evidenceRoute}>
        {data.activities.map((activity, index) => {
          const Icon = statusIcon[activity.status];
          const current = active?.assignmentId === activity.assignmentId;
          const locked = activity.status === "locked";
          const card = <>
            <div className={styles.evidenceTop}><span>Aula {String(activity.lessonPosition).padStart(2, "0")}</span><small><Icon /> {statusCopy[activity.status]}</small></div>
            <div className={styles.evidenceBody}><div><h3>{activity.title}</h3><p>{activity.latestVersion ? `Versão ${String(activity.latestVersion).padStart(2, "0")} registrada neste projeto.` : locked ? "Conclua a etapa atual para liberar esta atividade." : "A primeira versão ainda não foi registrada."}</p></div>{locked ? <LockKeyhole aria-label="Bloqueada" /> : <ArrowRight />}</div>
            {activity.decision && <div className={styles.decisionNote}><Lightbulb /><span><small>Registro da atividade</small>{activity.decision}</span></div>}
            {activity.latestFeedback && <div className={styles.feedbackNote}><MessageSquareQuote /><span><small>Feedback de {activity.latestFeedback.reviewerName}</small>{activity.latestFeedback.feedback}</span></div>}
            <div className={styles.evidenceFooter}><span><Clock3 /> {activityPositionCopy[activity.status]}</span><div>{activity.latestVersion && <em>v{String(activity.latestVersion).padStart(2, "0")}</em>}{!locked && <strong>{activityActionCopy[activity.status]}<ArrowRight aria-hidden="true" /></strong>}</div></div>
          </>;
          return <li key={activity.assignmentId} data-status={activity.status} data-current={current}>
            <span className={styles.routeNode}>{activity.status === "approved" ? <Check /> : String(index + 1).padStart(2, "0")}</span>
            {locked ? <div className={styles.evidenceCard} aria-disabled="true">{card}</div> : <Link href={`/atividade?assignmentId=${activity.assignmentId}`} className={styles.evidenceCard}>{card}</Link>}
          </li>;
        })}
      </ol>
    </section>
  </div>;
}
