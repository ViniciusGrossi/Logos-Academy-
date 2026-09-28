"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Send, UserRound } from "lucide-react";
import { useState } from "react";
import type { AdminSubmissionWorkspace, CriterionReview } from "@/specs/api.contracts";
import { MagneticAction, PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import styles from "./admin-experience.module.css";

export function AdminReviewWorkspace({ submissionId }: { submissionId: string }) {
  const { data, error, loading, reload } = useLiveApi<AdminSubmissionWorkspace>(`/api/admin/submissions/${submissionId}`);
  const [feedback, setFeedback] = useState("");
  const [results, setResults] = useState<Record<string, CriterionReview["result"]>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (loading) return <StateScene state="loading" title="Abrindo workspace de revisão" description="Reunindo entrega, rubrica e histórico de versões." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  if (!data) return <StateScene state="empty" title="Entrega não encontrada" description="Ela pode ter sido removida ou pertencer a outro tenant." />;
  const workspace = data;

  const decision = Object.values(results).some((result) => result === "needs_adjustment") ? "revision_requested" : "approved";
  const canPublish = Boolean(feedback.trim()) && workspace.criteria.length > 0 && workspace.criteria.every((criterion) => results[criterion.id]);
  async function publish() {
    if (!canPublish) { setNotice("Avalie todos os critérios e registre um feedback antes de publicar."); return; }
    setSaving(true); setNotice(null);
    try {
      await apiMutation(`/api/admin/submissions/${workspace.id}/review`, "POST", { decision, feedback: feedback.trim(), criteria: workspace.criteria.map((criterion) => ({ criterionId: criterion.id, result: results[criterion.id], comment: undefined })) });
      setNotice("Feedback publicado e a fila foi atualizada."); await reload();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível publicar o feedback."); }
    finally { setSaving(false); }
  }

  return <div className={styles.stack}>
    <Link className={styles.backLink} href="/admin/revisoes"><ArrowLeft className={styles.icon} /> Voltar à fila de revisões</Link>
    <PageHeader eyebrow="Workspace de revisão" title={workspace.activity.title} description={`${workspace.student.displayName} · ${workspace.classSummary?.name ?? "Percurso individual"} · versão ${workspace.version}.`} marker={workspace.dueAt ? `prazo ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(workspace.dueAt))}` : "sem prazo"} action={<StatusBadge tone={workspace.isLate ? "warning" : "neutral"}>{workspace.isLate ? "Fora do prazo" : "No prazo"}</StatusBadge>} />
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.sectionGrid}>
      <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Entrega enviada</h2><p>Itens e anexos da versão atual. O download permanece autorizado somente para admins do mesmo tenant.</p></div><FileText aria-hidden="true" /></div><div className={styles.paperBody}>{workspace.items.length ? workspace.items.map((item) => <div className={styles.notice} key={item.id}><strong>{item.fileName ?? item.kind}</strong><p>{item.textValue ?? item.urlValue ?? "Arquivo anexado"}</p>{item.fileId && <a className={styles.secondaryAction} href={`/api/files/${item.fileId}/download-url`}>Baixar anexo</a>}</div>) : <p className={styles.emptyInline}>Esta versão não contém itens legíveis.</p>}</div></section>
      <aside className={styles.paper}><div className={styles.paperHeader}><div><h2>Contexto</h2><p>Quem construiu e onde esta entrega se encaixa.</p></div><UserRound aria-hidden="true" /></div><div className={styles.paperBody}><div className={styles.factGrid}><div className={styles.fact}><span>Aluno</span><strong>{workspace.student.displayName}</strong></div><div className={styles.fact}><span>Etapa</span><strong>Ciclo {workspace.activity.cyclePosition} · aula {workspace.activity.lessonPosition}</strong></div><div className={styles.fact}><span>Versões anteriores</span><strong>{workspace.previousVersions.length}</strong></div><div className={styles.fact}><span>Revisões</span><strong>{workspace.reviews.length}</strong></div></div></div></aside>
    </div>
    <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Rubrica e feedback</h2><p>A decisão é derivada dos critérios: qualquer ajuste pendente solicita nova versão.</p></div><Send aria-hidden="true" /></div><div className={styles.paperBody}><div className={styles.choiceList}>{workspace.criteria.map((criterion) => <div className={styles.choice} key={criterion.id}><span className={styles.rowCopy}><strong>{criterion.label}</strong><small>{criterion.description}</small></span><div className={styles.formActions}><button type="button" className={results[criterion.id] === "met" ? styles.toolbarAction : styles.secondaryAction} onClick={() => setResults((current) => ({ ...current, [criterion.id]: "met" }))}>Atendeu</button><button type="button" className={results[criterion.id] === "needs_adjustment" ? styles.toolbarAction : styles.secondaryAction} onClick={() => setResults((current) => ({ ...current, [criterion.id]: "needs_adjustment" }))}>Ajustar</button></div></div>)}</div><label className={styles.formField}><span className={styles.label}>Feedback para o aluno</span><textarea className={styles.textarea} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Reconheça a decisão e indique o próximo passo." /></label><div className={styles.formActions}><StatusBadge tone={decision === "approved" ? "success" : "warning"}>{decision === "approved" ? "Aprovação prevista" : "Ajustes previstos"}</StatusBadge><MagneticAction><button className={styles.toolbarAction} disabled={!canPublish || saving} onClick={() => void publish()}>{saving ? "Publicando…" : "Publicar feedback"}</button></MagneticAction></div></div></section>
  </div>;
}
