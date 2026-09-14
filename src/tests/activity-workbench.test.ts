import { describe, expect, it } from "vitest";
import type { ActivityDetail, SubmissionDetail } from "@/specs/api.contracts";
import { latestReviewedSubmission, restorationSource } from "@/components/prototype/activity-detail";

const assignmentId = "10000000-0000-4000-8000-000000000001";
const reviewed: SubmissionDetail = {
  id: "10000000-0000-4000-8000-000000000002",
  assignmentId,
  version: 1,
  isDraft: false,
  isLate: false,
  submittedAt: "2026-09-11T18:00:00.000Z",
  items: [{ id: "10000000-0000-4000-8000-000000000003", requirementId: "10000000-0000-4000-8000-000000000004", kind: "text", textValue: "Decisão preservada", fileName: null }],
  review: { id: "10000000-0000-4000-8000-000000000005", decision: "revision_requested", feedback: "Ajuste o contraste.", reviewerName: "Orientador", reviewedAt: "2026-09-12T10:00:00.000Z", seenAt: null, criteria: [] },
  reviews: [],
};
const emptyDraft: SubmissionDetail = { id: "10000000-0000-4000-8000-000000000006", assignmentId, version: 2, isDraft: true, isLate: false, submittedAt: null, items: [], review: null, reviews: [] };
const activity: ActivityDetail = {
  id: "10000000-0000-4000-8000-000000000007", assignmentId, lessonPosition: 1,
  title: "Atividade", objective: "Objetivo", instructions: "Instruções", continuityGuidance: "Continue",
  estimatedMinutes: 20, dueAt: null, status: "revision_requested", isOverdue: false, canEdit: true, readOnlyReason: null, supplementalInstructions: null,
  context: null, expectedResult: null, steps: [], planB: null, reflectionPrompt: null, portfolioEvidence: null, toolHint: null,
  project: null, concepts: [], requirements: [], criteria: [], latestReview: reviewed.review, latestSubmission: emptyDraft, submissionHistory: { items: [reviewed], nextCursor: null },
};

describe("activity workbench", () => {
  it("mantém feedback e evidências quando a revisão cria um rascunho vazio", () => {
    const source = latestReviewedSubmission("items" in activity.submissionHistory ? activity.submissionHistory.items : activity.submissionHistory);
    expect(source?.review?.feedback).toBe("Ajuste o contraste.");
    expect(restorationSource(activity, source)?.items[0]?.textValue).toBe("Decisão preservada");
  });
});
