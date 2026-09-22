"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarCheck2, ClipboardCheck, FolderKanban, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import type { ConsentRecord, EnrollmentSummary, GuardianRecord, ProjectSummary, StudentSummary } from "@/specs/api.contracts";
import { apiMutation } from "@/components/prototype/live-api";
import { DataList, FilterBar, MagneticAction, MetricStrip, PageHeader, SpotlightCard, StateScene, StatusBadge } from "@/components/academy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademySelect } from "./academy-select";
import { useAdminStudent, useAdminStudentAttendance, useAdminStudentSubmissions, useAdminStudents } from "./admin-data";
import { InviteStudentSheet } from "./admin-operations-sheets";
import { hasStudentRisk, matchesRisk, type RiskFilter } from "./admin-utils";
import styles from "./admin-experience.module.css";

function studentTone(student: StudentSummary): "warning" | "success" {
  return hasStudentRisk(student) ? "warning" : "success";
}

export function AdminStudents() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [risk, setRisk] = useState<RiskFilter>("all");
  const { data, error, loading, reload } = useAdminStudents(deferredSearch);
  const students = useMemo(() => (data?.items ?? []).filter((student) => matchesRisk(student, risk)), [data, risk]);
  const attention = data?.items.filter(hasStudentRisk).length ?? 0;

  if (loading) return <StateScene state="loading" title="Organizando alunos" description="Lendo matrículas, atividades e reposições da Academy." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;

  return (
    <div className={styles.stack}>
      <PageHeader
        eyebrow="Operação pedagógica · alunos"
        title="Cada aluno, um percurso visível."
        description="Encontre rapidamente quem precisa de acompanhamento sem perder o contexto da turma, das evidências e da frequência presencial."
        marker="até 6 por turma"
        action={<InviteStudentSheet afterSave={reload} />}
      />
      <MetricStrip metrics={[
        { id: "visible", label: "Alunos encontrados", value: String(data?.items.length ?? 0), detail: "na consulta atual" },
        { id: "attention", label: "Pedem atenção", value: String(attention), detail: "atividade ou reposição", emphasis: attention > 0 },
        { id: "clear", label: "Sem pendências", value: String((data?.items.length ?? 0) - attention), detail: "ritmo preservado" },
      ]} />
      <FilterBar resultLabel={`${students.length} resultado${students.length === 1 ? "" : "s"}`}>
        <label className={styles.searchWrap}>
          <span className="sr-only">Buscar aluno</span>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <input className={styles.field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" />
        </label>
        <AcademySelect
          ariaLabel="Filtrar por atenção necessária"
          value={risk}
          onValueChange={(next) => setRisk(next as RiskFilter)}
          items={[
            { value: "all", label: "Todos os ritmos" },
            { value: "attention", label: "Pedem atenção" },
            { value: "clear", label: "Sem pendências" },
          ]}
        />
      </FilterBar>
      {!students.length ? (
        <StateScene state="empty" title="Nenhum aluno neste recorte" description="Ajuste a busca ou o filtro para reencontrar o percurso desejado." />
      ) : (
        <SpotlightCard className={styles.paper}>
          <div className={styles.paperHeader}>
            <div><h2>Mapa de acompanhamento</h2><p>Pendências aparecem como sinal pedagógico, não como punição.</p></div>
            <StatusBadge tone={attention ? "warning" : "success"}>{attention ? "Atenção ativa" : "Ritmo saudável"}</StatusBadge>
          </div>
          <DataList items={[...students]} ariaLabel="Alunos da Academy" renderItem={(student) => (
            <Link className={styles.rowLink} href={`/admin/alunos/${student.id}`}>
              <span className={styles.rowIdentity}>
                <span className={styles.avatar}>{student.displayName.slice(0, 2).toUpperCase()}</span>
                <span className={styles.rowCopy}><strong>{student.displayName}</strong><small>{student.email}</small></span>
              </span>
              <span className={styles.rowMeta}><strong>{student.activeEnrollmentCount} matrícula(s) ativa(s)</strong><small>{student.githubUsername ? `github.com/${student.githubUsername}` : "GitHub ainda não vinculado"}</small></span>
              <span className={styles.rowSignals}>
                <StatusBadge tone={studentTone(student)}>{hasStudentRisk(student) ? `${student.pendingAssignmentCount + student.pendingMakeupCount} pendência(s)` : "Em dia"}</StatusBadge>
                <ArrowUpRight className={styles.rowArrow} aria-hidden="true" />
              </span>
            </Link>
          )} />
        </SpotlightCard>
      )}
    </div>
  );
}

