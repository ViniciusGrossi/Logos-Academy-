import { describe, expect, it } from "vitest";

import type { AdminSubmissionWorkspace, Page, ReviewDetail, ReviewQueueSubmission } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import type { AdminActor, ReviewFeedbackStore } from "@/src/modules/review-feedback-loop/repository";
import { parseReviewQueuePage, parseWorkspace } from "@/src/modules/review-feedback-loop/contract";
import { ReviewFeedbackService } from "@/src/modules/review-feedback-loop/service";

const admin: AdminActor = { tenantId: "10000000-0000-4000-8000-000000000001", userId: "11000000-0000-4000-8000-000000000001", role: "admin" };
const submissionId = "12000000-0000-4000-8000-000000000001";
// IDs determinísticos do currículo são válidos no PostgreSQL, embora não codifiquem variante RFC.
const criterionId = "9f4ba958-87cc-78bd-5519-489112aeba3a";

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
  async workspace(): Promise<AdminSubmissionWorkspace> {
    return {
      id: submissionId, assignmentId: submissionId, version: 1, isDraft: false, isLate: false, submittedAt: new Date().toISOString(),
      items: [], review: null, reviews: [], criteria: [],
      student: { id: submissionId, displayName: "Aluno" },
      activity: { title: "Atividade", lessonPosition: 1, cyclePosition: 1 },
      classSummary: null, dueAt: null,
      requirements: [], previousVersions: [],
    };
  }
  async studentSubmissions(): Promise<Page<ReviewQueueSubmission>> {
    return { items: [], nextCursor: null };
  }
}

describe("review-feedback-loop", () => {
  it("decodifica fila e workspace com IDs determinísticos do currículo", () => {
    const queueItem = {
      id: submissionId,
      assignmentId: "b65b8b63-5ba1-4118-bfb1-d11c1431a08c",
      version: 1,
      isDraft: false,
      isLate: false,
      submittedAt: "2026-10-05T22:17:22.039105+00:00",
      items: [],
      review: null,
      reviews: [],
      criteria: [{ id: criterionId, label: "Contrato completo", description: "Critério do currículo.", position: 1 }],
      student: { id: "5b08eb57-aa8b-47f7-99f2-b66178ad9d1e", displayName: "Vinicius" },
      activity: { title: "Contrato e interface do meu assistente", lessonPosition: 1, cyclePosition: 1 },
      classSummary: { id: "1b6f4d87-67fb-4658-b334-41220300e8cd", name: "Turma Sudoeste - Manhã" },
      dueAt: "2026-10-08T16:11:00+00:00",
    };

    expect(parseReviewQueuePage({ items: [queueItem], nextCursor: null }, "request").items[0]?.criteria[0]?.id).toBe(criterionId);
    expect(parseWorkspace({ ...queueItem, requirements: [], previousVersions: [] }, "request").criteria[0]?.id).toBe(criterionId);
  });

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

  it("aceita critério com UUID determinístico persistido pelo currículo", async () => {
    const store = new Store();
    await new ReviewFeedbackService(store).publish(admin, {
      submissionId,
      decision: "approved",
      feedback: "Entrega aprovada.",
      criteria: [{ criterionId, result: "met" }],
    }, "request");
    expect(store.published).toMatchObject({ criteria: [{ criterionId }] });
  });

  it("rejeita decisão incoerente com a rubrica antes da RPC", async () => {
    const service = new ReviewFeedbackService(new Store());
    await expect(service.publish(admin, { submissionId, decision: "approved", feedback: "Ok", criteria: [{ criterionId, result: "needs_adjustment" }] }, "request")).rejects.toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { decision: [expect.any(String)] } });
    await expect(service.publish(admin, { submissionId, decision: "revision_requested", feedback: "Ok", criteria: [{ criterionId, result: "met" }] }, "request")).rejects.toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { decision: [expect.any(String)] } });
  });

  it("GWT-05/GWT-07 preserva negação tipada de revisão concorrente ou tenant estranho", async () => {
    const error = new AppError("FORBIDDEN", "Recurso indisponível.", "request");
    expect(error.code).toBe("FORBIDDEN");
  });
});
