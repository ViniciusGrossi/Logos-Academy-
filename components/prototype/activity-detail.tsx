"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  Lightbulb,
  Link2,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react";
import type {
  ActivityCriterion,
  ActivityDetail as ActivityDto,
  ActivityRequirement,
  AssignmentStatus,
  ReviewDetail,
  StudentHome,
  SubmissionDetail,
  SubmissionItem,
  SubmissionItemInput,
  UploadedFile,
} from "@/specs/api.contracts";
import { isDemoMode } from "@/src/mocks/demo-api";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiMutation, apiQuery, useLiveApi } from "./live-api";
import { EmptyState, ErrorState, LoadingState } from "./state-lab";
import styles from "./activity-detail.module.css";

type RequirementValue = { value: string; fileId?: string; filename?: string };
type Notice = { tone: "success" | "error"; text: string };

const statusCopy: Record<AssignmentStatus, { label: string; note: string }> = {
  locked: {
    label: "Bloqueada",
    note: "Conclua a etapa atual para liberar esta atividade.",
  },
  available: {
    label: "Disponível",
    note: "A mesa está pronta para a sua primeira versão.",
  },
  draft: {
    label: "Rascunho",
    note: "Sua versão está salva e continua editável.",
  },
  submitted: {
    label: "Em revisão",
    note: "A versão foi enviada e aguarda a leitura do orientador.",
  },
  revision_requested: {
    label: "Ajustes pedidos",
    note: "Use o feedback para construir uma versão mais precisa.",
  },
  approved: {
    label: "Aprovada",
    note: "Esta evidência já faz parte do seu projeto.",
  },
};

