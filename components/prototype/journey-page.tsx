"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { CinematicPage, MetricStrip, PageHeader, ProgressRail, SpotlightCard } from "@/components/academy";
import type { EnrollmentSummary, ProjectSummary } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

type Journey = { enrollment: EnrollmentSummary; projects: readonly ProjectSummary[]; sessionsCompleted: number; sessionsTotal: number };

export function JourneyPage() {
  const enrollmentId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("enrollmentId");
  const { data, error, loading, reload } = useLiveApi<Journey>(enrollmentId ? `/api/student/journey?enrollmentId=${enrollmentId}` : "/api/student/journey");
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data) return <EmptyState scope="jornada ativa" />;
  return <CinematicPage><PageHeader eyebrow="Jornada de formação" title={data.enrollment.curriculumName} description="Uma trilha presencial que continua no estúdio: cada ciclo revela a próxima evidência." marker={`${data.sessionsCompleted}/${data.sessionsTotal} encontros`} />
    <MetricStrip metrics={[{ id: "presenca", label: "Encontros", value: `${data.sessionsCompleted}/${data.sessionsTotal}`, detail: "presenciais concluídos", emphasis: true }, { id: "ciclos", label: "Ciclos", value: String(data.projects.length).padStart(2, "0"), detail: "projetos na sua trilha" }]} />
    <section className="evidence-section"><div className="section-heading"><div><span className="meta-label">Rota de aprendizado</span><h2>Projetos por ciclo</h2></div></div><ProgressRail className="evidence-section" items={data.projects.map((project, index) => ({ id: project.id, label: project.title, detail: `${project.completedActivityCount}/${project.activityCount} atividades · ${project.status}`, status: project.completedActivityCount === project.activityCount ? "complete" : index === 0 ? "current" : "upcoming" }))} /></section>
    <SpotlightCard className="operation-panel evidence-section"><span className="meta-label">Portfólio em formação</span><h2>Avance uma evidência por vez.</h2><p>Os ciclos ficam visíveis como uma trilha; cada projeto abre seu próprio registro de decisões e versões.</p><Link className="button-secondary" href={`/projetos?enrollmentId=${data.enrollment.id}`}><CalendarDays />Abrir projetos <ChevronRight /></Link></SpotlightCard>
  </CinematicPage>;
}
