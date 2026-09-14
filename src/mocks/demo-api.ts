import type {
  ActivityDetail, AttendanceEntry, ClassSummary, ConsentRecord,
  ConceptDetail, ConceptSummary, EnrollmentSummary, LibraryResourceDetail,
  LibraryResourceSummary, MeProfile, Page, ProjectDetail, ProjectSummary,
  ReviewDetail, ReviewQueueSubmission, SessionSummary, StudentSummary,
} from "@/specs/api.contracts";
import { explorerActivitySeeds } from "./academy.mock";

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
  prompt: "00000000-0000-4000-8000-000000000037",
  designSystem: "00000000-0000-4000-8000-000000000038",
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
  { id: ids.project, cyclePosition: 1, title: "Meu Assistente Inteligente", status: "in_progress", approvedAt: null, completedActivityCount: 3, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000011", cyclePosition: 2, title: "Creative Studio", status: "in_progress", approvedAt: null, completedActivityCount: 3, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000012", cyclePosition: 3, title: "Automation Lab", status: "in_progress", approvedAt: null, completedActivityCount: 3, activityCount: 4 },
  { id: "00000000-0000-4000-8000-000000000013", cyclePosition: 4, title: "AI Product", status: "in_progress", approvedAt: null, completedActivityCount: 3, activityCount: 4 },
];
const students: readonly StudentSummary[] = [
  { id: ids.marina, displayName: "Marina Alves", email: profile.email, githubUsername: "marina-alves", activeEnrollmentCount: 1, pendingAssignmentCount: 1, pendingMakeupCount: 0 },
  { id: ids.caio, displayName: "Caio Mendes", email: "caio.demo@logos.academy", githubUsername: null, activeEnrollmentCount: 1, pendingAssignmentCount: 1, pendingMakeupCount: 1 },
];
let consent: ConsentRecord = { id: "00000000-0000-4000-8000-000000000014", status: "verified", termVersion: "v1.0", signedAt: "2026-08-01", physicalCopyArchived: true, verifiedAt: now, revokedAt: null, revocationReason: null };
const concepts: readonly ConceptSummary[] = [
  { id: ids.concept, slug: "hierarquia-visual", title: "Hierarquia visual", summary: "Organiza o olhar para que a mensagem principal apareça primeiro.", releasedAt: now },
  { id: "00000000-0000-4000-8000-000000000015", slug: "contraste", title: "Contraste", summary: "Cria diferença perceptível entre elementos e decisões.", releasedAt: now },
];
const conceptDetails: readonly ConceptDetail[] = concepts.map((concept) => ({
  ...concept,
  body: concept.slug === "hierarquia-visual"
    ? "Hierarquia visual é a ordem de atenção planejada entre os elementos. Ela ajuda alguém a entender primeiro a mensagem principal, depois o contexto e, por fim, a ação."
    : "Contraste é a diferença perceptível entre elementos. Tamanho, peso, cor, espaço e posição podem criar contraste quando existe uma intenção clara.",
  videoUrl: null,
  videoTitle: concept.slug === "hierarquia-visual" ? "Hierarquia visual em 4 minutos" : "Contraste que orienta em 3 minutos",
  videoDurationMinutes: concept.slug === "hierarquia-visual" ? 4 : 3,
  readingMinutes: 6,
  contentBlocks: concept.slug === "hierarquia-visual" ? [
    { type: "text", heading: "Como o olhar decide", body: "Antes de ler, o olhar compara escala, posição, contraste e espaço. A hierarquia organiza essas diferenças para que uma peça comunique sem depender de explicação adicional." },
    { type: "diagram", heading: "Uma sequência de atenção", nodes: [
      { label: "Mensagem", detail: "O que precisa ser entendido primeiro." },
      { label: "Contexto", detail: "O que sustenta e qualifica a mensagem." },
      { label: "Ação", detail: "O que a pessoa deve fazer depois." },
    ] },
    { type: "callout", heading: "Teste rápido", body: "Afaste-se da tela por alguns segundos. Ao voltar, observe qual elemento você percebe primeiro. Se não for a mensagem principal, a hierarquia ainda precisa de ajuste." },
  ] : [
    { type: "text", heading: "Contraste não é decoração", body: "A diferença só é útil quando torna uma decisão mais clara. Aumentar tudo ao mesmo tempo elimina a própria hierarquia que o contraste deveria construir." },
    { type: "diagram", heading: "Quatro alavancas", nodes: [
      { label: "Escala", detail: "Grande e pequeno estabelecem prioridade." },
      { label: "Peso", detail: "Densidade tipográfica muda a presença." },
      { label: "Cor", detail: "Luminosidade e saturação criam separação." },
      { label: "Espaço", detail: "Isolamento também produz ênfase." },
    ] },
  ],
  relatedConcepts: concepts.filter((item) => item.id !== concept.id),
}));

