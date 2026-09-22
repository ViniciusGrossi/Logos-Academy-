"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  Check,
  CircleUserRound,
  Download,
  Eye,
  Fingerprint,
  Github,
  Globe,
  IdCard,
  Layers3,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  Orbit,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { EnrollmentSummary, MeProfile, ProjectSummary } from "@/specs/api.contracts";
import { MagneticAction, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import styles from "./student-profile.module.css";

type Journey = {
  enrollment: EnrollmentSummary;
  projects: readonly ProjectSummary[];
  sessionsCompleted: number;
  sessionsTotal: 16;
};

type SaveNotice = { tone: "success" | "error"; message: string; time?: string } | null;
type WorkFilter = "todos" | "approved" | "in_progress" | "locked";

const workFilters: readonly { id: WorkFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "approved", label: "Preservados" },
  { id: "in_progress", label: "Em construção" },
  { id: "locked", label: "Próximos" },
];

const workStateCopy: Record<ProjectSummary["status"], string> = {
  approved: "Preservado",
  in_progress: "Em construção",
  locked: "Próximo ciclo",
};

function passportNumber(id: string) {
  const compact = id.replaceAll("-", "").toUpperCase();
  return `LA-${compact.slice(0, 4)}-${compact.slice(-4)}`;
}

function monthYear(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(value)).replace(".", "");
}

