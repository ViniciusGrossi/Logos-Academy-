/** Contratos HTTP do MVP Logos Academy Platform. Sem implementação. */

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type Role = "admin" | "student";
export type EnrollmentKind = "class" | "individual";
export type EnrollmentStatus =
  "invited" | "active" | "paused" | "completed" | "cancelled";
export type SessionStatus =
  "scheduled" | "completed" | "rescheduled" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "excused_absence";
export type AssignmentStatus =
  | "locked"
  | "available"
  | "draft"
  | "submitted"
  | "revision_requested"
  | "approved";
export type SubmissionItemKind =
  "text" | "file" | "external_link" | "github_repository";
export type ReviewDecision = "approved" | "revision_requested";
export type CriterionResult = "met" | "needs_adjustment";

export interface ApiError {
  code:
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  requestId: string;
}

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiError };

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: readonly T[];
  nextCursor: string | null;
}

export interface UserSummary {
  id: UUID;
  email: string;
  displayName: string;
  role: Role;
}

export interface MeProfile extends UserSummary {
  githubUsername: string | null;
}

export interface StudentSummary {
  id: UUID;
  displayName: string;
  email: string;
  githubUsername: string | null;
  activeEnrollmentCount: number;
  pendingAssignmentCount: number;
  pendingMakeupCount: number;
}

export interface GuardianRecord {
  id: UUID;
  name: string;
  relationship: string;
  email: string | null;
  phone: string | null;
}

export type GuardianInput = {
  name: string;
  relationship: string;
} & ({ email: string; phone?: string } | { email?: string; phone: string });

export interface ConsentRecord {
  id: UUID;
  status: "pending" | "verified" | "revoked";
  termVersion: string;
  signedAt: ISODate | null;
  physicalCopyArchived: boolean;
  verifiedAt: ISODateTime | null;
  revokedAt: ISODateTime | null;
  revocationReason: string | null;
}

export interface ScheduleInput {
  startsOn: ISODate;
  weekdays: readonly [number, number];
  startsAtLocal: readonly [string, string];
  durationMinutes: number;
  timezone: string;
}

export type EnrollmentPlacementInput =
  | { kind: "class"; classId: UUID }
  | { kind: "individual"; individualSchedule: ScheduleInput };

export interface ClassSummary {
  id: UUID;
  name: string;
  curriculumName: string;
  startsOn: ISODate;
  status: "planned" | "active" | "completed" | "cancelled";
  activeStudentCount: number;
}

export interface EnrollmentSummary {
  id: UUID;
  studentId: UUID;
  studentName: string;
  curriculumName: string;
  kind: EnrollmentKind;
  classId: UUID | null;
  status: EnrollmentStatus;
  activatedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
}

export interface SessionSummary {
  id: UUID;
  lessonPosition: number;
  lessonTitle: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  status: SessionStatus;
}

export interface AttendanceEntry {
  enrollmentId: UUID;
  studentName: string;
  status: AttendanceStatus;
  privateNote: string | null;
  makeup: { completedAt: ISODateTime; makeupSessionId: UUID | null } | null;
}

/* ---------------------------------------------------------------------------
 * Atlas — central de conhecimento (spec: docs/specs/student-knowledge-atlas.md v2)
 * Conceitos, Prompts e Sistemas de Design com CMS editorial por blocos.
 * Nenhum bloco aceita HTML, CSS ou JavaScript arbitrário.
 * ------------------------------------------------------------------------- */

export type KnowledgeItemKind = "concept" | "prompt" | "design_system";
export type LibraryResourceKind = Exclude<KnowledgeItemKind, "concept">;
export type KnowledgeItemStatus = "draft" | "published" | "archived";

/** Trecho inline seguro. `href` aceita somente HTTPS ou caminho interno iniciado por "/". */
export interface KnowledgeInline {
  text: string;
  marks?: readonly ("bold" | "italic" | "code")[];
  href?: string;
}
export type KnowledgeParagraph = readonly KnowledgeInline[];

/** Referência a imagem editorial em `knowledge-assets`. `url` é assinada pelo backend e nunca é persistida. */
export interface KnowledgeImage {
  assetId: UUID;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  url?: string;
}

