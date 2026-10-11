"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, FileText, GitBranch, History, Link2, MessageSquareText, RotateCcw, Send, Sparkles, UserRound } from "lucide-react";
import type { AdminSubmissionWorkspace, CriterionReview, SubmissionItem } from "@/specs/api.contracts";
import { PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import styles from "./reviews-experience.module.css";

type CriterionResult = CriterionReview["result"];

export function AdminReviewWorkspace({ submissionId }: { submissionId: string }) {
  const { data, error, loading, reload } = useLiveApi<AdminSubmissionWorkspace>(`/api/admin/submissions/${submissionId}`);
  const [feedback, setFeedback] = useState("");
  const [results, setResults] = useState<Record<string, CriterionResult>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <StateScene state="loading" title="Abrindo a mesa de revisão" description="Reunindo evidências, rubrica e versões anteriores." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryButton} onClick={() => void reload()}>Tentar novamente</button>} />;
  if (!data) return <StateScene state="empty" title="Entrega não encontrada" description="Ela pode ter sido removida ou pertencer a outro ambiente." />;

  const workspace = data;
  const alreadyReviewed = Boolean(workspace.review);
  const allAnswered = workspace.criteria.length > 0 && workspace.criteria.every((criterion) => results[criterion.id]);
  const hasAdjustment = Object.values(results).some((result) => result === "needs_adjustment");
  const decision = hasAdjustment ? "revision_requested" : "approved";
  const canPublish = allAnswered && (!hasAdjustment || Boolean(feedback.trim()));

  async function publish(overrides?: { approveAll?: boolean }) {
    const selectedResults = overrides?.approveAll
      ? Object.fromEntries(workspace.criteria.map((criterion) => [criterion.id, "met" as const]))
      : results;
    const selectedHasAdjustment = Object.values(selectedResults).some((result) => result === "needs_adjustment");
    if (!workspace.criteria.length || !workspace.criteria.every((criterion) => selectedResults[criterion.id])) {
      setNotice({ tone: "error", message: "Avalie todos os critérios antes de publicar a revisão." });
      return;
    }
    if (selectedHasAdjustment && !feedback.trim()) {
      setNotice({ tone: "error", message: "Explique ao aluno o que precisa ser corrigido antes de solicitar uma nova versão." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await apiMutation(`/api/admin/submissions/${workspace.id}/review`, "POST", {
        decision: selectedHasAdjustment ? "revision_requested" : "approved",
        feedback: feedback.trim(),
        criteria: workspace.criteria.map((criterion) => ({
          criterionId: criterion.id,
          result: selectedResults[criterion.id],
          ...(comments[criterion.id]?.trim() ? { comment: comments[criterion.id].trim() } : {}),
        })),
      });
      if (overrides?.approveAll) setResults(selectedResults);
      setNotice({ tone: "success", message: selectedHasAdjustment ? "Correção solicitada. O aluno já pode preparar a próxima versão." : "Entrega aprovada e registrada no projeto." });
      await reload();
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível publicar a revisão." });
    } finally {
      setSaving(false);
    }
  }

  return <div className={styles.workspacePage}>
    <Link className={styles.backLink} href="/admin/revisoes"><ArrowLeft aria-hidden="true" /> Voltar ao mapa de evidências</Link>
    <PageHeader
      eyebrow="Mesa de revisão"
      title={workspace.activity.title}
      description={`${workspace.student.displayName} · ${workspace.classSummary?.name ?? "Percurso individual"} · versão ${workspace.version}`}
      marker={`ciclo ${workspace.activity.cyclePosition} · aula ${workspace.activity.lessonPosition}`}
      action={<StatusBadge tone={alreadyReviewed ? (workspace.review?.decision === "approved" ? "success" : "warning") : workspace.isLate ? "warning" : "neutral"}>{alreadyReviewed ? (workspace.review?.decision === "approved" ? "Aprovada" : "Correção solicitada") : workspace.isLate ? "Enviada com atraso" : "Aguardando revisão"}</StatusBadge>}
    />

    {notice && <div className={styles.workspaceNotice} data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "success" ? <CheckCircle2 aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}<span>{notice.message}</span></div>}

    <div className={styles.workspaceGrid}>
      <main className={styles.evidenceColumn}>
        <EvidenceSheet workspace={workspace} />
        <VersionHistory workspace={workspace} />
      </main>

      <aside className={styles.reviewColumn} aria-label="Painel de avaliação">
        <section className={styles.reviewPanel}>
          <header className={styles.reviewPanelHeader}>
            <div><span className={styles.eyebrow}>Rubrica da atividade</span><h2>{alreadyReviewed ? "Revisão publicada" : "Decida com evidências"}</h2><p>{alreadyReviewed ? "Esta versão está preservada. Consulte os critérios e o feedback enviados." : "Marque cada critério. Comentários são opcionais; a orientação geral só é obrigatória quando houver correção."}</p></div>
            <span className={styles.reviewCounter}>{alreadyReviewed ? workspace.review?.criteria.filter((criterion) => criterion.result === "met").length : Object.keys(results).length}<small>/{workspace.criteria.length}</small></span>
          </header>

          {alreadyReviewed && workspace.review ? <PublishedReview workspace={workspace} /> : <>
            <div className={styles.criteriaStack}>
              {workspace.criteria.map((criterion, index) => <article className={styles.criterionCard} key={criterion.id} data-result={results[criterion.id]}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><strong>{criterion.label}</strong></header>
                <p>{criterion.description}</p>
                <div className={styles.criterionChoice} role="group" aria-label={`Resultado: ${criterion.label}`}>
                  <button type="button" data-selected={results[criterion.id] === "met" || undefined} onClick={() => setResults((current) => ({ ...current, [criterion.id]: "met" }))}><Check aria-hidden="true" />Atendeu</button>
                  <button type="button" data-selected={results[criterion.id] === "needs_adjustment" || undefined} onClick={() => setResults((current) => ({ ...current, [criterion.id]: "needs_adjustment" }))}><RotateCcw aria-hidden="true" />Precisa ajustar</button>
                </div>
                <label className={styles.commentField}>
                  <span>{results[criterion.id] === "needs_adjustment" ? "Correção específica (opcional)" : "Sugestão de melhoria (opcional)"}</span>
                  <textarea value={comments[criterion.id] ?? ""} onChange={(event) => setComments((current) => ({ ...current, [criterion.id]: event.target.value }))} placeholder={results[criterion.id] === "needs_adjustment" ? "Ex.: mostre o estado de erro antes de reenviar." : "Ex.: na próxima versão, experimente…"} />
                </label>
              </article>)}
            </div>

            <label className={styles.feedbackField}>
              <span>Orientação para o aluno {hasAdjustment ? <b>obrigatória</b> : <small>opcional na aprovação</small>}</span>
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} aria-describedby="feedback-help" placeholder={hasAdjustment ? "Explique com clareza o que deve mudar e como o aluno saberá que concluiu a correção." : "Reconheça uma boa decisão ou deixe este campo vazio para aprovar sem observações."} />
              <small id="feedback-help">O aluno verá esta mensagem junto da rubrica e do histórico da versão.</small>
            </label>

            <footer className={styles.reviewActions}>
              <div className={styles.decisionSignal} data-decision={allAnswered ? decision : "pending"}>
                {allAnswered ? (hasAdjustment ? <RotateCcw aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />) : <MessageSquareText aria-hidden="true" />}
                <span><small>Decisão prevista</small><strong>{!allAnswered ? "Complete a rubrica" : hasAdjustment ? "Solicitar correção" : "Aprovar entrega"}</strong></span>
              </div>
              <div className={styles.actionGroup}>
                <button type="button" className={styles.approveQuietly} disabled={saving || !workspace.criteria.length} onClick={() => void publish({ approveAll: true })}><Sparkles aria-hidden="true" />{saving ? "Publicando…" : "Aprovar sem observações"}</button>
                <button type="button" className={styles.publishButton} disabled={saving || !canPublish} onClick={() => void publish()}>{saving ? "Publicando…" : hasAdjustment ? "Enviar correção" : "Publicar revisão"}<Send aria-hidden="true" /></button>
              </div>
            </footer>
          </>}
        </section>
      </aside>
    </div>
  </div>;
}

