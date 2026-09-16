"use client";

import { RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { StateScene, type StateSceneLayout } from "@/components/academy";
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

export function LoadingState({ layout = "default" }: { layout?: StateSceneLayout }) {
  return <StateScene state="loading" layout={layout} title="Trajetória sendo calculada" description="Revelando a próxima etapa da sua construção sem perder seu caminho." />;
}

export function EmptyState({ scope = "evidências", layout = "default" }: { scope?: string; layout?: StateSceneLayout }) {
  return <StateScene state="empty" layout={layout} title="Espaço para a próxima construção" description={`Nenhuma ${scope} está disponível aqui agora. Use o próximo passo para continuar sua jornada.`} />;
}

export function ErrorState({ retry, message, layout = "default" }: { retry?: () => void; message?: string; layout?: StateSceneLayout }) {
  return <StateScene state="error" layout={layout} title="Sinal interrompido" description={message ?? "A conexão falhou, mas suas informações continuam preservadas. Tente restabelecer o sinal."} action={retry ? <button className="button-secondary" onClick={retry}><RotateCcw />Tentar novamente</button> : undefined} />;
}
