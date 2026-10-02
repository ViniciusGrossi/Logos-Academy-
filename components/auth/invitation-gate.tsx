import React from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

import styles from "./invitation-gate.module.css";

export function InvitationGate({ code }: { code: string }) {
  return (
    <main className={styles.scene}>
      <section className={styles.card} aria-labelledby="invitation-title">
        <div className={styles.brand} aria-label="Logos Academy">LA</div>
        <span className={styles.eyebrow}>Convite individual · ambiente protegido</span>
        <ShieldCheck className={styles.icon} aria-hidden="true" />
        <h1 id="invitation-title">Seu acesso está pronto.</h1>
        <p>Confirme abaixo para abrir o convite seguro e criar sua senha da Logos Academy.</p>
        <form method="post" action={`/api/invitations/${code}/open`}>
          <button type="submit">
            Continuar ativação
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <small>Esta confirmação impede que previews automáticos consumam seu link antes de você.</small>
      </section>
    </main>
  );
}