export function StudentProfile() {
  const reduceMotion = useReducedMotion();
  const profile = useLiveApi<MeProfile>("/api/me");
  const journey = useLiveApi<Journey>("/api/student/journey");
  const [displayName, setDisplayName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<SaveNotice>(null);
  const [recordVersion, setRecordVersion] = useState(0);
  const [workFilter, setWorkFilter] = useState<WorkFilter>("todos");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.displayName);
      setGithubUsername(profile.data.githubUsername ?? "");
    }
  }, [profile.data]);

  const projects = useMemo(() => [...(journey.data?.projects ?? [])].sort((a, b) => a.cyclePosition - b.cyclePosition), [journey.data?.projects]);
  const currentProject = projects.find((project) => project.status === "in_progress") ?? projects.find((project) => project.status !== "approved") ?? projects.at(-1) ?? null;
  const completedCycles = projects.filter((project) => project.status === "approved");
  const dirty = profile.data ? displayName.trim() !== profile.data.displayName || githubUsername.trim() !== (profile.data.githubUsername ?? "") : false;

  const evidence = useMemo(() => projects.reduce(
    (total, project) => ({ done: total.done + project.completedActivityCount, all: total.all + project.activityCount }),
    { done: 0, all: 0 },
  ), [projects]);

  const visibleWorks = useMemo(
    () => projects.filter((project) => workFilter === "todos" || project.status === workFilter),
    [projects, workFilter],
  );

  // A completude só mede o que o aluno de fato controla hoje: os dois campos que o
  // PATCH /api/me aceita mais o primeiro ciclo aprovado. Nada de barra inventada.
  const registryChecks = useMemo(() => [
    { id: "nome", label: "Nome de exibição definido", detail: "Assina cada evidência enviada.", done: Boolean(profile.data?.displayName.trim()) },
    { id: "github", label: "GitHub vinculado", detail: "Identifica repositórios entregues como evidência.", done: Boolean(profile.data?.githubUsername) },
    { id: "ciclo", label: "Primeiro ciclo preservado", detail: "Um projeto aprovado já compõe o arquivo.", done: completedCycles.length > 0 },
  ], [profile.data?.displayName, profile.data?.githubUsername, completedCycles.length]);
  const registryDone = registryChecks.filter((check) => check.done).length;
  const registryPercent = Math.round((registryDone / registryChecks.length) * 100);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      await apiMutation<MeProfile>("/api/me", "PATCH", { displayName: displayName.trim(), githubUsername: githubUsername.trim() || null });
      const savedAt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      setRecordVersion((current) => current + 1);
      setNotice({ tone: "success", message: "Registro atualizado e pronto para acompanhar suas próximas evidências.", time: savedAt });
      await profile.reload();
    } catch (cause) {
      setNotice({ tone: "error", message: cause instanceof Error ? cause.message : "Não foi possível atualizar o registro." });
    } finally {
      setPending(false);
    }
  }

  if (profile.loading) return <StateScene layout="profile" state="loading" title="Identidade em revelação" description="Reunindo identidade, ciclo e vínculo técnico." />;
  if (profile.error) return <StateScene layout="profile" state="error" title="Sinal interrompido no perfil" description={profile.error.message} action={<button type="button" onClick={() => { void profile.reload(); }}>Tentar novamente</button>} />;
  if (!profile.data) return <StateScene layout="profile" state="empty" title="Espaço para completar seu perfil" description="Entre novamente para continuar sua construção." />;

  const initial = profile.data.displayName.trim().charAt(0).toUpperCase();
  const roleLabel = profile.data.role === "admin" ? "Administrador" : "Estudante";
  const githubConnected = Boolean(profile.data.githubUsername);
  const editable = profile.data.role === "student";
  const allApproved = projects.length > 0 && completedCycles.length === projects.length;
  const activatedAt = journey.data?.enrollment.activatedAt ?? null;
  const sessionsCompleted = journey.data?.sessionsCompleted ?? 0;
  const sessionsTotal = journey.data?.sessionsTotal ?? 16;

  return <main className={styles.profilePage}>
    <header className={styles.pageHeading}>
      <div>
        <span className={styles.eyebrow}><Fingerprint size={14} /> Identidade e autoria · registro ativo</span>
        <h1>Seu trabalho leva<br /><em>a sua assinatura.</em></h1>
        <ul className={styles.heroFacts}>
          <li><Sparkles size={14} /> {journey.data?.enrollment.curriculumName ?? "Formação"}</li>
          {activatedAt && <li><IdCard size={14} /> desde {monthYear(activatedAt)}</li>}
          <li><Check size={14} /> {completedCycles.length} de {projects.length} ciclos preservados</li>
          <li><Layers3 size={14} /> {evidence.done} de {evidence.all} evidências</li>
        </ul>
      </div>
      <div className={styles.headingSignature} aria-hidden="true">
        <div className={styles.signatureMeta}><span>Traço de autoria</span><small>{passportNumber(profile.data.id)}</small></div>
        <svg viewBox="0 0 520 210" role="presentation">
          <path className={styles.signatureGuide} d="M18 156C79 151 103 86 142 91C177 95 152 164 197 160C245 156 247 38 292 43C335 48 300 163 357 154C402 147 414 92 447 105C467 113 458 141 501 137" />
          <path className={styles.signatureStroke} d="M18 156C79 151 103 86 142 91C177 95 152 164 197 160C245 156 247 38 292 43C335 48 300 163 357 154C402 147 414 92 447 105C467 113 458 141 501 137" />
          <path className={styles.signatureFlourish} d="M90 174C191 187 332 187 472 164" />
          {!reduceMotion && <circle className={styles.signatureScanner} r="5">
            <animateMotion dur="6.5s" repeatCount="indefinite" path="M18 156C79 151 103 86 142 91C177 95 152 164 197 160C245 156 247 38 292 43C335 48 300 163 357 154C402 147 414 92 447 105C467 113 458 141 501 137" />
          </circle>}
          <g className={styles.signatureNodes}>
            <circle cx="18" cy="156" r="3" /><circle cx="292" cy="43" r="3" /><circle cx="501" cy="137" r="3" />
          </g>
        </svg>
        <div className={styles.signatureStatus}><span><i /> identidade confirmada</span><small>registro visual · não transferível</small></div>
        <p>Este passaporte acompanha cada evidência produzida na Academy e mantém seu vínculo técnico pronto para publicação.</p>
      </div>
    </header>

    <div className={styles.profileLayout}>
      <aside className={styles.passport} aria-label="Passaporte do estudante">
        <div className={styles.passportGrid} aria-hidden="true" />
        <header className={styles.passportHeader}>
          <span><Orbit size={15} /> Logos Academy</span>
          <small>Passaporte de autoria</small>
        </header>

        <div className={styles.identityCore}>
          <div className={styles.portrait} data-letter={initial}>
            <span>{initial}</span>
            <i aria-hidden="true" />
          </div>
          <div className={styles.identityCopy}>
            <span className={styles.microLabel}>Titular do registro</span>
            <h2>{profile.data.displayName}</h2>
            <p>{profile.data.email}</p>
            <div className={styles.badgeRow}>
              <StatusBadge tone="explorer"><CircleUserRound size={13} /> {roleLabel}</StatusBadge>
              <StatusBadge tone={githubConnected ? "success" : "warning"}><Github size={13} /> {githubConnected ? "GitHub verificado" : "Vínculo pendente"}</StatusBadge>
            </div>
          </div>
        </div>

        <div className={styles.passportFacts}>
          <div><span className={styles.factIcon}><IdCard size={17} /></span><small>Identificador</small><strong>{passportNumber(profile.data.id)}</strong></div>
          <div><span className={styles.factIcon}><Orbit size={17} /></span><small>{allApproved ? "Formação" : "Ciclo atual"}</small><strong>{allApproved ? "Concluída" : currentProject ? `${String(currentProject.cyclePosition).padStart(2, "0")} · ${currentProject.title}` : "Em preparação"}</strong></div>
        </div>

        <section className={styles.cycleVisas} aria-label="Vistos dos ciclos">
          <div><span className={styles.microLabel}>Vistos de construção</span><small>{completedCycles.length} concluído(s)</small></div>
          <ol>
            {projects.map((project) => {
              const state = project.status === "approved" ? "complete" : project.id === currentProject?.id ? "current" : "future";
              return <li key={project.id} data-state={state}>
                <span aria-hidden="true">{state === "complete" ? <Check size={17} /> : String(project.cyclePosition).padStart(2, "0")}</span>
                <small aria-hidden="true">{state === "complete" ? "Concluído" : state === "current" ? "Em curso" : "A seguir"}</small>
                <span className={styles.srOnly}>Ciclo {project.cyclePosition}, {project.title}: {state === "complete" ? "concluído" : state === "current" ? "em curso" : "a seguir"}</span>
              </li>;
            })}
          </ol>
        </section>

        <footer className={styles.passportFooter}>
          <div><ShieldCheck size={15} /><span>Registro interno protegido</span></div>
          <div className={styles.machineCode} aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <i key={index} />)}</div>
        </footer>

        <div className={styles.passportSeal} key={recordVersion} data-updated={recordVersion > 0} role="img" aria-label={recordVersion > 0 ? "Registro atualizado" : "Registro válido"}>
          <span><BadgeCheck size={24} /></span>
          <small>{recordVersion > 0 ? "Atualizado" : "Válido"}</small>
        </div>
      </aside>

      <div className={styles.deskColumn}>
        <section className={styles.recordDesk}>
          <header className={styles.deskHeader}>
            <div><span className={styles.eyebrow}>Mesa de registro · {editable ? "edição" : "somente leitura"}</span><h2 id="desk-title">Dados que assinam suas evidências</h2></div>
            <StatusBadge tone={!editable ? "neutral" : dirty ? "warning" : "success"}>{!editable ? "Perfil de gestão" : dirty ? "Alterações não salvas" : "Registro sincronizado"}</StatusBadge>
          </header>
          {!editable && <p className={styles.deskNotice}><ShieldCheck size={15} /> A edição do passaporte pertence à conta de aluno. Esta visão é somente leitura.</p>}

          <form className={styles.profileForm} onSubmit={save} aria-labelledby="desk-title">
            <div className={styles.fieldGroup}>
              <label htmlFor="displayName">Nome de exibição</label>
              <div className={styles.inputShell}><CircleUserRound size={18} /><input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={1} maxLength={120} required disabled={!editable} aria-describedby="displayName-help" /><span>Autoria</span></div>
              <small id="displayName-help">Este nome aparece nas atividades, evidências e no portfólio interno.</small>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="profileEmail">E-mail de acesso</label>
              <div className={styles.inputShell} data-readonly><Mail size={18} /><input id="profileEmail" value={profile.data.email} readOnly aria-readonly="true" aria-describedby="profileEmail-help" /><span>Protegido</span></div>
              <small id="profileEmail-help">O endereço de acesso é administrado pela matrícula e não pode ser alterado aqui.</small>
            </div>

            <section className={styles.githubLink} data-connected={githubConnected}>
              <div className={styles.githubMark}><Github size={27} /></div>
              <div>
                <span className={styles.microLabel}>Vínculo técnico</span>
                <h3>{githubConnected ? "GitHub conectado" : "Conecte sua autoria técnica"}</h3>
                <p>{githubConnected ? "Seu usuário está pronto para identificar repositórios enviados como evidência." : "Informe somente seu nome de usuário. O vínculo será usado nas atividades que exigem repositório."}</p>
              </div>
              {githubConnected && <a href={`https://github.com/${profile.data.githubUsername}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir GitHub de ${profile.data.githubUsername}`}><ArrowUpRight size={17} /></a>}
              <div className={styles.githubField}>
                <label htmlFor="githubUsername" className={styles.srOnly}>Nome de usuário do GitHub</label>
                <span aria-hidden="true">github.com/</span>
                <input
                  id="githubUsername"
                  value={githubUsername}
                  onChange={(event) => setGithubUsername(event.target.value)}
                  pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?"
                  title="Use apenas letras, números e hífens, começando e terminando com letra ou número."
                  placeholder="seu-usuario"
                  disabled={!editable}
                  aria-describedby="githubUsername-help"
                />
                <span id="githubUsername-help"><Link2 size={14} /> {githubUsername ? "Identificador informado" : "Aguardando usuário"}</span>
              </div>
            </section>

            <div className={styles.formFooter}>
              <div className={styles.recordState} aria-live={notice?.tone === "error" ? "assertive" : "polite"} role={notice?.tone === "error" ? "alert" : undefined}>
                {notice ? <span data-tone={notice.tone}>{notice.tone === "success" ? <BadgeCheck size={18} /> : <ShieldCheck size={18} />}<span><strong>{notice.tone === "success" ? "Passaporte atualizado" : "Atualização interrompida"}</strong><small>{notice.message}{notice.time ? ` · ${notice.time}` : ""}</small></span></span> : <span><Fingerprint size={18} /><span><strong>Pronto para registrar</strong><small>Revise os dados antes de confirmar.</small></span></span>}
              </div>
              <MagneticAction className={styles.saveMagnetic}><button type="submit" className={styles.saveButton} disabled={pending || !dirty || !editable}><Save size={17} /> {pending ? "Atualizando…" : !editable ? "Somente leitura" : dirty ? "Atualizar passaporte" : "Tudo salvo"}</button></MagneticAction>
            </div>
          </form>
        </section>

        <section className={styles.registry} aria-labelledby="registry-title">
          <div className={styles.registryHead}>
            <div>
              <span className={styles.microLabel}>Completar registro</span>
              <h2 id="registry-title">O que ainda falta assinar</h2>
            </div>
            <div className={styles.registryGauge} style={{ "--registry": `${registryPercent * 3.6}deg` } as CSSProperties} role="img" aria-label={`${registryDone} de ${registryChecks.length} itens do registro concluídos`}>
              <strong>{registryPercent}%</strong>
            </div>
          </div>
          <ul className={styles.registryList}>
            {registryChecks.map((check) => <li key={check.id} data-done={check.done}>
              <span className={styles.registryMark}>{check.done ? <Check size={14} /> : <i aria-hidden="true" />}</span>
              <span><strong>{check.label}</strong><small>{check.detail}</small></span>
            </li>)}
          </ul>
          <small className={styles.registryNote}>Somente nome e GitHub são editáveis aqui; o ciclo avança pelas entregas aprovadas.</small>
        </section>
      </div>
    </div>

    <section className={styles.works} aria-labelledby="works-title">
      <div className={styles.worksHead}>
        <div>
          <span className={styles.microLabel}>Evidência, não promessa</span>
          <h2 id="works-title">O que aparece no portfólio</h2>
        </div>
        <div className={styles.filterGroup} role="group" aria-label="Filtrar projetos por estado">
          {workFilters.map((filter) => <button
            key={filter.id}
            type="button"
            aria-pressed={workFilter === filter.id}
            onClick={() => setWorkFilter(filter.id)}
          >{filter.label}</button>)}
        </div>
      </div>
      {visibleWorks.length ? <ul className={styles.worksList}>
        {visibleWorks.map((project) => {
          const percent = project.activityCount ? Math.round((project.completedActivityCount / project.activityCount) * 100) : 0;
          return <li key={project.id} data-status={project.status}>
            <span className={styles.workIndex}>{String(project.cyclePosition).padStart(2, "0")}</span>
            <span className={styles.workCopy}>
              <span className={styles.workState}>
                {project.status === "approved" ? <Check size={12} /> : project.status === "locked" ? <LockKeyhole size={12} /> : <Layers3 size={12} />}
                {workStateCopy[project.status]}
              </span>
              <strong>{project.title}</strong>
              <small>{project.completedActivityCount} de {project.activityCount} evidências registradas</small>
            </span>
            <span className={styles.workMeter} role="img" aria-label={`${percent}% concluído`}>
              <i style={{ width: `${percent}%` }} />
              <b>{percent}%</b>
            </span>
          </li>;
        })}
      </ul> : <p className={styles.worksEmpty}>Nenhum projeto com esse estado.</p>}
      <small className={styles.worksCount}>{projects.length} {projects.length === 1 ? "projeto" : "projetos"} · {completedCycles.length} {completedCycles.length === 1 ? "preservado" : "preservados"} · {sessionsCompleted} de {sessionsTotal} encontros realizados</small>
    </section>

    <section className={styles.comingSoon} aria-labelledby="public-title">
      <div className={styles.soonCopy}>
        <span className={styles.soonLabel}><LockKeyhole size={13} /> Em breve</span>
        <h2 id="public-title">Perfil público e selos</h2>
        <p>Um endereço próprio para mostrar o portfólio fora da Academy, com controle de quem pode abrir, e selos de competência lastreados em evidência aprovada. Depende de handle, nível de visibilidade e um modelo de competências no backend — nada disso existe hoje, então os controles abaixo estão desativados.</p>
        <p className={styles.soonNote}><ShieldCheck size={13} /> Notas de mentor e rascunhos nunca entrariam no perfil público, em nenhum nível.</p>
      </div>
      <div className={styles.soonPreview}>
        <div className={styles.soonHandle} aria-hidden="true">
          <span>logos.academy/</span>
          <b>seu-usuario</b>
        </div>
        <div className={styles.soonVisibility} role="group" aria-label="Níveis de visibilidade, indisponíveis">
          <button type="button" disabled><LockKeyhole size={14} /><span><b>Privado</b><small>Só você e o mentor</small></span></button>
          <button type="button" disabled><Link2 size={14} /><span><b>Por link</b><small>Quem tem o endereço</small></span></button>
          <button type="button" disabled><Globe size={14} /><span><b>Público</b><small>Vitrine da turma</small></span></button>
        </div>
        <div className={styles.soonSeals}>
          {["Pensamento com prompts", "Leitura de dados", "Protótipo funcional", "Defesa de decisão"].map((seal) => <span key={seal}><Award size={13} /> {seal}</span>)}
        </div>
      </div>
    </section>

    <section className={styles.comingSoon} aria-labelledby="account-title">
      <div className={styles.soonCopy}>
        <span className={styles.soonLabel}><LockKeyhole size={13} /> Em breve</span>
        <h2 id="account-title">Conta</h2>
        <p>Exportar o que você construiu, encerrar sessões abertas em outros dispositivos e escolher quando receber aviso de revisão. Cada um exige endpoint próprio — por enquanto, a troca de e-mail e a saída da conta ficam com a coordenação e com o botão de sair da barra superior.</p>
      </div>
      <ul className={styles.soonAccount}>
        <li><span className={styles.soonIcon}><Eye size={15} /></span><span><b>Avisos de revisão</b><small>E-mail quando o mentor responde</small></span><i data-on="true" aria-hidden="true" /></li>
        <li><span className={styles.soonIcon}><Download size={15} /></span><span><b>Exportar meus dados</b><small>Projetos, evidências e histórico</small></span><button type="button" disabled>Gerar</button></li>
        <li><span className={styles.soonIcon}><LogOut size={15} /></span><span><b>Encerrar sessões</b><small>Desconectar outros dispositivos</small></span><button type="button" disabled>Encerrar</button></li>
      </ul>
    </section>
  </main>;
}
