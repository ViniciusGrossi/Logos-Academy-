import type { AssignmentStatus } from "@/specs/api.contracts";

export const activityFlowSteps = [
  { status: "available", label: "Disponível" },
  { status: "draft", label: "Rascunho" },
  { status: "submitted", label: "Em análise" },
  { status: "revision_requested", label: "Ajustes solicitados" },
  { status: "approved", label: "Aprovada" },
] as const satisfies ReadonlyArray<{ status: Exclude<AssignmentStatus, "locked">; label: string }>;

export const activityActionCopy = {
  locked: "Aguardando liberação",
  available: "Abrir atividade",
  draft: "Continuar rascunho",
  submitted: "Consultar envio",
  revision_requested: "Ver feedback e revisar",
  approved: "Consultar atividade",
} satisfies Record<AssignmentStatus, string>;

export const activityPositionCopy = {
  locked: "Aguardando liberação",
  available: "Pronta para começar",
  draft: "Rascunho em andamento",
  submitted: "Aguardando análise",
  revision_requested: "Ajustes solicitados",
  approved: "Atividade concluída",
} satisfies Record<AssignmentStatus, string>;

export function getActivityFlowIndex(status: AssignmentStatus) {
  return activityFlowSteps.findIndex((step) => step.status === status);
}

export function getActivityFlowState(
  stepIndex: number,
  status: AssignmentStatus,
): "complete" | "current" | "pending" {
  const currentIndex = getActivityFlowIndex(status);
  if (currentIndex < 0 || stepIndex > currentIndex) return "pending";
  return stepIndex === currentIndex ? "current" : "complete";
}
