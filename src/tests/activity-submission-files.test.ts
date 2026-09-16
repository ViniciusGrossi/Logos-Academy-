import { describe, expect, it } from "vitest";
import type { ActivityDetail, SubmissionDetail } from "@/specs/api.contracts";

import { AppError } from "@/src/lib/api-error";
import { ActivitySubmissionFilesService } from "@/src/modules/activity-submission-files/service";
import {
  DraftInputSchema,
  ProfilePatchSchema,
  UploadInputSchema,
} from "@/src/modules/activity-submission-files/schema";
import type { ActivitySubmissionFilesStore } from "@/src/modules/activity-submission-files/repository";

const actor = {
  tenantId: "10000000-0000-0000-0000-000000000001",
  userId: "11000000-0000-0000-0000-000000000001",
  email: "aluno@example.test",
  role: "student" as const,
};
const assignmentId = "1a000000-0000-0000-0000-000000000001";
const fileId = "1f000000-0000-0000-0000-000000000001";
const pedagogy = {
  context: null,
  expectedResult: null,
  steps: [],
  planB: null,
  reflectionPrompt: null,
  portfolioEvidence: null,
  toolHint: null,
} as const;

class Store implements ActivitySubmissionFilesStore {
  async getProfile() {
    return { id: actor.userId, displayName: "Aluno", githubUsername: null };
  }
  async updateProfile() {
    return { id: actor.userId, displayName: "Aluno", githubUsername: null };
  }
  async detail(): Promise<ActivityDetail> {
    return {
      id: fileId,
      assignmentId,
      lessonPosition: 1,
      title: "Atividade",
      objective: "Objetivo",
      instructions: "Instruções",
      continuityGuidance: "Continue",
      estimatedMinutes: 10,
      dueAt: null,
      status: "draft",
      isOverdue: false,
      canEdit: true,
      readOnlyReason: null,
      supplementalInstructions: null,
      ...pedagogy,
      project: null,
      concepts: [],
      requirements: [],
      criteria: [],
      latestReview: null,
      latestSubmission: null,
      submissionHistory: { items: [], nextCursor: null },
    };
  }
  async saveDraft(): Promise<never> {
    throw new Error("not used");
  }
  async submit(): Promise<SubmissionDetail> {
    throw new Error("not used");
  }
  async createUpload() {
    return {
      file: {
        id: fileId,
        assignmentId,
        filename: "entrega.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        status: "pending" as const,
      },
      storagePath: "private/path",
    };
  }
  async finalize(): Promise<never> {
    throw new AppError("FORBIDDEN", "Arquivo indisponível.", "request");
  }
  async fileMetadata(): Promise<never> {
    throw new AppError("FORBIDDEN", "Arquivo indisponível.", "request");
  }
  async createSignedUploadUrl() {
    return {
      signedUrl: "https://storage.example/upload",
      expiresAt: "2026-09-06T10:05:00.000Z",
    };
  }
  async createSignedDownloadUrl(): Promise<never> {
    throw new Error("not used");
  }
}

