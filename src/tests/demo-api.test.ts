import { afterEach, describe, expect, it, vi } from "vitest";
import { demoApi, isDemoMode } from "@/src/mocks/demo-api";
import {
  explorerActivityGuidance,
  explorerActivitySeeds,
} from "@/src/mocks/academy.mock";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("provider de demonstração", () => {
  it("só fica disponível fora de produção com flag explícita", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoMode()).toBe(false);
  });

  it("entrega os dados que sustentam as telas de aluno e administração", async () => {
    const [
      home,
      journey,
      project,
      activity,
      dashboard,
      students,
      classes,
      concepts,
    ] = await Promise.all([
      demoApi<{ primaryAction: { assignmentId?: string } }>(
        "/api/student/home",
        "GET",
      ),
      demoApi<{ enrollment: { id: string }; projects: readonly unknown[] }>(
        "/api/student/journey",
        "GET",
      ),
      demoApi<{
        brief: { challenge: string };
        activities: readonly {
          decision: string | null;
          latestFeedback: unknown;
        }[];
      }>("/api/student/projects/00000000-0000-4000-8000-000000000011", "GET"),
      demoApi<{
        project: { activities: readonly unknown[] };
        requirements: readonly { kind: string }[];
        latestSubmission: { isDraft: boolean; items: readonly unknown[] };
        submissionHistory: { items: readonly { review: unknown }[] };
      }>("/api/student/activities/00000000-0000-4000-8000-000000000005", "GET"),
      demoApi<{ upcomingSessions: readonly unknown[] }>(
        "/api/admin/dashboard",
        "GET",
      ),
      demoApi<{ items: readonly unknown[] }>(
        "/api/admin/students?limit=50",
        "GET",
      ),
      demoApi<{ items: readonly unknown[] }>(
        "/api/admin/classes?limit=50",
        "GET",
      ),
      demoApi<{ items: readonly unknown[] }>(
        "/api/student/concepts?limit=50",
        "GET",
      ),
    ]);
    expect(home.primaryAction.assignmentId).toBeTruthy();
    expect(journey.enrollment.id).toBeTruthy();
    expect(journey.projects).not.toHaveLength(0);
    expect(project.brief.challenge).toContain("campanha visual");
    expect(project.activities).toHaveLength(4);
    expect(
      project.activities.some(
        (activity) => activity.decision && activity.latestFeedback,
      ),
    ).toBe(true);
    expect(activity.project.activities).toHaveLength(4);
    expect(
      activity.requirements.map((requirement) => requirement.kind),
    ).toEqual(["text", "file", "external_link", "github_repository"]);
    expect(activity.latestSubmission).toMatchObject({
      isDraft: true,
      items: [],
    });
    expect(activity.submissionHistory.items[0]?.review).toBeTruthy();
    expect(dashboard.upcomingSessions).not.toHaveLength(0);
    expect(students.items).not.toHaveLength(0);
    expect(classes.items).not.toHaveLength(0);
    expect(concepts.items).not.toHaveLength(0);
  });

  it("disponibiliza as 16 atividades nos quatro projetos do Explorer", async () => {
    const projectIds = [
      "00000000-0000-4000-8000-000000000007",
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
    ];
    const projectPages = await Promise.all(
      projectIds.map((id) =>
        demoApi<{
          cyclePosition: number;
          activities: readonly {
            assignmentId: string;
            lessonPosition: number;
          }[];
        }>(`/api/student/projects/${id}`, "GET"),
      ),
    );
    const activities = projectPages.flatMap((project) => project.activities);
    expect(explorerActivitySeeds).toHaveLength(16);
    expect(explorerActivityGuidance).toHaveLength(16);
    expect(
      explorerActivityGuidance.every((guidance) =>
        Object.values(guidance).every((value) => value.trim().length > 0),
      ),
    ).toBe(true);
    expect(projectPages.map((project) => project.activities.length)).toEqual([
      4, 4, 4, 4,
    ]);
    expect(
      new Set(activities.map((activity) => activity.assignmentId)).size,
    ).toBe(16);
    expect(activities.map((activity) => activity.lessonPosition)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    expect(
      explorerActivitySeeds
        .filter((_, index) => (index + 1) % 4 === 0)
        .map((activity) => activity.title),
    ).toEqual([
      "Project Day: Meu Assistente Inteligente",
      "Project Day: Creative Studio",
      "Project Day: Automation Lab",
      "Demo Day: eu construí isto",
    ]);

    const available = activities.filter((activity) =>
      [1, 9, 13].includes(activity.lessonPosition),
    );
    const details = await Promise.all(
      available.map((activity) =>
        demoApi<{
          lessonPosition: number;
          title: string;
          context: string | null;
          continuityGuidance: string | null;
          reflectionPrompt: string | null;
          portfolioEvidence: string | null;
          toolHint: string | null;
          steps: readonly unknown[];
          requirements: readonly unknown[];
          criteria: readonly unknown[];
        }>(`/api/student/activities/${activity.assignmentId}`, "GET"),
      ),
    );
    expect(details.map((detail) => detail.lessonPosition)).toEqual([1, 9, 13]);
    details.forEach((detail) => {
      expect(detail.title).toBeTruthy();
      expect(detail.steps.length).toBeGreaterThan(2);
      expect(detail.requirements.length).toBeGreaterThan(1);
      expect(detail.criteria.length).toBeGreaterThan(4);
      expect(detail.context).toBeTruthy();
      expect(detail.continuityGuidance).toBeTruthy();
      expect(detail.reflectionPrompt).toBeTruthy();
      expect(detail.portfolioEvidence).toBeTruthy();
      expect(detail.toolHint).toBeTruthy();
    });
    await expect(
      demoApi(`/api/student/activities/${activities[3]!.assignmentId}`, "GET"),
    ).rejects.toThrow("Atividade bloqueada");
  });

  it("aceita mutações em memória sem acessar serviços remotos", async () => {
    const profile = await demoApi<{ displayName: string }>("/api/me", "PATCH", {
      displayName: "Marina Demo",
    });
    const attendance = await demoApi<readonly { status: string }[]>(
      "/api/admin/sessions/00000000-0000-4000-8000-000000000009/attendance",
      "PUT",
      {
        entries: [
          {
            enrollmentId: "00000000-0000-4000-8000-000000000002",
            status: "present",
          },
        ],
      },
    );
    const draft = await demoApi<{ isDraft: boolean }>(
      "/api/student/activities/00000000-0000-4000-8000-000000000005/draft",
      "PUT",
      { items: [] },
    );
    expect(profile.displayName).toBe("Marina Demo");
    expect(attendance[0]?.status).toBe("present");
    expect(draft.isDraft).toBe(true);
  });
});