const libraryResources: readonly LibraryResourceDetail[] = [
  {
    id: ids.prompt, kind: "prompt", slug: "direcao-visual-com-contexto", title: "Direção visual com contexto",
    summary: "Transforma intenção, público e restrições em uma direção visual verificável.", releasedAt: now, lessonPosition: 5,
    body: "Use este prompt antes de gerar imagens ou montar uma referência. Ele força a intenção visual a responder ao problema do projeto.", readingMinutes: 4,
    contentBlocks: [{ type: "callout", heading: "Quando usar", body: "No início de uma exploração visual, antes de decidir estilo, ferramenta ou composição final." }],
    artifact: {
      type: "prompt",
      template: "Atue como diretor de arte. Para [PÚBLICO], crie uma direção visual que comunique [MENSAGEM] e provoque [AÇÃO]. Respeite [RESTRIÇÕES]. Explique três decisões de composição, hierarquia e contraste.",
      variables: [
        { token: "[PÚBLICO]", description: "Quem precisa compreender a peça." },
        { token: "[MENSAGEM]", description: "A única ideia que deve vencer." },
        { token: "[AÇÃO]", description: "O comportamento esperado depois do contato." },
        { token: "[RESTRIÇÕES]", description: "Formato, canal, recursos e limites reais." },
      ],
      exampleInput: "Público: famílias do bairro. Mensagem: a praça volta a ser um lugar de encontro. Ação: participar do mutirão. Restrições: cartaz A3, duas cores.",
      exampleOutput: "Direção visual centrada em um ponto de encontro, com título dominante, contraste alto e uma chamada única para o mutirão.",
    }, relatedResources: [],
  },
  {
    id: ids.designSystem, kind: "design_system", slug: "sistema-visual-de-campanha", title: "Sistema visual de campanha",
    summary: "Um kit mínimo para manter mensagem, ritmo e ação coerentes em diferentes peças.", releasedAt: now, lessonPosition: 6,
    body: "Este sistema demonstra como poucas regras repetíveis criam identidade sem transformar cada peça em uma cópia da anterior.", readingMinutes: 7,
    contentBlocks: [{ type: "text", heading: "O sistema serve à mensagem", body: "Tokens, tipos e componentes reduzem decisões repetidas. A direção continua autoral, mas ganha consistência e velocidade." }],
    artifact: {
      type: "design_system",
      palette: [
        { name: "Ink", value: "#121214", role: "Estrutura e texto" },
        { name: "Paper", value: "#F4F1EA", role: "Área de leitura" },
        { name: "Signal", value: "#FF6A00", role: "Ação e estado" },
      ],
      typography: [
        { name: "Display", sample: "Uma mensagem vence.", role: "Títulos curtos" },
        { name: "Text", sample: "Contexto suficiente para decidir.", role: "Leitura e explicação" },
      ],
      principles: ["Uma mensagem dominante por peça", "Contraste reservado para decisão", "Espaço cria ritmo e separação"],
      components: [
        { name: "Título de campanha", description: "Promessa principal em até duas linhas." },
        { name: "Bloco de contexto", description: "Explica sem disputar atenção com o título." },
        { name: "Chamada", description: "Uma ação concreta, curta e verificável." },
      ],
    }, relatedResources: [],
  },
];
let attendance: readonly AttendanceEntry[] = students.map((student) => ({ enrollmentId: student.id === ids.marina ? ids.enrollment : "00000000-0000-4000-8000-000000000016", studentName: student.displayName, status: student.id === ids.caio ? "excused_absence" : "present", privateNote: null, makeup: null }));

const review: ReviewDetail = { id: ids.review, decision: "revision_requested", feedback: "O título está forte. Reduza o texto de apoio e explique a decisão na próxima versão.", reviewerName: "Vinicius", reviewedAt: now, seenAt: null, criteria: [{ criterionId: "00000000-0000-4000-8000-000000000017", result: "needs_adjustment", comment: "A mensagem principal ainda disputa atenção." }] };
let submissionVersion = 2;

