"use client";

import Link from "next/link";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DemoState } from "@/src/mocks/academy.mock";

const states: Array<{ value: DemoState; label: string }> = [
  { value: "content", label: "Conteúdo" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Vazio" },
  { value: "error", label: "Erro" },
];

export function StateSelector({ state }: { state: DemoState }) {
  const pathname = usePathname();
  const router = useRouter();
  return <Tabs className="state-selector" value={state} onValueChange={(value) => router.push(`${pathname}?state=${value}`)}><TabsList aria-label="Estado da demonstração">{states.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}</TabsList></Tabs>;
}

export function LoadingState() {
  return <div className="state-canvas" aria-label="Carregando conteúdo"><Skeleton className="skeleton-line wide" /><Skeleton className="skeleton-line" /><div className="skeleton-panel"><Skeleton /><Skeleton /><Skeleton /></div></div>;
}

export function EmptyState({ scope = "evidências" }: { scope?: string }) {
  return <div className="empty-state"><span className="state-icon"><Inbox /></span><h2>Nenhuma {scope} por aqui</h2><p>Quando houver uma próxima ação, ela aparecerá neste espaço com o contexto necessário.</p><Link className="button-secondary" href="?state=content">Ver exemplo preenchido</Link></div>;
}

export function ErrorState({ retry, message }: { retry?: () => void; message?: string }) {
  return <div className="empty-state error-state" role="alert"><span className="state-icon"><AlertTriangle /></span><h2>Não foi possível carregar agora</h2><p>{message ?? "Seu trabalho não foi alterado. Tente carregar esta visão novamente."}</p>{retry ? <button className="button-secondary" onClick={retry}><RotateCcw />Tentar novamente</button> : <Link className="button-secondary" href="?state=content"><RotateCcw />Tentar novamente</Link>}</div>;
}