export type KnowledgeBlock =
  | { id: string; type: "rich_text"; content: readonly KnowledgeParagraph[] }
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "list"; style: "bullet" | "ordered"; items: readonly KnowledgeParagraph[] }
  | { id: string; type: "callout"; tone: "info" | "tip" | "warning"; title: string; content: readonly KnowledgeParagraph[] }
  | { id: string; type: "image"; image: KnowledgeImage }
  | { id: string; type: "gallery"; images: readonly KnowledgeImage[] }
  | {
      id: string;
      type: "diagram";
      title: string;
      layout: "sequence" | "cycle" | "hierarchy";
      nodes: readonly { id: string; label: string; detail: string }[];
      edges: readonly { from: string; to: string; label: string | null }[];
    }
  | { id: string; type: "code"; language: string; code: string; caption: string | null }
  | { id: string; type: "quote"; variant: "quote" | "definition"; text: string; attribution: string | null };

export type KnowledgeBlockType = KnowledgeBlock["type"];

/** Vídeo não listado do YouTube. Distribuição, não controle de acesso. */
export interface KnowledgeVideo {
  provider: "youtube";
  /** ID normalizado de 11 caracteres [A-Za-z0-9_-]. */
  videoId: string;
  title: string;
  durationSeconds: number;
  transcript: string;
  captionsReviewed: boolean;
}

export interface KnowledgeLessonRef {
  lessonTemplateId: UUID;
  curriculumId: UUID;
  cyclePosition: number;
  lessonPosition: number;
  lessonTitle: string;
}

export interface ConceptArtifact {
  type: "concept";
  objective: string;
  video: KnowledgeVideo | null;
  summaryPoints: readonly string[];
  reviewQuestions: readonly string[];
}

export interface PromptVariable {
  /** Nome usado no template como {{key}}; [a-z][a-z0-9_]{0,39}. */
  key: string;
  label: string;
  description: string;
  example: string;
  required: boolean;
}

export interface PromptArtifact {
  type: "prompt";
  objective: string;
  whenToUse: readonly string[];
  whenNotToUse: readonly string[];
  template: string;
  anatomy: readonly { label: string; excerpt: string; explanation: string }[];
  variables: readonly PromptVariable[];
  exampleInput: string;
  exampleOutput: string;
  cautions: readonly string[];
  adaptMinutes: number;
}

export type DesignFontRole = "sans" | "serif" | "mono" | "display";
export type DesignPreviewKind = "button" | "field" | "card" | "badge" | "callout" | "navigation" | "editorial_block";

/** Espécime renderizado somente por componentes controlados do frontend. */
export interface DesignComponentPreview {
  id: string;
  kind: DesignPreviewKind;
  label: string;
  description: string;
  /** Textos exibidos no espécime; nunca markup. */
  copy: readonly string[];
  /** Nomes de cores da paleta deste sistema (não valores livres). */
  tokens: { background: string; foreground: string; accent: string | null; border: string | null };
  /** Nome de um raio definido em `radii`. */
  radius: string | null;
}

export interface DesignSystemArtifact {
  type: "design_system";
  purpose: string;
  context: string;
  principles: readonly { title: string; detail: string }[];
  /** `value` em #RRGGBB. */
  palette: readonly { name: string; value: string; role: string }[];
  typography: readonly {
    name: string;
    fontRole: DesignFontRole;
    weight: 400 | 500 | 600 | 700 | 800;
    sizePx: number;
    sample: string;
    role: string;
  }[];
  spacing: readonly { name: string; valuePx: number }[];
  radii: readonly { name: string; valuePx: number }[];
  components: readonly DesignComponentPreview[];
  usageExamples: readonly { title: string; description: string }[];
  dos: readonly string[];
  donts: readonly string[];
  referenceImages: readonly KnowledgeImage[];
}

export type KnowledgeArtifact = ConceptArtifact | PromptArtifact | DesignSystemArtifact;

/** Documento editorial completo; o aluno recebe sempre o snapshot publicado. */
export interface KnowledgeDocument {
  kind: KnowledgeItemKind;
  title: string;
  slug: string;
  summary: string;
  tags: readonly string[];
  readingMinutes: number;
  blocks: readonly KnowledgeBlock[];
  artifact: KnowledgeArtifact;
}

/* ----- Leitura do aluno ----- */

