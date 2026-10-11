import type { ActivityCriterion, ActivityRequirement, AdminSubmissionWorkspace, Page, ReviewDetail, ReviewOverview, ReviewOverviewActivity, ReviewOverviewStudent, ReviewQueueSubmission, SubmissionDetail } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { isPostgresUuid } from "@/src/modules/review-feedback-loop/schema";

export function parseReviewQueuePage(value: unknown, requestId: string): Page<ReviewQueueSubmission> {
  if (!isRecord(value) || !Array.isArray(value.items) || !(typeof value.nextCursor === "string" || value.nextCursor === null)) {
    throw new AppError("INTERNAL_ERROR", "Resposta de revisões inválida.", requestId);
  }
  return { items: value.items.map((item) => parseQueueSubmission(item, requestId)), nextCursor: value.nextCursor };
}

export function parseReviewOverview(value: unknown, requestId: string): ReviewOverview {
  if (!isRecord(value) || !isRecord(value.classSummary) || !isPostgresUuid(value.classSummary.id)
    || typeof value.classSummary.name !== "string" || !Array.isArray(value.activities)
    || !Array.isArray(value.students) || !(isPostgresUuid(value.selectedActivityId) || value.selectedActivityId === null)) {
    throw new AppError("INTERNAL_ERROR", "Mapa de evidências inválido.", requestId);
  }
  return {
    classSummary: { id: value.classSummary.id, name: value.classSummary.name },
    activities: value.activities.map((activity) => parseOverviewActivity(activity, requestId)),
    selectedActivityId: value.selectedActivityId,
    students: value.students.map((student) => parseOverviewStudent(student, requestId)),
  };
}

function parseOverviewActivity(value: unknown, requestId: string): ReviewOverviewActivity {
  if (!isRecord(value) || !isPostgresUuid(value.id) || typeof value.title !== "string"
    || !isPositiveInteger(value.lessonPosition) || !isPositiveInteger(value.cyclePosition)
    || !isNonNegativeInteger(value.awaitingReviewCount)) {
    throw new AppError("INTERNAL_ERROR", "Atividade do mapa de evidências inválida.", requestId);
  }
  return {
    id: value.id,
    title: value.title,
    lessonPosition: value.lessonPosition,
    cyclePosition: value.cyclePosition,
    awaitingReviewCount: value.awaitingReviewCount,
  };
}

function parseOverviewStudent(value: unknown, requestId: string): ReviewOverviewStudent {
  if (!isRecord(value) || !isPostgresUuid(value.studentId) || !isPostgresUuid(value.enrollmentId)
    || typeof value.displayName !== "string" || !(isPostgresUuid(value.assignmentId) || value.assignmentId === null)
    || !isRosterStatus(value.status) || !(typeof value.dueAt === "string" || value.dueAt === null)
    || !(isPostgresUuid(value.submissionId) || value.submissionId === null)
    || !(isPositiveInteger(value.version) || value.version === null)
    || !(typeof value.submittedAt === "string" || value.submittedAt === null)
    || !(typeof value.reviewedAt === "string" || value.reviewedAt === null)
    || typeof value.isLate !== "boolean") {
    throw new AppError("INTERNAL_ERROR", "Aluno do mapa de evidências inválido.", requestId);
  }
  return {
    studentId: value.studentId,
    enrollmentId: value.enrollmentId,
    displayName: value.displayName,
    assignmentId: value.assignmentId,
    status: value.status,
    dueAt: value.dueAt,
    submissionId: value.submissionId,
    version: value.version,
    submittedAt: value.submittedAt,
    reviewedAt: value.reviewedAt,
    isLate: value.isLate,
  };
}

export function parseReview(value: unknown, requestId: string): ReviewDetail {
  if (!isRecord(value) || !isPostgresUuid(value.id) || !isDecision(value.decision) || typeof value.feedback !== "string"
    || typeof value.reviewerName !== "string" || typeof value.reviewedAt !== "string"
    || !(typeof value.seenAt === "string" || value.seenAt === null) || !Array.isArray(value.criteria)) {
    throw new AppError("INTERNAL_ERROR", "Resposta de feedback inválida.", requestId);
  }
  return {
    id: value.id, decision: value.decision, feedback: value.feedback, reviewerName: value.reviewerName,
    reviewedAt: value.reviewedAt, seenAt: value.seenAt,
    criteria: value.criteria.map((criterion) => parseCriterion(criterion, requestId)),
  };
}

export function parseWorkspace(value: unknown, requestId: string): AdminSubmissionWorkspace {
  if (!isRecord(value) || !Array.isArray(value.requirements) || !Array.isArray(value.previousVersions)) {
    throw new AppError("INTERNAL_ERROR", "Workspace de revisão inválido.", requestId);
  }
  return {
    ...parseQueueSubmission(value, requestId),
    requirements: value.requirements.map((requirement) => parseRequirement(requirement, requestId)),
    previousVersions: value.previousVersions.map((submission) => parseSubmission(submission, requestId)),
  };
}

function parseQueueSubmission(value: unknown, requestId: string): ReviewQueueSubmission {
  if (!isRecord(value) || !Array.isArray(value.criteria) || !(typeof value.dueAt === "string" || value.dueAt === null)) {
    throw new AppError("INTERNAL_ERROR", "Rubrica da entrega inválida.", requestId);
  }
  return {
    ...parseSubmission(value, requestId),
    criteria: value.criteria.map((criterion) => parseActivityCriterion(criterion, requestId)),
    student: parseStudentRef(value.student, requestId),
    activity: parseActivityRef(value.activity, requestId),
    classSummary: parseClassSummaryRef(value.classSummary ?? null, requestId),
    dueAt: value.dueAt,
  };
}