function EvidenceSheet({ workspace }: { workspace: AdminSubmissionWorkspace }) {
  const requirements = useMemo(() => new Map(workspace.requirements.map((requirement) => [requirement.id, requirement])), [workspace.requirements]);
  return <section className={styles.evidenceSheet}>
    <header className={styles.sheetHeader}>
      <div><span className={styles.eyebrow}>Folha de evidências · v{String(workspace.version).padStart(2, "0")}</span><h2>O que o aluno enviou</h2><p>Leia a entrega como um conjunto de decisões. Cada bloco corresponde a um requisito da atividade.</p></div>
      <FileText aria-hidden="true" />
    </header>
    <div className={styles.sheetBody}>
      {workspace.items.length ? workspace.items.map((item, index) => <EvidenceItem key={item.id} item={item} label={requirements.get(item.requirementId)?.label ?? `Evidência ${index + 1}`} index={index} />) : <div className={styles.inlineEmpty}><FileText aria-hidden="true" /><div><strong>Nenhum item legível nesta versão.</strong><span>Confira se os anexos ainda estão disponíveis.</span></div></div>}
    </div>
    <footer className={styles.sheetFooter}><UserRound aria-hidden="true" /><span><small>Autoria</small><strong>{workspace.student.displayName}</strong></span><span><small>Envio</small><strong>{workspace.submittedAt ? formatDate(workspace.submittedAt) : "Sem registro"}</strong></span></footer>
  </section>;
}