/** Resumo mínimo usado por Início, Atividade e Projetos. */
export interface ConceptSummary {
  id: UUID;
  slug: string;
  title: string;
  summary: string;
  releasedAt: ISODateTime;
}

export interface KnowledgeRelatedItem {
  id: UUID;
  kind: KnowledgeItemKind;
  title: string;
  summary: string;
}

/** Item de índice do Atlas: Conceitos e bibliotecas compartilham a mesma base. */
export interface AtlasItemSummary {
  id: UUID;
  kind: KnowledgeItemKind;
  slug: string;
  title: string;
  summary: string;
  tags: readonly string[];
  /** Apenas aulas já liberadas ao aluno. */
  lessons: readonly KnowledgeLessonRef[];
  releasedAt: ISODateTime;
  readingMinutes: number;
}

export interface AtlasConceptSummary extends AtlasItemSummary {
  kind: "concept";
  videoDurationSeconds: number | null;
}

export interface LibraryResourceSummary extends AtlasItemSummary {
  kind: LibraryResourceKind;
  /** Prompt: quantidade de variáveis. Design system: 0. */
  variableCount: number;
  /** Prompt: minutos para compreender e adaptar. Design system: null. */
  adaptMinutes: number | null;
  /** Design system: miniatura com até 5 cores (#RRGGBB). Prompt: []. */
  swatches: readonly string[];
  /** Design system: contagens documentadas. Prompt: null. */
  colorCount: number | null;
  componentCount: number | null;
  /** Prompt: template base para ação rápida "Copiar base". Design system: null. */
  template: string | null;
}

export interface AtlasFacets {
  /** Total liberado na coleção consultada, ignorando busca e filtros. */
  totalReleased: number;
  tags: readonly string[];
  lessons: readonly KnowledgeLessonRef[];
  /** Existe conteúdo publicado ainda não liberado; nunca revela quantidade, título ou tipo. */
  hasUpcoming: boolean;
}

export interface AtlasPage<T> extends Page<T> {
  facets: AtlasFacets;
}

export interface AtlasActivityLink {
  assignmentId: UUID;
  title: string;
  lessonPosition: number;
}

export interface ConceptDetail extends AtlasConceptSummary {
  /** Resumo textual legado (compatibilidade). */
  body: string;
  objective: string;
  /** Somente vídeo publicado com legenda revisada. */
  video: Omit<KnowledgeVideo, "captionsReviewed"> | null;
  blocks: readonly KnowledgeBlock[];
  summaryPoints: readonly string[];
  reviewQuestions: readonly string[];
  relatedConcepts: readonly AtlasConceptSummary[];
  relatedItems: readonly KnowledgeRelatedItem[];
  activity: AtlasActivityLink | null;
}

export interface LibraryResourceDetail extends LibraryResourceSummary {
  blocks: readonly KnowledgeBlock[];
  artifact: PromptArtifact | DesignSystemArtifact;
  relatedItems: readonly KnowledgeRelatedItem[];
}

export interface AtlasListQuery extends PageQuery {
  search?: string;
  cycle?: number;
  lesson?: number;
  tag?: string;
}

/* ----- CMS administrativo ----- */

export interface KnowledgeEditor {
  userId: UUID;
  displayName: string;
}

export interface AdminKnowledgeItemSummary {
  id: UUID;
  kind: KnowledgeItemKind;
  status: KnowledgeItemStatus;
  title: string;
  slug: string;
  summary: string;
  tags: readonly string[];
  curriculumId: UUID;
  curriculumName: string;
  lessons: readonly KnowledgeLessonRef[];
  /** Existe rascunho salvo diferente do snapshot publicado. */
  hasUnpublishedChanges: boolean;
  publishedAt: ISODateTime | null;
  archivedAt: ISODateTime | null;
  updatedAt: ISODateTime;
  updatedBy: KnowledgeEditor | null;
}

export interface KnowledgeAsset {
  id: UUID;
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
  status: "pending" | "ready" | "rejected";
  /** URL assinada curta; ausente enquanto `pending`. */
  url: string | null;
}

export interface KnowledgePublishIssue {
  /** Caminho do campo, ex.: "summary", "blocks[3].image.alt", "artifact.video.captionsReviewed". */
  path: string;
  message: string;
}

