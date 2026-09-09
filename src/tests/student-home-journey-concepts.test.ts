import { describe, expect, it } from "vitest";
import type { ReviewDetail, StudentHome } from "@/specs/api.contracts";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import { ConceptsQuerySchema, JourneyQuerySchema, PathIdSchema } from "@/src/modules/admissions/schema";
describe("student-home-journey-concepts", () => {
  it("valida jornada e conceitos paginados antes das RPCs", () => {
    expect(() => JourneyQuerySchema.parse({ enrollmentId: "x" })).toThrow();
    expect(() => ConceptsQuerySchema.parse({ limit: 101 })).toThrow();
    expect(() => ConceptsQuerySchema.parse({ unknown: true })).toThrow();
  });
  it("bloqueia deep-link de conceito e review inválidos", () => {
    expect(() => PathIdSchema.parse({ id: "x" })).toThrow();
  });
});

describe("DTOs e erros da Wave 3", () => {
  it("normaliza a negação de ownership da RPC", () => {
    expect(mapRpcError("42501")).toBe("FORBIDDEN");
  });

  it("preserva os DTOs completos de home e review", () => {
    const review = { id: crypto.randomUUID(), decision: "approved", feedback: "Bom trabalho", reviewerName: "Mentora", reviewedAt: new Date().toISOString(), seenAt: new Date().toISOString(), criteria: [{ criterionId: crypto.randomUUID(), result: "met", comment: "Completo" }] } satisfies ReviewDetail;
    const home = { primaryAction: { kind: "setup_github", label: "Conecte seu GitHub" }, nextSession: null, recentFeedback: review, currentProject: null, pendingMakeupCount: 1 } satisfies StudentHome;
    expect(home.recentFeedback?.criteria).toHaveLength(1);
  });
});
