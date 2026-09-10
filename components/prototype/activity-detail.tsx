"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, LockKeyhole, Send } from "lucide-react";
import type { ActivityDetail as ActivityDto, SubmissionItemInput } from "@/specs/api.contracts";
import { apiMutation, useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

const activityTrail = [
  { id: "00000000-0000-4000-8000-000000000024", label: "Radar de referências", status: "Concluída", state: "complete" },
  { id: "00000000-0000-4000-8000-000000000005", label: "Cartaz que orienta uma decisão", status: "Sua vez", state: "current" },
  { id: "00000000-0000-4000-8000-000000000025", label: "Protótipo que pede uma ação", status: "A seguir", state: "locked" },
] as const;

export function ActivityDetail() {
  const search = useSearchParams();
  const assignmentId = search.get("assignmentId") ?? activityTrail[1].id;
  const { data, error, loading, reload } = useLiveApi<ActivityDto>(`/api/student/activities/${assignmentId}`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftItems = useMemo<SubmissionItemInput[]>(() => data?.requirements.flatMap((item) => { const value = values[item.id]?.trim(); return !value ? [] : [{ requirementId: item.id, kind: item.kind, textValue: value } as SubmissionItemInput]; }) ?? [], [data, values]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data) return <EmptyState scope="atividade liberada" />;
  const activity = data;
  const isLocked = activity.status === "locked";
  const isComplete = activity.status === "approved" || activity.status === "submitted";
  const isActionable = !isLocked && !isComplete;
  async function save(submit: boolean) { setSaving(true); try { const draft = await apiMutation<{ id: string }>(`/api/student/activities/${activity.assignmentId}/draft`, "PUT", { items: draftItems }); if (submit) await apiMutation(`/api/student/activities/${activity.assignmentId}/submit`, "POST", { expectedDraftId: draft.id }); setMessage(submit ? "Versão enviada para revisão." : "Rascunho salvo."); await reload(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Não foi possível salvar."); } finally { setSaving(false); } }
  return <><Link href="/" className="back-link"><ArrowLeft />Voltar ao início</Link><section className="operation-panel"><span className="meta-label">Seu percurso neste projeto</span><ol className="progress-rail-premium" aria-label="Atividades do projeto">{activityTrail.map((item, index) => <li key={item.id} data-status={item.state} aria-current={item.id === assignmentId ? "step" : undefined}><span className="progress-rail-premium__index">{String(index + 1).padStart(2, "0")}</span><span className="progress-rail-premium__copy"><strong>{item.label}</strong><small>{item.status}</small></span>{item.state === "locked" ? <LockKeyhole aria-label="Bloqueada" /> : <Link className="button-secondary" href={`/atividade?assignmentId=${item.id}`}>{item.id === assignmentId ? "Aberta" : "Ver"}</Link>}</li>)}</ol></section><header className="activity-header"><span className="meta-label">Atividade atual · Aula {String(activity.lessonPosition).padStart(2, "0")}</span><h1>{activity.title}</h1><p>{activity.objective}</p><div className="activity-meta"><span>{activity.estimatedMinutes} min</span><span className="version-marker">{activity.status}</span></div></header><div className="activity-layout"><div className="activity-main"><section className="work-sheet"><h2>O que precisa acontecer</h2><p>{activity.instructions}</p><p>{activity.continuityGuidance}</p></section>{isLocked ? <section className="work-sheet"><LockKeyhole /><h2>Esta é a próxima etapa</h2><p>Envie a atividade atual para liberar este protótipo. Assim, sua trilha mostra uma atividade por vez, sem pular a construção.</p><Link className="button-primary" href={`/atividade?assignmentId=${activityTrail[1].id}`}>Voltar para a atividade atual</Link></section> : isComplete ? <section className="work-sheet"><Check /><h2>Evidência concluída</h2><p>Você já entregou esta etapa. Ela continua visível como parte do histórico do seu projeto.</p><Link className="button-secondary" href={`/atividade?assignmentId=${activityTrail[1].id}`}>Ir para a atividade atual</Link></section> : <section className="work-sheet"><div className="section-heading"><div><span className="meta-label">Sua entrega</span><h2>Registre a nova versão</h2></div></div>{activity.requirements.map((item) => <label className="floating-field" key={item.id}><span>{item.label}{item.required ? " *" : ""}</span><input value={values[item.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Descreva sua decisão" required={item.required} /><small>Seja objetivo: explique sua escolha e o que ela melhora.</small></label>)}<div className="submit-actions"><button type="button" className="button-secondary" disabled={saving} onClick={() => void save(false)}>Salvar rascunho</button><button type="button" className="button-primary" disabled={saving} onClick={() => void save(true)}>Enviar versão <Send /></button></div>{message && <p className="save-status" role="status"><Check />{message}</p>}</section>}</div><aside className="activity-aside"><section><span className="meta-label">Critérios visíveis</span><h2>Antes de enviar</h2><ul className="criteria-list">{activity.criteria.map((item) => <li key={item.id}><Check />{item.label}: {item.description}</li>)}</ul></section><section><span className="meta-label">Seu momento</span><h2>{isComplete ? "Concluída" : isLocked ? "Bloqueada" : "Em revisão"}</h2><p>{isComplete ? "A evidência segue no seu histórico." : isLocked ? "A próxima atividade abre depois da entrega atual." : "Use o feedback para melhorar e reenviar sua evidência."}</p></section></aside></div></>;
}