export interface AdminKnowledgeItemDetail extends AdminKnowledgeItemSummary {
  /** Rascunho de trabalho (sempre o mais recente salvo). */
  document: KnowledgeDocument;
  /** Snapshot visto pelos alunos; null antes da primeira publicação. */
  publishedDocument: KnowledgeDocument | null;
  lessonTemplateIds: readonly UUID[];
  /** Imagens referenciadas pelo rascunho, com URL assinada para a prévia. */
  assets: readonly KnowledgeAsset[];
  /** Pendências que hoje impediriam a publicação; vazio = publicável. */
  publishIssues: readonly KnowledgePublishIssue[];
}

export interface AdminKnowledgeCurriculumOption {
  id: UUID;
  name: string;
  lessons: readonly KnowledgeLessonRef[];
}

export interface AdminKnowledgePage extends Page<AdminKnowledgeItemSummary> {
  options: {
    curricula: readonly AdminKnowledgeCurriculumOption[];
    tags: readonly string[];
  };
}

export interface AdminKnowledgeListQuery extends PageQuery {
  kind?: KnowledgeItemKind;
  status?: KnowledgeItemStatus;
  curriculumId?: UUID;
  cycle?: number;
  lesson?: number;
  tag?: string;
  search?: string;
}

export interface AdminKnowledgeWriteInput {
  curriculumId: UUID;
  lessonTemplateIds: readonly UUID[];
  document: KnowledgeDocument;
}

export interface ActivityCriterion {
  id: UUID;
  label: string;
  description: string;
  position: number;
}

export interface ActivityStep {
  position: number;
  label: string;
}

export interface ActivityRequirement {
  id: UUID;
  kind: SubmissionItemKind;
  label: string;
  required: boolean;
  position: number;
}

export interface ActivityProjectContext {
  id: UUID;
  title: string;
  cyclePosition: number;
  activities: readonly {
    assignmentId: UUID;
    lessonPosition: number;
    title: string;
    status: AssignmentStatus;
    latestVersion: number | null;
  }[];
}

export interface ActivityDetail {
  id: UUID;
  assignmentId: UUID;
  lessonPosition: number;
  title: string;
  objective: string;
  instructions: string;
  continuityGuidance: string;
  estimatedMinutes: number;
  dueAt: ISODateTime | null;
  status: AssignmentStatus;
  isOverdue: boolean;
  canEdit: boolean;
  readOnlyReason: "inactive_enrollment" | "submitted" | "approved" | null;
  supplementalInstructions: string | null;
  /** Campos pedagógicos da migration 0047 — nullable durante o rollout. */
  context: string | null;
  expectedResult: string | null;
  steps: readonly ActivityStep[];
  planB: string | null;
  reflectionPrompt: string | null;
  portfolioEvidence: string | null;
  toolHint: string | null;
  /** Nullable durante o rollout da migration 0046. */
  project: ActivityProjectContext | null;
  concepts: readonly ConceptSummary[];
  requirements: readonly ActivityRequirement[];
  criteria: readonly ActivityCriterion[];
  latestReview: ReviewDetail | null;
  latestSubmission: SubmissionDetail | null;
  submissionHistory: Page<SubmissionDetail>;
}

export interface SubmissionItemInput {
  requirementId: UUID;
  kind: SubmissionItemKind;
  textValue?: string;
  urlValue?: string;
  fileId?: UUID;
}

export interface SubmissionItem extends SubmissionItemInput {
  id: UUID;
  /** Nome real do arquivo enviado; null quando o item não é de arquivo. Migration 0047. */
  fileName: string | null;
}

export interface CriterionReview {
  criterionId: UUID;
  result: CriterionResult;
  comment: string | null;
}

export interface ReviewDetail {
  id: UUID;
  decision: ReviewDecision;
  feedback: string;
  reviewerName: string;
  reviewedAt: ISODateTime;
  seenAt: ISODateTime | null;
  criteria: readonly CriterionReview[];
}

export interface SubmissionDetail {
  id: UUID;
  assignmentId: UUID;
  version: number;
  isDraft: boolean;
  isLate: boolean;
  submittedAt: ISODateTime | null;
  items: readonly SubmissionItem[];
  review: ReviewDetail | null;
  reviews: readonly ReviewDetail[];
}

/** Entrega na fila administrativa, com a rubrica necess\u00e1ria para publicar o feedback. */
export interface ReviewQueueSubmission extends SubmissionDetail {
  criteria: readonly ActivityCriterion[];
}