function parseStudentRef(value: unknown, requestId: string): ReviewQueueSubmission["student"] {
  if (!isRecord(value) || !isPostgresUuid(value.id) || typeof value.displayName !== "string") {
    throw new AppError("INTERNAL_ERROR", "Aluno da entrega inválido.", requestId);
  }
  return { id: value.id, displayName: value.displayName };
}

function parseActivityRef(value: unknown, requestId: string): ReviewQueueSubmission["activity"] {
  if (!isRecord(value) || typeof value.title !== "string" || !isPositiveInteger(value.lessonPosition) || !isPositiveInteger(value.cyclePosition)) {
    throw new AppError("INTERNAL_ERROR", "Atividade da entrega inválida.", requestId);
  }
  return { title: value.title, lessonPosition: value.lessonPosition, cyclePosition: value.cyclePosition };
}

function parseClassSummaryRef(value: unknown, requestId: string): ReviewQueueSubmission["classSummary"] {
  if (value === null) return null;
  if (!isRecord(value) || !isPostgresUuid(value.id) || typeof value.name !== "string") {
    throw new AppError("INTERNAL_ERROR", "Turma da entrega inválida.", requestId);
  }
  return { id: value.id, name: value.name };
}

function parseRequirement(value: unknown, requestId: string): ActivityRequirement {
  if (!isRecord(value) || !isPostgresUuid(value.id) || !isKind(value.kind) || typeof value.label !== "string" || typeof value.required !== "boolean" || !isPositiveInteger(value.position)) {
    throw new AppError("INTERNAL_ERROR", "Requisito da atividade inválido.", requestId);
  }
  return { id: value.id, kind: value.kind, label: value.label, required: value.required, position: value.position };
}

function parseActivityCriterion(value: unknown, requestId: string): ActivityCriterion {
  if (!isRecord(value) || !isPostgresUuid(value.id) || typeof value.label !== "string" || typeof value.description !== "string" || !isPositiveInteger(value.position)) {
    throw new AppError("INTERNAL_ERROR", "Critério da atividade inválido.", requestId);
  }
  return { id: value.id, label: value.label, description: value.description, position: value.position };
}

function parseSubmission(value: unknown, requestId: string): SubmissionDetail {
  if (!isRecord(value) || !isPostgresUuid(value.id) || !isPostgresUuid(value.assignmentId) || !isPositiveInteger(value.version)
    || typeof value.isDraft !== "boolean" || typeof value.isLate !== "boolean" || !(typeof value.submittedAt === "string" || value.submittedAt === null) || !Array.isArray(value.items) || !Array.isArray(value.reviews)) {
    console.error(`[${requestId}] review submission contract mismatch`, {
      receivedFields: isRecord(value) ? Object.keys(value).sort() : typeof value,
      requiredFields: ["assignmentId", "id", "isDraft", "isLate", "items", "reviews", "submittedAt", "version"],
    });
    throw new AppError("INTERNAL_ERROR", "A fila de revisões está temporariamente indisponível. Verifique se as migrations mais recentes foram aplicadas.", requestId);
  }
  return {
    id: value.id, assignmentId: value.assignmentId, version: value.version, isDraft: value.isDraft, isLate: value.isLate, submittedAt: value.submittedAt,
    items: value.items.map((item) => parseSubmissionItem(item, requestId)),
    review: value.review === null ? null : parseReview(value.review, requestId),
    reviews: value.reviews.map((review) => parseReview(review, requestId)),
  };
}

function parseSubmissionItem(value: unknown, requestId: string): SubmissionDetail["items"][number] {
  if (!isRecord(value) || !isPostgresUuid(value.id) || !isPostgresUuid(value.requirementId)
    || !isKind(value.kind) || !(typeof value.textValue === "string" || value.textValue === null || value.textValue === undefined)
    || !(typeof value.urlValue === "string" || value.urlValue === null || value.urlValue === undefined)
    || !(isPostgresUuid(value.fileId) || value.fileId === null || value.fileId === undefined)
    || !(typeof value.fileName === "string" || value.fileName === null || value.fileName === undefined)) {
    throw new AppError("INTERNAL_ERROR", "Item de entrega inválido.", requestId);
  }
  return {
    id: value.id, requirementId: value.requirementId, kind: value.kind,
    ...(typeof value.textValue === "string" ? { textValue: value.textValue } : {}),
    ...(typeof value.urlValue === "string" ? { urlValue: value.urlValue } : {}),
    ...(isPostgresUuid(value.fileId) ? { fileId: value.fileId } : {}),
    fileName: typeof value.fileName === "string" ? value.fileName : null,
  };
}

function parseCriterion(value: unknown, requestId: string): ReviewDetail["criteria"][number] {
  if (!isRecord(value) || !isPostgresUuid(value.criterionId) || !isResult(value.result)
    || !(typeof value.comment === "string" || value.comment === null)) {
    throw new AppError("INTERNAL_ERROR", "Critério de feedback inválido.", requestId);
  }
  return { criterionId: value.criterionId, result: value.result, comment: value.comment };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value > 0; }
function isNonNegativeInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0; }
function isKind(value: unknown): value is SubmissionDetail["items"][number]["kind"] { return value === "text" || value === "file" || value === "external_link" || value === "github_repository"; }
function isDecision(value: unknown): value is ReviewDetail["decision"] { return value === "approved" || value === "revision_requested"; }
function isResult(value: unknown): value is ReviewDetail["criteria"][number]["result"] { return value === "met" || value === "needs_adjustment"; }
function isRosterStatus(value: unknown): value is ReviewOverviewStudent["status"] {
  return value === "not_assigned" || value === "locked" || value === "available" || value === "draft"
    || value === "submitted" || value === "revision_requested" || value === "approved";
}
