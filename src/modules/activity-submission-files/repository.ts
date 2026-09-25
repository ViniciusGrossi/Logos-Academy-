import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type {
  ActivityDetail,
  MeProfile,
  SubmissionDetail,
  UploadedFile,
} from "@/specs/api.contracts";
import type {
  DraftInput,
  ProfilePatchInput,
  UploadInput,
} from "@/src/modules/activity-submission-files/schema";

export type StudentActor = Readonly<{
  tenantId: string;
  userId: string;
  email: string;
  role: "student";
}>;
export type InternalFile = Readonly<{
  file: UploadedFile;
  storagePath: string;
}>;
export interface ActivitySubmissionFilesStore {
  getProfile(
    actor: StudentActor,
    requestId: string,
  ): Promise<Omit<MeProfile, "email" | "role">>;
  updateProfile(
    actor: StudentActor,
    input: ProfilePatchInput,
    requestId: string,
  ): Promise<Omit<MeProfile, "email" | "role">>;
  detail(
    actor: StudentActor,
    assignmentId: string,
    requestId: string,
    historyCursor?: string,
  ): Promise<ActivityDetail>;
  saveDraft(
    actor: StudentActor,
    input: DraftInput,
    requestId: string,
  ): Promise<SubmissionDetail>;
  submit(
    actor: StudentActor,
    assignmentId: string,
    expectedDraftId: string,
    requestId: string,
  ): Promise<SubmissionDetail>;
  createUpload(
    actor: StudentActor,
    input: UploadInput,
    requestId: string,
  ): Promise<InternalFile>;
  finalize(
    actor: StudentActor,
    fileId: string,
    requestId: string,
  ): Promise<UploadedFile>;
  fileMetadata(
    actor: StudentActor,
    fileId: string,
    requestId: string,
  ): Promise<InternalFile>;
  createSignedUploadUrl(
    path: string,
    requestId: string,
  ): Promise<{ signedUrl: string; expiresAt: string }>;
  createSignedDownloadUrl(
    path: string,
    requestId: string,
  ): Promise<{ signedUrl: string; expiresAt: string }>;
}