export interface ProjectSummary {
  id: UUID;
  cyclePosition: number;
  title: string;
  status: "locked" | "in_progress" | "approved";
  approvedAt: ISODateTime | null;
  completedActivityCount: number;
  activityCount: number;
}

export interface ProjectBrief {
  challenge: string;
  problem: string;
  audience: string;
  expectedResult: string;
  qualityCriteria: readonly string[];
  concepts: readonly string[];
}

export interface ProjectDetail extends ProjectSummary {
  /** Nullable durante o rollout da migration 0045. */
  brief: ProjectBrief | null;
  activities: readonly {
    assignmentId: UUID;
    lessonPosition: number;
    title: string;
    status: AssignmentStatus;
    latestVersion: number | null;
    decision: string | null;
    latestFeedback: {
      decision: ReviewDecision;
      feedback: string;
      reviewerName: string;
      reviewedAt: ISODateTime;
    } | null;
  }[];
}

export interface StudentHome {
  primaryAction:
    | { kind: "continue_activity"; assignmentId: UUID; label: string }
    | { kind: "revise_submission"; assignmentId: UUID; label: string }
    | { kind: "view_feedback"; assignmentId: UUID; label: string }
    | { kind: "setup_github"; label: string }
    | { kind: "none"; label: string };
  nextSession: SessionSummary | null;
  recentFeedback: ReviewDetail | null;
  currentProject: ProjectSummary | null;
  pendingMakeupCount: number;
}

export interface UploadedFile {
  id: UUID;
  assignmentId: UUID;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: "pending" | "ready" | "rejected";
}

export interface AdminDashboard {
  awaitingReviewCount: number;
  feedbackDueSoonCount: number;
  overdueAssignmentCount: number;
  pendingMakeupCount: number;
  deliveryApprovalRate: number;
  upcomingSessions: readonly SessionSummary[];
  studentsAtRisk: readonly StudentSummary[];
}

export interface CompletionCheck {
  enrollmentId: UUID;
  attendanceComplete: boolean;
  projectsComplete: boolean;
  reflectionComplete: boolean;
  presentationComplete: boolean;
  noPendingRevisions: boolean;
  eligible: boolean;
  blockers: readonly string[];
}

export interface PresentationRecord {
  id: UUID;
  enrollmentId: UUID;
  kind: "demo_day" | "substitute";
  performedAt: ISODateTime;
  contextualNote: string | null;
}

export interface Endpoint<Request, Response> {
  request: Request;
  response: ApiResult<Response>;
}

export interface ApiContracts {
  "GET /api/me": Endpoint<Record<string, never>, MeProfile>;
  "PATCH /api/me": Endpoint<
    { displayName?: string; githubUsername?: string },
    MeProfile
  >;

  "POST /api/admin/students/invite": Endpoint<
    {
      email: string;
      displayName: string;
      birthDate: ISODate;
      guardian: GuardianInput;
      consent: {
        termVersion: string;
        signedAt: ISODate;
        physicalCopyArchived: true;
      };
      enrollment: { curriculumId: UUID } & EnrollmentPlacementInput;
    },
    { studentId: UUID; enrollmentId: UUID; invitationSentAt: ISODateTime }
  >;
  "GET /api/admin/students": Endpoint<
    PageQuery & { search?: string; classId?: UUID },
    Page<StudentSummary>
  >;
  "GET /api/admin/students/:studentId": Endpoint<
    { studentId: UUID },
    {
      student: StudentSummary;
      guardian: GuardianRecord;
      consent: ConsentRecord;
      enrollments: readonly EnrollmentSummary[];
      projects: readonly ProjectSummary[];
    }
  >;
  "PUT /api/admin/students/:studentId/consent": Endpoint<
    {
      studentId: UUID;
      guardian: GuardianInput;
      termVersion: string;
      signedAt: ISODate;
      physicalCopyArchived: true;
    },
    ConsentRecord
  >;
  "POST /api/admin/students/:studentId/consent/revoke": Endpoint<
    {
      studentId: UUID;
      reason: string;
    },
    {
      consent: ConsentRecord;
      pausedEnrollmentIds: readonly UUID[];
      accessDisabled: true;
    }
  >;

