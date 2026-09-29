"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CalendarDays, Check, Copy, Link2, MessageCircle, Send, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { MagneticAction, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AcademySelect } from "./academy-select";
import { inviteMessage, whatsAppInviteUrl } from "./admin-utils";
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

type InviteResult = { studentId: string; enrollmentId: string; invitationSentAt: string; activationLink: string | null };

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
  const [copied, setCopied] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const reduceMotion = useReducedMotion();
  const selectedClass = options?.classes.find((item) => item.id === form.classId);

  const message = result?.activationLink
    ? inviteMessage({
        guardianName: form.guardianName,
        studentName: form.displayName,
        className: selectedClass?.name ?? "sua turma",
        loginEmail: form.email,
        activationLink: result.activationLink,
      })
    : null;
  const whatsAppUrl = message && form.guardianPhone.trim() ? whatsAppInviteUrl(form.guardianPhone, message) : null;

  function update<Key extends keyof typeof initialForm>(key: Key, value: (typeof initialForm)[Key]) {
    idempotencyKey.current = crypto.randomUUID();
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setForm(initialForm);
    setResult(null);
    setError(null);
    setCopied(false);
    idempotencyKey.current = crypto.randomUUID();
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o link na tela e copie à mão.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!form.birthDate || !form.signedAt) throw new Error("Selecione as duas datas obrigatórias antes de enviar.");
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
          <SheetTitle className={styles.inviteTitle}>{result ? "Convite pronto." : "Abrir um novo percurso."}</SheetTitle>
          <SheetDescription id="invite-description" className={styles.inviteDescription}>
            {result ? "O link de ativação está pronto para você enviar ao responsável." : "Registre identidade, proteção e turma. A senha será criada somente pelo estudante no link enviado."}
          </SheetDescription>
        </SheetHeader>

        <div className={styles.inviteProgress} aria-label="Etapas do convite">
          {["Identidade", "Proteção", "Percurso"].map((label, index) => (
            <span key={label} data-complete={Boolean(result) || undefined}><i>{result ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</i>{label}</span>
          ))}
        </div>

        {result ? (
          <motion.section className={styles.inviteSuccess} initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.inviteSuccessIcon}><Link2 aria-hidden="true" /></div>
            <StatusBadge tone="success">Link gerado</StatusBadge>
            <h2>{form.displayName} assume daqui.</h2>
            {message ? (
              <>
                <p>Envie o link para <strong>{form.guardianName}</strong> pelo WhatsApp. Depois da ativação, o login do estudante será sempre <strong>{form.email}</strong>.</p>
                <p className={styles.inviteLink}>{result.activationLink}</p>
                {!whatsAppUrl && <p className={styles.warning}>Sem WhatsApp válido do responsável. Copie a mensagem e envie pelo canal que preferir.</p>}
                <div className={styles.formActions}>
                  {whatsAppUrl && <MagneticAction><a className={styles.toolbarAction} href={whatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Enviar pelo WhatsApp <ArrowRight size={17} /></a></MagneticAction>}
                  <button type="button" className={styles.secondaryAction} onClick={copyMessage}>{copied ? <><Check size={16} /> Mensagem copiada</> : <><Copy size={16} /> Copiar mensagem</>}</button>
                </div>
              </>
            ) : (
              <p className={styles.warning}>Este convite já havia sido registrado, então o link não pode ser exibido outra vez. Convide novamente para gerar um link novo.</p>
            )}
            {error && <p className={styles.danger} role="alert">{error}</p>}
            <ol className={styles.inviteRoute}>
              <li data-active="true"><span>01</span><div><strong>Link gerado</strong><small>Individual, com validade</small></div></li>
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
            <InviteSection icon={<UserRoundPlus />} index="01" title="Identidade do estudante" description="O nome aparecerá nas evidências; o e-mail será o login do estudante.">
              <div className={styles.formGrid}>
                <InviteField label="Nome completo" value={form.displayName} onChange={(value) => update("displayName", value)} autoComplete="name" required />
                <InviteField label="E-mail de login" value={form.email} onChange={(value) => update("email", value)} type="email" autoComplete="email" required />
                <InviteDateField label="Data de nascimento" value={form.birthDate} onChange={(value) => update("birthDate", value)} startMonth={new Date(1940, 0)} />
              </div>
            </InviteSection>

            <InviteSection icon={<ShieldCheck />} index="02" title="Responsável e consentimento" description="O convite só é gerado depois que o termo físico está registrado.">
              <div className={styles.formGrid}>
                <InviteField label="Nome do responsável" value={form.guardianName} onChange={(value) => update("guardianName", value)} required />
                <InviteField label="Relação" value={form.guardianRelationship} onChange={(value) => update("guardianRelationship", value)} placeholder="Mãe, pai, responsável…" required />
                <InviteField label="E-mail do responsável" value={form.guardianEmail} onChange={(value) => update("guardianEmail", value)} type="email" required />
                <InviteField label="WhatsApp do responsável" value={form.guardianPhone} onChange={(value) => update("guardianPhone", value)} type="tel" placeholder="(11) 98888-7777" />
                <InviteField label="Versão do termo" value={form.termVersion} onChange={(value) => update("termVersion", value)} required />
                <InviteDateField label="Data da assinatura" value={form.signedAt} onChange={(value) => update("signedAt", value)} startMonth={new Date(2020, 0)} />
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
              <p><Link2 size={16} aria-hidden="true" /> Você recebe o link para enviar ao responsável; nenhuma senha é criada pela gestão.</p>
              <MagneticAction><button className={styles.toolbarAction} disabled={pending || loading || !options?.classes.length}>{pending ? "Gerando convite…" : <><Send size={17} /> Gerar convite <ArrowRight size={17} /></>}</button></MagneticAction>
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

function InviteDateField({ label, value, onChange, startMonth }: { label: string; value: string; onChange: (value: string) => void; startMonth: Date }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  return <label className={styles.formField}>
    <span className={styles.label}>{label}</span>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={styles.dateTrigger} aria-label={label}>
          <CalendarDays size={17} aria-hidden="true" />
          <span>{selected ? formatDate(value) : "Selecionar data"}</span>
          <small>{selected ? value : "AAAA-MM-DD"}</small>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className={styles.datePopover}>
        <Calendar
          mode="single"
          locale={ptBR}
          captionLayout="dropdown-years"
          startMonth={startMonth}
          endMonth={new Date()}
          selected={selected}
          onSelect={(date) => { if (date) { onChange(date.toISOString().slice(0, 10)); setOpen(false); } }}
          className={styles.inviteCalendar}
          aria-label={label}
        />
      </PopoverContent>
    </Popover>
  </label>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
