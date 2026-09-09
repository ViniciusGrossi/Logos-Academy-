import { afterEach, describe, expect, it, vi } from "vitest";
import { demoApi, isDemoMode } from "@/src/mocks/demo-api";

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
    const [home, journey, dashboard, students, classes, concepts] = await Promise.all([
      demoApi<{ primaryAction: { assignmentId?: string } }>("/api/student/home", "GET"),
      demoApi<{ enrollment: { id: string }; projects: readonly unknown[] }>("/api/student/journey", "GET"),
      demoApi<{ upcomingSessions: readonly unknown[] }>("/api/admin/dashboard", "GET"),
      demoApi<{ items: readonly unknown[] }>("/api/admin/students?limit=50", "GET"),
      demoApi<{ items: readonly unknown[] }>("/api/admin/classes?limit=50", "GET"),
      demoApi<{ items: readonly unknown[] }>("/api/student/concepts?limit=50", "GET"),
    ]);
    expect(home.primaryAction.assignmentId).toBeTruthy();
    expect(journey.enrollment.id).toBeTruthy();
    expect(journey.projects).not.toHaveLength(0);
    expect(dashboard.upcomingSessions).not.toHaveLength(0);
    expect(students.items).not.toHaveLength(0);
    expect(classes.items).not.toHaveLength(0);
    expect(concepts.items).not.toHaveLength(0);
  });

  it("aceita mutações em memória sem acessar serviços remotos", async () => {
    const profile = await demoApi<{ displayName: string }>("/api/me", "PATCH", { displayName: "Marina Demo" });
    const attendance = await demoApi<readonly { status: string }[]>("/api/admin/sessions/00000000-0000-4000-8000-000000000009/attendance", "PUT", { entries: [{ enrollmentId: "00000000-0000-4000-8000-000000000002", status: "present" }] });
    const draft = await demoApi<{ isDraft: boolean }>("/api/student/activities/00000000-0000-4000-8000-000000000005/draft", "PUT", { items: [] });
    expect(profile.displayName).toBe("Marina Demo");
    expect(attendance[0]?.status).toBe("present");
    expect(draft.isDraft).toBe(true);
  });
});
