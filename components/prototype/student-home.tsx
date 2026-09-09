"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, MessageCircleMore, Wrench } from "lucide-react";
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
  return <>
    <section className="student-intro"><div><span className="meta-label">Seu estúdio de missões</span><h1>Construa algo que você consiga explicar.</h1></div><p>As atividades registram suas decisões, versões e evidências do projeto.</p></section>
    <section className="mission-rail neon-edge" aria-labelledby="mission-title"><div className="mission-copy"><span className="meta-label">Próximo passo</span><h2 id="mission-title">{action.label}</h2><p>{data.currentProject ? `${data.currentProject.title} · ${data.currentProject.completedActivityCount}/${data.currentProject.activityCount} atividades concluídas.` : "Sua jornada individual está pronta para continuar."}</p><div className="mission-actions"><Link href={href} className="button-primary">Continuar <ArrowRight /></Link><Link href="/projetos" className="button-secondary">Ver projetos</Link></div></div><div className="construction-map"><span className="map-title">Mapa de construção</span><ol><li className="done"><span>01</span><span><strong>Explorar</strong><small>Conceito e desafio presencial</small></span></li><li className="active"><span>02</span><span><strong>Construir</strong><small>Entregar uma evidência por vez</small></span></li><li><span>03</span><span><strong>Explicar</strong><small>Feedback e portfólio privado</small></span></li></ol></div></section>
    <section className="evidence-section"><div className="section-heading"><div><span className="meta-label">Acompanhamento</span><h2>Seu ciclo agora</h2></div></div><div className="evidence-list">{data.nextSession && <div className="evidence-row"><CalendarDays /><div><strong>{data.nextSession.lessonTitle}</strong><small>{new Date(data.nextSession.startsAt).toLocaleString("pt-BR")}</small></div></div>}{data.recentFeedback && <Link href={href} className="evidence-row"><MessageCircleMore /><div><strong>Feedback novo</strong><small>{data.recentFeedback.feedback}</small></div><ArrowRight /></Link>}{data.pendingMakeupCount > 0 && <div className="evidence-row"><Wrench /><div><strong>Reposição pendente</strong><small>{data.pendingMakeupCount} item(ns) precisam ser concluídos antes da formação.</small></div></div>}</div></section>
  </>;
}
