"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MessageCircleMore, Wrench } from "lucide-react";
import { CinematicPage, MagneticAction, MetricStrip, PageHeader, ProgressRail, SpotlightCard } from "@/components/academy";
import type { StudentHome as StudentHomeDto } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

export function StudentHome() {
  const { data, error, loading, reload } = useLiveApi<StudentHomeDto>("/api/student/home");
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data || data.primaryAction.kind === "none") return <EmptyState scope="missão disponível" />;
  const action = data.primaryAction;
  const href = "assignmentId" in action ? `/atividade?assignmentId=${action.assignmentId}` : action.kind === "setup_github" ? "/atividade" : "/projetos";
  const completed = data.currentProject?.completedActivityCount ?? 0;
  const total = data.currentProject?.activityCount ?? 0;

  return <CinematicPage>
    <PageHeader eyebrow="Seu estúdio de missões" title="Construa algo que você consiga explicar." description="Cada decisão, versão e evidência deixa uma marca no seu projeto." marker={data.currentProject ? `ciclo ${data.currentProject.activityCount}` : "em progresso"} />
    <SpotlightCard className="mission-rail neon-edge">
      <div className="mission-copy"><span className="meta-label">Próximo movimento</span><h2>{action.label}</h2><p>{data.currentProject ? `${data.currentProject.title} · ${completed}/${total} evidências concluídas.` : "Sua jornada individual está pronta para continuar."}</p><div className="mission-actions"><MagneticAction><Link href={href} className="button-primary">Continuar <ArrowRight /></Link></MagneticAction><Link href="/projetos" className="button-secondary">Ver projetos</Link></div></div>
      <div className="construction-map"><span className="map-grid" aria-hidden="true" /><span className="map-title">Mapa de construção</span><ProgressRail label="Mapa da missão" items={[{ id: "explorar", label: "Explorar", detail: "Conceito e desafio presencial", status: completed > 0 ? "complete" : "current" }, { id: "construir", label: "Construir", detail: "Entregar uma evidência por vez", status: completed > 0 ? "current" : "upcoming" }, { id: "explicar", label: "Explicar", detail: "Feedback e portfólio privado", status: total > 0 && completed === total ? "current" : "locked" }]} /></div>
    </SpotlightCard>
    <MetricStrip className="evidence-section" label="Seu ritmo" metrics={[{ id: "evidencias", label: "Evidências", value: `${completed}/${total}`, detail: "no projeto atual", emphasis: true }, { id: "encontro", label: "Próximo encontro", value: data.nextSession ? "Agendado" : "Em breve", detail: data.nextSession ? new Date(data.nextSession.startsAt).toLocaleDateString("pt-BR") : "acompanhe a agenda" }]} />
    <section className="evidence-section"><div className="section-heading"><div><span className="meta-label">Sinais do estúdio</span><h2>O que pede sua atenção</h2></div></div><div className="evidence-list">{data.nextSession && <div className="evidence-row"><CalendarDays /><div><strong>{data.nextSession.lessonTitle}</strong><small>{new Date(data.nextSession.startsAt).toLocaleString("pt-BR")}</small></div></div>}{data.recentFeedback && <Link href={href} className="evidence-row"><MessageCircleMore /><div><strong>Feedback novo</strong><small>{data.recentFeedback.feedback}</small></div><ArrowRight /></Link>}{data.pendingMakeupCount > 0 && <div className="evidence-row"><Wrench /><div><strong>Reposição pendente</strong><small>{data.pendingMakeupCount} item(ns) precisam ser concluídos antes da formação.</small></div></div>}</div></section>
  </CinematicPage>;
}
