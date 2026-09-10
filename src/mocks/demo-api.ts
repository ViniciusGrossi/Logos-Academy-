import type {
  ActivityDetail, AttendanceEntry, ClassSummary, ConsentRecord,
  EnrollmentSummary, MeProfile, Page, ProjectDetail, ProjectSummary,
  ReviewDetail, ReviewQueueSubmission, SessionSummary, StudentSummary,
} from "@/specs/api.contracts";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type JsonObject = Record<string, unknown>;

const now = "2026-09-08T14:00:00.000Z";
const ids = {
  class: "00000000-0000-4000-8000-000000000001",
  enrollment: "00000000-0000-4000-8000-000000000002",
  marina: "00000000-0000-4000-8000-000000000003",
  caio: "00000000-0000-4000-8000-000000000004",
  assignment: "00000000-0000-4000-8000-000000000005",
  assignmentResearch: "00000000-0000-4000-8000-000000000024",
  assignmentPrototype: "00000000-0000-4000-8000-000000000025",
  submission: "00000000-0000-4000-8000-000000000006",
  project: "00000000-0000-4000-8000-000000000007",
  concept: "00000000-0000-4000-8000-000000000008",
  session: "00000000-0000-4000-8000-000000000009",
  review: "00000000-0000-4000-8000-000000000010",
};

const sessions: readonly SessionSummary[] = Array.from({ length: 16 }, (_, index) => ({
  id: `${ids.session.slice(0, -2)}${String(index + 1).padStart(2, "0")}`,
  lessonPosition: index + 1,
  lessonTitle: index === 6 ? "Cartaz que orienta uma decisão" : index === 15 ? "Demo Day e reflexão final" : `Encontro Explorer ${String(index + 1).padStart(2, "0")}`,
  startsAt: `2026-${index < 8 ? "08" : "09"}-${String((index % 8) * 3 + 2).padStart(2, "0")}T17:00:00.000Z`,
  endsAt: `2026-${index < 8 ? "08" : "09"}-${String((index % 8) * 3 + 2).padStart(2, "0")}T19:00:00.000Z`,
  status: index < 6 ? "completed" : "scheduled",
}));