export class ActivitySubmissionFilesRepository implements ActivitySubmissionFilesStore {
  private readonly admin;
  constructor(private readonly server: SupabaseClient) {
    const env = getAdminSupabaseEnv();
    this.admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        db: { schema: "logos_academy" },
      },
    );
  }

  async getProfile(
    actor: StudentActor,
    requestId: string,
  ): Promise<Omit<MeProfile, "email" | "role">> {
    return this.profile(actor, {}, requestId);
  }
  async updateProfile(
    actor: StudentActor,
    input: ProfilePatchInput,
    requestId: string,
  ): Promise<Omit<MeProfile, "email" | "role">> {
    return this.profile(actor, input, requestId);
  }
  async detail(
    actor: StudentActor,
    assignmentId: string,
    requestId: string,
    historyCursor?: string,
  ): Promise<ActivityDetail> {
    return this.rpc(
      "student_activity_detail",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_assignment_id: assignmentId,
        p_encryption_key: this.encryptionKey(),
        p_history_cursor: historyCursor ?? null,
        p_history_limit: 5,
      },
      requestId,
    ) as Promise<ActivityDetail>;
  }
  async saveDraft(
    actor: StudentActor,
    input: DraftInput,
    requestId: string,
  ): Promise<SubmissionDetail> {
    return this.rpc(
      "student_save_draft",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_assignment_id: input.assignmentId,
        p_items: input.items,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<SubmissionDetail>;
  }
  async submit(
    actor: StudentActor,
    assignmentId: string,
    expectedDraftId: string,
    requestId: string,
  ): Promise<SubmissionDetail> {
    return this.rpc(
      "student_submit_activity",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_assignment_id: assignmentId,
        p_expected_draft_id: expectedDraftId,
        p_request_id: requestId,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<SubmissionDetail>;
  }
  async createUpload(
    actor: StudentActor,
    input: UploadInput,
    requestId: string,
  ): Promise<InternalFile> {
    return this.rpc(
      "student_create_upload",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_assignment_id: input.assignmentId,
        p_filename: input.filename,
        p_content_type: input.contentType,
        p_size_bytes: input.sizeBytes,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<InternalFile>;
  }
  async finalize(
    actor: StudentActor,
    fileId: string,
    requestId: string,
  ): Promise<UploadedFile> {
    return this.rpc(
      "student_finalize_upload",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_file_id: fileId,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<UploadedFile>;
  }
  async fileMetadata(
    actor: StudentActor,
    fileId: string,
    requestId: string,
  ): Promise<InternalFile> {
    return this.rpc(
      "student_file_metadata",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_file_id: fileId,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<InternalFile>;
  }
  async createSignedUploadUrl(
    path: string,
    requestId: string,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const { data, error } = await this.admin.storage
      .from("submissions")
      .createSignedUploadUrl(path);
    if (error || !data?.signedUrl)
      throw new AppError(
        "INTERNAL_ERROR",
        "Não foi possível preparar o upload.",
        requestId,
      );
    return { signedUrl: data.signedUrl, expiresAt: expiry() };
  }
  async createSignedDownloadUrl(
    path: string,
    requestId: string,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const { data, error } = await this.admin.storage
      .from("submissions")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl)
      throw new AppError(
        "INTERNAL_ERROR",
        "Não foi possível preparar o download.",
        requestId,
      );
    return { signedUrl: data.signedUrl, expiresAt: expiry() };
  }

  private async profile(
    actor: StudentActor,
    input: ProfilePatchInput,
    requestId: string,
  ): Promise<Omit<MeProfile, "email" | "role">> {
    if (input.displayName !== undefined) {
      const { error } = await this.server
        .from("users")
        .update({ display_name: input.displayName })
        .eq("id", actor.userId)
        .eq("tenant_id", actor.tenantId);
      if (error)
        throw new AppError(
          "INTERNAL_ERROR",
          "Não foi possível atualizar o perfil.",
          requestId,
        );
    }
    if (input.githubUsername !== undefined) {
      const { error } = await this.server
        .from("student_profiles")
        .update({ github_username: input.githubUsername })
        .eq("user_id", actor.userId)
        .eq("tenant_id", actor.tenantId);
      if (error)
        throw new AppError(
          "INTERNAL_ERROR",
          "Não foi possível atualizar o perfil.",
          requestId,
        );
    }
    const { data, error } = await this.server
      .from("users")
      .select("id, display_name")
      .eq("id", actor.userId)
      .eq("tenant_id", actor.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data || typeof data.display_name !== "string")
      throw new AppError("FORBIDDEN", "Perfil indisponível.", requestId);
    const { data: profile, error: profileError } = await this.server
      .from("student_profiles")
      .select("github_username")
      .eq("user_id", actor.userId)
      .eq("tenant_id", actor.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (profileError)
      throw new AppError("FORBIDDEN", "Perfil indispon\u00edvel.", requestId);
    return {
      id: data.id,
      displayName: data.display_name,
      githubUsername:
        profile && typeof profile.github_username === "string"
          ? profile.github_username
          : null,
    };
  }
  private async rpc(
    name: string,
    parameters: Record<string, unknown>,
    requestId: string,
  ): Promise<unknown> {
    const { data, error } = await this.admin
      .schema("logos_academy" as "public")
      .rpc(name as never, parameters as never);
    if (error || data === null) {
      if (
        (name === "student_submit_activity" ||
          name === "student_finalize_upload") &&
        error?.code === "23514"
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "Dados da entrega inválidos.",
          requestId,
          { items: ["Verifique requisitos e arquivo."] },
        );
      if (name === "student_submit_activity" && error?.code === "40001")
        throw new AppError(
          "CONFLICT",
          "O rascunho foi atualizado. Recarregue a atividade.",
          requestId,
        );
      throw new AppError(
        mapRpcError(error?.code),
        "Não foi possível concluir a operação.",
        requestId,
      );
    }
    return data;
  }
  private encryptionKey(): string {
    return getAdminSupabaseEnv().PII_ENCRYPTION_KEY;
  }
}

function expiry(): string {
  return new Date(Date.now() + 300_000).toISOString();
}
