import React, { type ReactNode } from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StateSceneProps = {
  state: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const defaults = {
  loading: { title: "Preparando seu espaço", description: "Organizando as evidências mais recentes." },
  empty: { title: "Nada por aqui ainda", description: "Quando houver um novo registro, ele aparecerá neste espaço." },
  error: { title: "Não foi possível carregar", description: "Tente novamente. Seus dados anteriores continuam preservados." },
};

export function StateScene({ state, title, description, action, className }: StateSceneProps) {
  const Icon = state === "loading" ? LoaderCircle : state === "empty" ? Inbox : AlertTriangle;
  const copy = defaults[state];

  return (
    <section className={cn("state-scene-premium", `state-scene-premium--${state}`, className)} aria-live={state === "error" ? "assertive" : "polite"} aria-busy={state === "loading"}>
      <span className="state-scene-premium__index">{state === "loading" ? "···" : state === "empty" ? "00" : "!"}</span>
      <div className="state-scene-premium__icon"><Icon aria-hidden="true" /></div>
      <div className="state-scene-premium__copy">
        <h2>{title ?? copy.title}</h2>
        <p>{description ?? copy.description}</p>
      </div>
      {state === "loading" ? (
        <div className="state-scene-premium__skeleton" aria-hidden="true">
          <span className="animate-pulse rounded-md bg-muted" /><span className="animate-pulse rounded-md bg-muted" /><span className="animate-pulse rounded-md bg-muted" />
        </div>
      ) : action ? <div className="state-scene-premium__action">{action}</div> : null}
    </section>
  );
}