let profile: MeProfile = { id: ids.marina, email: "marina.demo@logos.academy", displayName: "Marina Alves", role: "admin", githubUsername: "marina-alves" };
let classSummary: ClassSummary = { id: ids.class, name: "Explorer A", curriculumName: "Explorer", startsOn: "2026-08-02", status: "active", activeStudentCount: 2 };
const enrollment: EnrollmentSummary = { id: ids.enrollment, studentId: ids.marina, studentName: "Marina Alves", curriculumName: "Explorer", kind: "class", classId: ids.class, status: "active", activatedAt: now, completedAt: null };
const projects: readonly ProjectSummary[] = [
  { id: ids.project, cyclePosition: 1, title: "Creative Studio", status: "in_progress", approvedAt: null, completedActivityCount: 2, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000011", cyclePosition: 2, title: "Campanha que Move", status: "locked", approvedAt: null, completedActivityCount: 0, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000012", cyclePosition: 3, title: "Automation Lab", status: "locked", approvedAt: null, completedActivityCount: 0, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000013", cyclePosition: 4, title: "Projeto de impacto", status: "locked", approvedAt: null, completedActivityCount: 0, activityCount: 4 },
];
const students: readonly StudentSummary[] = [
  { id: ids.marina, displayName: "Marina Alves", email: profile.email, githubUsername: "marina-alves", activeEnrollmentCount: 1, pendingAssignmentCount: 1, pendingMakeupCount: 0 },
  { id: ids.caio, displayName: "Caio Mendes", email: "caio.demo@logos.academy", githubUsername: null, activeEnrollmentCount: 1, pendingAssignmentCount: 1, pendingMakeupCount: 1 },
];
let consent: ConsentRecord = { id: "00000000-0000-4000-8000-000000000014", status: "verified", termVersion: "v1.0", signedAt: "2026-08-01", physicalCopyArchived: true, verifiedAt: now, revokedAt: null, revocationReason: null };
const concepts = [
  { id: ids.concept, slug: "hierarquia-visual", title: "Hierarquia visual", summary: "Organiza o olhar para que a mensagem principal apareça primeiro.", releasedAt: now },
  { id: "00000000-0000-4000-8000-000000000015", slug: "contraste", title: "Contraste", summary: "Cria diferença perceptível entre elementos e decisões.", releasedAt: now },
];
let attendance: readonly AttendanceEntry[] = students.map((student) => ({ enrollmentId: student.id === ids.marina ? ids.enrollment : "00000000-0000-4000-8000-000000000016", studentName: student.displayName, status: student.id === ids.caio ? "excused_absence" : "present", privateNote: null, makeup: null }));

const review: ReviewDetail = { id: ids.review, decision: "revision_requested", feedback: "O título está forte. Reduza o texto de apoio e explique a decisão na próxima versão.", reviewerName: "Vinicius", reviewedAt: now, seenAt: null, criteria: [{ criterionId: "00000000-0000-4000-8000-000000000017", result: "needs_adjustment", comment: "A mensagem principal ainda disputa atenção." }] };
let submissionVersion = 2;

function page<T>(items: readonly T[]): Page<T> { return { items, nextCursor: null }; }
function activity(assignmentId = ids.assignment): ActivityDetail {
  if (assignmentId === ids.assignmentResearch) return { id: "00000000-0000-4000-8000-000000000026", assignmentId, lessonPosition: 6, title: "Radar de referências", objective: "Selecionar referências e explicar o que cada uma ensina sobre atenção.", instructions: "Registre três referências e uma decisão que você quer testar no cartaz.", continuityGuidance: "Essa leitura alimenta a primeira versão do projeto.", estimatedMinutes: 20, dueAt: "2026-09-07T20:00:00.000Z", status: "approved", isOverdue: false, supplementalInstructions: null, concepts, requirements: [{ id: "00000000-0000-4000-8000-000000000019", kind: "text", label: "Referências comentadas", required: true, position: 1 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Intenção visual", description: "Cada referência possui uma observação objetiva.", position: 1 }], latestSubmission: null, submissionHistory: [] };
  if (assignmentId === ids.assignmentPrototype) return { id: "00000000-0000-4000-8000-000000000027", assignmentId, lessonPosition: 8, title: "Protótipo que pede uma ação", objective: "Transformar a decisão visual em uma ação clara para quem vê o cartaz.", instructions: "Monte a próxima versão e descreva qual comportamento ela deve provocar.", continuityGuidance: "Esta etapa abre após você enviar a revisão atual.", estimatedMinutes: 30, dueAt: "2026-09-10T20:00:00.000Z", status: "locked", isOverdue: false, supplementalInstructions: null, concepts, requirements: [{ id: "00000000-0000-4000-8000-000000000019", kind: "text", label: "Hipótese de ação", required: true, position: 1 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Convite à ação", description: "A próxima ação é clara sem explicação extra.", position: 1 }], latestSubmission: null, submissionHistory: [] };
  const item = { id: "00000000-0000-4000-8000-000000000018", requirementId: "00000000-0000-4000-8000-000000000019", kind: "text" as const, textValue: "A versão 03 aumenta o contraste do título." };
  return { id: "00000000-0000-4000-8000-000000000020", assignmentId: ids.assignment, lessonPosition: 7, title: "Cartaz que orienta uma decisão", objective: "Refinar a hierarquia visual e provar a mensagem principal.", instructions: "Compare a versão anterior com o feedback e envie uma nova decisão.", continuityGuidance: "A próxima atividade só abre após esta evidência.", estimatedMinutes: 25, dueAt: "2026-09-08T20:00:00.000Z", status: "revision_requested", isOverdue: false, supplementalInstructions: null, concepts, requirements: [{ id: item.requirementId, kind: "text", label: "Decisão registrada", required: true, position: 1 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Mensagem principal", description: "Uma única mensagem é perceptível à distância.", position: 1 }], latestSubmission: { id: ids.submission, assignmentId: ids.assignment, version: submissionVersion, isDraft: false, submittedAt: now, items: [item], review }, submissionHistory: [] };
}

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** In-memory client-only API used exclusively by the local demo mode. */
export async function demoApi<T>(url: string, method: Method, body?: JsonObject): Promise<T> {
  const pathname = url.split("?")[0] ?? url;
  if (method === "GET" && pathname === "/api/me") return profile as T;
  if (method === "PATCH" && pathname === "/api/me") { profile = { ...profile, displayName: stringValue(body, "displayName", profile.displayName), githubUsername: nullableString(body, "githubUsername", profile.githubUsername) }; return profile as T; }
  if (method === "GET" && pathname === "/api/student/home") return ({ primaryAction: { kind: "revise_submission", assignmentId: ids.assignment, label: "Revisar cartaz" }, nextSession: sessions[6]!, recentFeedback: review, currentProject: projects[0]!, pendingMakeupCount: 0 }) as T;
  if (method === "GET" && pathname === "/api/student/journey") return ({ enrollment, projects, sessionsCompleted: 6, sessionsTotal: 16 }) as T;
  if (method === "GET" && pathname === "/api/student/calendar") return sessions as T;
  if (method === "GET" && pathname === "/api/student/attendance") return page(sessions.slice(0, 6).map((session, index) => ({ session, status: index === 3 ? "excused_absence" : "present", makeup: index === 3 ? null : null }))) as T;
  if (method === "GET" && pathname === "/api/student/concepts") return page(concepts) as T;
  if (method === "GET" && pathname.startsWith("/api/student/concepts/")) { const concept = concepts.find((item) => item.id === pathname.split("/").at(-1)) ?? concepts[0]!; return ({ ...concept, body: "Use hierarquia e contraste para tornar uma decisão legível antes de adicionar detalhes.", relatedConcepts: concepts.filter((item) => item.id !== concept.id) }) as T; }
  if (method === "GET" && pathname.startsWith("/api/student/activities/")) return activity(pathname.split("/").at(-1)) as T;
  if (method === "PUT" && pathname.endsWith("/draft")) return ({ ...activity().latestSubmission!, id: ids.submission, isDraft: true, submittedAt: null }) as T;
  if (method === "POST" && pathname.endsWith("/submit")) { submissionVersion += 1; return ({ ...activity().latestSubmission!, version: submissionVersion, isDraft: false, submittedAt: now }) as T; }
  if (method === "GET" && pathname === "/api/student/projects") return projects as T;
  if (method === "GET" && pathname.startsWith("/api/student/projects/")) return projectDetail(pathname.split("/").at(-1) ?? ids.project) as T;
  if (method === "GET" && pathname === "/api/student/portfolio") return page([projectDetail(ids.project)]) as T;
  if (method === "POST" && pathname.includes("/reviews/") && pathname.endsWith("/seen")) return { ...review, seenAt: now } as T;
  if (method === "GET" && pathname === "/api/admin/dashboard") return ({ awaitingReviewCount: 1, feedbackDueSoonCount: 1, overdueAssignmentCount: 0, pendingMakeupCount: 1, deliveryApprovalRate: 84, upcomingSessions: sessions.slice(6, 9), studentsAtRisk: [students[1]!] }) as T;
  if (method === "GET" && pathname === "/api/admin/students") return page(students.filter((student) => url.toLowerCase().includes("search=") ? student.displayName.toLowerCase().includes(new URLSearchParams(url.split("?")[1]).get("search")?.toLowerCase() ?? "") : true)) as T;
  if (method === "GET" && /^\/api\/admin\/students\/[^/]+$/.test(pathname)) return studentDetail(pathname.split("/").at(-1) ?? ids.marina) as T;
  if (method === "PUT" && pathname.endsWith("/consent")) { consent = { ...consent, status: "verified", termVersion: stringValue(body, "termVersion", consent.termVersion), signedAt: stringValue(body, "signedAt", consent.signedAt ?? "2026-08-01") }; return consent as T; }
  if (method === "POST" && pathname.endsWith("/consent/revoke")) { consent = { ...consent, status: "revoked", revokedAt: now, revocationReason: stringValue(body, "reason", "Solicitação de demonstração") }; return ({ consent, pausedEnrollmentIds: [ids.enrollment], accessDisabled: true }) as T; }
  if (method === "GET" && pathname === "/api/admin/classes") return page([classSummary]) as T;
  if (method === "GET" && /^\/api\/admin\/classes\/[^/]+$/.test(pathname)) return ({ class: classSummary, enrollments: [enrollment, { ...enrollment, id: attendance[1]!.enrollmentId, studentId: ids.caio, studentName: "Caio Mendes" }], sessions }) as T;
  if (method === "PATCH" && /^\/api\/admin\/classes\/[^/]+$/.test(pathname)) { classSummary = { ...classSummary, name: stringValue(body, "name", classSummary.name), status: classStatus(body, classSummary.status) }; return classSummary as T; }
  if (method === "GET" && pathname.includes("/sessions/") && pathname.endsWith("/attendance")) return attendance as T;
  if (method === "PUT" && pathname.includes("/sessions/") && pathname.endsWith("/attendance")) { attendance = inputEntries(body); return attendance as T; }
  if (method === "PATCH" && pathname.startsWith("/api/admin/sessions/")) return { ...sessions.find((item) => item.id === pathname.split("/").at(-1)), startsAt: stringValue(body, "startsAt", sessions[6]!.startsAt), endsAt: stringValue(body, "endsAt", sessions[6]!.endsAt), status: stringValue(body, "status", "scheduled") } as T;
  if (method === "POST" && pathname.endsWith("/release")) return ({ assignmentIds: [ids.assignment], releasedAt: now }) as T;
  if (method === "GET" && pathname === "/api/admin/reviews") return page([{ ...activity().latestSubmission!, criteria: activity().criteria }] as readonly ReviewQueueSubmission[]) as T;
  if (method === "POST" && pathname.includes("/submissions/") && pathname.endsWith("/review")) return { ...review, decision: stringValue(body, "decision", review.decision) } as T;
  if (method === "POST" && pathname === "/api/admin/students/invite") return ({ studentId: ids.caio, enrollmentId: attendance[1]!.enrollmentId, invitationSentAt: now }) as T;
  if (method === "POST" && pathname === "/api/admin/classes") return ({ class: classSummary, sessions }) as T;
  if (method === "POST" && pathname === "/api/admin/enrollments") return enrollment as T;
  if (method === "PATCH" && pathname.startsWith("/api/admin/enrollments/")) return enrollment as T;
  if (method === "GET" && pathname.endsWith("/completion")) return completion() as T;
  if (method === "POST" && pathname.endsWith("/presentation")) return ({ id: "00000000-0000-4000-8000-000000000021", enrollmentId: ids.enrollment, kind: "demo_day", performedAt: now, contextualNote: null }) as T;
  if (method === "POST" && pathname.endsWith("/complete")) return completion() as T;
  if (method === "POST" && pathname.includes("/attendance/") && pathname.endsWith("/makeup")) return attendance[1]! as T;
  if (method === "POST" && pathname === "/api/files/upload-url") return ({ file: { id: "00000000-0000-4000-8000-000000000022", assignmentId: ids.assignment, filename: stringValue(body, "filename", "evidencia.pdf"), contentType: stringValue(body, "contentType", "application/pdf"), sizeBytes: 1024, status: "pending" }, signedUploadUrl: "https://demo.invalid/upload", expiresAt: now }) as T;
  if (method === "POST" && pathname.endsWith("/finalize")) return ({ id: pathname.split("/")[3], assignmentId: ids.assignment, filename: "evidencia.pdf", contentType: "application/pdf", sizeBytes: 1024, status: "ready" }) as T;
  if (method === "GET" && pathname.endsWith("/download-url")) return ({ signedDownloadUrl: "https://demo.invalid/download", expiresAt: now }) as T;
  throw new Error(`Rota demo não suportada: ${method} ${pathname}`);
}

function projectDetail(id: string): ProjectDetail { const project = projects.find((item) => item.id === id) ?? projects[0]!; return { ...project, activities: [{ assignmentId: ids.assignment, lessonPosition: 7, title: "Cartaz que orienta uma decisão", status: "revision_requested", latestVersion: submissionVersion }] }; }
function studentDetail(studentId: string) { const student = students.find((item) => item.id === studentId) ?? students[0]!; return { student, guardian: { id: "00000000-0000-4000-8000-000000000023", name: "Ana Alves", relationship: "Mãe", email: "ana.demo@logos.academy", phone: "+55 11 99999-0000" }, consent, enrollments: [{ ...enrollment, studentId: student.id, studentName: student.displayName }], projects }; }
function completion() { return { enrollmentId: ids.enrollment, attendanceComplete: false, projectsComplete: false, reflectionComplete: false, presentationComplete: false, noPendingRevisions: false, eligible: false, blockers: ["Há uma revisão pendente na demonstração."] }; }
function stringValue(body: JsonObject | undefined, key: string, fallback: string): string { const value = body?.[key]; return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function nullableString(body: JsonObject | undefined, key: string, fallback: string | null): string | null { const value = body?.[key]; return value === null || typeof value === "string" ? value : fallback; }
function classStatus(body: JsonObject | undefined, fallback: ClassSummary["status"]): ClassSummary["status"] { const value = body?.status; return value === "planned" || value === "active" || value === "completed" || value === "cancelled" ? value : fallback; }
function inputEntries(body: JsonObject | undefined): readonly AttendanceEntry[] { const entries = body?.entries; if (!Array.isArray(entries)) return attendance; return entries.map((entry, index) => { const item = entry as JsonObject; const status = item.status === "absent" || item.status === "excused_absence" ? item.status : "present"; return { enrollmentId: stringValue(item, "enrollmentId", attendance[index]?.enrollmentId ?? ids.enrollment), studentName: students[index]?.displayName ?? "Aluno demo", status, privateNote: nullableString(item, "privateNote", null), makeup: null }; }); }
