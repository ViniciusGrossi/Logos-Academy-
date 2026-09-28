"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, MailCheck, Send, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { MagneticAction, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AcademySelect } from "./academy-select";
import styles from "./admin-experience.module.css";

type InviteOptions = {
  curricula: readonly { id: string; name: string; version: string }[];
  classes: readonly {
    id: string;
    name: string;
    curriculumId: string;
    curriculumName: string;
    startsOn: string;
    status: "planned" | "active";
    occupiedSeats: number;
    capacity: number;
  }[];
};

type InviteResult = { studentId: string; enrollmentId: string; invitationSentAt: string };

const initialForm = {
  displayName: "",
  email: "",
  birthDate: "",
  guardianName: "",
  guardianRelationship: "",
  guardianEmail: "",
  guardianPhone: "",
  termVersion: "2026.1",
  signedAt: "",
  classId: "",
  physicalCopyArchived: false,
};

export function AdminInviteStudent({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => Promise<void> }) {
  const { data: options, error: optionsError, loading } = useLiveApi<InviteOptions>(open ? "/api/admin/students/invite/options" : null);
  const [form, setForm] = useState(initialForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const reduceMotion = useReducedMotion();
  const selectedClass = options?.classes.find((item) => item.id === form.classId);

  function update<Key extends keyof typeof initialForm>(key: Key, value: (typeof initialForm)[Key]) {
    idempotencyKey.current = crypto.randomUUID();
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setForm(initialForm);
    setResult(null);
    setError(null);
    idempotencyKey.current = crypto.randomUUID();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!selectedClass) throw new Error("Selecione uma turma disponível.");
      if (selectedClass.occupiedSeats >= selectedClass.capacity) throw new Error("Esta turma já atingiu a capacidade máxima.");
      if (!form.physicalCopyArchived) throw new Error("Confirme o arquivamento do termo físico antes de convidar.");

      const invitation = await apiMutation<InviteResult>("/api/admin/students/invite", "POST", {
          email: form.email.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          birthDate: form.birthDate,
          guardian: {
            name: form.guardianName.trim(),
            relationship: form.guardianRelationship.trim(),
            ...(form.guardianEmail.trim() ? { email: form.guardianEmail.trim().toLowerCase() } : {}),
            ...(form.guardianPhone.trim() ? { phone: form.guardianPhone.trim() } : {}),
          },
          consent: { termVersion: form.termVersion.trim(), signedAt: form.signedAt, physicalCopyArchived: true },
          enrollment: { curriculumId: selectedClass.curriculumId, kind: "class", classId: selectedClass.id },
        }, { "idempotency-key": idempotencyKey.current });
      setResult(invitation);
      await onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o convite.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) window.setTimeout(reset, 220); }}>
      <SheetContent className={styles.inviteSheet} aria-describedby="invite-description">
        <SheetHeader className={styles.inviteHeader}>
          <div className={styles.inviteEyebrow}><UserRoundPlus size={16} aria-hidden="true" /> Novo acesso · estudante</div>
          <SheetTitle className={styles.inviteTitle}>{result ? "Convite em rota." : "Abrir um novo percurso."}</SheetTitle>
          <SheetDescription id="invite-description" className={styles.inviteDescription}>
            {result ? "O e-mail já saiu com o link seguro para a criação da senha." : "Registre identidade, proteção e turma. A senha será criada somente pelo estudante no link recebido."}
          </SheetDescription>
        </SheetHeader>

        <div className={styles.inviteProgress} aria-label="Etapas do convite">
          {["Identidade", "Proteção", "Percurso"].map((label, index) => (
            <span key={label} data-complete={Boolean(result) || undefined}><i>{result ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</i>{label}</span>
          ))}
        </div>

        {result ? (
          <motion.section className={styles.inviteSuccess} initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.inviteSuccessIcon}><MailCheck aria-hidden="true" /></div>
            <StatusBadge tone="success">Convite enviado</StatusBadge>
            <h2>{form.displayName} assume daqui.</h2>
            <p>Enviamos o link para <strong>{form.email}</strong>. O estudante confirmará o endereço, criará a senha e ativará a matrícula.</p>
            <ol className={styles.inviteRoute}>
              <li data-active="true"><span>01</span><div><strong>E-mail enviado</strong><small>Link individual e seguro</small></div></li>
              <li><span>02</span><div><strong>Senha criada</strong><small>Feita pelo próprio estudante</small></div></li>
              <li><span>03</span><div><strong>Estúdio liberado</strong><small>Matrícula passa de convidada para ativa</small></div></li>
            </ol>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryAction} onClick={reset}>Convidar outro aluno</button>
              <MagneticAction><button type="button" className={styles.toolbarAction} onClick={() => onOpenChange(false)}>Concluir</button></MagneticAction>
            </div>
          </motion.section>
        ) : (
          <form className={styles.inviteForm} onSubmit={submit}>
            <InviteSection icon={<UserRoundPlus />} index="01" title="Identidade do estudante" description="O nome aparecerá nas evidências; o e-mail será o endereço do convite.">
              <div className={styles.formGrid}>
                <InviteField label="Nome completo" value={form.displayName} onChange={(value) => update("displayName", value)} autoComplete="name" required />
                <InviteField label="E-mail do convite" value={form.email} onChange={(value) => update("email", value)} type="email" autoComplete="email" required />
                <InviteField label="Data de nascimento" value={form.birthDate} onChange={(value) => update("birthDate", value)} type="date" required />
              </div>
            </InviteSection>

            <InviteSection icon={<ShieldCheck />} index="02" title="Responsável e consentimento" description="A Academy só envia o convite depois que o termo físico está registrado.">
              <div className={styles.formGrid}>
                <InviteField label="Nome do responsável" value={form.guardianName} onChange={(value) => update("guardianName", value)} required />
                <InviteField label="Relação" value={form.guardianRelationship} onChange={(value) => update("guardianRelationship", value)} placeholder="Mãe, pai, responsável…" required />
                <InviteField label="E-mail do responsável" value={form.guardianEmail} onChange={(value) => update("guardianEmail", value)} type="email" required />
                <InviteField label="WhatsApp (opcional)" value={form.guardianPhone} onChange={(value) => update("guardianPhone", value)} type="tel" />
                <InviteField label="Versão do termo" value={form.termVersion} onChange={(value) => update("termVersion", value)} required />
                <InviteField label="Data da assinatura" value={form.signedAt} onChange={(value) => update("signedAt", value)} type="date" required />
              </div>
              <label className={styles.inviteConsent}>
                <input type="checkbox" checked={form.physicalCopyArchived} onChange={(event) => update("physicalCopyArchived", event.target.checked)} />
                <span><strong>Via física assinada e arquivada</strong><small>Esta confirmação é obrigatória para liberar o convite.</small></span>
              </label>
            </InviteSection>

            <InviteSection icon={<UsersRound />} index="03" title="Turma e formação" description="O convite já nasce ligado ao percurso correto.">
              {loading ? <p className={styles.notice}>Lendo turmas disponíveis…</p> : optionsError ? <p className={styles.danger}>{optionsError.message}</p> : (
                <label className={styles.formField}>
                  <span className={styles.label}>Turma</span>
                  <AcademySelect
                    value={form.classId || undefined}
                    onValueChange={(value) => update("classId", value)}
                    placeholder="Selecione uma turma"
                    ariaLabel="Selecionar turma do novo estudante"
                    items={(options?.classes ?? []).map((item) => ({
                      value: item.id,
                      label: `${item.name} · ${item.curriculumName} · ${item.capacity - item.occupiedSeats} vaga(s)`,
                    }))}
                  />
                </label>
              )}
              {selectedClass && <div className={styles.inviteClassSignal}>
                <CalendarDays aria-hidden="true" />
                <span><strong>{selectedClass.name}</strong><small>Início em {formatDate(selectedClass.startsOn)} · {selectedClass.occupiedSeats}/{selectedClass.capacity} lugares ocupados</small></span>
                <StatusBadge tone={selectedClass.status === "active" ? "success" : "neutral"}>{selectedClass.status === "active" ? "Em curso" : "Planejada"}</StatusBadge>
              </div>}
            </InviteSection>

            {error && <p className={styles.danger} role="alert">{error}</p>}
            <div className={styles.inviteFooter}>
              <p><MailCheck size={16} aria-hidden="true" /> O aluno receberá um link; nenhuma senha é criada pela gestão.</p>
              <MagneticAction><button className={styles.toolbarAction} disabled={pending || loading || !options?.classes.length}>{pending ? "Enviando convite…" : <><Send size={17} /> Enviar convite <ArrowRight size={17} /></>}</button></MagneticAction>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InviteSection({ icon, index, title, description, children }: { icon: React.ReactNode; index: string; title: string; description: string; children: React.ReactNode }) {
  return <motion.section className={styles.inviteSection} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: Number(index) * .04 }}>
    <header><span className={styles.inviteSectionIcon}>{icon}</span><div><small>{index} · registro</small><h3>{title}</h3><p>{description}</p></div></header>
    <div className={styles.inviteSectionBody}>{children}</div>
  </motion.section>;
}

function InviteField({ label, value, onChange, type = "text", required, placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; autoComplete?: string }) {
  return <label className={styles.formField}><span className={styles.label}>{label}</span><input className={styles.field} value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} /></label>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
