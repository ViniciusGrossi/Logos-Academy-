import type { ActivityDetail, MeProfile, SubmissionDetail, UploadedFile } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { AssignmentPathSchema, DraftInputSchema, FilePathSchema, ProfilePatchSchema, SubmitInputSchema, UploadInputSchema } from "@/src/modules/activity-submission-files/schema";
import type { ActivitySubmissionFilesStore, StudentActor } from "@/src/modules/activity-submission-files/repository";

export class ActivitySubmissionFilesService {
  constructor(private readonly repository: ActivitySubmissionFilesStore) {}
  async profile(actor: StudentActor, requestId: string): Promise<MeProfile> { return { ...(await this.repository.getProfile(actor, requestId)), email: actor.email, role: actor.role }; }
  async patchProfile(actor: StudentActor, input: unknown, requestId: string): Promise<MeProfile> { return { ...(await this.repository.updateProfile(actor, parse(ProfilePatchSchema, input, requestId), requestId)), email: actor.email, role: actor.role }; }
  async detail(actor: StudentActor, assignmentId: unknown, requestId: string): Promise<ActivityDetail> { return this.repository.detail(actor, parse(AssignmentPathSchema, { assignmentId }, requestId).assignmentId, requestId); }
  async saveDraft(actor: StudentActor, input: unknown, requestId: string): Promise<SubmissionDetail> { return this.repository.saveDraft(actor, parse(DraftInputSchema, input, requestId), requestId); }
  async submit(actor: StudentActor, input: unknown, requestId: string): Promise<SubmissionDetail> {
    const parsed = parse(SubmitInputSchema, input, requestId);
    const detail = await this.repository.detail(actor, parsed.assignmentId, requestId);
    if (detail.requirements.some((requirement) => requirement.kind === "github_repository") && !(await this.repository.getProfile(actor, requestId)).githubUsername) {
      throw new AppError("VALIDATION_ERROR", "Configure seu GitHub antes de enviar esta atividade.", requestId, { githubUsername: ["GitHub obrigatório para esta atividade."] });
    }
    return this.repository.submit(actor, parsed.assignmentId, parsed.expectedDraftId, requestId);
  }
  async createUpload(actor: StudentActor, input: unknown, requestId: string): Promise<{ file: UploadedFile; signedUploadUrl: string; expiresAt: string }> { const created = await this.repository.createUpload(actor, parse(UploadInputSchema, input, requestId), requestId); const url = await this.repository.createSignedUploadUrl(created.storagePath, requestId); return { file: created.file, signedUploadUrl: url.signedUrl, expiresAt: url.expiresAt }; }
  async finalize(actor: StudentActor, fileId: unknown, requestId: string): Promise<UploadedFile> { return this.repository.finalize(actor, parse(FilePathSchema, { fileId }, requestId).fileId, requestId); }
  async download(actor: StudentActor, fileId: unknown, requestId: string): Promise<{ signedDownloadUrl: string; expiresAt: string }> { const file = await this.repository.fileMetadata(actor, parse(FilePathSchema, { fileId }, requestId).fileId, requestId); const url = await this.repository.createSignedDownloadUrl(file.storagePath, requestId); return { signedDownloadUrl: url.signedUrl, expiresAt: url.expiresAt }; }
}

function parse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, input: unknown, requestId: string): T { const parsed = schema.safeParse(input); if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados inválidos.", requestId); return parsed.data; }