function page<T>(items: readonly T[]): Page<T> { return { items, nextCursor: null }; }
function activity(assignmentId = ids.assignment): ActivityDetail {
  if (assignmentId === ids.assignmentResearch) return { id: "00000000-0000-4000-8000-000000000026", assignmentId, lessonPosition: 5, title: "Radar de referências", objective: "Selecionar referências e explicar o que cada uma ensina sobre atenção.", instructions: "Registre três referências e uma decisão que você quer testar no cartaz.", continuityGuidance: "Essa leitura alimenta a primeira versão do projeto.", estimatedMinutes: 20, dueAt: "2026-09-07T20:00:00.000Z", status: "approved", isOverdue: false, supplementalInstructions: null, context: "Você está montando o repertório visual do projeto. Cada referência é uma decisão em potencial.", expectedResult: "Três referências comentadas e uma decisão que você quer testar na próxima versão.", steps: [{ position: 1, label: "Escolha três referências" }, { position: 2, label: "Anote o que cada uma ensina sobre atenção" }, { position: 3, label: "Aponte uma decisão para testar" }], planB: "Sem internet, use imagens impressas ou revistas.", reflectionPrompt: "Qual referência mais muda a sua próxima versão?", portfolioEvidence: "O radar de referências comentado.", toolHint: "Pinterest, Behance ou um moodboard no Canva.", project: activityProject(), concepts, requirements: [{ id: "00000000-0000-4000-8000-000000000019", kind: "text", label: "Referências comentadas", required: true, position: 1 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Intenção visual", description: "Cada referência possui uma observação objetiva.", position: 1 }], latestSubmission: null, submissionHistory: [] };
  if (assignmentId === ids.assignmentPrototype) return { id: "00000000-0000-4000-8000-000000000027", assignmentId, lessonPosition: 8, title: "Protótipo que pede uma ação", objective: "Transformar a decisão visual em uma ação clara para quem vê o cartaz.", instructions: "Monte a próxima versão e descreva qual comportamento ela deve provocar.", continuityGuidance: "Esta etapa abre após você enviar a revisão atual.", estimatedMinutes: 30, dueAt: "2026-09-10T20:00:00.000Z", status: "locked", isOverdue: false, supplementalInstructions: null, context: "Você transforma a decisão visual em uma ação clara para quem vê o cartaz.", expectedResult: "Uma versão que provoca um comportamento específico em quem vê.", steps: [{ position: 1, label: "Defina a ação desejada" }, { position: 2, label: "Ajuste o cartaz para pedir essa ação" }, { position: 3, label: "Descreva o comportamento esperado" }], planB: "Sem ferramenta, descreva a ação em texto e esboce no papel.", reflectionPrompt: "A ação fica clara sem explicação extra?", portfolioEvidence: "O protótipo final com a hipótese de ação.", toolHint: "Figma ou Canva.", project: activityProject(), concepts, requirements: [{ id: "00000000-0000-4000-8000-000000000019", kind: "text", label: "Hipótese de ação", required: true, position: 1 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Convite à ação", description: "A próxima ação é clara sem explicação extra.", position: 1 }], latestSubmission: null, submissionHistory: [] };
  // Ciclo revisão→reenvio fiel à produção: a revisão gera um rascunho VAZIO (v+1, isDraft, sem review);
  // a submissão revisada com o feedback vive no histórico. A UI deriva o feedback do histórico, não do latestSubmission.
  const textItem = { id: "00000000-0000-4000-8000-000000000018", requirementId: "00000000-0000-4000-8000-000000000019", kind: "text" as const, textValue: "O título abre a leitura; a imagem sustenta o contraste.", fileName: null };
  const fileItem = { id: "00000000-0000-4000-8000-000000000036", requirementId: "00000000-0000-4000-8000-000000000031", kind: "file" as const, fileId: "00000000-0000-4000-8000-000000000022", fileName: "cartaz-v1.pdf" };
  const reviewed = { id: ids.submission, assignmentId: ids.assignment, version: 1, isDraft: false, isLate: false, submittedAt: "2026-09-06T18:00:00.000Z", items: [textItem, fileItem], review, reviews: [review] };
  const draft = { id: "00000000-0000-4000-8000-000000000029", assignmentId: ids.assignment, version: submissionVersion, isDraft: true, isLate: false, submittedAt: null, items: [], review: null, reviews: [] };
  return { id: "00000000-0000-4000-8000-000000000020", assignmentId: ids.assignment, lessonPosition: 7, title: "Cartaz que orienta uma decisão", objective: "Refinar a hierarquia visual e provar a mensagem principal.", instructions: "Compare a versão anterior com o feedback e envie uma nova decisão.", continuityGuidance: "A próxima atividade só abre após esta evidência.", estimatedMinutes: 25, dueAt: "2026-09-08T20:00:00.000Z", status: "revision_requested", isOverdue: false, supplementalInstructions: "Reduza o texto de apoio antes de alterar novamente a imagem principal.", context: "Você está refinando a hierarquia visual do cartaz. A mensagem principal precisa vencer o ruído antes de qualquer detalhe.", expectedResult: "Uma nova versão do cartaz com uma mensagem principal legível à distância e a decisão explicada.", steps: [{ position: 1, label: "Releia o feedback da versão anterior" }, { position: 2, label: "Ajuste contraste e peso do título" }, { position: 3, label: "Reduza o texto de apoio" }, { position: 4, label: "Explique a decisão em uma frase" }], planB: "Se a ferramenta de edição falhar, monte a versão no papel e fotografe.", reflectionPrompt: "O que a nova versão comunica em três segundos?", portfolioEvidence: "A versão final do cartaz com o registro da decisão.", toolHint: "Canva ou Figma; câmera do celular como backup.", project: activityProject(), concepts, requirements: [{ id: textItem.requirementId, kind: "text", label: "Decisão registrada", required: true, position: 1 }, { id: "00000000-0000-4000-8000-000000000031", kind: "file", label: "Nova versão do cartaz", required: true, position: 2 }, { id: "00000000-0000-4000-8000-000000000032", kind: "external_link", label: "Referência externa", required: false, position: 3 }, { id: "00000000-0000-4000-8000-000000000033", kind: "github_repository", label: "Repositório do processo", required: false, position: 4 }], criteria: [{ id: "00000000-0000-4000-8000-000000000017", label: "Mensagem principal", description: "Uma única mensagem é perceptível à distância.", position: 1 }, { id: "00000000-0000-4000-8000-000000000034", label: "Contraste funcional", description: "Título, imagem e apoio ocupam níveis de atenção distintos.", position: 2 }, { id: "00000000-0000-4000-8000-000000000035", label: "Decisão explicável", description: "A mudança responde diretamente ao feedback recebido.", position: 3 }], latestSubmission: draft, submissionHistory: [reviewed] };
}

function activityProject() {
  const project = projectDetail(ids.project);
  return { id: project.id, title: project.title, cyclePosition: project.cyclePosition, activities: project.activities.map(({ assignmentId, lessonPosition, title, status, latestVersion }) => ({ assignmentId, lessonPosition, title, status, latestVersion })) };
}

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** In-memory client-only API used exclusively by the local demo mode. */
export async function demoApi<T>(url: string, method: Method, body?: JsonObject): Promise<T> {
  const requestUrl = new URL(url, "http://demo.local");
  const pathname = requestUrl.pathname;
  if (method === "GET" && pathname === "/api/me") return profile as T;
  if (method === "PATCH" && pathname === "/api/me") { profile = { ...profile, displayName: stringValue(body, "displayName", profile.displayName), githubUsername: nullableString(body, "githubUsername", profile.githubUsername) }; return profile as T; }
  if (method === "GET" && pathname === "/api/student/home") return ({ primaryAction: { kind: "revise_submission", assignmentId: ids.assignment, label: "Revisar cartaz" }, nextSession: sessions[6]!, recentFeedback: review, currentProject: projects[0]!, pendingMakeupCount: 0 }) as T;
  if (method === "GET" && pathname === "/api/student/journey") return ({ enrollment, projects, sessionsCompleted: 6, sessionsTotal: 16 }) as T;
  if (method === "GET" && pathname === "/api/student/calendar") return sessions as T;
  if (method === "GET" && pathname === "/api/student/attendance") return page(sessions.slice(0, 6).map((session, index) => ({ session, status: index === 3 ? "excused_absence" : "present", makeup: index === 3 ? null : null }))) as T;
  if (method === "GET" && pathname === "/api/student/concepts") return page(filterKnowledge(concepts, requestUrl.searchParams.get("search"))) as T;
  if (method === "GET" && pathname.startsWith("/api/student/concepts/")) return (conceptDetails.find((item) => item.id === pathname.split("/").at(-1)) ?? conceptDetails[0]!) as T;
  if (method === "GET" && pathname === "/api/student/library") {
    const kind = requestUrl.searchParams.get("kind");
    const resources = libraryResources.filter((item) => item.kind === kind);
    return page(filterKnowledge(resources, requestUrl.searchParams.get("search")).map(resourceSummary)) as T;
  }
  if (method === "GET" && pathname.startsWith("/api/student/library/")) return (libraryResources.find((item) => item.id === pathname.split("/").at(-1)) ?? libraryResources[0]!) as T;
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
  if (method === "GET" && pathname === "/api/admin/reviews") { const history = activity().submissionHistory; const submission = "items" in history ? history.items[0] : history[0]; return page([{ ...submission!, criteria: activity().criteria }] as readonly ReviewQueueSubmission[]) as T; }
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

function projectDetail(id: string): ProjectDetail {
  const project = projects.find((item) => item.id === id) ?? projects[0]!;
  return {
    ...project,
    brief: {
      challenge: "Criar uma campanha visual que conduza uma decisão clara usando hierarquia, contraste e narrativa.",
      problem: "Mensagens visuais perdem força quando imagem, texto e chamada disputam a atenção de quem vê.",
      audience: "Pessoas que precisam compreender a ideia principal e saber o que fazer em poucos segundos.",
      expectedResult: "Campanha autoral com conceito, imagem principal, vídeo curto, copy e processo documentado.",
      qualityCriteria: ["Uma mensagem principal perceptível", "Hierarquia visual intencional", "Imagem, texto e ação coerentes", "Decisões explicadas entre versões"],
      concepts: ["Hierarquia visual", "Contraste", "Storytelling", "Curadoria", "Copy curta"],
    },
    activities: [
      { assignmentId: ids.assignmentResearch, lessonPosition: 5, title: "Referências escolhidas", status: "approved", latestVersion: 1, decision: "Usar luz lateral e enquadramento fechado para concentrar a atenção.", latestFeedback: null },
      { assignmentId: "00000000-0000-4000-8000-000000000028", lessonPosition: 6, title: "Hipótese de comunicação", status: "approved", latestVersion: 1, decision: "A imagem apresenta o conflito; o título entrega uma única promessa.", latestFeedback: { decision: "approved", feedback: "A hipótese conecta público, mensagem e escolha visual.", reviewerName: "Vinicius", reviewedAt: now } },
      { assignmentId: ids.assignment, lessonPosition: 7, title: "Primeira versão e feedback", status: "revision_requested", latestVersion: submissionVersion, decision: "Aumentar o contraste do título e reduzir o texto de apoio na versão 03.", latestFeedback: { decision: review.decision, feedback: review.feedback, reviewerName: review.reviewerName, reviewedAt: review.reviewedAt } },
      { assignmentId: ids.assignmentPrototype, lessonPosition: 8, title: "Evidência final", status: "locked", latestVersion: null, decision: null, latestFeedback: null },
    ],
  };
}
function studentDetail(studentId: string) { const student = students.find((item) => item.id === studentId) ?? students[0]!; return { student, guardian: { id: "00000000-0000-4000-8000-000000000023", name: "Ana Alves", relationship: "Mãe", email: "ana.demo@logos.academy", phone: "+55 11 99999-0000" }, consent, enrollments: [{ ...enrollment, studentId: student.id, studentName: student.displayName }], projects }; }
function completion() { return { enrollmentId: ids.enrollment, attendanceComplete: false, projectsComplete: false, reflectionComplete: false, presentationComplete: false, noPendingRevisions: false, eligible: false, blockers: ["Há uma revisão pendente na demonstração."] }; }
function stringValue(body: JsonObject | undefined, key: string, fallback: string): string { const value = body?.[key]; return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function nullableString(body: JsonObject | undefined, key: string, fallback: string | null): string | null { const value = body?.[key]; return value === null || typeof value === "string" ? value : fallback; }
function filterKnowledge<T extends { title: string; summary: string }>(items: readonly T[], search: string | null): readonly T[] { const query = search?.trim().toLocaleLowerCase("pt-BR"); return query ? items.filter((item) => `${item.title} ${item.summary}`.toLocaleLowerCase("pt-BR").includes(query)) : items; }
function resourceSummary(resource: LibraryResourceDetail): LibraryResourceSummary { const { body: _body, readingMinutes: _readingMinutes, contentBlocks: _contentBlocks, artifact: _artifact, relatedResources: _relatedResources, ...summary } = resource; return summary; }
function classStatus(body: JsonObject | undefined, fallback: ClassSummary["status"]): ClassSummary["status"] { const value = body?.status; return value === "planned" || value === "active" || value === "completed" || value === "cancelled" ? value : fallback; }
function inputEntries(body: JsonObject | undefined): readonly AttendanceEntry[] { const entries = body?.entries; if (!Array.isArray(entries)) return attendance; return entries.map((entry, index) => { const item = entry as JsonObject; const status = item.status === "absent" || item.status === "excused_absence" ? item.status : "present"; return { enrollmentId: stringValue(item, "enrollmentId", attendance[index]?.enrollmentId ?? ids.enrollment), studentName: students[index]?.displayName ?? "Aluno demo", status, privateNote: nullableString(item, "privateNote", null), makeup: null }; }); }
