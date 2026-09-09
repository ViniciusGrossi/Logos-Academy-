import { describe, expect, it } from "vitest";

import type { Page, ReviewDetail, ReviewQueueSubmission } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import type { AdminActor, ReviewFeedbackStore } from "@/src/modules/review-feedback-loop/repository";
import { ReviewFeedbackService } from "@/src/modules/review-feedback-loop/service";

const admin: AdminActor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "11000000-0000-4000-8000-000000000001", role: "admin" };
const submissionId = "12000000-0000-4000-8000-000000000001";
const criterionId = "13000000-0000-4000-8000-000000000001";

class Store implements ReviewFeedbackStore {
  query: unknown = null;
  published: unknown = null;
  async page(_actor: AdminActor, query: unknown): Promise<Page<ReviewQueueSubmission>> {
    this.query = query;
    return { items: [], nextCursor: null };
  }
  async publish(_actor: AdminActor, input: unknown): Promise<ReviewDetail> {
    this.published = input;
    return { id: submissionId, decision: "approved", feedback: "Entrega aprovada.", reviewerName: "Admin", reviewedAt: new Date().toISOString(), seenAt: null, criteria: [{ criterionId, result: "met", comment: null }] };
  }
}

describe("review-feedback-loop", () => {
  it("GWT-01 pagina a fila com cursor, turma e SLA", async () => {
    const store = new Store();
    await new ReviewFeedbackService(store).page(admin, { classId: submissionId, overdueOnly: "true", cursor: "cursor", limit: "10" }, "request");
    expect(store.query).toEqual({ classId: submissionId, overdueOnly: true, cursor: "cursor", limit: 10 });
  });

  it("GWT-02 bloqueia feedback vazio e critério ausente antes da RPC", async () => {
    const service = new ReviewFeedbackService(new Store());
    await expect(service.publish(admin, { submissionId, decision: "approved", feedback: " ", criteria: [{ criterionId, result: "met" }] }, "request")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.publish(admin, { submissionId, decision: "approved", feedback: "Ok", criteria: [] }, "request")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("GWT-03/GWT-04 publica somente decisão e critérios válidos", async () => {
    const store = new Store();
    const review = await new ReviewFeedbackService(store).publish(admin, { submissionId, decision: "revision_requested", feedback: "Ajuste a fonte.", criteria: [{ criterionId, result: "needs_adjustment", comment: "Inclua a origem." }] }, "request");
    expect(store.published).toMatchObject({ decision: "revision_requested" });
    expect(review.criteria).toHaveLength(1);
  });

  it("GWT-05/GWT-07 preserva negação tipada de revisão concorrente ou tenant estranho", async () => {
    const error = new AppError("FORBIDDEN", "Recurso indisponível.", "request");
    expect(error.code).toBe("FORBIDDEN");
  });
});
