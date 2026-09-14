/** Contratos HTTP do MVP Logos Academy Platform. Sem implementação. */

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type Role = "admin" | "student";
export type EnrollmentKind = "class" | "individual";
export type EnrollmentStatus = "invited" | "active" | "paused" | "completed" | "cancelled";
export type SessionStatus = "scheduled" | "completed" | "rescheduled" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "excused_absence";
export type AssignmentStatus =
  | "locked"
  | "available"
  | "draft"
  | "submitted"
  | "revision_requested"
  | "approved";
export type SubmissionItemKind = "text" | "file" | "external_link" | "github_repository";
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
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

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
} & (
  | { email: string; phone?: string }
  | { email?: string; phone: string }
);

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

export interface ConceptSummary {
  id: UUID;
  slug: string;
  title: string;
  summary: string;
  releasedAt: ISODateTime;
}

export type KnowledgeContentBlock =
  | { type: "text"; heading: string; body: string }
  | { type: "callout"; heading: string; body: string }
  | { type: "image"; url: string; alt: string; caption: string | null }
  | { type: "diagram"; heading: string; nodes: readonly { label: string; detail: string }[] };

export interface ConceptDetail extends ConceptSummary {
  body: string;
  videoUrl: string | null;
  videoTitle: string | null;
  videoDurationMinutes: number | null;
  readingMinutes: number;
  contentBlocks: readonly KnowledgeContentBlock[];
  relatedConcepts: readonly ConceptSummary[];
}

export type LibraryResourceKind = "prompt" | "design_system";

export interface LibraryResourceSummary {
  id: UUID;
  kind: LibraryResourceKind;
  slug: string;
  title: string;
  summary: string;
  releasedAt: ISODateTime;
  lessonPosition: number;
}

export type LibraryArtifact =
  | {
      type: "prompt";
      template: string;
      variables: readonly { token: string; description: string }[];
      exampleInput: string | null;
      exampleOutput: string | null;
    }
  | {
      type: "design_system";
      palette: readonly { name: string; value: string; role: string }[];
      typography: readonly { name: string; sample: string; role: string }[];
      principles: readonly string[];
      components: readonly { name: string; description: string }[];
    };

export interface LibraryResourceDetail extends LibraryResourceSummary {
  body: string;
  readingMinutes: number;
  contentBlocks: readonly KnowledgeContentBlock[];
  artifact: LibraryArtifact;
  relatedResources: readonly LibraryResourceSummary[];
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
  canEdit?: boolean;
  readOnlyReason?: "inactive_enrollment" | "submitted" | "approved" | null;
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
  latestReview?: ReviewDetail | null;
  latestSubmission: SubmissionDetail | null;
  /** A lista pode estar paginada durante o rollout, preservando a resposta legada. */
  submissionHistory: Page<SubmissionDetail> | readonly SubmissionDetail[];
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
  "PATCH /api/me": Endpoint<{ displayName?: string; githubUsername?: string }, MeProfile>;

  "POST /api/admin/students/invite": Endpoint<{
    email: string;
    displayName: string;
    birthDate: ISODate;
    guardian: GuardianInput;
    consent: { termVersion: string; signedAt: ISODate; physicalCopyArchived: true };
    enrollment: { curriculumId: UUID } & EnrollmentPlacementInput;
  }, { studentId: UUID; enrollmentId: UUID; invitationSentAt: ISODateTime }>;
  "GET /api/admin/students": Endpoint<PageQuery & { search?: string; classId?: UUID }, Page<StudentSummary>>;
  "GET /api/admin/students/:studentId": Endpoint<{ studentId: UUID }, {
    student: StudentSummary;
    guardian: GuardianRecord;
    consent: ConsentRecord;
    enrollments: readonly EnrollmentSummary[];
    projects: readonly ProjectSummary[];
  }>;
  "PUT /api/admin/students/:studentId/consent": Endpoint<{
    studentId: UUID;
    guardian: GuardianInput;
    termVersion: string;
    signedAt: ISODate;
    physicalCopyArchived: true;
  }, ConsentRecord>;
  "POST /api/admin/students/:studentId/consent/revoke": Endpoint<{
    studentId: UUID;
    reason: string;
  }, { consent: ConsentRecord; pausedEnrollmentIds: readonly UUID[]; accessDisabled: true }>;

  "POST /api/admin/classes": Endpoint<{
    name: string;
    curriculumId: UUID;
    schedule: ScheduleInput;
  }, { class: ClassSummary; sessions: readonly SessionSummary[] }>;
  "GET /api/admin/classes": Endpoint<PageQuery & { status?: ClassSummary["status"] }, Page<ClassSummary>>;
  "GET /api/admin/classes/:classId": Endpoint<{ classId: UUID }, {
    class: ClassSummary;
    enrollments: readonly EnrollmentSummary[];
    sessions: readonly SessionSummary[];
  }>;
  "PATCH /api/admin/classes/:classId": Endpoint<{ classId: UUID; name?: string; status?: ClassSummary["status"] }, ClassSummary>;

