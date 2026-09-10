"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { CinematicPage, MetricStrip, PageHeader, SpotlightCard } from "@/components/academy";
import type { ProjectDetail, ProjectSummary } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

export function ProjectPortal() {
  const { data, error, loading, reload } = useLiveApi<readonly ProjectSummary[]>("/api/student/projects");
  const portfolio = useLiveApi<{ items: readonly ProjectDetail[] }>("/api/student/portfolio");
  if (loading || portfolio.loading) return <LoadingState />;
  if (error || portfolio.error) return <ErrorState retry={() => { void reload(); void portfolio.reload(); }} message={error?.message ?? portfolio.error?.message ?? "Erro"} />;
  const projects = data ?? []; const approved = portfolio.data?.items ?? [];
  if (!projects.length) return <EmptyState scope="projeto iniciado" />;
  return <CinematicPage><PageHeader eyebrow="Portfólio privado" title="Projetos em construção." description="O que importa não é só o resultado: é a evidência de como você chegou até ele." marker={`${projects.length} ciclos`} />
    <MetricStrip metrics={[{ id: "ativos", label: "Em construção", value: String(projects.length).padStart(2, "0"), detail: "projetos ativos", emphasis: true }, { id: "aprovados", label: "Evidências preservadas", value: String(approved.length).padStart(2, "0"), detail: "projetos aprovados" }]} />
    <section className="evidence-section"><div className="section-heading"><div><span className="meta-label">Trilha ativa</span><h2>Seus projetos</h2></div></div><div className="evidence-list">{projects.map((project) => <Link className="evidence-row" key={project.id} href={`/projetos/${project.id}`}><FolderKanban /><div><strong>{project.title}</strong><small>{project.completedActivityCount}/{project.activityCount} atividades · {project.status}</small></div><span className="version-marker">ciclo {project.cyclePosition}</span><ArrowRight /></Link>)}</div></section>
    <section className="evidence-section"><div className="section-heading"><div><span className="meta-label">Arquivo de evidências</span><h2>Seu portfólio</h2></div></div>{approved.length ? <div className="evidence-list">{approved.map((project) => <Link className="evidence-row" key={project.id} href={`/projetos/${project.id}`}><FolderKanban /><div><strong>{project.title}</strong><small>{project.activities.length} evidência(s) preservada(s)</small></div><ArrowRight /></Link>)}</div> : <SpotlightCard className="operation-panel"><p>Quando um projeto for aprovado, ele aparecerá aqui como parte da sua coleção.</p></SpotlightCard>}</section>
  </CinematicPage>;
}