  "POST /api/admin/classes": Endpoint<
    {
      name: string;
      curriculumId: UUID;
      schedule: ScheduleInput;
    },
    { class: ClassSummary; sessions: readonly SessionSummary[] }
  >;
  "GET /api/admin/classes": Endpoint<
    PageQuery & { status?: ClassSummary["status"] },
    Page<ClassSummary>
  >;
  "GET /api/admin/classes/:classId": Endpoint<
    { classId: UUID },
    {
      class: ClassSummary;
      enrollments: readonly EnrollmentSummary[];
      sessions: readonly SessionSummary[];
    }
  >;
  "PATCH /api/admin/classes/:classId": Endpoint<
    { classId: UUID; name?: string; status?: ClassSummary["status"] },
    ClassSummary
  >;

  "POST /api/admin/enrollments": Endpoint<
    {
      studentId: UUID;
      curriculumId: UUID;
    } & EnrollmentPlacementInput,
    EnrollmentSummary
  >;
  "PATCH /api/admin/enrollments/:enrollmentId": Endpoint<
    {
      enrollmentId: UUID;
      status: Exclude<EnrollmentStatus, "completed">;
    },
    EnrollmentSummary
  >;
  "GET /api/admin/enrollments/:enrollmentId/completion": Endpoint<
    { enrollmentId: UUID },
    CompletionCheck
  >;
  "POST /api/admin/enrollments/:enrollmentId/presentation": Endpoint<
    {
      enrollmentId: UUID;
      kind: PresentationRecord["kind"];
      performedAt: ISODateTime;
      contextualNote?: string;
    },
    PresentationRecord
  >;
  "POST /api/admin/enrollments/:enrollmentId/complete": Endpoint<
    { enrollmentId: UUID },
    CompletionCheck
  >;

  "PATCH /api/admin/sessions/:sessionId": Endpoint<
    {
      sessionId: UUID;
      startsAt?: ISODateTime;
      endsAt?: ISODateTime;
      status?: SessionStatus;
    },
    SessionSummary
  >;
  "GET /api/admin/sessions/:sessionId/attendance": Endpoint<
    { sessionId: UUID },
    readonly AttendanceEntry[]
  >;
  "PUT /api/admin/sessions/:sessionId/attendance": Endpoint<
    {
      sessionId: UUID;
      entries: readonly {
        enrollmentId: UUID;
        status: AttendanceStatus;
        privateNote?: string;
      }[];
    },
    readonly AttendanceEntry[]
  >;
  "POST /api/admin/sessions/:sessionId/release": Endpoint<
    {
      sessionId: UUID;
      target:
        | { kind: "all_active_enrollments" }
        | { kind: "enrollments"; enrollmentIds: readonly UUID[] };
      dueAt: ISODateTime;
      supplementalInstructions?: string;
    },
    { assignmentIds: readonly UUID[]; releasedAt: ISODateTime }
  >;
  "POST /api/admin/attendance/:attendanceId/makeup": Endpoint<
    {
      attendanceId: UUID;
      makeupSessionId?: UUID;
      completedAt: ISODateTime;
      note?: string;
    },
    AttendanceEntry
  >;

  "GET /api/admin/dashboard": Endpoint<{ classId?: UUID }, AdminDashboard>;
  "GET /api/admin/reviews": Endpoint<
    PageQuery & { classId?: UUID; overdueOnly?: boolean },
    Page<ReviewQueueSubmission>
  >;
  "POST /api/admin/submissions/:submissionId/review": Endpoint<
    {
      submissionId: UUID;
      decision: ReviewDecision;
      feedback: string;
      criteria: readonly {
        criterionId: UUID;
        result: CriterionResult;
        comment?: string;
      }[];
    },
    ReviewDetail
  >;