export function AdminStudentDetail({ studentId }: { studentId: string }) {
  const { data, error, loading, reload } = useAdminStudent(studentId);
  if (loading) return <StateScene state="loading" title="Abrindo prontuário pedagógico" description="Reunindo matrícula, projetos e consentimento." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  if (!data) return <StateScene state="empty" title="Aluno não encontrado" description="O registro pode ter sido removido ou não estar disponível neste tenant." />;

  const { student, guardian, consent, enrollments, projects } = data;
  const approvedProjects = projects.filter((project) => project.status === "approved").length;
  return (
    <div className={styles.stack}>
      <Link className={styles.backLink} href="/admin/alunos"><ArrowLeft className={styles.icon} aria-hidden="true" /> Voltar aos alunos</Link>
      <PageHeader
        eyebrow="Prontuário pedagógico"
        title={student.displayName}
        description={`${student.email} · acompanhamento individual dentro da Logos Academy.`}
        marker={`ID ${student.id.slice(0, 8)}`}
        action={<StatusBadge tone={studentTone(student)}>{hasStudentRisk(student) ? "Pede atenção" : "Em dia"}</StatusBadge>}
      />
      <MetricStrip metrics={[
        { id: "enrollments", label: "Matrículas ativas", value: String(student.activeEnrollmentCount), detail: "turma ou individual" },
        { id: "assignments", label: "Atividades pendentes", value: String(student.pendingAssignmentCount), detail: "feedback ou entrega", emphasis: student.pendingAssignmentCount > 0 },
        { id: "makeups", label: "Reposições", value: String(student.pendingMakeupCount), detail: "100% de frequência", emphasis: student.pendingMakeupCount > 0 },
        { id: "projects", label: "Projetos aprovados", value: String(approvedProjects), detail: `de ${projects.length} projeto(s)` },
      ]} />
      <Tabs defaultValue="overview" className={styles.tabShell}>
        <TabsList variant="line" className={styles.tabsList} aria-label="Seções do aluno">
          <TabsTrigger className={styles.tabTrigger} value="overview">Visão geral</TabsTrigger>
          <TabsTrigger className={styles.tabTrigger} value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger className={styles.tabTrigger} value="submissions">Entregas</TabsTrigger>
          <TabsTrigger className={styles.tabTrigger} value="attendance">Frequência</TabsTrigger>
          <TabsTrigger className={styles.tabTrigger} value="projects">Projetos</TabsTrigger>
          <TabsTrigger className={styles.tabTrigger} value="guardian">Responsável e consentimento</TabsTrigger>
        </TabsList>
        <TabsContent className={styles.tabPanel} value="overview"><StudentOverview student={student} guardian={guardian} consent={consent} /></TabsContent>
        <TabsContent className={styles.tabPanel} value="enrollments"><EnrollmentList enrollments={enrollments} /></TabsContent>
        <TabsContent className={styles.tabPanel} value="submissions"><StudentSubmissions studentId={student.id} /></TabsContent>
        <TabsContent className={styles.tabPanel} value="attendance"><StudentAttendance studentId={student.id} /></TabsContent>
        <TabsContent className={styles.tabPanel} value="projects"><ProjectList projects={projects} /></TabsContent>
        <TabsContent className={styles.tabPanel} value="guardian"><ConsentPanel studentId={student.id} guardian={guardian} consent={consent} reload={reload} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StudentSubmissions({ studentId }: { studentId: string }) {
  const { data, error, loading, reload } = useAdminStudentSubmissions(studentId);
  if (loading) return <StateScene state="loading" title="Lendo entregas" description="Carregando versões, atividade e estado de revisão." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  const items = data?.items ?? [];
  if (!items.length) return <StateScene state="empty" title="Nenhuma entrega enviada" description="As evidências publicadas pelo aluno aparecerão aqui." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Entregas e versões</h2><p>Cada linha preserva a atividade, a versão submetida e o estado de feedback.</p></div><ClipboardCheck aria-hidden="true" /></div><DataList items={[...items]} ariaLabel="Entregas do aluno" renderItem={(submission) => <Link className={styles.rowLink} href={`/admin/revisoes/${submission.id}`}><span className={styles.rowIdentity}><span className={styles.avatar}>V{submission.version}</span><span className={styles.rowCopy}><strong>{submission.activity.title}</strong><small>Ciclo {submission.activity.cyclePosition} · aula {submission.activity.lessonPosition}</small></span></span><span className={styles.rowMeta}><strong>{submission.submittedAt ? `Enviada em ${formatDate(submission.submittedAt)}` : "Rascunho"}</strong><small>{submission.items.length} item(ns) · {submission.isLate ? "fora do prazo" : "no prazo"}</small></span><span className={styles.rowSignals}><StatusBadge tone={submission.review?.decision === "approved" ? "success" : submission.review ? "warning" : "neutral"}>{submission.review?.decision === "approved" ? "Aprovada" : submission.review ? "Ajustes pedidos" : "Aguardando"}</StatusBadge><ArrowUpRight className={styles.rowArrow} /></span></Link>} /></section>;
}

function StudentAttendance({ studentId }: { studentId: string }) {
  const { data, error, loading, reload } = useAdminStudentAttendance(studentId);
  if (loading) return <StateScene state="loading" title="Lendo frequência" description="Reunindo encontro original, status e eventual reposição." />;
  if (error) return <StateScene state="error" description={error.message} action={<button className={styles.secondaryAction} onClick={() => void reload()}>Tentar novamente</button>} />;
  const items = data?.items ?? [];
  if (!items.length) return <StateScene state="empty" title="Nenhuma chamada registrada" description="A frequência aparecerá após os encontros concluídos." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Histórico de presença</h2><p>As ausências permanecem visíveis mesmo depois de recompostas.</p></div><CalendarCheck2 aria-hidden="true" /></div><DataList items={items.map((entry) => ({ ...entry, id: entry.attendanceId }))} ariaLabel="Frequência do aluno" renderItem={(entry) => <div className={styles.rowLink}><span className={styles.rowIdentity}><span className={styles.avatar}>{String(entry.session.lessonPosition).padStart(2, "0")}</span><span className={styles.rowCopy}><strong>{entry.session.lessonTitle}</strong><small>{formatDate(entry.session.startsAt)}</small></span></span><span className={styles.rowMeta}><strong>{entry.makeup ? `Reposta em ${formatDate(entry.makeup.completedAt)}` : "Registro original"}</strong><small>{entry.privateNote || "Sem observação privada"}</small></span><span className={styles.rowSignals}><StatusBadge tone={entry.status === "present" ? "success" : entry.makeup ? "warning" : "danger"}>{entry.status === "present" ? "Presente" : entry.makeup ? "Falta reposta" : entry.status === "absent" ? "Falta" : "Justificada"}</StatusBadge></span></div>} /></section>;
}

function StudentOverview({ student, guardian, consent }: { student: StudentSummary; guardian: GuardianRecord; consent: ConsentRecord }) {
  return (
    <div className={styles.sectionGrid}>
      <section className={styles.paper}>
        <div className={styles.paperHeader}><div><h2>Identidade de construção</h2><p>Dados essenciais para orientar o percurso e reconhecer as evidências.</p></div><UserRound aria-hidden="true" /></div>
        <div className={styles.paperBody}><div className={styles.factGrid}>
          <Fact label="Nome" value={student.displayName} />
          <Fact label="E-mail" value={student.email} />
          <Fact label="GitHub" value={student.githubUsername ? `@${student.githubUsername}` : "Pendente"} />
          <Fact label="Responsável" value={guardian.name} />
        </div></div>
      </section>
      <SpotlightCard className={styles.paper}>
        <div className={styles.paperHeader}><div><h2>Proteção ativa</h2><p>O acesso depende do termo físico registrado.</p></div><ShieldCheck aria-hidden="true" /></div>
        <div className={styles.paperBody}>
          <StatusBadge tone={consent.status === "verified" ? "success" : consent.status === "revoked" ? "danger" : "warning"}>{consent.status === "verified" ? "Consentimento verificado" : consent.status === "revoked" ? "Consentimento revogado" : "Consentimento pendente"}</StatusBadge>
          <p className={consent.status === "verified" ? styles.notice : styles.warning}>Termo {consent.termVersion} · {consent.physicalCopyArchived ? "via física arquivada" : "via física pendente"}.</p>
        </div>
      </SpotlightCard>
    </div>
  );
}

function EnrollmentList({ enrollments }: { enrollments: readonly EnrollmentSummary[] }) {
  if (!enrollments.length) return <StateScene state="empty" title="Nenhuma matrícula" description="Este aluno ainda não iniciou um percurso na Academy." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Matrículas</h2><p>Turma e produto individual convivem sem misturar dados pessoais.</p></div><UsersRound aria-hidden="true" /></div><div className={styles.paperBody}><DataList items={[...enrollments]} ariaLabel="Matrículas do aluno" renderItem={(enrollment) => <div className={styles.rowLink}><span className={styles.rowIdentity}><span className={styles.avatar}>{enrollment.kind === "class" ? "T" : "I"}</span><span className={styles.rowCopy}><strong>{enrollment.curriculumName}</strong><small>{enrollment.kind === "class" ? "Turma" : "Individual"}</small></span></span><span className={styles.rowMeta}><strong>{enrollment.activatedAt ? `Ativada em ${formatDate(enrollment.activatedAt)}` : "Aguardando ativação"}</strong><small>{enrollment.completedAt ? `Concluída em ${formatDate(enrollment.completedAt)}` : "Percurso em andamento"}</small></span><span className={styles.rowSignals}><StatusBadge tone={enrollment.status === "active" ? "success" : enrollment.status === "paused" ? "warning" : "neutral"}>{enrollment.status}</StatusBadge></span></div>} /></div></section>;
}

function ProjectList({ projects }: { projects: readonly ProjectSummary[] }) {
  if (!projects.length) return <StateScene state="empty" title="Nenhum projeto iniciado" description="Os projetos aparecerão conforme o currículo for liberado." />;
  return <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Portfólio interno</h2><p>Evidências graduais antes da publicação no GitHub.</p></div><FolderKanban aria-hidden="true" /></div><div className={styles.paperBody}><DataList items={[...projects]} ariaLabel="Projetos do aluno" renderItem={(project) => <div className={styles.rowLink}><span className={styles.rowIdentity}><span className={styles.avatar}>{String(project.cyclePosition).padStart(2, "0")}</span><span className={styles.rowCopy}><strong>{project.title}</strong><small>{project.completedActivityCount}/{project.activityCount} atividades concluídas</small></span></span><span className={styles.rowMeta}><strong>{project.approvedAt ? `Aprovado em ${formatDate(project.approvedAt)}` : "Em construção"}</strong><small>Evidência privada da Academy</small></span><span className={styles.rowSignals}><StatusBadge tone={project.status === "approved" ? "success" : project.status === "in_progress" ? "explorer" : "neutral"}>{project.status}</StatusBadge></span></div>} /></div></section>;
}

function ConsentPanel({ studentId, guardian, consent, reload }: { studentId: string; guardian: GuardianRecord; consent: ConsentRecord; reload: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      await apiMutation<ConsentRecord>(`/api/admin/students/${studentId}/consent`, "PUT", {
        guardian: { name: String(form.get("name")), relationship: String(form.get("relationship")), email: String(form.get("email")) || undefined, phone: String(form.get("phone")) || undefined },
        termVersion: String(form.get("termVersion")), signedAt: String(form.get("signedAt")), physicalCopyArchived: true,
      });
      setNotice("Consentimento e responsável atualizados."); await reload();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível atualizar o consentimento."); }
    finally { setPending(false); }
  }

  async function revoke() {
    if (!revocationReason.trim()) { setNotice("Informe o motivo da revogação."); return; }
    setPending(true); setNotice(null);
    try { await apiMutation(`/api/admin/students/${studentId}/consent/revoke`, "POST", { reason: revocationReason.trim() }); setNotice("Consentimento revogado e acessos pausados."); await reload(); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Não foi possível revogar o consentimento."); }
    finally { setPending(false); }
  }

  return <div className={styles.sectionGrid}>
    <section className={styles.paper}><div className={styles.paperHeader}><div><h2>Responsável e termo físico</h2><p>O registro digital confirma a guarda do documento assinado em papel.</p></div><ShieldCheck aria-hidden="true" /></div><div className={styles.paperBody}>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.formGrid}>
          <Field label="Nome do responsável" name="name" defaultValue={guardian.name} required />
          <Field label="Relação" name="relationship" defaultValue={guardian.relationship} required />
          <Field label="E-mail" name="email" type="email" defaultValue={guardian.email ?? ""} />
          <Field label="WhatsApp" name="phone" type="tel" defaultValue={guardian.phone ?? ""} />
          <Field label="Versão do termo" name="termVersion" defaultValue={consent.termVersion} required />
          <Field label="Data da assinatura" name="signedAt" type="date" defaultValue={consent.signedAt ?? ""} required />
        </div>
        <p className={styles.notice}>Ao salvar, você confirma que a via física assinada está arquivada.</p>
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <div className={styles.formActions}><MagneticAction><button className={styles.toolbarAction} disabled={pending}>{pending ? "Salvando…" : "Salvar registro"}</button></MagneticAction></div>
      </form>
    </div></section>
    <aside className={styles.paper}><div className={styles.paperHeader}><div><h2>Revogar consentimento</h2><p>Pausa matrículas e desativa o acesso do aluno.</p></div></div><div className={styles.paperBody}>
      <label className={styles.formField}><span className={styles.label}>Motivo contextual</span><textarea className={styles.textarea} value={revocationReason} onChange={(event) => setRevocationReason(event.target.value)} placeholder="Registre apenas o contexto necessário" /></label>
      <p className={styles.danger}>A revogação interrompe o acesso. Use somente mediante solicitação válida do responsável.</p>
      <button type="button" className={styles.dangerAction} disabled={pending || consent.status === "revoked"} onClick={() => void revoke()}>{consent.status === "revoked" ? "Consentimento já revogado" : "Revogar consentimento"}</button>
    </div></aside>
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className={styles.fact}><span>{label}</span><strong>{value}</strong></div>; }
function Field({ label, name, type = "text", defaultValue, required = false }: { label: string; name: string; type?: string; defaultValue: string; required?: boolean }) { return <label className={styles.formField}><span className={styles.label}>{label}</span><input className={styles.field} name={name} type={type} defaultValue={defaultValue} required={required} /></label>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
