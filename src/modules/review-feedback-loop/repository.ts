import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { AdminSubmissionWorkspace, Page, ReviewDetail, ReviewOverview, ReviewQueueSubmission } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import { parseReview, parseReviewOverview, parseReviewQueuePage, parseWorkspace } from "@/src/modules/review-feedback-loop/contract";
import type { PublishReviewInput, ReviewOverviewQuery, ReviewQueueQuery, StudentSubmissionsQuery } from "@/src/modules/review-feedback-loop/schema";

export type AdminActor = Readonly<{ tenantId: string; userId: string; role: "admin" }>;
export interface ReviewFeedbackStore {
  page(actor: AdminActor, query: ReviewQueueQuery, requestId: string): Promise<Page<ReviewQueueSubmission>>;
  overview(actor: AdminActor, query: ReviewOverviewQuery, requestId: string): Promise<ReviewOverview>;
  publish(actor: AdminActor, input: PublishReviewInput, requestId: string): Promise<ReviewDetail>;
  /** SR-A5 (Release 2): workspace único de revisão. */
  workspace(actor: AdminActor, submissionId: string, requestId: string): Promise<AdminSubmissionWorkspace>;
  /** SR-A6 (Release 2): entregas do aluno na ficha administrativa. */
  studentSubmissions(actor: AdminActor, query: StudentSubmissionsQuery, requestId: string): Promise<Page<ReviewQueueSubmission>>;
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
    return parseReviewQueuePage(result, requestId);
  }

  async overview(actor: AdminActor, query: ReviewOverviewQuery, requestId: string): Promise<ReviewOverview> {
    return parseReviewOverview(await this.rpc("admin_review_overview", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_class_id: query.classId,
      p_activity_template_id: query.activityId ?? null,
    }, requestId), requestId);
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

  async workspace(actor: AdminActor, submissionId: string, requestId: string): Promise<AdminSubmissionWorkspace> {
    return parseWorkspace(await this.rpc("admin_submission_workspace", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_submission_id: submissionId,
      p_encryption_key: this.encryptionKey(),
    }, requestId), requestId);
  }

  async studentSubmissions(actor: AdminActor, query: StudentSubmissionsQuery, requestId: string): Promise<Page<ReviewQueueSubmission>> {
    const result = await this.rpc("admin_student_submissions_page", {
      p_tenant_id: actor.tenantId,
      p_actor_user_id: actor.userId,
      p_student_profile_id: query.studentId,
      p_encryption_key: this.encryptionKey(),
      p_cursor: query.cursor ?? null,
      p_limit: query.limit,
    }, requestId);
    return parseReviewQueuePage(result, requestId);
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