export function ActivityDetail() {
  const search = useSearchParams();
  const requestedAssignmentId = search.get("assignmentId");
  const home = useLiveApi<StudentHome>(
    requestedAssignmentId ? null : "/api/student/home",
  );
  const currentAssignmentId =
    home.data && "assignmentId" in home.data.primaryAction
      ? home.data.primaryAction.assignmentId
      : null;
  const assignmentId = requestedAssignmentId ?? currentAssignmentId;
  const detail = useLiveApi<ActivityDto>(
    assignmentId ? `/api/student/activities/${assignmentId}` : null,
  );
  const [values, setValues] = useState<Record<string, RequirementValue>>({});
  const [message, setMessage] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [olderHistory, setOlderHistory] = useState<readonly SubmissionDetail[]>(
    [],
  );
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSection, setActiveSection] = useState("construcao");
  const [orientationOpen, setOrientationOpen] = useState(false);
  const hydratedAssignment = useRef<string | null>(null);
  const savedValuesKey = useRef("");
  const sectionLock = useRef<string | null>(null);

  const initialHistory = historyItems(detail.data?.submissionHistory);
  const historyKey = initialHistory
    .map((submission) => submission.id)
    .join(",");
  const history = useMemo(
    () =>
      [...initialHistory, ...olderHistory]
        .filter(
          (submission, index, entries) =>
            entries.findIndex((candidate) => candidate.id === submission.id) ===
            index,
        )
        .sort((left, right) => right.version - left.version),
    [initialHistory, olderHistory],
  );
  const reviewedSubmission = useMemo(
    () => latestReviewedSubmission(history),
    [history],
  );
  const latestReview =
    latestSubmissionReview(reviewedSubmission) ??
    latestSubmissionReview(detail.data?.latestSubmission) ??
    detail.data?.latestReview ??
    null;

  useEffect(() => {
    if (!detail.data || hydratedAssignment.current === detail.data.assignmentId)
      return;
    const source = restorationSource(detail.data, reviewedSubmission);
    const restoredValues = valuesFromItems(source?.items ?? []);
    setValues(restoredValues);
    savedValuesKey.current = stableValuesKey(restoredValues);
    setMessage(null);
    hydratedAssignment.current = detail.data.assignmentId;
  }, [detail.data, reviewedSubmission]);

  useEffect(() => {
    setOlderHistory([]);
    setHistoryCursor(detail.data?.submissionHistory.nextCursor ?? null);
  }, [
    detail.data?.assignmentId,
    detail.data?.submissionHistory.nextCursor,
    historyKey,
  ]);

  useEffect(() => {
    if (!latestReview || latestReview.seenAt) return;
    void apiMutation(
      `/api/student/reviews/${latestReview.id}/seen`,
      "POST",
      {},
    ).catch(() => undefined);
  }, [latestReview]);

  useEffect(() => {
    if (!detail.data) return;
    const sections = ["orientacao", "construcao", "qualidade", "historico"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        if (sectionLock.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -62%", threshold: [0, 0.25, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [detail.data]);

  const draftItems = useMemo<SubmissionItemInput[]>(() => {
    const items: SubmissionItemInput[] = [];
    for (const requirement of detail.data?.requirements ?? []) {
      const entry = values[requirement.id];
      if (requirement.kind === "file") {
        if (entry?.fileId)
          items.push({
            requirementId: requirement.id,
            kind: "file",
            fileId: entry.fileId,
          });
        continue;
      }
      const value = entry?.value.trim();
      if (!value) continue;
      items.push(
        requirement.kind === "text"
          ? { requirementId: requirement.id, kind: "text", textValue: value }
          : {
              requirementId: requirement.id,
              kind: requirement.kind,
              urlValue: value,
            },
      );
    }
    return items;
  }, [detail.data, values]);
  const valuesKey = stableValuesKey(values);
  const hasUnsavedChanges =
    hydratedAssignment.current === detail.data?.assignmentId &&
    valuesKey !== savedValuesKey.current;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  if ((home.loading && !requestedAssignmentId) || detail.loading)
    return <LoadingState layout="activity" />;
  if (!requestedAssignmentId && home.error)
    return <ErrorState layout="activity" retry={home.reload} message={home.error.message} />;
  if (detail.error)
    return <ErrorState layout="activity" retry={detail.reload} message={detail.error.message} />;
  if (!assignmentId || !detail.data)
    return <EmptyState layout="activity" scope="atividade disponível" />;

  const activity = detail.data;
  const project = activity.project;
  const isLocked = activity.status === "locked";
  const isReadOnly = !activity.canEdit;
  const activeProjectActivity = project?.activities.find((item) =>
    ["available", "draft", "revision_requested"].includes(item.status),
  );
  const version = activity.latestSubmission?.version ?? 1;
  const missing = activity.requirements.filter(
    (requirement) =>
      requirement.required &&
      !draftItems.some((item) => item.requirementId === requirement.id),
  );
  const criterionResults = new Map(
    latestReview?.criteria.map((item) => [item.criterionId, item]),
  );
  const requiredRequirements = activity.requirements.filter(
    (requirement) => requirement.required,
  );
  const requiredCompleted = requiredRequirements.filter((requirement) =>
    draftItems.some((item) => item.requirementId === requirement.id),
  ).length;

  async function save(submit: boolean) {
    if (submit && missing.length > 0) {
      setMessage({
        tone: "error",
        text: `Complete antes de enviar: ${missing.map((item) => item.label).join(", ")}.`,
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    const persistedValuesKey = valuesKey;
    try {
      const draft = await apiMutation<{ id: string; version?: number }>(
        `/api/student/activities/${activity.assignmentId}/draft`,
        "PUT",
        { items: draftItems },
      );
      if (submit)
        await apiMutation(
          `/api/student/activities/${activity.assignmentId}/submit`,
          "POST",
          { expectedDraftId: draft.id },
        );
      await detail.reload();
      savedValuesKey.current = persistedValuesKey;
      const savedAt = formatTime(new Date());
      setMessage({
        tone: "success",
        text: submit
          ? `Versão ${String(draft.version ?? version).padStart(2, "0")} enviada para revisão.`
          : `Rascunho v${String(draft.version ?? version).padStart(2, "0")} salvo às ${savedAt}.`,
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error ? cause.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function upload(
    requirement: ActivityRequirement,
    file: File | undefined,
  ) {
    if (!file) return;
    setUploadingId(requirement.id);
    setMessage(null);
    try {
      const prepared = await apiMutation<{
        file: UploadedFile;
        signedUploadUrl: string;
      }>("/api/files/upload-url", "POST", {
        assignmentId: activity.assignmentId,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!isDemoMode()) {
        const response = await fetch(prepared.signedUploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Não foi possível enviar o arquivo.");
      }
      const finalized = await apiMutation<UploadedFile>(
        `/api/files/${prepared.file.id}/finalize`,
        "POST",
        {},
      );
      setValues((current) => ({
        ...current,
        [requirement.id]: {
          value: "",
          fileId: finalized.id,
          filename: file.name,
        },
      }));
      setMessage({
        tone: "success",
        text: `${file.name} está pronto para entrar nesta versão.`,
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "Não foi possível anexar o arquivo.",
      });
    } finally {
      setUploadingId(null);
    }
  }

  async function openFileById(fileId: string) {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const result = await apiQuery<{ signedDownloadUrl: string }>(
        `/api/files/${fileId}/download-url`,
      );
      if (tab) tab.location.href = result.signedDownloadUrl;
      else window.location.assign(result.signedDownloadUrl);
    } catch (cause) {
      tab?.close();
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "Não foi possível abrir o arquivo.",
      });
    }
  }

  async function openFile(item: SubmissionItem) {
    if (item.fileId) await openFileById(item.fileId);
  }

  async function loadOlderHistory() {
    if (!historyCursor || loadingHistory) return;
    setLoadingHistory(true);
    try {
      const page = await apiQuery<ActivityDto>(
        `/api/student/activities/${activity.assignmentId}?cursor=${encodeURIComponent(historyCursor)}`,
      );
      setOlderHistory((current) => [
        ...current,
        ...historyItems(page.submissionHistory),
      ]);
      setHistoryCursor(page.submissionHistory.nextCursor);
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar versões anteriores.",
      });
    } finally {
      setLoadingHistory(false);
    }
  }

  const completion = requiredRequirements.length
    ? Math.round((requiredCompleted / requiredRequirements.length) * 100)
    : 100;
  function activateSection(section: string) {
    sectionLock.current = section;
    setActiveSection(section);
    window.setTimeout(() => {
      sectionLock.current = null;
    }, 700);
  }
  function protectNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Você tem alterações não salvas. Deseja sair e descartar essas mudanças?",
      )
    )
      event.preventDefault();
  }

  return (
    <div className={styles.workbench}>
      <Link
        href={project ? `/projetos/${project.id}` : "/projetos"}
        className={styles.back}
        onClick={protectNavigation}
      >
        <ArrowLeft />
        Voltar ao projeto
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroMeta}>
            {project
              ? `Ciclo ${String(project.cyclePosition).padStart(2, "0")} · ${project.title}`
              : "Mesa de construção"}
          </span>
          <h1>{activity.title}</h1>
          <p>{activity.objective}</p>
          <div className={styles.heroTelemetry}>
            <span>v{String(version).padStart(2, "0")}</span>
            <span>{statusCopy[activity.status].label}</span>
          </div>
        </div>
        <div
          className={styles.energyCore}
          data-status={activity.status}
          aria-label={`Atividade ${activity.lessonPosition}`}
        >
          <i />
          <i />
          <i />
          <span>{String(activity.lessonPosition).padStart(2, "0")}</span>
          <small>Atividade</small>
        </div>
      </header>

      {project && (
        <ol className={styles.projectRoute} aria-label="Percurso do projeto">
          {project.activities.map((item, index) => {
            const current = item.assignmentId === activity.assignmentId;
            const locked = item.status === "locked";
            const content = (
              <>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <small>
                  {statusCopy[item.status].label}
                  {item.latestVersion
                    ? ` · v${String(item.latestVersion).padStart(2, "0")}`
                    : ""}
                </small>
              </>
            );
            return (
              <li
                key={item.assignmentId}
                data-current={current}
                data-status={item.status}
                aria-current={current ? "step" : undefined}
              >
                {locked || current ? (
                  <div>
                    {content}
                    {locked && <LockKeyhole aria-label="Bloqueada" />}
                  </div>
                ) : (
                  <Link
                    href={`/atividade?assignmentId=${item.assignmentId}`}
                    onClick={protectNavigation}
                  >
                    {content}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.metaStrip}>
        <span>
          <Clock3 />
          {activity.estimatedMinutes} minutos
        </span>
        <span data-status={activity.status}>
          {statusCopy[activity.status].label}
        </span>
        <span>Versão {String(version).padStart(2, "0")}</span>
        <span data-overdue={activity.isOverdue}>
          {activity.isOverdue ? (
            <>
              <AlertTriangle />
              Prazo ultrapassado
            </>
          ) : activity.dueAt ? (
            `Até ${formatDate(activity.dueAt)}`
          ) : (
            "Sem prazo definido"
          )}
        </span>
      </div>

      {latestReview && (
        <FeedbackPanel review={latestReview} criteria={activity.criteria} />
      )}

      <nav className={styles.sectionNav} aria-label="Seções da atividade">
        <a
          href="#construcao"
          onClick={() => activateSection("construcao")}
          aria-current={activeSection === "construcao" ? "location" : undefined}
        >
          Construção
        </a>
        <a
          href="#orientacao"
          onClick={() => {
            setOrientationOpen(true);
            activateSection("orientacao");
          }}
          aria-current={activeSection === "orientacao" ? "location" : undefined}
        >
          Orientação
        </a>
        <a
          href="#qualidade"
          onClick={() => activateSection("qualidade")}
          aria-current={activeSection === "qualidade" ? "location" : undefined}
        >
          Qualidade
        </a>
        <a
          href="#historico"
          onClick={() => activateSection("historico")}
          aria-current={activeSection === "historico" ? "location" : undefined}
        >
          Histórico
        </a>
      </nav>

      <div className={styles.mainColumn}>
        <details
          id="orientacao"
          className={styles.brief}
          open={orientationOpen}
          onToggle={(event) => setOrientationOpen(event.currentTarget.open)}
        >
          <summary className={styles.briefSummary}>
            <span>
              <strong>Orientação completa</strong>
              <small>{activity.instructions}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className={styles.briefLead}>
            <span className={styles.eyebrow}>Por que isso importa</span>
            <p>{activity.context ?? activity.objective}</p>
          </div>
          <div className={styles.missionBrief}>
            <span className={styles.eyebrow}>Sua missão</span>
            <h2>{activity.instructions}</h2>
            {activity.supplementalInstructions && (
              <p>{activity.supplementalInstructions}</p>
            )}
          </div>
          <div className={styles.expectedResult} tabIndex={0}>
            <span className={styles.readyCore}>
              <PackageCheck aria-hidden="true" />
            </span>
            <div>
              <span className={styles.eyebrow}>Pronto significa</span>
              <p>
                {activity.expectedResult ??
                  "Todos os entregáveis obrigatórios registrados e explicados."}
              </p>
              <small>
                Use este resultado para conferir sua versão antes do envio.
              </small>
            </div>
          </div>
          {activity.steps.length > 0 && (
            <div className={styles.processBlock}>
              <div className={styles.processHeading}>
                <span>Rota de construção</span>
                <small>Siga a sequência, volte quando precisar</small>
              </div>
              <ol className={styles.steps} aria-label="Passos da atividade">
                {activity.steps.map((step) => (
                  <li
                    key={step.position}
                    style={{ "--step-index": step.position } as CSSProperties}
                  >
                    <span>
                      <i />
                      {String(step.position).padStart(2, "0")}
                    </span>
                    <p>{step.label}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className={styles.supportDeck}>
            {activity.toolHint && (
              <SupportDetail
                icon={<Wrench />}
                label="Ferramentas sugeridas"
                text={activity.toolHint}
              />
            )}
            {activity.planB && (
              <SupportDetail
                icon={<Lightbulb />}
                label="Se a ferramenta falhar"
                text={activity.planB}
              />
            )}
            {activity.portfolioEvidence && (
              <SupportDetail
                icon={<PackageCheck />}
                label="Evidência para o projeto"
                text={activity.portfolioEvidence}
              />
            )}
            {activity.reflectionPrompt && (
              <SupportDetail
                icon={<Sparkles />}
                label="Pergunta de fechamento"
                text={activity.reflectionPrompt}
              />
            )}
          </div>
          <footer>
            <ArrowRight />
            <span>
              <strong>Depois desta atividade</strong>
              {activity.continuityGuidance}
            </span>
          </footer>
        </details>

        {isLocked ? (
          <section id="construcao" className={styles.statePanel}>
            <LockKeyhole />
            <div>
              <span className={styles.eyebrow}>Próxima etapa</span>
              <h2>Esta mesa ainda está fechada.</h2>
              <p>{statusCopy.locked.note}</p>
            </div>
            {activeProjectActivity && (
              <Link
                href={`/atividade?assignmentId=${activeProjectActivity.assignmentId}`}
                className={styles.secondaryAction}
                onClick={protectNavigation}
              >
                Voltar à atividade atual <ArrowRight />
              </Link>
            )}
          </section>
        ) : isReadOnly ? (
          <section id="construcao" className={styles.statePanel}>
            <CheckCircle2 />
            <div>
              <span className={styles.eyebrow}>
                {activity.readOnlyReason === "inactive_enrollment"
                  ? "Mesa em consulta"
                  : activity.status === "approved"
                    ? "Evidência aprovada"
                    : "Versão enviada"}
              </span>
              <h2>
                {activity.readOnlyReason === "inactive_enrollment"
                  ? "Seu percurso não está ativo para novas edições."
                  : statusCopy[activity.status].note}
              </h2>
              <p>
                {activity.readOnlyReason === "inactive_enrollment"
                  ? "Você ainda pode consultar a orientação, os critérios e todo o histórico preservado."
                  : "Abra o histórico para consultar exatamente o que foi enviado e o retorno recebido."}
              </p>
            </div>
            {activity.status === "approved" && project && (
              <Link
                href={`/projetos/${project.id}`}
                className={styles.secondaryAction}
                onClick={protectNavigation}
              >
                Ver no projeto <ArrowRight />
              </Link>
            )}
          </section>
        ) : (
          <form
            id="construcao"
            className={styles.versionDesk}
            style={{ "--completion": `${completion}%` } as CSSProperties}
            aria-busy={saving || Boolean(uploadingId)}
            onSubmit={(event) => {
              event.preventDefault();
              void save(true);
            }}
            onInvalidCapture={(event) => {
              event.preventDefault();
              const invalid = event.target as
                HTMLInputElement | HTMLTextAreaElement;
              requestAnimationFrame(() => invalid.focus());
              setMessage({
                tone: "error",
                text: missing.length
                  ? `Complete antes de enviar: ${missing.map((item) => item.label).join(", ")}.`
                  : "Revise os campos indicados antes de enviar.",
              });
            }}
          >
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  {activity.status === "revision_requested"
                    ? "Nova iteração"
                    : "Mesa de versão"}
                </span>
                <h2>Construa a versão {String(version).padStart(2, "0")}</h2>
              </div>
              <div className={styles.iterationGauge}>
                <span>{completion}%</span>
                <small>
                  {requiredCompleted}/{requiredRequirements.length} obrigatórios
                </small>
              </div>
            </div>
            {activity.status === "revision_requested" && (
              <p className={styles.revisionHint}>
                <RotateCcw />A versão anterior foi trazida para cá. Ajuste
                somente o que o feedback pede e registre o que mudou.
              </p>
            )}
            <div
              className={styles.iterationConsole}
              aria-label="Preparação da nova versão"
            >
              <div>
                <span>01</span>
                <strong>
                  {activity.status === "revision_requested"
                    ? "Leia o retorno"
                    : "Entenda o objetivo"}
                </strong>
                <small>
                  {activity.status === "revision_requested"
                    ? "Use o feedback como alvo da versão."
                    : "Confira o resultado esperado antes de começar."}
                </small>
              </div>
              <div>
                <span>02</span>
                <strong>Registre a decisão</strong>
                <small>
                  {activity.status === "revision_requested"
                    ? "Explique o que mudou e por quê."
                    : "Explique a escolha que orientou sua construção."}
                </small>
              </div>
              <div>
                <span>03</span>
                <strong>Anexe a prova</strong>
                <small>Inclua o artefato que comprova a melhoria.</small>
              </div>
              <div className={styles.completionTrack}>
                <Progress
                  className={styles.completionProgress}
                  value={completion}
                  aria-label={`${requiredCompleted} de ${requiredRequirements.length} requisitos obrigatórios preenchidos`}
                />
                <span>
                  {missing.length
                    ? `${missing.length} pendência${missing.length > 1 ? "s" : ""}`
                    : "Obrigatórios preenchidos"}
                </span>
              </div>
            </div>
            <div className={styles.requirements}>
              {activity.requirements.map((requirement) => (
                <RequirementField
                  key={requirement.id}
                  requirement={requirement}
                  entry={values[requirement.id]}
                  uploading={uploadingId === requirement.id}
                  disabled={saving || Boolean(uploadingId)}
                  onChange={(entry) =>
                    setValues((current) => ({
                      ...current,
                      [requirement.id]: entry,
                    }))
                  }
                  onUpload={(file) => void upload(requirement, file)}
                  onOpenFile={(fileId) => void openFileById(fileId)}
                  onRemove={() =>
                    setValues((current) => ({
                      ...current,
                      [requirement.id]: { value: "" },
                    }))
                  }
                />
              ))}
            </div>
            <div className={styles.actions}>
              <p>
                <span data-dirty={hasUnsavedChanges} />
                {saving
                  ? "Salvando esta versão…"
                  : hasUnsavedChanges
                    ? "Alterações não salvas"
                    : "Rascunho salvo e privado"}
              </p>
              <button
                type="button"
                className={styles.secondaryAction}
                disabled={saving || Boolean(uploadingId)}
                onClick={() => void save(false)}
              >
                Salvar rascunho
              </button>
              <button
                type="submit"
                className={styles.primaryAction}
                aria-busy={saving}
                disabled={saving || Boolean(uploadingId)}
              >
                {saving
                  ? "Salvando…"
                  : activity.status === "revision_requested"
                    ? "Enviar nova versão"
                    : "Enviar versão"}
                <Send aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {message && (
          <p className={styles.message} data-tone={message.tone} role="status">
            {message.tone === "success" ? <Check /> : <AlertTriangle />}
            {message.text}
          </p>
        )}

        <section id="qualidade" className={styles.qualitySection}>
          <div className={styles.qualityIntro}>
            <span className={styles.eyebrow}>Qualidade antes do envio</span>
            <h2>Confira o que a versão precisa provar.</h2>
            <p>{statusCopy[activity.status].note}</p>
            <div className={styles.concepts}>
              {activity.concepts.map((concept) => (
                <Link
                  key={concept.id}
                  href={`/atlas?tab=conceitos&item=${concept.id}`}
                  onClick={protectNavigation}
                >
                  <GitBranch />
                  {concept.title}
                </Link>
              ))}
            </div>
          </div>
          <ol className={styles.criteriaList}>
            {activity.criteria.map((criterion, index) => {
              const result = criterionResults.get(criterion.id);
              return (
                <li key={criterion.id} data-result={result?.result}>
                  <span>
                    {result ? (
                      result.result === "met" ? (
                        <Check />
                      ) : (
                        <AlertTriangle />
                      )
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <strong>{criterion.label}</strong>
                    <p>{criterion.description}</p>
                    {result?.comment && <small>{result.comment}</small>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="historico" className={styles.history}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Histórico verificável</span>
              <h2>A evolução fica visível, versão por versão.</h2>
            </div>
            <div className={styles.historyCount}>
              <span>{history.length}</span>
              <small>registros</small>
            </div>
          </div>
          {history.length ? (
            <div className={styles.historyList}>
              {history.map((submission) => (
                <HistoryVersion
                  key={submission.id}
                  submission={submission}
                  requirements={activity.requirements}
                  criteria={activity.criteria}
                  onOpenFile={openFile}
                />
              ))}
            </div>
          ) : (
            <div className={styles.historyEmpty}>
              <PackageCheck />
              <div>
                <strong>A primeira versão começa aqui.</strong>
                <p>
                  Quando você enviar, decisões, evidências e feedbacks ficarão
                  preservados nesta linha do tempo.
                </p>
              </div>
            </div>
          )}
          {historyCursor && (
            <button
              type="button"
              className={styles.historyMore}
              disabled={loadingHistory}
              onClick={() => void loadOlderHistory()}
            >
              {loadingHistory
                ? "Carregando versões…"
                : "Carregar versões anteriores"}
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function FeedbackPanel({
  review,
  criteria,
}: {
  review: ReviewDetail;
  criteria: readonly ActivityCriterion[];
}) {
  const isApproved = review.decision === "approved";
  return (
    <section
      className={styles.feedback}
      data-decision={review.decision}
      aria-labelledby="feedback-title"
    >
      <div className={styles.feedbackMark}>
        <i aria-hidden="true" />
        {isApproved ? <CheckCircle2 /> : <MessageSquareText />}
        <span>{isApproved ? "Versão aprovada" : "Feedback recebido"}</span>
      </div>
      <div className={styles.feedbackBody}>
        <span className={styles.eyebrow}>
          {isApproved
            ? "O que ficou comprovado"
            : "Ajuste que move esta versão"}
        </span>
        <h2 id="feedback-title">{review.feedback}</h2>
        <p>
          Revisado por <strong>{review.reviewerName}</strong> em{" "}
          {formatDate(review.reviewedAt)}.
        </p>
        <div className={styles.feedbackCriteria}>
          {review.criteria.map((item) => {
            const criterion = criteria.find(
              (candidate) => candidate.id === item.criterionId,
            );
            return (
              <span key={item.criterionId} data-result={item.result}>
                {item.result === "met" ? <Check /> : <AlertTriangle />}
                {criterion?.label ?? "Critério revisado"}
              </span>
            );
          })}
        </div>
      </div>
      {isApproved ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <RotateCcw aria-hidden="true" />
      )}
    </section>
  );
}

function SupportDetail({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className={styles.supportDisclosure} data-open={open}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
        <span>
          <small>Apoio de oficina</small>
          <strong>{label}</strong>
        </span>
        <ChevronDown />
      </button>
      <div className={styles.supportPanel}>
        <div>
          <p>{text}</p>
        </div>
      </div>
    </article>
  );
}

function RequirementField({
  requirement,
  entry,
  uploading,
  disabled,
  onChange,
  onUpload,
  onOpenFile,
  onRemove,
}: {
  requirement: ActivityRequirement;
  entry: RequirementValue | undefined;
  uploading: boolean;
  disabled: boolean;
  onChange: (entry: RequirementValue) => void;
  onUpload: (file: File | undefined) => void;
  onOpenFile: (fileId: string) => void;
  onRemove: () => void;
}) {
  const label = `${requirement.label}${requirement.required ? " *" : " · opcional"}`;
  const fieldId = `requirement-${requirement.id}`;
  const helperId = `${fieldId}-helper`;
  const invalid =
    requirement.required &&
    (requirement.kind === "file" ? !entry?.fileId : !entry?.value.trim());
  if (requirement.kind === "file")
    return (
      <div className={styles.fileFieldShell}>
        <label
          className={styles.fileField}
          data-attached={Boolean(entry?.fileId)}
        >
          <span>
            {entry?.fileId ? <Check /> : <Paperclip />}
            {label}
          </span>
          <strong aria-live="polite">
            {uploading
              ? "Enviando arquivo…"
              : (entry?.filename ?? "Selecione a evidência do seu processo")}
          </strong>
          <small id={helperId}>
            PDF, imagem, texto, documento ou apresentação · até 20 MB
          </small>
          <input
            id={fieldId}
            type="file"
            required={requirement.required && !entry?.fileId}
            aria-invalid={invalid}
            aria-describedby={helperId}
            disabled={disabled}
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.docx,.pptx"
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
        </label>
        {entry?.fileId && (
          <div className={styles.fileActions}>
            <button
              type="button"
              className={styles.fileRemove}
              disabled={disabled}
              onClick={onRemove}
            >
              Remover do rascunho
            </button>
            <button
              type="button"
              className={styles.fileOpen}
              onClick={() => onOpenFile(entry.fileId!)}
            >
              Abrir arquivo anexado <ExternalLink aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  const isText = requirement.kind === "text";
  const Icon = isText ? FileText : Link2;
  return (
    <label className={styles.field}>
      <span>
        <Icon />
        {label}
      </span>
      {isText ? (
        <Textarea
          id={fieldId}
          value={entry?.value ?? ""}
          onChange={(event) => onChange({ value: event.target.value })}
          placeholder="Explique a escolha, o teste e o que mudou."
          maxLength={10_000}
          disabled={disabled}
          required={requirement.required}
          aria-invalid={invalid}
          aria-describedby={helperId}
        />
      ) : (
        <Input
          id={fieldId}
          type="url"
          value={entry?.value ?? ""}
          onChange={(event) => onChange({ value: event.target.value })}
          placeholder={
            requirement.kind === "github_repository"
              ? "https://github.com/usuario/repositorio"
              : "https://..."
          }
          pattern={
            requirement.kind === "github_repository"
              ? "https://github\\.com/.*"
              : "https://.*"
          }
          title={
            requirement.kind === "github_repository"
              ? "Use uma URL HTTPS de github.com."
              : "Use uma URL que comece com https://."
          }
          maxLength={2_000}
          disabled={disabled}
          required={requirement.required}
          aria-invalid={invalid}
          aria-describedby={helperId}
        />
      )}
      <small id={helperId}>
        {isText
          ? "Registre uma decisão que você consiga explicar."
          : requirement.kind === "github_repository"
            ? "Use a URL HTTPS do repositório."
            : "Use uma URL HTTPS acessível ao orientador."}
      </small>
    </label>
  );
}

function HistoryVersion({
  submission,
  requirements,
  criteria,
  onOpenFile,
}: {
  submission: SubmissionDetail;
  requirements: readonly ActivityRequirement[];
  criteria: readonly ActivityCriterion[];
  onOpenFile: (item: SubmissionItem) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const reviews = submissionReviews(submission);
  const latestReview = latestSubmissionReview(submission);
  const state =
    latestReview?.decision === "approved"
      ? "Aprovada"
      : latestReview
        ? "Revisão recebida"
        : "Enviada";
  return (
    <article
      className={styles.historyVersion}
      data-open={open}
      data-state={latestReview?.decision ?? "submitted"}
    >
      <button
        type="button"
        className={styles.historyTrigger}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>v{String(submission.version).padStart(2, "0")}</span>
        <div>
          <strong>{state}</strong>
          <small>
            {submission.submittedAt
              ? formatDateTime(submission.submittedAt)
              : "Rascunho"}{" "}
            · {submission.items.length} evidências
          </small>
        </div>
        <span className={styles.historySignal}>
          <i />
          Ver versão
        </span>
        <ChevronDown />
      </button>
      <div className={styles.historyPanel}>
        <div className={styles.versionContents}>
          <div className={styles.evidenceList}>
            {submission.items.map((item) => {
              const requirement = requirements.find(
                (candidate) => candidate.id === item.requirementId,
              );
              return (
                <article key={item.id}>
                  <CircleDot />
                  <div>
                    <strong>{requirement?.label ?? "Evidência"}</strong>
                    {item.textValue && <p>{item.textValue}</p>}
                    {item.urlValue && (
                      <a href={item.urlValue} target="_blank" rel="noreferrer">
                        Abrir link <ExternalLink />
                      </a>
                    )}
                    {item.fileId && (
                      <button
                        type="button"
                        onClick={() => void onOpenFile(item)}
                      >
                        Abrir {item.fileName ?? "arquivo"}
                        <ExternalLink />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {reviews.length > 0 && (
            <div className={styles.versionReviews}>
              {reviews.map((review, index) => (
                <div className={styles.versionReview} key={review.id}>
                  <span className={styles.eyebrow}>
                    Retorno {String(index + 1).padStart(2, "0")} ·{" "}
                    {review.reviewerName}
                  </span>
                  <p>{review.feedback}</p>
                  <ul>
                    {review.criteria.map((item) => (
                      <li
                        key={`${review.id}-${item.criterionId}`}
                        data-result={item.result}
                      >
                        <span>
                          {item.result === "met" ? (
                            <Check />
                          ) : (
                            <AlertTriangle />
                          )}
                        </span>
                        <div>
                          <strong>
                            {criteria.find(
                              (criterion) => criterion.id === item.criterionId,
                            )?.label ?? "Critério"}
                          </strong>
                          {item.comment && <p>{item.comment}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function latestReviewedSubmission(
  history: readonly SubmissionDetail[],
): SubmissionDetail | null {
  return history.reduce<SubmissionDetail | null>(
    (latest, submission) =>
      !latestSubmissionReview(submission) ||
      (latest && latest.version > submission.version)
        ? latest
        : submission,
    null,
  );
}

export function submissionReviews(
  submission: SubmissionDetail,
): readonly ReviewDetail[] {
  return submission.reviews.length
    ? [...submission.reviews].sort((a, b) =>
        a.reviewedAt.localeCompare(b.reviewedAt),
      )
    : submission.review
      ? [submission.review]
      : [];
}

export function latestSubmissionReview(
  submission: SubmissionDetail | null | undefined,
): ReviewDetail | null {
  return submission ? (submissionReviews(submission).at(-1) ?? null) : null;
}

export function restorationSource(
  activity: ActivityDto,
  reviewed: SubmissionDetail | null,
): SubmissionDetail | null {
  if (activity.latestSubmission?.items.length) return activity.latestSubmission;
  if (activity.latestSubmission?.isDraft && reviewed) return reviewed;
  return (
    activity.latestSubmission ??
    historyItems(activity.submissionHistory)[0] ??
    null
  );
}

function historyItems(
  history: ActivityDto["submissionHistory"] | undefined,
): readonly SubmissionDetail[] {
  return history?.items ?? [];
}

function valuesFromItems(
  items: readonly SubmissionItem[],
): Record<string, RequirementValue> {
  return Object.fromEntries(
    items.map((item) => [
      item.requirementId,
      {
        value: item.textValue ?? item.urlValue ?? "",
        fileId: item.fileId,
        filename: item.fileName ?? undefined,
      },
    ]),
  );
}

function stableValuesKey(values: Record<string, RequirementValue>): string {
  return JSON.stringify(
    Object.entries(values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, value]) => [id, value.value, value.fileId, value.filename]),
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