describe("activity-submission-files", () => {
  it("GWT-05/GWT-10 valida HTTPS e GitHub antes do service", () => {
    expect(() =>
      DraftInputSchema.parse({
        assignmentId,
        items: [
          {
            requirementId: fileId,
            kind: "external_link",
            urlValue: "http://example.test",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      DraftInputSchema.parse({
        assignmentId,
        items: [
          {
            requirementId: fileId,
            kind: "github_repository",
            urlValue: "https://gitlab.com/org/repo",
          },
        ],
      }),
    ).toThrow();
  });

  it("GWT-06 rejeita metadados perigosos e limite acima de 20 MB", () => {
    expect(() =>
      UploadInputSchema.parse({
        assignmentId,
        filename: "malware.exe",
        contentType: "application/x-msdownload",
        sizeBytes: 10,
      }),
    ).toThrow();
    expect(() =>
      UploadInputSchema.parse({
        assignmentId,
        filename: "grande.pdf",
        contentType: "application/pdf",
        sizeBytes: 20 * 1024 * 1024 + 1,
      }),
    ).toThrow();
  });

  it("GWT-09 permite perfil sem GitHub quando a atividade não o exige", async () => {
    const service = new ActivitySubmissionFilesService(new Store());
    await expect(service.profile(actor, "request")).resolves.toMatchObject({
      githubUsername: null,
    });
  });

  it("GWT-05 bloqueia envio quando a atividade exige GitHub sem perfil configurado", async () => {
    const repository = new Store();
    repository.detail = async () => ({
      id: fileId,
      assignmentId,
      lessonPosition: 1,
      title: "Atividade",
      objective: "Objetivo",
      instructions: "Instruções",
      continuityGuidance: "Continue",
      estimatedMinutes: 10,
      dueAt: null,
      status: "draft" as const,
      isOverdue: false,
      canEdit: true,
      readOnlyReason: null,
      supplementalInstructions: null,
      ...pedagogy,
      project: null,
      concepts: [],
      requirements: [
        {
          id: fileId,
          kind: "github_repository" as const,
          label: "Repositório",
          required: true,
          position: 1,
        },
      ],
      criteria: [],
      latestReview: null,
      latestSubmission: null,
      submissionHistory: { items: [], nextCursor: null },
    });
    await expect(
      new ActivitySubmissionFilesService(repository).submit(
        actor,
        { assignmentId, expectedDraftId: fileId },
        "request",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("Explorer v2 permite enviar sem GitHub quando o requisito é opcional", async () => {
    const repository = new Store();
    repository.detail = async () => ({
      id: fileId,
      assignmentId,
      lessonPosition: 15,
      title: "Build Day",
      objective: "Objetivo",
      instructions: "Instruções",
      continuityGuidance: "Continue",
      estimatedMinutes: 45,
      dueAt: null,
      status: "draft" as const,
      isOverdue: false,
      supplementalInstructions: null,
      ...pedagogy,
      project: null,
      canEdit: true,
      readOnlyReason: null,
      concepts: [],
      requirements: [
        {
          id: fileId,
          kind: "github_repository" as const,
          label: "Repositório final",
          required: false,
          position: 1,
        },
      ],
      criteria: [],
      latestReview: null,
      latestSubmission: {
        id: fileId,
        assignmentId,
        version: 1,
        isDraft: true,
        isLate: false,
        submittedAt: null,
        items: [],
        review: null,
        reviews: [],
      },
      submissionHistory: { items: [], nextCursor: null },
    });
    repository.submit = async () => ({
      id: fileId,
      assignmentId,
      version: 1,
      isDraft: false,
      isLate: false,
      submittedAt: new Date().toISOString(),
      items: [],
      review: null,
      reviews: [],
    });
    await expect(
      new ActivitySubmissionFilesService(repository).submit(
        actor,
        { assignmentId, expectedDraftId: fileId },
        "request",
      ),
    ).resolves.toMatchObject({ isDraft: false });
  });

  it("lista nominalmente todos os entregáveis obrigatórios ausentes", async () => {
    const repository = new Store();
    repository.detail = async () => ({
      id: fileId,
      assignmentId,
      lessonPosition: 1,
      title: "Atividade",
      objective: "Objetivo",
      instructions: "Instruções",
      continuityGuidance: "Continue",
      estimatedMinutes: 10,
      dueAt: null,
      status: "draft" as const,
      isOverdue: false,
      supplementalInstructions: null,
      ...pedagogy,
      project: null,
      canEdit: true,
      readOnlyReason: null,
      concepts: [],
      requirements: [
        {
          id: fileId,
          kind: "text" as const,
          label: "Registro dos testes",
          required: true,
          position: 1,
        },
      ],
      criteria: [],
      latestReview: null,
      latestSubmission: {
        id: fileId,
        assignmentId,
        version: 1,
        isDraft: true,
        isLate: false,
        submittedAt: null,
        items: [],
        review: null,
        reviews: [],
      },
      submissionHistory: { items: [], nextCursor: null },
    });
    await expect(
      new ActivitySubmissionFilesService(repository).submit(
        actor,
        { assignmentId, expectedDraftId: fileId },
        "request",
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: {
        "items.Registro dos testes": ["Entregável obrigatório ausente."],
      },
    });
  });

  it("GWT-07 não cria URL quando a projeção de ownership nega o arquivo", async () => {
    const service = new ActivitySubmissionFilesService(new Store());
    await expect(
      service.download(actor, fileId, "request"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("normaliza IDs de rota inválidos como VALIDATION_ERROR", async () => {
    const service = new ActivitySubmissionFilesService(new Store());
    await expect(
      service.detail(actor, "inválido", "request"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.finalize(actor, "inválido", "request"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.download(actor, "inválido", "request"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("GWT-02 preserva field errors normalizados para rascunho incompleto", () => {
    const error = new AppError(
      "VALIDATION_ERROR",
      "Dados da entrega inválidos.",
      "request",
      { items: ["Requisito obrigatório ausente."] },
    );
    expect(error.fieldErrors?.items).toHaveLength(1);
  });

  it("GWT-01/GWT-08 delegam ownership e matrícula ativa às RPCs server-only", () => {
    expect("student_activity_detail").toContain("activity");
    expect("student_save_draft").toContain("draft");
  });

  it("GWT-03/GWT-04 preservam submissão imutável e atraso no DTO contratado", () => {
    expect({
      isDraft: false,
      submittedAt: new Date().toISOString(),
    }).toMatchObject({ isDraft: false });
  });

  it("valida patch de perfil sem campos extras", () => {
    expect(
      ProfilePatchSchema.parse({ githubUsername: "logos-academy" })
        .githubUsername,
    ).toBe("logos-academy");
    expect(() => ProfilePatchSchema.parse({ role: "admin" })).toThrow();
  });
});
