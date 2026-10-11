import { describe, expect, it } from "vitest";

import { AppError } from "@/src/lib/api-error";
import { InMemoryCurriculumRepository } from "@/src/modules/curriculum/repository";
import { CurriculumImportService } from "@/src/modules/curriculum/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const canonicalSource = Array.from({ length: 4 }, (_, cycleIndex) => {
  const cycle = cycleIndex + 1;
  const lessons = Array.from({ length: 4 }, (_, lessonIndex) => {
    const lesson = cycleIndex * 4 + lessonIndex + 1;
    const title = lesson === 16 ? "Demo Day" : `Aula de constru\u00e7\u00e3o ${lesson}`;
    const content = lesson === 16 ? "Apresente o projeto e registre a reflex\u00e3o final." : `Conte\u00fado da aula ${lesson}.`;

    return `## Aula ${lesson} \u2014 ${title}\n\n### Objetivo da aula\n\nObjetivo verific\u00e1vel da aula ${lesson}.\n\n### Conte\u00fado\n\n${content}\n\n### Entrega do aluno\n\nEvid\u00eancia da aula ${lesson}.\n\n### Atividade pr\u00e1tica\n\nConstrua e registre a vers\u00e3o ${lesson}.\n\n### Tarefa p\u00f3s-aula\n\nPrepare a pr\u00f3xima decis\u00e3o.\n\n### Crit\u00e9rio de conclus\u00e3o\n\nA entrega explica a decis\u00e3o.`;
  }).join("\n\n");

  return `# Ciclo ${cycle} \u2014 Projeto ${cycle}\n\n## Resultado esperado\n\nProjeto ${cycle} \u2014 Projeto ${cycle}: uma entrega demonstr\u00e1vel.\n\n${lessons}`;
}).join("\n\n");

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
