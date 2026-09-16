import Link from "next/link";
import React, { type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StateSceneLayout = "default" | "home" | "activity" | "journey" | "projects" | "detail" | "agenda" | "profile" | "concepts";

type StateSceneProps = {
  state: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  layout?: StateSceneLayout;
};

const defaults = {
  loading: { title: "Preparando seu espaço", description: "Organizando as evidências mais recentes." },
  empty: { title: "Nada por aqui ainda", description: "Quando houver um novo registro, ele aparecerá neste espaço." },
  error: { title: "Não foi possível carregar", description: "Tente novamente. Seus dados anteriores continuam preservados." },
};

function LoadingGeometry({ layout }: { layout: StateSceneLayout }) {
  return <div className="state-scene-premium__skeleton" data-layout={layout} aria-hidden="true">
    <span /><span /><span /><span /><span /><span />
  </div>;
}

export function StateScene({ state, title, description, action, className, layout = "default" }: StateSceneProps) {
  const Icon = state === "loading" ? LoaderCircle : state === "empty" ? Inbox : AlertTriangle;
  const copy = defaults[state];
  const fallbackAction = state === "empty"
    ? <Link href="/" className="button-secondary"><ArrowRight />Ver o próximo passo</Link>
    : state === "error"
      ? <Link href="/" className="button-secondary"><ArrowLeft />Voltar ao início</Link>
      : null;

  return (
    <section className={cn("state-scene-premium", `state-scene-premium--${state}`, className)} data-layout={layout} aria-live={state === "error" ? "assertive" : "polite"} aria-busy={state === "loading"}>
      <span className="state-scene-premium__index">{state === "loading" ? "···" : state === "empty" ? "00" : "!"}</span>
      <div className="state-scene-premium__icon"><Icon aria-hidden="true" /></div>
      <div className="state-scene-premium__copy">
        <h2>{title ?? copy.title}</h2>
        <p>{description ?? copy.description}</p>
      </div>
      {state === "loading" ? <LoadingGeometry layout={layout} /> : <div className="state-scene-premium__action">{action ?? fallbackAction}</div>}
    </section>
  );
}
