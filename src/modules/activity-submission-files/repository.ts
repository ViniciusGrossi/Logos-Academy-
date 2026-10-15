import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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
/** SR-A7 (Release 2): actor mínimo aceito tanto por aluno quanto por admin. */
export type FileActor = Readonly<{ tenantId: string; userId: string }>;
/** SR-A7 (Release 2): metadados suficientes para assinar o download como admin. */
export type AdminFileTarget = Readonly<{
  storagePath: string;
  filename: string;
  contentType: string;
}>;
export type PendingUploadInspection = Readonly<{ state: "pending"; bytes: Uint8Array; contentType: string; sizeBytes: number; storagePath: string }>;
export type UploadInspection = PendingUploadInspection | Readonly<{ state: "ready"; file: UploadedFile }>;
export interface ActivitySubmissionFilesStore {
  uploadInspection(actor: StudentActor, fileId: string, requestId: string): Promise<UploadInspection>;
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
    verified: PendingUploadInspection,
  ): Promise<UploadedFile>;
  fileMetadata(
    actor: StudentActor,
    fileId: string,
    requestId: string,
  ): Promise<InternalFile>;
  /** SR-A7 (Release 2): admin do mesmo tenant abrindo o anexo de uma entrega. */
  adminFileMetadata(
    actor: FileActor,
    fileId: string,
    requestId: string,
  ): Promise<AdminFileTarget>;
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
    verified: PendingUploadInspection,
  ): Promise<UploadedFile> {
    // The client can still overwrite its original pending object. Publish only
    // these inspected bytes to a new path which no client-owned row references.
    const snapshotPath = `${verified.storagePath}/verified/${crypto.randomUUID()}`;
    const { error } = await this.admin.storage.from("submissions").upload(snapshotPath, verified.bytes, {
      contentType: verified.contentType, upsert: false,
    });
    if (error) throw new AppError("INTERNAL_ERROR", "Não foi possível preservar o arquivo verificado.", requestId);
    return this.rpc(
      "student_finalize_verified_upload",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_file_id: fileId,
        p_verified_storage_path: snapshotPath,
        p_encryption_key: this.encryptionKey(),
      },
      requestId,
    ) as Promise<UploadedFile>;
  }
  async uploadInspection(actor: StudentActor, fileId: string, requestId: string): Promise<UploadInspection> {
    const { data, error } = await this.admin.schema("logos_academy").from("uploaded_files")
      .select("storage_path, student_profile_id, activity_assignment_id, content_type, size_bytes, status")
      .eq("id", fileId).eq("tenant_id", actor.tenantId).eq("uploaded_by_user_id", actor.userId)
      .in("status", ["pending", "ready"]).is("deleted_at", null).maybeSingle();
    if (error || !data) throw new AppError("FORBIDDEN", "Arquivo indisponível.", requestId);
    const parsed = z.object({
      storage_path: z.string(), student_profile_id: z.string().uuid(), activity_assignment_id: z.string().uuid(),
      content_type: z.string(), size_bytes: z.number().int().min(1).max(20 * 1024 * 1024),
      status: z.enum(["pending", "ready"]),
    }).safeParse(data);
    if (!parsed.success) throw new AppError("INTERNAL_ERROR", "Metadados de arquivo inválidos.", requestId);
    const target = parsed.data;
    const base = `${actor.tenantId}/${target.student_profile_id}/${target.activity_assignment_id}/${fileId}`;
    if (target.status === "ready" && target.storage_path.startsWith(`${base}/verified/`)
      && z.string().uuid().safeParse(target.storage_path.slice(`${base}/verified/`.length)).success) {
      return { state: "ready", file: (await this.fileMetadata(actor, fileId, requestId)).file };
    }
    if (target.status !== "pending" || target.storage_path !== base) {
      throw new AppError("FORBIDDEN", "Arquivo indisponível.", requestId);
    }
    const { data: signed, error: signedError } = await this.admin.storage.from("submissions").createSignedUrl(target.storage_path, 30);
    if (signedError || !signed) throw new AppError("INTERNAL_ERROR", "Não foi possível verificar o arquivo.", requestId);
    const response = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(10_000), redirect: "error", cache: "no-store" });
    if (!response.ok || !response.body) throw new AppError("INTERNAL_ERROR", "Não foi possível verificar o arquivo.", requestId);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > target.size_bytes) throw new AppError("VALIDATION_ERROR", "Arquivo excede o tamanho autorizado.", requestId);
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { state: "pending", bytes, contentType: target.content_type, sizeBytes: target.size_bytes, storagePath: base };
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
  async adminFileMetadata(
    actor: FileActor,
    fileId: string,
    requestId: string,
  ): Promise<AdminFileTarget> {
    const result = (await this.rpc(
      "admin_file_download_target",
      {
        p_tenant_id: actor.tenantId,
        p_actor_user_id: actor.userId,
        p_file_id: fileId,
      },
      requestId,
    )) as Record<string, unknown>;
    if (
      typeof result.storagePath !== "string" ||
      typeof result.filename !== "string" ||
      typeof result.contentType !== "string"
    ) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Metadados de arquivo inválidos.",
        requestId,
      );
    }
    return {
      storagePath: result.storagePath,
      filename: result.filename,
      contentType: result.contentType,
    };
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