  "POST /api/admin/enrollments": Endpoint<{
    studentId: UUID;
    curriculumId: UUID;
  } & EnrollmentPlacementInput, EnrollmentSummary>;
  "PATCH /api/admin/enrollments/:enrollmentId": Endpoint<{
    enrollmentId: UUID;
    status: Exclude<EnrollmentStatus, "completed">;
  }, EnrollmentSummary>;
  "GET /api/admin/enrollments/:enrollmentId/completion": Endpoint<{ enrollmentId: UUID }, CompletionCheck>;
  "POST /api/admin/enrollments/:enrollmentId/presentation": Endpoint<{
    enrollmentId: UUID;
    kind: PresentationRecord["kind"];
    performedAt: ISODateTime;
    contextualNote?: string;
  }, PresentationRecord>;
  "POST /api/admin/enrollments/:enrollmentId/complete": Endpoint<{ enrollmentId: UUID }, CompletionCheck>;

  "PATCH /api/admin/sessions/:sessionId": Endpoint<{
    sessionId: UUID;
    startsAt?: ISODateTime;
    endsAt?: ISODateTime;
    status?: SessionStatus;
  }, SessionSummary>;
  "GET /api/admin/sessions/:sessionId/attendance": Endpoint<{ sessionId: UUID }, readonly AttendanceEntry[]>;
  "PUT /api/admin/sessions/:sessionId/attendance": Endpoint<{
    sessionId: UUID;
    entries: readonly { enrollmentId: UUID; status: AttendanceStatus; privateNote?: string }[];
  }, readonly AttendanceEntry[]>;
  "POST /api/admin/sessions/:sessionId/release": Endpoint<{
    sessionId: UUID;
    target: { kind: "all_active_enrollments" } | { kind: "enrollments"; enrollmentIds: readonly UUID[] };
    dueAt: ISODateTime;
    supplementalInstructions?: string;
  }, { assignmentIds: readonly UUID[]; releasedAt: ISODateTime }>;
  "POST /api/admin/attendance/:attendanceId/makeup": Endpoint<{
    attendanceId: UUID;
    makeupSessionId?: UUID;
    completedAt: ISODateTime;
    note?: string;
  }, AttendanceEntry>;

  "GET /api/admin/dashboard": Endpoint<{ classId?: UUID }, AdminDashboard>;
  "GET /api/admin/reviews": Endpoint<PageQuery & { classId?: UUID; overdueOnly?: boolean }, Page<ReviewQueueSubmission>>;
  "POST /api/admin/submissions/:submissionId/review": Endpoint<{
    submissionId: UUID;
    decision: ReviewDecision;
    feedback: string;
    criteria: readonly { criterionId: UUID; result: CriterionResult; comment?: string }[];
  }, ReviewDetail>;

  "GET /api/student/home": Endpoint<Record<string, never>, StudentHome>;
  "POST /api/student/reviews/:reviewId/seen": Endpoint<{ reviewId: UUID }, ReviewDetail>;
  "GET /api/student/journey": Endpoint<{ enrollmentId?: UUID }, {
    enrollment: EnrollmentSummary;
    projects: readonly ProjectSummary[];
    sessionsCompleted: number;
    sessionsTotal: 16;
  }>;
  "GET /api/student/calendar": Endpoint<{ enrollmentId: UUID; from?: ISODate; to?: ISODate }, readonly SessionSummary[]>;
  "GET /api/student/attendance": Endpoint<PageQuery & { enrollmentId?: UUID }, Page<{
    session: SessionSummary;
    status: AttendanceStatus;
    makeup: AttendanceEntry["makeup"];
  }>>;
  "GET /api/student/concepts": Endpoint<PageQuery & { search?: string }, Page<ConceptSummary>>;
  "GET /api/student/concepts/:conceptId": Endpoint<{ conceptId: UUID }, ConceptDetail>;
  "GET /api/student/library": Endpoint<PageQuery & { kind: LibraryResourceKind; search?: string }, Page<LibraryResourceSummary>>;
  "GET /api/student/library/:resourceId": Endpoint<{ resourceId: UUID }, LibraryResourceDetail>;
  "GET /api/student/activities/:assignmentId": Endpoint<{ assignmentId: UUID }, ActivityDetail>;
  "PUT /api/student/activities/:assignmentId/draft": Endpoint<{
    assignmentId: UUID;
    items: readonly SubmissionItemInput[];
  }, SubmissionDetail>;
  "POST /api/student/activities/:assignmentId/submit": Endpoint<{
    assignmentId: UUID;
    expectedDraftId: UUID;
  }, SubmissionDetail>;
  "GET /api/student/projects": Endpoint<{ enrollmentId?: UUID }, readonly ProjectSummary[]>;
  "GET /api/student/projects/:projectId": Endpoint<{ projectId: UUID }, ProjectDetail>;
  "GET /api/student/portfolio": Endpoint<PageQuery & { enrollmentId?: UUID }, Page<ProjectDetail>>;

  "POST /api/files/upload-url": Endpoint<{
    assignmentId: UUID;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }, { file: UploadedFile; signedUploadUrl: string; expiresAt: ISODateTime }>;
  "POST /api/files/:fileId/finalize": Endpoint<{ fileId: UUID }, UploadedFile>;
  "GET /api/files/:fileId/download-url": Endpoint<{ fileId: UUID }, { signedDownloadUrl: string; expiresAt: ISODateTime }>;
}
