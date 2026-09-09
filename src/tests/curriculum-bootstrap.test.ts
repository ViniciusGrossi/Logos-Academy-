import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AppError } from "@/src/lib/api-error";
import { InMemoryCurriculumRepository } from "@/src/modules/curriculum/repository";
import { CurriculumImportService } from "@/src/modules/curriculum/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const canonicalSource = readFileSync(
  path.resolve("..", "Curriculo", "Curriculo_Operacional_Explorer.md"),
  "utf8",
);

describe("curriculum", () => {
  it("mantém IDs e contagens estáveis ao importar o Explorer novamente", async () => {
    const repository = new InMemoryCurriculumRepository();
    const service = new CurriculumImportService(repository);

    const first = await service.importExplorer({ tenantId, document: canonicalSource });
    const second = await service.importExplorer({ tenantId, document: canonicalSource });

    expect(second.curriculumId).toBe(first.curriculumId);
    expect(repository.snapshot(tenantId)).toMatchObject({ curricula: 1, cycles: 4, lessons: 16, projects: 4 });
  });

  it("preserva o snapshot pedagógico 4/16/4 e as relações do Explorer", async () => {
    const repository = new InMemoryCurriculumRepository();
    const imported = await new CurriculumImportService(repository).importExplorer({ tenantId, document: canonicalSource });
    const snapshot = repository.curriculum(imported.curriculumId);

    expect(snapshot.cycles).toHaveLength(4);
    expect(snapshot.cycles.flatMap((cycle) => cycle.lessons)).toHaveLength(16);
    expect(snapshot.cycles.map((cycle) => cycle.projectTitle)).toHaveLength(4);
    expect(snapshot.cycles.flatMap((cycle) => cycle.lessons).every((lesson) => lesson.activity.lessonId === lesson.id)).toBe(true);
    expect(snapshot.cycles[3]?.lessons[3]?.title).toContain("Demo Day");
    expect(snapshot.cycles[3]?.lessons[3]?.referenceContent).toContain("reflexão final");
  });

  it("aplica instrução complementar somente à execução escolhida", async () => {
    const repository = new InMemoryCurriculumRepository();
    const service = new CurriculumImportService(repository);
    const imported = await service.importExplorer({ tenantId, document: canonicalSource });
    const template = repository.curriculum(imported.curriculumId).cycles[0]?.lessons[0]?.activity;
    if (!template) throw new Error("Fixture de currículo inválida.");

    const first = service.createExecution(template, { supplementalInstructions: "Trabalhe em dupla." });
    const second = service.createExecution(template, {});

    expect(first.supplementalInstructions).toBe("Trabalhe em dupla.");
    expect(second.supplementalInstructions).toBeNull();
    expect(template.instructions).not.toContain("Trabalhe em dupla.");
  });

  it("bloqueia tentativa operacional de alterar objetivo ou critério canônico", () => {
    const service = new CurriculumImportService(new InMemoryCurriculumRepository());

    expect(() => service.assertExecutionOnly({ objective: "Novo objetivo" })).toThrow(AppError);
    try {
      service.assertExecutionOnly({ criteria: [{ label: "Novo critério" }] });
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