  "GET /api/admin/atlas": Endpoint<AdminKnowledgeListQuery, AdminKnowledgePage>;
  "POST /api/admin/atlas": Endpoint<AdminKnowledgeWriteInput, AdminKnowledgeItemDetail>;
  "GET /api/admin/atlas/:itemId": Endpoint<{ itemId: UUID }, AdminKnowledgeItemDetail>;
  /** Salva rascunho; nunca publica. 409 CONFLICT quando expectedUpdatedAt diverge. */
  "PATCH /api/admin/atlas/:itemId": Endpoint<
    { itemId: UUID; expectedUpdatedAt: ISODateTime } & AdminKnowledgeWriteInput,
    AdminKnowledgeItemDetail
  >;
  /** Valida e copia o rascunho para o snapshot publicado. 400 VALIDATION_ERROR com fieldErrors quando houver pendências. */
  "POST /api/admin/atlas/:itemId/publish": Endpoint<
    { itemId: UUID; expectedUpdatedAt: ISODateTime },
    AdminKnowledgeItemDetail
  >;
  /** Remove das listas estudantis sem apagar o registro. */
  "POST /api/admin/atlas/:itemId/archive": Endpoint<
    { itemId: UUID; expectedUpdatedAt: ISODateTime },
    AdminKnowledgeItemDetail
  >;
  "POST /api/admin/atlas/assets/upload-url": Endpoint<
    {
      filename: string;
      contentType: KnowledgeAsset["contentType"];
      sizeBytes: number;
      width: number;
      height: number;
    },
    { asset: KnowledgeAsset; signedUploadUrl: string; expiresAt: ISODateTime }
  >;
  "POST /api/admin/atlas/assets/:assetId/finalize": Endpoint<
    { assetId: UUID },
    KnowledgeAsset
  >;

  "GET /api/student/home": Endpoint<Record<string, never>, StudentHome>;
  "POST /api/student/reviews/:reviewId/seen": Endpoint<
    { reviewId: UUID },
    ReviewDetail
  >;
  "GET /api/student/journey": Endpoint<
    { enrollmentId?: UUID },
    {
      enrollment: EnrollmentSummary;
      projects: readonly ProjectSummary[];
      sessionsCompleted: number;
      sessionsTotal: 16;
    }
  >;
  "GET /api/student/calendar": Endpoint<
    { enrollmentId: UUID; from?: ISODate; to?: ISODate },
    readonly SessionSummary[]
  >;
  "GET /api/student/attendance": Endpoint<
    PageQuery & { enrollmentId?: UUID },
    Page<{
      session: SessionSummary;
      status: AttendanceStatus;
      makeup: AttendanceEntry["makeup"];
    }>
  >;
  "GET /api/student/concepts": Endpoint<
    AtlasListQuery & { hasVideo?: boolean; maxReadingMinutes?: number },
    AtlasPage<AtlasConceptSummary>
  >;
  "GET /api/student/concepts/:conceptId": Endpoint<
    { conceptId: UUID },
    ConceptDetail
  >;
  "GET /api/student/library": Endpoint<
    AtlasListQuery & { kind: LibraryResourceKind },
    AtlasPage<LibraryResourceSummary>
  >;
  "GET /api/student/library/:resourceId": Endpoint<
    { resourceId: UUID },
    LibraryResourceDetail
  >;
  "GET /api/student/activities/:assignmentId": Endpoint<
    { assignmentId: UUID; cursor?: string },
    ActivityDetail
  >;
  "PUT /api/student/activities/:assignmentId/draft": Endpoint<
    {
      assignmentId: UUID;
      items: readonly SubmissionItemInput[];
    },
    SubmissionDetail
  >;
  "POST /api/student/activities/:assignmentId/submit": Endpoint<
    {
      assignmentId: UUID;
      expectedDraftId: UUID;
    },
    SubmissionDetail
  >;
  "GET /api/student/projects": Endpoint<
    { enrollmentId?: UUID },
    readonly ProjectSummary[]
  >;
  "GET /api/student/projects/:projectId": Endpoint<
    { projectId: UUID },
    ProjectDetail
  >;
  "GET /api/student/portfolio": Endpoint<
    PageQuery & { enrollmentId?: UUID },
    Page<ProjectDetail>
  >;

  "POST /api/files/upload-url": Endpoint<
    {
      assignmentId: UUID;
      filename: string;
      contentType: string;
      sizeBytes: number;
    },
    { file: UploadedFile; signedUploadUrl: string; expiresAt: ISODateTime }
  >;
  "POST /api/files/:fileId/finalize": Endpoint<{ fileId: UUID }, UploadedFile>;
  "GET /api/files/:fileId/download-url": Endpoint<
    { fileId: UUID },
    { signedDownloadUrl: string; expiresAt: ISODateTime }
  >;
}
