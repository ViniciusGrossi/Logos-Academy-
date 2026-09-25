import { describe, expect, it } from "vitest";

import { demoApi } from "@/src/mocks/demo-api";
import { PresentationSchema } from "@/src/modules/projects-portfolio-completion/schema";
import type { CompletionCheck, PresentationRecord } from "@/specs/api.contracts";

const enrollmentId = "00000000-0000-4000-8000-000000000002";

describe("formação — elegibilidade e apresentação", () => {
  it("expõe os cinco requisitos e os bloqueios da conclusão", async () => {
    const check = await demoApi<CompletionCheck>(
      `/api/admin/enrollments/${enrollmentId}/completion`,
      "GET",
    );
    expect(Object.keys(check)).toEqual([
      "enrollmentId",
      "attendanceComplete",
      "projectsComplete",
      "reflectionComplete",
      "presentationComplete",
      "noPendingRevisions",
      "eligible",
      "blockers",
    ]);
    expect(check.eligible).toBe(false);
    expect(check.blockers.length).toBeGreaterThan(0);
  });

  it("aceita o payload de apresentação montado a partir de um input datetime-local", () => {
    const parsed = PresentationSchema.safeParse({
      kind: "substitute",
      performedAt: new Date("2026-09-25T19:30").toISOString(),
      contextualNote: "Apresentou para a turma da manhã.",
    });
    expect(parsed.success).toBe(true);
    // datetime-local não tem timezone: sem toISOString o Zod .datetime() rejeita.
    expect(
      PresentationSchema.safeParse({ kind: "demo_day", performedAt: "2026-09-25T19:30" }).success,
    ).toBe(false);
  });

  it("registra a apresentação e devolve o registro imutável", async () => {
    const record = await demoApi<PresentationRecord>(
      `/api/admin/enrollments/${enrollmentId}/presentation`,
      "POST",
      { kind: "demo_day", performedAt: new Date().toISOString() },
    );
    expect(record.enrollmentId).toBe(enrollmentId);
    expect(record.kind).toBe("demo_day");
  });
});
