"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Route } from "lucide-react";
import type { EnrollmentSummary, ProjectSummary } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

type Journey = { enrollment: EnrollmentSummary; projects: readonly ProjectSummary[]; sessionsCompleted: number; sessionsTotal: number };

export function JourneyPage() {
  const enrollmentId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("enrollmentId");
  const query = enrollmentId ? `/api/student/journey?enrollmentId=${enrollmentId}` : "/api/student/journey";
  const { data, error, loading, reload } = useLiveApi<Journey>(query);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data) return <EmptyState scope="jornada ativa" />;
  return <>
    <header className="student-intro"><div><span className="meta-label">Jornada de formação</span><h1>{data.enrollment.curriculumName}</h1></div><p>{data.sessionsCompleted}/{data.sessionsTotal} encontros presenciais concluídos.</p></header>
    <section className="operation-panel"><div className="section-heading"><div><span className="meta-label">Trilha</span><h2>Projetos por ciclo</h2></div><Route /></div><div className="evidence-list">{data.projects.map((project) => <Link className="evidence-row" href={`/projetos/${project.id}`} key={project.id}><span className="version-marker">{project.cyclePosition.toString().padStart(2, "0")}</span><div><strong>{project.title}</strong><small>{project.completedActivityCount}/{project.activityCount} atividades · {project.status}</small></div><ChevronRight /></Link>)}</div></section>
    <Link className="button-secondary" href={`/projetos?enrollmentId=${data.enrollment.id}`}><CalendarDays />Abrir projetos</Link>
  </>;
}