function EvidenceItem({ item, label, index }: { item: SubmissionItem; label: string; index: number }) {
  const Icon = item.kind === "github_repository" ? GitBranch : item.kind === "external_link" ? Link2 : FileText;
  const value = item.textValue ?? item.urlValue ?? item.fileName ?? "Arquivo anexado";
  const href = item.fileId ? `/api/files/${item.fileId}/download-url` : item.urlValue;
  return <article className={styles.evidenceItem}>
    <span className={styles.evidenceIndex}>{String(index + 1).padStart(2, "0")}</span>
    <div><span className={styles.evidenceLabel}><Icon aria-hidden="true" />{label}</span><p>{value}</p>{href && <a href={href} target={item.urlValue ? "_blank" : undefined} rel={item.urlValue ? "noreferrer" : undefined}>Abrir evidência<ArrowUpRight aria-hidden="true" /></a>}</div>
  </article>;
}

function VersionHistory({ workspace }: { workspace: AdminSubmissionWorkspace }) {
  const versions = [workspace, ...workspace.previousVersions].sort((a, b) => b.version - a.version);
  return <section className={styles.versionPanel}>
    <header><History aria-hidden="true" /><div><span className={styles.eyebrow}>Linha do tempo</span><h2>Versões preservadas</h2></div><strong>{versions.length}</strong></header>
    <ol>{versions.map((version, index) => <li key={version.id} data-current={index === 0 || undefined}><span>v{String(version.version).padStart(2, "0")}</span><div><strong>{index === 0 ? "Versão em análise" : version.review?.decision === "approved" ? "Versão aprovada" : version.review ? "Correção solicitada" : "Versão enviada"}</strong><small>{version.submittedAt ? formatDate(version.submittedAt) : "Rascunho"}</small></div>{version.review && <StatusBadge tone={version.review.decision === "approved" ? "success" : "warning"}>{version.review.decision === "approved" ? "Aprovada" : "Revisada"}</StatusBadge>}</li>)}</ol>
  </section>;
}

function PublishedReview({ workspace }: { workspace: AdminSubmissionWorkspace }) {
  const review = workspace.review;
  if (!review) return null;
  const resultById = new Map(review.criteria.map((criterion) => [criterion.criterionId, criterion]));
  return <div className={styles.publishedReview}>
    <div className={styles.publishedDecision} data-decision={review.decision}><CheckCircle2 aria-hidden="true" /><div><small>Decisão publicada</small><strong>{review.decision === "approved" ? "Entrega aprovada" : "Correção solicitada"}</strong><span>{formatDate(review.reviewedAt)} · {review.reviewerName}</span></div></div>
    <div className={styles.publishedCriteria}>{workspace.criteria.map((criterion) => { const result = resultById.get(criterion.id); return <article key={criterion.id}><span data-result={result?.result}>{result?.result === "met" ? <Check aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}</span><div><strong>{criterion.label}</strong><p>{result?.comment || "Sem comentário específico."}</p></div></article>; })}</div>
    <div className={styles.feedbackQuote}><MessageSquareText aria-hidden="true" /><div><small>Feedback enviado</small><p>{review.feedback || "Aprovada sem observações adicionais."}</p></div></div>
  </div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
