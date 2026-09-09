"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ProjectDetail as ProjectDto } from "@/specs/api.contracts";
import { useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
export function ProjectDetailPage(){const params=useParams<{projectId:string}>();const {data,error,loading,reload}=useLiveApi<ProjectDto>(params.projectId?`/api/student/projects/${params.projectId}`:null);if(loading)return <LoadingState/>;if(error)return <ErrorState retry={reload} message={error.message}/>;if(!data)return <EmptyState scope="projeto"/>;return <><Link className="back-link" href="/projetos"><ArrowLeft/>Voltar aos projetos</Link><header className="activity-header"><span className="meta-label">Ciclo {data.cyclePosition}</span><h1>{data.title}</h1><p>{data.completedActivityCount} de {data.activityCount} atividades concluídas.</p></header><section className="operation-panel"><div className="section-heading"><div><span className="meta-label">Evidências</span><h2>Atividades do projeto</h2></div></div><div className="evidence-list">{data.activities.map(activity=><Link className="evidence-row" key={activity.assignmentId} href={`/atividade?assignmentId=${activity.assignmentId}`}><CheckCircle2/><div><strong>{activity.title}</strong><small>Aula {activity.lessonPosition} · {activity.status}{activity.latestVersion ? ` · versão ${activity.latestVersion}`:""}</small></div><ArrowRight/></Link>)}</div></section></>}
