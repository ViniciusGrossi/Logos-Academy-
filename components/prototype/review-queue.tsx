"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Send } from "lucide-react";
import type { CriterionReview, Page, ReviewQueueSubmission } from "@/specs/api.contracts";
import { apiMutation, useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";

export function ReviewQueue() {
  const { data, error, loading, reload } = useLiveApi<Page<ReviewQueueSubmission>>("/api/admin/reviews?limit=20");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Record<string, CriterionReview["result"]>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState retry={reload} message={error.message} />;
  if (!data?.items.length) return <EmptyState scope="entrega aguardando revisão" />;

  async function review(submission: ReviewQueueSubmission) {
    setNotice(null);
    if (!submission.criteria.length) {
      setNotice("Esta atividade está sem rubrica. Corrija a configuração antes de publicar o feedback.");
      return;
    }
    const criteria: CriterionReview[] = submission.criteria.map((criterion) => ({ criterionId: criterion.id, result: results[submission.id]?.[criterion.id] ?? "needs_adjustment", comment: null }));
    if (!feedback[submission.id]?.trim() || criteria.some((criterion) => !results[submission.id]?.[criterion.criterionId])) {
      setNotice("Registre o feedback e avalie todos os critérios antes de publicar.");
      return;
    }
    try {
      const decision = criteria.some((criterion) => criterion.result === "needs_adjustment") ? "revision_requested" : "approved";
      await apiMutation(`/api/admin/submissions/${submission.id}/review`, "POST", { decision, feedback: feedback[submission.id], criteria });
      setNotice("Feedback publicado.");
      void reload();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível publicar."); }
  }

  return <>
    <header className="admin-header"><div><span className="meta-label">Feedback pedagógico</span><h1>Revisões para concluir.</h1></div></header>
    <section className="operation-panel"><div className="queue-list">{data.items.map((submission) => <article className="work-sheet" key={submission.id}>
      <span className="meta-label">{submission.student.displayName} · {submission.activity.title} · versão {submission.version}</span><h2>Entrega enviada</h2><p>{submission.items.map((item) => item.textValue ?? item.urlValue ?? "Arquivo").join(" · ") || "Sem itens legíveis."}</p><Link href={`/admin/revisoes/${submission.id}`} className="text-action">Abrir workspace <ArrowUpRight /></Link>
      <div className="review-criteria" aria-label="Critérios de avaliação">{submission.criteria.map((criterion) => <fieldset key={criterion.id}><legend>{criterion.label}</legend><small>{criterion.description}</small><div><button type="button" className={results[submission.id]?.[criterion.id] === "met" ? "is-selected" : ""} onClick={() => setResults((current) => ({ ...current, [submission.id]: { ...current[submission.id], [criterion.id]: "met" } }))}>Atendeu</button><button type="button" className={results[submission.id]?.[criterion.id] === "needs_adjustment" ? "is-selected" : ""} onClick={() => setResults((current) => ({ ...current, [submission.id]: { ...current[submission.id], [criterion.id]: "needs_adjustment" } }))}>Ajustar</button></div></fieldset>)}</div>
      <label className="floating-field"><span>Feedback para o aluno</span><textarea value={feedback[submission.id] ?? ""} onChange={(event) => setFeedback((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Reconheça a decisão, indique o próximo passo." /></label>
      <button className="button-primary" onClick={() => void review(submission)}>Publicar feedback <Send /></button>
    </article>)}</div>{notice && <p className="save-status" role="status"><Check />{notice}</p>}</section>
  </>;
}
