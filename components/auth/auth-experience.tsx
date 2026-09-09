"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SmoothInput } from "@/components/ui/smooth-input";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { safeInternalPath } from "@/src/lib/safe-internal-path";
import styles from "./auth-experience.module.css";

type AuthMode = "login" | "activate" | "recover";

const copy = {
  login: { step: "Acesso ao estúdio", title: "Continue de onde parou.", intro: "Entre para retomar sua missão, consultar conceitos e organizar as próximas evidências." },
  activate: { step: "Primeiro acesso", title: "Prepare seu espaço.", intro: "Crie uma senha segura para ativar o acesso recebido pela Logos Academy." },
  recover: { step: "Recuperar acesso", title: "Volte à construção.", intro: "Receba um link seguro no seu e-mail ou defina uma nova senha após abrir o link." },
} satisfies Record<AuthMode, { step: string; title: string; intro: string }>;

export function passwordScore(value: string) {
  return Math.min(4, Number(value.length >= 8) + Number(value.length >= 12) + Number(/[0-9]/u.test(value)) + Number(/[^a-zA-Z0-9]/u.test(value)));
}

export function authErrorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.name === "ZodError") return "A plataforma ainda não está configurada. Tente novamente em alguns instantes.";
  return cause instanceof Error ? cause.message : "Não foi possível concluir. Tente novamente.";
}

async function signInWithDemo(email: string, password: string): Promise<boolean> {
  const response = await fetch("/api/demo/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = typeof body === "object" && body && "message" in body && typeof body.message === "string" ? body.message : "Não foi possível entrar.";
    throw new Error(message);
  }
  return true;
}

function PasswordMeter({ value }: { value: string }) {
  const score = passwordScore(value);
  const labels = ["Use ao menos 8 caracteres", "Senha básica", "Senha razoável", "Senha boa", "Senha forte"];
  const colors = ["#c63e2d", "#d85a18", "#ff8a00", "#249568"];
  return <><div className={styles.meter} aria-hidden="true">{[0,1,2,3].map((index) => <span key={index} style={{ "--meter-active": index < score ? 1 : 0, "--meter-color": colors[Math.max(0, score - 1)] } as React.CSSProperties} />)}</div><p className={styles.meterText} aria-live="polite">{labels[score]}</p></>;
}

function PasswordInput({ value, onChange, label = "Senha", helper = "Mínimo de 8 caracteres" }: { value: string; onChange: (value: string) => void; label?: string; helper?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className={styles.passwordRow}><SmoothInput label={label} helper={helper} icon={<LockKeyhole size={18} />} type={visible ? "text" : "password"} value={value} autoComplete={label === "Senha" ? "current-password" : "new-password"} minLength={8} required onChange={(event) => onChange(event.target.value)} /><button type="button" className={styles.reveal} onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}

function MagneticSubmit({ pending, label }: { pending: boolean; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .08}px, ${(event.clientY - rect.top - rect.height / 2) * .14}px)`;
  }
  function reset() { if (ref.current) ref.current.style.transform = "translate(0,0)"; }
  return <div className={styles.magnetic} onPointerMove={move} onPointerLeave={reset}><button ref={ref} className={styles.submit} disabled={pending}>{pending ? "Processando…" : label}<ArrowRight size={19} /></button></div>;
}

export function AuthExperience({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const safeNext = safeInternalPath(requestedNext, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const updateMode = mode !== "login" && (mode === "activate" || searchParams.get("mode") === "update");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(mode === "login" || !updateMode);

  useEffect(() => {
    if (!updateMode) return;
    const client = createSupabaseBrowserClient();
    void client.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
      if (!data.session) setError("Abra novamente o link seguro enviado pela Logos Academy.");
    });
  }, [updateMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(null); setMessage(null);
    try {
      if (mode === "login") {
        if (await signInWithDemo(email, password)) {
          router.replace(safeNext); router.refresh();
          return;
        }
        const client = createSupabaseBrowserClient();
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        router.replace(safeNext); router.refresh();
        return;
      }
      const client = createSupabaseBrowserClient();
      if (!updateMode) {
        const next = "/recuperar-senha?mode=update";
        const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (result.error) throw result.error;
        setMessage("Link enviado. Confira seu e-mail e abra-o neste dispositivo.");
        return;
      }
      if (passwordScore(password) < 2) throw new Error("Crie uma senha com pelo menos 8 caracteres e mais variedade.");
      if (password !== confirmation) throw new Error("As senhas não coincidem.");
      const result = await client.auth.updateUser({ password });
      if (result.error) throw result.error;
      setMessage(mode === "activate" ? "Acesso ativado. Seu estúdio está pronto." : "Senha atualizada com sucesso.");
      window.setTimeout(() => { router.replace("/"); router.refresh(); }, 700);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally { setPending(false); }
  }

  const action = mode === "login" ? "Entrar no estúdio" : updateMode ? "Salvar nova senha" : "Enviar link seguro";
  return <main className={styles.scene}>
    <section className={styles.cinema} aria-label="Logos Academy">
      <Link href="/login" className={styles.brand}><Image src="/brand/logos-academy-logo.png" width={304} height={92} alt="Logos Academy" priority /></Link>
      <div className={styles.story}><span className={styles.eyebrow}>Capacidade, não aula.</span><h1>Sua próxima <em>evidência</em> começa aqui.</h1><p>A plataforma acompanha o que acontece presencialmente: conceitos para consultar, missões para executar e projetos que mostram sua evolução.</p></div>
      <div className={styles.rail} aria-label="Jornada na plataforma"><div><small>01</small><strong>Compreenda</strong></div><div><small>02</small><strong>Construa</strong></div><div><small>03</small><strong>Demonstre</strong></div></div>
    </section>
    <section className={styles.workspace}>
      <div className={styles.formWrap}><div className={styles.step}>{copy[mode].step}</div><h2>{copy[mode].title}</h2><p className={styles.intro}>{copy[mode].intro}</p>
        <form className={styles.form} onSubmit={submit}>
          {(mode === "login" || !updateMode) && <SmoothInput label="E-mail" helper="Use o endereço cadastrado na matrícula" icon={<Mail size={18} />} type="email" value={email} autoComplete="email" required onChange={(event) => setEmail(event.target.value)} />}
          {(mode === "login" || updateMode) && <PasswordInput value={password} onChange={setPassword} label={mode === "login" ? "Senha" : "Nova senha"} />}
          {updateMode && <><PasswordMeter value={password} /><PasswordInput value={confirmation} onChange={setConfirmation} label="Confirmar senha" helper="Repita exatamente a senha acima" /></>}
          {error && <div className={styles.status} data-error="true" role="alert">{error}</div>}
          {message && <div className={styles.status} role="status">{message}</div>}
          <MagneticSubmit pending={pending || !sessionReady} label={action} />
        </form>
        <div className={styles.footer}>{mode === "login" ? <><Link href="/recuperar-senha">Esqueci minha senha</Link><span><KeyRound size={14} aria-hidden="true" /> Convite obrigatório</span></> : <><Link href="/login">Voltar ao login</Link><span>Ambiente protegido</span></>}</div>
      </div>
    </section>
  </main>;
}
