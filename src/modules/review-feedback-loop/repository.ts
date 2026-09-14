import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ActivityCriterion, Page, ReviewDetail, ReviewQueueSubmission, SubmissionDetail } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type { PublishReviewInput, ReviewQueueQuery } from "@/src/modules/review-feedback-loop/schema";

export type AdminActor = Readonly<{ tenantId: string; userId: string; role: "admin" }>;
export interface ReviewFeedbackStore {
  page(actor: AdminActor, query: ReviewQueueQuery, requestId: string): Promise<Page<ReviewQueueSubmission>>;
  publish(actor: AdminActor, input: PublishReviewInput, requestId: string): Promise<ReviewDetail>;
}

export class ReviewFeedbackRepository implements ReviewFeedbackStore {
  private readonly client: SupabaseClient;

  constructor() {
    const env = getAdminSupabaseEnv();
    this.client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async page(actor: AdminActor, query: ReviewQueueQuery, requestId: string): Promise<Page<ReviewQueueSubmission>> {
    const result = await this.rpc("admin_reviews_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_encryption_key: this.encryptionKey(),
      p_class_id: query.classId ?? null,
      p_overdue_only: query.overdueOnly,
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    return parsePage(result, requestId);
  }

  async publish(actor: AdminActor, input: PublishReviewInput, requestId: string): Promise<ReviewDetail> {
    return parseReview(await this.rpc("admin_publish_review", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_submission_id: input.submissionId,
      p_decision: input.decision,
      p_feedback: input.feedback,
      p_criteria: input.criteria,
      p_encryption_key: this.encryptionKey(),
      p_request_id: requestId,
    }, requestId), requestId);
  }

  private async rpc(name: string, parameters: Record<string, unknown>, requestId: string): Promise<unknown> {
    const { data, error } = await this.client.schema("logos_academy" as "public").rpc(name as never, parameters as never);
    if (error || data === null) {
      const code = error?.code === "22023" ? "VALIDATION_ERROR" : mapRpcError(error?.code);
      throw new AppError(code, "Não foi possível concluir a revisão.", requestId);
    }
    return data;
  }

  private encryptionKey(): string { return getAdminSupabaseEnv().PII_ENCRYPTION_KEY; }
}

function parsePage(value: unknown, requestId: string): Page<ReviewQueueSubmission> {
  if (!isRecord(value) || !Array.isArray(value.items) || !(typeof value.nextCursor === "string" || value.nextCursor === null)) {
    throw new AppError("INTERNAL_ERROR", "Resposta de revisões inválida.", requestId);
  }
  return { items: value.items.map((item) => parseQueueSubmission(item, requestId)), nextCursor: value.nextCursor };
}

function parseQueueSubmission(value: unknown, requestId: string): ReviewQueueSubmission {
  if (!isRecord(value) || !Array.isArray(value.criteria)) {
    throw new AppError("INTERNAL_ERROR", "Rubrica da entrega inv\u00e1lida.", requestId);
  }
  return { ...parseSubmission(value, requestId), criteria: value.criteria.map((criterion) => parseActivityCriterion(criterion, requestId)) };
}

function parseActivityCriterion(value: unknown, requestId: string): ActivityCriterion {
  if (!isRecord(value) || !isUuid(value.id) || typeof value.label !== "string" || typeof value.description !== "string" || !isPositiveInteger(value.position)) {
    throw new AppError("INTERNAL_ERROR", "Crit\u00e9rio da atividade inv\u00e1lido.", requestId);
  }
  return { id: value.id, label: value.label, description: value.description, position: value.position };
}

function parseSubmission(value: unknown, requestId: string): SubmissionDetail {
  if (!isRecord(value) || !isUuid(value.id) || !isUuid(value.assignmentId) || !isPositiveInteger(value.version)
    || typeof value.isDraft !== "boolean" || typeof value.isLate !== "boolean" || !(typeof value.submittedAt === "string" || value.submittedAt === null) || !Array.isArray(value.items) || !Array.isArray(value.reviews)) {
    throw new AppError("INTERNAL_ERROR", "Resposta de entrega inválida.", requestId);
  }
  return {
    id: value.id, assignmentId: value.assignmentId, version: value.version, isDraft: value.isDraft, isLate: value.isLate, submittedAt: value.submittedAt,
    items: value.items.map((item) => parseSubmissionItem(item, requestId)),
    review: value.review === null ? null : parseReview(value.review, requestId),
    reviews: value.reviews.map((review) => parseReview(review, requestId)),
  };
}

function parseSubmissionItem(value: unknown, requestId: string): SubmissionDetail["items"][number] {
  if (!isRecord(value) || !isUuid(value.id) || !isUuid(value.requirementId)
    || !isKind(value.kind) || !(typeof value.textValue === "string" || value.textValue === null || value.textValue === undefined)
    || !(typeof value.urlValue === "string" || value.urlValue === null || value.urlValue === undefined)
    || !(isUuid(value.fileId) || value.fileId === null || value.fileId === undefined)
    || !(typeof value.fileName === "string" || value.fileName === null || value.fileName === undefined)) {
    throw new AppError("INTERNAL_ERROR", "Item de entrega inválido.", requestId);
  }
  return {
    id: value.id, requirementId: value.requirementId, kind: value.kind,
    ...(typeof value.textValue === "string" ? { textValue: value.textValue } : {}),
    ...(typeof value.urlValue === "string" ? { urlValue: value.urlValue } : {}),
    ...(isUuid(value.fileId) ? { fileId: value.fileId } : {}),
    fileName: typeof value.fileName === "string" ? value.fileName : null,
  };
}

function parseReview(value: unknown, requestId: string): ReviewDetail {
  if (!isRecord(value) || !isUuid(value.id) || !isDecision(value.decision) || typeof value.feedback !== "string"
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

function parseCriterion(value: unknown, requestId: string): ReviewDetail["criteria"][number] {
  if (!isRecord(value) || !isUuid(value.criterionId) || !isResult(value.result)
    || !(typeof value.comment === "string" || value.comment === null)) {
    throw new AppError("INTERNAL_ERROR", "Critério de feedback inválido.", requestId);
  }
  return { criterionId: value.criterionId, result: value.result, comment: value.comment };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value); }
function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value > 0; }
function isKind(value: unknown): value is SubmissionDetail["items"][number]["kind"] { return value === "text" || value === "file" || value === "external_link" || value === "github_repository"; }
function isDecision(value: unknown): value is ReviewDetail["decision"] { return value === "approved" || value === "revision_requested"; }
function isResult(value: unknown): value is ReviewDetail["criteria"][number]["result"] { return value === "met" || value === "needs_adjustment"; }
