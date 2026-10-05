import { describe, expect, it } from "vitest";

import {
  activityActionCopy,
  activityFlowSteps,
  getActivityFlowIndex,
  getActivityFlowState,
} from "@/components/prototype/project-activity-flow";

describe("fluxo real da atividade no projeto", () => {
  it("usa somente estados que existem no contrato", () => {
    expect(activityFlowSteps.map((step) => step.status)).toEqual([
      "available",
      "draft",
      "submitted",
      "revision_requested",
      "approved",
    ]);
  });

  it("marca o estado atual sem inventar avanço por contagem de versões", () => {
    expect(getActivityFlowIndex("submitted")).toBe(2);
    expect(activityFlowSteps.map((_, index) => getActivityFlowState(index, "submitted"))).toEqual([
      "complete",
      "complete",
      "current",
      "pending",
      "pending",
    ]);
  });

  it("não apresenta uma etapa navegável quando a atividade está bloqueada", () => {
    expect(getActivityFlowIndex("locked")).toBe(-1);
    expect(getActivityFlowState(0, "locked")).toBe("pending");
    expect(activityActionCopy.locked).toBe("Aguardando liberação");
  });

  it("orienta a ação correta para envio, revisão e aprovação", () => {
    expect(activityActionCopy.submitted).toBe("Consultar envio");
    expect(activityActionCopy.revision_requested).toBe("Ver feedback e revisar");
    expect(activityActionCopy.approved).toBe("Consultar atividade");
  });
});
